from django.contrib.auth import authenticate, get_user_model
from django.core.exceptions import ValidationError
from django.core.management import call_command
from django.db import IntegrityError, connection, transaction
from django.db.migrations.executor import MigrationExecutor
from django.test import TestCase, TransactionTestCase, override_settings
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

User = get_user_model()

# These tests sign in for real, and the default hasher is slow on purpose.
fast_passwords = override_settings(
    PASSWORD_HASHERS=['django.contrib.auth.hashers.MD5PasswordHasher'],
)


class UserModelTests(TestCase):
    """Test cases for the custom User model."""

    def test_user_creation_with_required_fields(self):
        """Test that a user can be created with required fields (username, email, password)."""
        user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.assertEqual(user.username, 'testuser')
        self.assertEqual(user.email, 'test@example.com')
        self.assertTrue(user.check_password('testpass123'))
        self.assertFalse(user.is_staff)
        self.assertFalse(user.is_superuser)
        self.assertTrue(user.is_active)

    def test_user_creation_with_fullname(self):
        """Test that a user can be created with the optional fullname field."""
        user = User.objects.create_user(
            username='testuser2',
            email='test2@example.com',
            password='testpass123',
            fullname='Test User Full Name'
        )
        self.assertEqual(user.fullname, 'Test User Full Name')
        self.assertEqual(user.username, 'testuser2')

    def test_user_creation_without_fullname(self):
        """Test that a user can be created without the fullname field (it's optional)."""
        user = User.objects.create_user(
            username='testuser3',
            email='test3@example.com',
            password='testpass123'
        )
        self.assertEqual(user.fullname, '')
        self.assertTrue(user.fullname == '' or user.fullname is None)

    def test_user_string_representation(self):
        """Test that the __str__ method returns the username."""
        user = User.objects.create_user(
            username='testuser4',
            email='test4@example.com',
            password='testpass123'
        )
        self.assertEqual(str(user), 'testuser4')

    def test_user_inherits_abstractuser_fields(self):
        """Test that User model inherits all AbstractUser fields and methods."""
        user = User.objects.create_user(
            username='testuser5',
            email='test5@example.com',
            password='testpass123'
        )
        # Verify inherited fields exist
        self.assertIsNotNone(user.username)
        self.assertIsNotNone(user.email)
        self.assertIsNotNone(user.password)
        self.assertIsNotNone(user.is_staff)
        self.assertIsNotNone(user.is_superuser)
        self.assertIsNotNone(user.is_active)
        self.assertIsNotNone(user.date_joined)
        # Verify inherited methods work
        self.assertTrue(hasattr(user, 'get_full_name'))
        self.assertTrue(hasattr(user, 'get_short_name'))
        self.assertTrue(hasattr(user, 'check_password'))

    def test_superuser_creation(self):
        """Test that a superuser can be created with correct permissions."""
        superuser = User.objects.create_superuser(
            username='admin',
            email='admin@example.com',
            password='admin123'
        )
        self.assertTrue(superuser.is_staff)
        self.assertTrue(superuser.is_superuser)
        self.assertTrue(superuser.is_active)
        self.assertTrue(superuser.check_password('admin123'))

    def test_superuser_must_have_is_staff_true(self):
        """Test that create_superuser sets is_staff to True."""
        superuser = User.objects.create_superuser(
            username='admin2',
            email='admin2@example.com',
            password='admin123'
        )
        self.assertTrue(superuser.is_staff)

    def test_superuser_must_have_is_superuser_true(self):
        """Test that create_superuser sets is_superuser to True."""
        superuser = User.objects.create_superuser(
            username='admin3',
            email='admin3@example.com',
            password='admin123'
        )
        self.assertTrue(superuser.is_superuser)

    def test_user_fullname_field_exists(self):
        """Test that the fullname field exists on the User model."""
        user = User.objects.create_user(
            username='testuser6',
            email='test6@example.com',
            password='testpass123',
            fullname='John Doe'
        )
        self.assertTrue(hasattr(user, 'fullname'))
        self.assertEqual(user.fullname, 'John Doe')

    def test_user_fullname_can_be_blank(self):
        """Test that fullname field can be left blank."""
        user = User.objects.create_user(
            username='testuser7',
            email='test7@example.com',
            password='testpass123'
        )
        # fullname should be blank/empty, not raise an error
        self.assertEqual(user.fullname, '')


