"""Rate limits (15.0). The rates themselves live in settings.REST_FRAMEWORK.

Every limit here is per gunicorn worker, not global: see the note above the rates in
settings.py. Limits are keyed by `backend.client_ip.client_ip` for anonymous requests.
"""

import math

from django.conf import settings
from django.utils.cache import patch_cache_control
from rest_framework import exceptions, status
from rest_framework.throttling import AnonRateThrottle, SimpleRateThrottle, UserRateThrottle
from rest_framework.views import exception_handler as drf_exception_handler


class SignedInUserThrottle(UserRateThrottle):
    """The per-account limit for signed-in users, and only them.

    DRF's UserRateThrottle also counts anonymous requests by IP under the same rate, which
    would cap guests at the signed-in rate on top of the anonymous one.
    """

    def get_cache_key(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return None
        return super().get_cache_key(request, view)


class GuestOrderCreateThrottle(AnonRateThrottle):
    """Placing a guest order, per IP. Listing and cancelling fall under the general anon rate.

    A ceiling against a script on a leaked share link, not crowd control: a whole party shares
    one public IP, and the two-unserved-drinks rule (PR #28) is what limits each guest.
    """
    scope = 'guest_order_create'

    def allow_request(self, request, view):
        if request.method != 'POST':
            return True
        return super().allow_request(request, view)


class PasswordResetIPThrottle(AnonRateThrottle):
    """Asking for a reset link, per IP. Visible: going over is a 429."""
    scope = 'password_reset'


class PasswordResetAccountThrottle(SimpleRateThrottle):
    """Reset emails per account, checked by hand once the view has found the account.

    Deliberately silent: going over skips the email but answers exactly like any other
    request. A visible 429 here would only happen for real accounts, which would tell a
    stranger which emails and usernames exist.
    """
    scope = 'password_reset_account'

    def __init__(self, user):
        self.user = user
        super().__init__()

    def get_cache_key(self, request, view):
        return self.cache_format % {'scope': self.scope, 'ident': self.user.pk}


class CurrentPasswordThrottle(SimpleRateThrottle):
    """Current-password checks per account: changing the email or the password (14.0).

    The person already has a session, so this is what stops someone at an unlocked phone, or
    a script with a stolen session cookie, from guessing the password to take the account
    over. Every check counts, right or wrong. Visible: the 429 only ever reaches someone
    signed in to the account, so it reveals nothing. Checked by hand, like
    PasswordResetAccountThrottle, because a name or avatar edit does not check the password.
    """
    scope = 'current_password'

    def __init__(self, user):
        self.user = user
        super().__init__()

    def get_cache_key(self, request, view):
        return self.cache_format % {'scope': self.scope, 'ident': self.user.pk}


class LockedOut(exceptions.APIException):
    """A sign-in refused by django-axes: too many failures for this username from this IP."""
    status_code = status.HTTP_429_TOO_MANY_REQUESTS
    default_code = 'locked_out'

    def __init__(self):
        super().__init__(detail=str(settings.AXES_COOLOFF_MESSAGE))


def _wait_message(wait):
    if wait is None:
        return 'Too many requests. Please wait a little and try again.'
    minutes = math.ceil(wait / 60)
    if minutes <= 1:
        return 'Too many requests. Please wait a minute and try again.'
    return f'Too many requests. Please wait {minutes} minutes and try again.'


def exception_handler(exc, context):
    """DRF's handler, plus: a readable throttle message, and 429s are never cached.

    Vercel's CDN sits in front of the API. A cached 429 would turn one client's limit into
    everyone's, so every 429 says no-store, whichever view it came from.
    """
    if isinstance(exc, exceptions.Throttled):
        exc.detail = _wait_message(exc.wait)
    response = drf_exception_handler(exc, context)
    if response is not None and response.status_code == status.HTTP_429_TOO_MANY_REQUESTS:
        patch_cache_control(response, no_store=True, private=True)
    return response
