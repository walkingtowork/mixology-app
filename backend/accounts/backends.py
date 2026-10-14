from django.contrib.auth import get_user_model
from django.contrib.auth.backends import ModelBackend


class EmailOrUsernameBackend(ModelBackend):
    """Sign in with either a username or an email address, ignoring case.

    Usernames cannot contain "@" (see `accounts.models.username_validator`), so the typed
    value says which one it is and the two can never be confused. This is the only
    authentication backend, so the Django admin login accepts either as well.
    """

    def authenticate(self, request, username=None, password=None, **kwargs):
        if username is None or password is None:
            return None
        User = get_user_model()
        lookup = 'email__iexact' if '@' in username else 'username__iexact'
        try:
            user = User._default_manager.get(**{lookup: username.strip()})
        except User.DoesNotExist:
            # Hash the password anyway, so a miss takes as long as a wrong password and
            # response time does not reveal which accounts exist.
            User().set_password(password)
            return None
        if user.check_password(password) and self.user_can_authenticate(user):
            return user
        return None