class UserIdentityTests(TestCase):
    """Usernames and emails are each unique ignoring case, and both are required."""

    def setUp(self):
        self.user = User.objects.create_user(username='Alex', email='Alex@Example.com')

    def test_username_is_unique_ignoring_case(self):
        with self.assertRaises(IntegrityError), transaction.atomic():
            User.objects.create_user(username='alex', email='other@example.com')

    def test_email_is_unique_ignoring_case(self):
        with self.assertRaises(IntegrityError), transaction.atomic():
            User.objects.create_user(username='other', email='alex@example.COM')

    def test_email_is_required(self):
        with self.assertRaises(IntegrityError), transaction.atomic():
            User.objects.create_user(username='other')

    def test_username_allows_only_letters_and_numbers(self):
        for username in ['sam@example.com', 'sam.smith', 'sam_smith', 'sam-smith', 'sam smith', 'sam+1', '']:
            with self.subTest(username=username):
                user = User(username=username, email='sam@example.com', password='x')
                with self.assertRaises(ValidationError) as caught:
                    user.full_clean()
                self.assertIn('username', caught.exception.message_dict)
        User(username='Sam42', email='sam@example.com', password='x').full_clean()

    def test_validation_reports_a_clash_before_the_database_does(self):
        """Forms (the admin, and signup later) get a message, not a 500."""
        user = User(username='ALEX', email='ALEX@example.com', password='x')
        with self.assertRaises(ValidationError) as caught:
            user.full_clean()
        messages = ' '.join(caught.exception.messages)
        self.assertIn('username already exists', messages)
        self.assertIn('email address already exists', messages)


@fast_passwords
class EmailOrUsernameBackendTests(TestCase):
    """One login field: a value with "@" is an email, anything else a username."""

    def setUp(self):
        self.user = User.objects.create_user(
            username='Alex', email='Alex@Example.com', password='correct-horse',
        )

    def test_sign_in_with_username_or_email_in_any_case(self):
        for identifier in ['Alex', 'alex', 'ALEX', 'Alex@Example.com', 'alex@example.com', ' alex ']:
            with self.subTest(identifier=identifier):
                self.assertEqual(authenticate(username=identifier, password='correct-horse'), self.user)

    def test_wrong_password_is_refused(self):
        self.assertIsNone(authenticate(username='alex', password='wrong'))
        self.assertIsNone(authenticate(username='alex@example.com', password='wrong'))

    def test_unknown_account_is_refused(self):
        self.assertIsNone(authenticate(username='nobody', password='correct-horse'))
        self.assertIsNone(authenticate(username='nobody@example.com', password='correct-horse'))

    def test_inactive_user_is_refused(self):
        self.user.is_active = False
        self.user.save()
        self.assertIsNone(authenticate(username='alex', password='correct-horse'))

    def test_admin_login_accepts_an_email(self):
        self.user.is_staff = True
        self.user.save()
        response = self.client.post(
            '/admin/login/', {'username': 'alex@example.com', 'password': 'correct-horse'},
        )
        self.assertEqual(response.status_code, 302)
        self.assertEqual(int(self.client.session['_auth_user_id']), self.user.id)


