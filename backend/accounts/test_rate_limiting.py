"""Rate limiting and login lockout (15.0).

Kept out of tests.py so this work merges cleanly alongside other account changes. The limits
are the real ones from settings: the test runner (backend/test_runner.py) empties the cache
before every test instead of switching throttling off.
"""

from datetime import timedelta

from axes.models import AccessAttempt
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core import mail
from django.core.exceptions import ImproperlyConfigured
from django.db.models import F
from django.test import SimpleTestCase, override_settings
from django.urls import resolve
from rest_framework import status
from rest_framework.test import APIClient, APITestCase
from rest_framework.throttling import AnonRateThrottle

from backend.client_ip import client_ip, parse_trusted_proxy_count
from cocktails.models import Menu, MenuItem, Recipe

User = get_user_model()

fast_passwords = override_settings(
    PASSWORD_HASHERS=['django.contrib.auth.hashers.MD5PasswordHasher'],
)

# Pinned rather than read from the environment, so these tests mean the same thing everywhere.
two_proxies = override_settings(REST_FRAMEWORK={**settings.REST_FRAMEWORK, 'NUM_PROXIES': 2})


def limit(scope):
    """How many requests the configured rate allows, e.g. 10 for '10/hour'."""
    return int(settings.REST_FRAMEWORK['DEFAULT_THROTTLE_RATES'][scope].split('/')[0])


def via_vercel(ip):
    """Request kwargs for a client at `ip`, as X-Forwarded-For arrives through Vercel and Railway."""
    return {'HTTP_X_FORWARDED_FOR': f'{ip}, 76.76.21.21', 'REMOTE_ADDR': '100.64.0.2'}


class TrustedProxyCountParsingTests(SimpleTestCase):
    def test_unset_or_blank_uses_the_default(self):
        for value in [None, '', '   ']:
            with self.subTest(value=value):
                self.assertEqual(parse_trusted_proxy_count(value, default=2), 2)

    def test_whole_numbers_are_accepted(self):
        for value, expected in [('0', 0), ('1', 1), (' 3 ', 3)]:
            with self.subTest(value=value):
                self.assertEqual(parse_trusted_proxy_count(value), expected)

    def test_anything_else_stops_the_app_starting(self):
        for value in ['-1', 'two', '1.5', '2,']:
            with self.subTest(value=value):
                with self.assertRaises(ImproperlyConfigured):
                    parse_trusted_proxy_count(value)


class ClientIPTests(SimpleTestCase):
    def request(self, **meta):
        from django.test import RequestFactory
        return RequestFactory().get('/', **meta)

    @two_proxies
    def test_counts_trusted_proxies_in_from_the_right(self):
        self.assertEqual(client_ip(self.request(**via_vercel('203.0.113.7'))), '203.0.113.7')

    @two_proxies
    def test_a_forged_entry_on_the_left_is_ignored(self):
        request = self.request(HTTP_X_FORWARDED_FOR='6.6.6.6, 203.0.113.7, 76.76.21.21')
        self.assertEqual(client_ip(request), '203.0.113.7')

    @two_proxies
    def test_fewer_entries_than_proxies_uses_the_leftmost(self):
        self.assertEqual(client_ip(self.request(HTTP_X_FORWARDED_FOR='203.0.113.7')), '203.0.113.7')

    @two_proxies
    def test_no_header_falls_back_to_remote_addr(self):
        self.assertEqual(client_ip(self.request(REMOTE_ADDR='192.0.2.1')), '192.0.2.1')

    def test_zero_proxies_trusts_only_remote_addr(self):
        with override_settings(REST_FRAMEWORK={**settings.REST_FRAMEWORK, 'NUM_PROXIES': 0}):
            request = self.request(HTTP_X_FORWARDED_FOR='6.6.6.6', REMOTE_ADDR='192.0.2.1')
            self.assertEqual(client_ip(request), '192.0.2.1')


