"""Password reset links, using Django's own token machinery.

A link carries the user's id and a token signed with SECRET_KEY over their password hash,
last login and the time it was made. So it stops working once it is used (the hash changes),
once they sign in (last login changes), or after PASSWORD_RESET_TIMEOUT. Nothing is stored.
"""
from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode

from .models import User


def can_reset(user):
    """Deactivated accounts, and ones with no password to replace, get no links."""
    return user.is_active and user.has_usable_password()


def reset_url(user):
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    return f'{settings.SITE_URL}/reset-password/{uid}/{token}'


def user_for_link(uidb64, token):
    """The user a reset link is for, or None if the link is malformed, used or expired."""
    try:
        user = User.objects.get(pk=force_str(urlsafe_base64_decode(uidb64)))
    except (ValueError, OverflowError, User.DoesNotExist):
        return None
    if can_reset(user) and default_token_generator.check_token(user, token):
        return user
    return None


def send_reset_email(user):
    send_mail(
        subject='Reset your Bar Cart password',
        message=(
            f'Hi {user.username},\n\n'
            f'Someone asked to reset the password for your Bar Cart account. To choose a new '
            f'one, open this link:\n\n{reset_url(user)}\n\n'
            f"It works once, for three days. If you didn't ask, you can ignore this email "
            f'and your password stays as it is.\n'
        ),
        from_email=None,
        recipient_list=[user.email],
    )


def emails_are_delivered():
    """False while email only goes to the log, so the app can say to ask for a link instead."""
    return settings.EMAIL_BACKEND != 'django.core.mail.backends.console.EmailBackend'
