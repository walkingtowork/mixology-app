from axes.backends import AxesStandaloneBackend
from django.contrib.auth import get_user_model
from django.contrib.auth.backends import ModelBackend


def find_user(identifier):
    """The account an email or username names, ignoring case and surrounding spaces, or None.

    Usernames cannot contain "@" (see `accounts.models.username_validator`), so the typed
    value says which one it is and the two can never be confused.
    """
    User = get_user_model()
    lookup = 'email__iexact' if '@' in identifier else 'username__iexact'
    try:
        return User._default_manager.get(**{lookup: identifier.strip()})
    except User.DoesNotExist:
        return None


class EmailOrUsernameBackend(ModelBackend):
    """Sign in with either a username or an email address, ignoring case.

    This is the only backend that checks passwords, so the Django admin login accepts either
    as well. `LoginLockoutBackend` runs before it.
    """

    def authenticate(self, request, username=None, password=None, **kwargs):
        if username is None or password is None:
            return None
        user = find_user(username)
        if user is None:
            # Hash the password anyway, so a miss takes as long as a wrong password and
            # response time does not reveal which accounts exist.
            get_user_model()().set_password(password)
            return None
        if user.check_password(password) and self.user_can_authenticate(user):
            return user
        return None


class LoginLockoutBackend(AxesStandaloneBackend):
    """django-axes's lockout check (15.3), first in AUTHENTICATION_BACKENDS.

    It never signs anyone in. It refuses a username + IP that is locked out, before any
    password is checked. Both ways in pass the request: the API's LoginView and the Django
    admin login. Without a request there is no IP to lock on, and stock axes raises. The only
    callers without one are server-side code and the test client's `login()`, which nobody
    outside can reach, so those pass straight through to the password check.
    """

    def authenticate(self, request, username=None, password=None, **kwargs):
        if request is None:
            return None
        return super().authenticate(request, username=username, password=password, **kwargs)


def lockout_username(request, credentials):
    """The name axes records failures under (AXES_USERNAME_CALLABLE).

    Login accepts an email or a username in any case, so axes would otherwise see "Sam",
    "sam" and "sam@example.com" as three people and allow five tries for each. Every
    spelling of an existing account maps to its lowercased username. Anything that names no
    account is recorded as typed (trimmed, lowercased), so lockout behaves the same either
    way and does not reveal which accounts exist.
    """
    identifier = (credentials or {}).get('username')
    if not isinstance(identifier, str):
        return None
    user = find_user(identifier)
    return (user.username if user else identifier.strip()).lower()