@fast_passwords
@two_proxies
class LoginLockoutTests(APITestCase):
    """5 failures lock that username + IP for 30 minutes (15.7)."""

    def setUp(self):
        self.user = User.objects.create_user(username='Alex', email='alex@example.com', password='correct-horse')

    def login(self, identifier='alex', password='correct-horse', ip='203.0.113.7'):
        return self.client.post(
            '/api/auth/login/', {'identifier': identifier, 'password': password},
            format='json', **via_vercel(ip),
        )

    def fail(self, times, identifier='alex', ip='203.0.113.7'):
        return [self.login(identifier, 'wrong', ip).status_code for _ in range(times)]

    def test_the_fifth_failure_locks_out_and_says_so(self):
        self.assertEqual(self.fail(4), [status.HTTP_400_BAD_REQUEST] * 4)
        response = self.login(password='wrong')
        self.assertEqual(response.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
        self.assertEqual(response.data['detail'], settings.AXES_COOLOFF_MESSAGE)
        self.assertIn('no-store', response['Cache-Control'])
        self.assertNotIn('public', response['Cache-Control'])

    def test_while_locked_out_the_right_password_does_not_get_in(self):
        self.fail(5)
        self.assertEqual(self.login().status_code, status.HTTP_429_TOO_MANY_REQUESTS)
        self.assertEqual(self.client.get('/api/auth/session/').data, {'user': None})

    def test_another_ip_is_not_locked_out(self):
        """Someone guessing at your account from elsewhere must not lock you out of it."""
        self.fail(5, ip='198.51.100.9')
        self.assertEqual(self.login(ip='203.0.113.7').status_code, status.HTTP_200_OK)

    def test_another_username_from_the_same_ip_is_not_locked_out(self):
        User.objects.create_user(username='sam', email='sam@example.com', password='correct-horse')
        self.fail(5)
        self.assertEqual(self.login('sam').status_code, status.HTTP_200_OK)

    def test_switching_between_email_username_and_case_buys_no_extra_tries(self):
        for identifier in ['alex', 'ALEX', 'alex@example.com', 'Alex@Example.com']:
            self.assertEqual(self.login(identifier, 'wrong').status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(self.login(' alex ', 'wrong').status_code, status.HTTP_429_TOO_MANY_REQUESTS)
        for identifier in ['alex', 'alex@example.com']:
            self.assertEqual(self.login(identifier).status_code, status.HTTP_429_TOO_MANY_REQUESTS)

    def test_a_name_with_no_account_locks_out_the_same_way(self):
        """Otherwise the lockout itself would say which accounts exist."""
        self.assertEqual(self.fail(5, identifier='nobody'), [400, 400, 400, 400, 429])

    def test_success_clears_earlier_failures(self):
        self.fail(4)
        self.assertEqual(self.login().status_code, status.HTTP_200_OK)
        self.client.post('/api/auth/logout/')
        self.assertEqual(self.fail(5), [400, 400, 400, 400, 429])

    def test_the_lock_lifts_after_30_minutes(self):
        self.fail(5)
        AccessAttempt.objects.update(attempt_time=F('attempt_time') - timedelta(minutes=31))
        self.assertEqual(self.login().status_code, status.HTTP_200_OK)

    def test_trying_again_while_locked_does_not_extend_the_lock(self):
        self.fail(5)
        AccessAttempt.objects.update(attempt_time=F('attempt_time') - timedelta(minutes=29))
        self.fail(3)
        AccessAttempt.objects.update(attempt_time=F('attempt_time') - timedelta(minutes=2))
        self.assertEqual(self.login().status_code, status.HTTP_200_OK)

    def test_other_failures_are_still_400s(self):
        """Lockout adds a 429; it does not change what a plain failure or a bad body returns."""
        self.assertEqual(self.client.post('/api/auth/login/', {}, format='json').status_code, 400)

    def test_the_django_admin_login_shares_the_lockout(self):
        self.user.is_staff = True
        self.user.save()
        for _ in range(3):
            self.login(password='wrong')
        admin = APIClient()
        for _ in range(2):
            response = admin.post(
                '/admin/login/', {'username': 'alex@example.com', 'password': 'wrong'}, **via_vercel('203.0.113.7'),
            )
        self.assertEqual(response.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
        response = admin.post(
            '/admin/login/', {'username': 'alex', 'password': 'correct-horse'}, **via_vercel('203.0.113.7'),
        )
        self.assertEqual(response.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
        self.assertNotIn('_auth_user_id', admin.session)


@two_proxies
class PasswordResetThrottleTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='alex', email='alex@example.com', password='old-password-1')

    def ask(self, identifier='alex', ip='203.0.113.7'):
        return self.client.post(
            '/api/auth/password-reset/', {'identifier': identifier}, format='json', **via_vercel(ip),
        )

    def test_per_ip_limit_is_a_429_that_is_never_cached(self):
        for n in range(limit('password_reset')):
            self.assertEqual(self.ask(f'nobody{n}').status_code, status.HTTP_200_OK)
        response = self.ask('someone-else')
        self.assertEqual(response.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
        self.assertIn('Please wait', response.data['detail'])
        self.assertIn('Retry-After', response)
        self.assertIn('no-store', response['Cache-Control'])
        self.assertNotIn('public', response['Cache-Control'])
        self.assertEqual(self.ask('someone-else', ip='198.51.100.9').status_code, status.HTTP_200_OK)

    def test_per_account_limit_quietly_stops_the_emails(self):
        allowed = limit('password_reset_account')
        self.assertLess(allowed, limit('password_reset'))
        # Asking by email and by username counts against the same account.
        answers = set()
        for n in range(allowed + 2):
            response = self.ask('alex' if n % 2 else 'ALEX@example.com', ip=f'198.51.100.{n}')
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            answers.add(str(response.data))
        self.assertEqual(len(mail.outbox), allowed)
        # Over the limit looks exactly like under it, so it gives nothing away.
        self.assertEqual(len(answers), 1)

    def test_the_per_account_limit_does_not_spill_onto_other_accounts(self):
        User.objects.create_user(username='sam', email='sam@example.com', password='pw-for-sam-1')
        for n in range(limit('password_reset_account')):
            self.ask('alex', ip=f'198.51.100.{n}')
        mail.outbox.clear()
        self.ask('sam', ip='192.0.2.50')
        self.assertEqual([m.to for m in mail.outbox], [['sam@example.com']])


@fast_passwords
class CurrentPasswordThrottleTests(APITestCase):
    """Changing the email or password checks the current one; axes never sees those checks."""

    def setUp(self):
        self.user = User.objects.create_user(username='alex', email='alex@example.com', password='old-password-1')
        self.client.force_login(self.user)

    def change_password(self, current):
        return self.client.post(
            '/api/auth/password/', {'current_password': current, 'password': 'a-new-long-passphrase'},
            format='json',
        )

    def change_email(self, current):
        return self.client.patch(
            '/api/auth/profile/', {'email': 'new@example.com', 'current_password': current}, format='json',
        )

    def test_guesses_on_either_form_share_one_limit_then_even_the_right_password_is_refused(self):
        for n in range(limit('current_password')):
            guess = self.change_password if n % 2 else self.change_email
            self.assertEqual(guess(f'guess-{n}').status_code, status.HTTP_400_BAD_REQUEST)
        response = self.change_password('old-password-1')
        self.assertEqual(response.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
        self.assertIn('Please wait', response.data['detail'])
        self.assertIn('no-store', response['Cache-Control'])
        self.assertEqual(self.change_email('old-password-1').status_code, status.HTTP_429_TOO_MANY_REQUESTS)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('old-password-1'))
        self.assertEqual(self.user.email, 'alex@example.com')

    def test_edits_that_do_not_check_the_password_do_not_count(self):
        for n in range(limit('current_password') + 2):
            response = self.client.patch('/api/auth/profile/', {'fullname': f'Alex {n}'}, format='json')
            self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(self.change_email('old-password-1').status_code, status.HTTP_200_OK)

    def test_the_limit_is_per_account(self):
        for n in range(limit('current_password')):
            self.change_password(f'guess-{n}')
        sam = User.objects.create_user(username='sam', email='sam@example.com', password='pw-for-sam-1')
        self.client.force_login(sam)
        self.assertEqual(self.change_password('pw-for-sam-1').status_code, status.HTTP_204_NO_CONTENT)


@two_proxies
class GuestOrderThrottleTests(APITestCase):
    def setUp(self):
        owner = User.objects.create_user(username='host', email='host@example.com')
        self.recipe = Recipe.objects.create(owner=owner, name='Negroni')
        self.menu = Menu.objects.create(owner=owner, name='Party', is_active=True)
        MenuItem.objects.create(menu=self.menu, recipe=self.recipe, order=1)
        self.url = f'/api/public/menu/{self.menu.share_token}/orders/'

    def order(self, n, ip='203.0.113.7'):
        return self.client.post(
            self.url, {'recipe_id': self.recipe.id, 'guest_name': f'Guest {n}'}, format='json', **via_vercel(ip),
        )

    def test_placing_orders_is_capped_per_ip(self):
        for n in range(limit('guest_order_create')):
            self.assertEqual(self.order(n).status_code, status.HTTP_201_CREATED)
        response = self.order('one too many')
        self.assertEqual(response.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
        self.assertIn('no-store', response['Cache-Control'])
        self.assertNotIn('public', response['Cache-Control'])
        # Guests elsewhere, and checking or cancelling orders, are unaffected.
        self.assertEqual(self.order('elsewhere', ip='198.51.100.9').status_code, status.HTTP_201_CREATED)
        response = self.client.get(self.url, {'guest_name': 'Guest 0'}, **via_vercel('203.0.113.7'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class AnonymousEndpointsAreThrottledTests(SimpleTestCase):
    """Every endpoint a stranger can reach has at least the general anonymous limit (15.9)."""

    def test_each_anonymous_endpoint_has_the_anon_limit(self):
        token = '11111111-2222-3333-4444-555555555555'
        paths = [
            '/api/auth/session/', '/api/auth/login/', '/api/auth/logout/',
            '/api/auth/signup/abc/', '/api/auth/password-reset/', '/api/auth/password-reset/MQ/abc-123/',
            f'/api/public/menu/{token}/', f'/api/public/menu/{token}/orders/',
            f'/api/public/menu/{token}/orders/1/',
        ]
        for path in paths:
            with self.subTest(path=path):
                view = resolve(path).func.cls()
                self.assertTrue(
                    any(isinstance(t, AnonRateThrottle) for t in view.get_throttles()),
                    f'{path} has no anonymous rate limit',
                )


@two_proxies
class ClientIPViewTests(APITestCase):
    url = '/api/auth/client-ip/'

    def test_signed_out_is_a_401(self):
        self.assertEqual(self.client.get(self.url).status_code, status.HTTP_401_UNAUTHORIZED)

    def test_anyone_but_a_superuser_gets_a_404(self):
        regular = User.objects.create_user(username='sam', email='sam@example.com')
        staff = User.objects.create_user(username='staff', email='staff@example.com', is_staff=True)
        for user in [regular, staff]:
            with self.subTest(user=user.username):
                self.client.force_authenticate(user)
                self.assertEqual(self.client.get(self.url).status_code, status.HTTP_404_NOT_FOUND)

    def test_a_superuser_sees_what_each_limiter_computes(self):
        admin = User.objects.create_superuser(username='root', email='root@example.com', password='x-pass-123')
        self.client.force_authenticate(admin)
        response = self.client.get(self.url, **via_vercel('203.0.113.7'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['remote_addr'], '100.64.0.2')
        self.assertEqual(response.data['x_forwarded_for'], '203.0.113.7, 76.76.21.21')
        self.assertEqual(response.data['drf_throttle_ip'], '203.0.113.7')
        self.assertEqual(response.data['axes_ip'], '203.0.113.7')
        self.assertEqual(response.data['trusted_proxy_count'], 2)
        self.assertIn('no-store', response['Cache-Control'])
        self.assertNotIn('public', response['Cache-Control'])