@fast_passwords
class AuthAPITests(APITestCase):
    """Login, logout and "who am I", as the login screen will use them."""

    def setUp(self):
        self.user = User.objects.create_user(
            username='Alex', email='alex@example.com', password='correct-horse', fullname='Alex Lin',
        )

    def login(self, identifier='alex', password='correct-horse'):
        return self.client.post(
            '/api/auth/login/', {'identifier': identifier, 'password': password}, format='json',
        )

    def test_session_is_null_when_signed_out(self):
        response = self.client.get('/api/auth/session/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, {'user': None})

    def test_login_with_username_starts_a_session(self):
        response = self.login('alex')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['user'], {
            'id': self.user.id, 'username': 'Alex', 'email': 'alex@example.com', 'fullname': 'Alex Lin',
        })
        self.assertEqual(self.client.get('/api/auth/session/').data['user']['username'], 'Alex')

    def test_login_with_email_starts_a_session(self):
        self.assertEqual(self.login('ALEX@example.com').status_code, status.HTTP_200_OK)
        self.assertEqual(self.client.get('/api/auth/session/').data['user']['id'], self.user.id)

    def test_login_opens_the_rest_of_the_api(self):
        self.assertEqual(self.client.get('/api/recipes/').status_code, status.HTTP_401_UNAUTHORIZED)
        self.login()
        self.assertEqual(self.client.get('/api/recipes/').status_code, status.HTTP_200_OK)

    def test_every_failed_login_looks_the_same(self):
        """Unknown account, wrong password and deactivated user must be indistinguishable."""
        User.objects.create_user(
            username='gone', email='gone@example.com', password='correct-horse', is_active=False,
        )
        attempts = [
            ('alex', 'wrong'), ('nobody', 'correct-horse'),
            ('nobody@example.com', 'correct-horse'), ('gone', 'correct-horse'),
        ]
        bodies = set()
        for identifier, password in attempts:
            with self.subTest(identifier=identifier):
                response = self.login(identifier, password)
                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
                bodies.add(str(response.data))
        self.assertEqual(len(bodies), 1)
        self.assertEqual(self.client.get('/api/auth/session/').data, {'user': None})

    def test_login_with_missing_or_malformed_fields_is_a_400(self):
        for body in [{}, {'identifier': 'alex'}, {'password': 'correct-horse'},
                     {'identifier': ['alex'], 'password': 'correct-horse'}]:
            with self.subTest(body=body):
                response = self.client.post('/api/auth/login/', body, format='json')
                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_response_never_includes_the_password(self):
        self.assertNotIn('password', str(self.login().data))

    def test_logout_ends_the_session(self):
        self.login()
        response = self.client.post('/api/auth/logout/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(self.client.get('/api/auth/session/').data, {'user': None})
        self.assertEqual(self.client.get('/api/recipes/').status_code, status.HTTP_401_UNAUTHORIZED)

    def test_logout_when_signed_out_is_not_an_error(self):
        self.assertEqual(self.client.post('/api/auth/logout/').status_code, status.HTTP_204_NO_CONTENT)

    def test_auth_responses_are_not_publicly_cacheable(self):
        self.login()
        response = self.client.get('/api/auth/session/')
        self.assertNotIn('public', response.get('Cache-Control', ''))
        self.assertIn('cookie', response.get('Vary', '').lower())


@fast_passwords
class AuthCsrfTests(APITestCase):
    """CSRF is enforced on login and logout, through the same proxy the browser uses."""

    ORIGIN = 'https://thebarcart.vercel.app'

    def setUp(self):
        self.client = APIClient(enforce_csrf_checks=True)
        User.objects.create_user(username='alex', email='alex@example.com', password='correct-horse')

    def post(self, path, body=None, token=None):
        extra = {'HTTP_X_CSRFTOKEN': token} if token else {}
        return self.client.post(path, body or {}, format='json', secure=True, HTTP_ORIGIN=self.ORIGIN, **extra)

    def csrf_token(self):
        return self.client.cookies['csrftoken'].value

    def credentials(self):
        return {'identifier': 'alex', 'password': 'correct-horse'}

    def test_session_endpoint_hands_out_the_csrf_cookie(self):
        self.assertNotIn('csrftoken', self.client.cookies)
        self.client.get('/api/auth/session/', secure=True)
        self.assertIn('csrftoken', self.client.cookies)

    def test_login_without_a_csrf_token_is_refused(self):
        self.client.get('/api/auth/session/', secure=True)
        response = self.post('/api/auth/login/', self.credentials())
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(self.client.get('/api/auth/session/', secure=True).data, {'user': None})

    def test_login_with_the_csrf_token_succeeds(self):
        self.client.get('/api/auth/session/', secure=True)
        response = self.post('/api/auth/login/', self.credentials(), token=self.csrf_token())
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_login_from_an_unlisted_origin_is_refused(self):
        self.client.get('/api/auth/session/', secure=True)
        response = self.client.post(
            '/api/auth/login/', self.credentials(), format='json', secure=True,
            HTTP_ORIGIN='https://evil.example', HTTP_X_CSRFTOKEN=self.csrf_token(),
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_logout_needs_the_token_issued_at_login(self):
        """Django rotates the CSRF token on login, so the frontend must re-read the cookie."""
        self.client.get('/api/auth/session/', secure=True)
        self.post('/api/auth/login/', self.credentials(), token=self.csrf_token())
        self.assertEqual(self.post('/api/auth/logout/').status_code, status.HTTP_403_FORBIDDEN)
        response = self.post('/api/auth/logout/', token=self.csrf_token())
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_a_csrf_failure_is_a_403_not_a_401(self):
        """The frontend treats 401 as "signed out"; a CSRF failure must not log anyone out."""
        self.client.get('/api/auth/session/', secure=True)
        self.post('/api/auth/login/', self.credentials(), token=self.csrf_token())
        response = self.post('/api/categories/', {'name': 'Gin'})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIsNotNone(self.client.get('/api/auth/session/', secure=True).data['user'])

    def test_writes_after_login_still_need_the_token(self):
        self.client.get('/api/auth/session/', secure=True)
        self.post('/api/auth/login/', self.credentials(), token=self.csrf_token())
        self.assertEqual(self.post('/api/categories/', {'name': 'Gin'}).status_code, status.HTTP_403_FORBIDDEN)
        response = self.post('/api/categories/', {'name': 'Gin'}, token=self.csrf_token())
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)


class PrepareUserIdentitiesMigrationTests(TransactionTestCase):
    """Migration 0002 readies existing users for the constraints in 0003.

    Runs the real migration against users created at the 0001 schema: what matters is what
    happens to a database that already has accounts in it.
    """

    BEFORE = [('accounts', '0001_initial')]
    AFTER = [('accounts', '0003_user_identity_constraints')]

    def setUp(self):
        self.executor = MigrationExecutor(connection)
        self.executor.migrate(self.BEFORE)
        self.OldUser = self.executor.loader.project_state(self.BEFORE).apps.get_model('accounts', 'User')

    def tearDown(self):
        # Leave the schema fully migrated for whatever test runs next. Flush first: users a
        # test left clashing would make the migration refuse to run here too.
        call_command('flush', verbosity=0, interactive=False)
        executor = MigrationExecutor(connection)
        executor.migrate(executor.loader.graph.leaf_nodes())

    def migrate(self):
        executor = MigrationExecutor(connection)
        executor.migrate(self.AFTER)
        return executor.loader.project_state(self.AFTER).apps.get_model('accounts', 'User')

    def test_existing_users_with_distinct_emails_are_untouched(self):
        self.OldUser.objects.create(username='admin', email='Admin@example.com')
        self.OldUser.objects.create(username='walkingtowork', email='me@example.com')
        NewUser = self.migrate()
        self.assertEqual(
            dict(NewUser.objects.values_list('username', 'email')),
            {'admin': 'Admin@example.com', 'walkingtowork': 'me@example.com'},
        )

    def test_blank_emails_get_a_placeholder(self):
        self.OldUser.objects.create(username='Admin')
        self.OldUser.objects.create(username='guest')
        NewUser = self.migrate()
        self.assertEqual(
            dict(NewUser.objects.values_list('username', 'email')),
            {'Admin': 'admin@placeholder.invalid', 'guest': 'guest@placeholder.invalid'},
        )

    def test_emails_differing_only_by_case_stop_the_migration_with_an_explanation(self):
        self.OldUser.objects.create(username='one', email='Sam@example.com')
        self.OldUser.objects.create(username='two', email='sam@example.com')
        with self.assertRaisesMessage(RuntimeError, 'same email once case is ignored: sam@example.com'):
            self.migrate()

    def test_usernames_differing_only_by_case_stop_the_migration_with_an_explanation(self):
        self.OldUser.objects.create(username='Sam', email='one@example.com')
        self.OldUser.objects.create(username='sam', email='two@example.com')
        with self.assertRaisesMessage(RuntimeError, 'same username once case is ignored: sam'):
            self.migrate()
