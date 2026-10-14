import secrets

from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.core.validators import RegexValidator
from django.db import models
from django.db.models.functions import Lower
from django.utils import timezone

# Letters and numbers only. Nothing in a username can look like an email address, so a
# typed login containing "@" is always an email and anything else is always a username.
username_validator = RegexValidator(
    r'^[A-Za-z0-9]+\Z',
    'Enter a username using letters and numbers only.',
)


class User(AbstractUser):
    """
    Custom User model extending Django's AbstractUser.

    A user signs in with either their username or their email (see `accounts.backends`),
    so both are required and both are unique ignoring case: "Alex" and "alex" are the
    same person, as are "Alex@example.com" and "alex@example.com".
    """
    username = models.CharField(
        max_length=150,
        unique=True,
        validators=[username_validator],
        help_text='Required. Letters and numbers only.',
        error_messages={'unique': 'A user with that username already exists.'},
    )
    email = models.EmailField('email address')
    fullname = models.CharField(max_length=150, blank=True, help_text="User's full name")

    class Meta:
        verbose_name = "User"
        verbose_name_plural = "Users"
        constraints = [
            models.UniqueConstraint(
                Lower('username'),
                name='accounts_user_username_ci_unique',
                violation_error_message='A user with that username already exists.',
            ),
            models.UniqueConstraint(
                Lower('email'),
                name='accounts_user_email_ci_unique',
                violation_error_message='A user with that email address already exists.',
            ),
            models.CheckConstraint(
                check=~models.Q(email=''),
                name='accounts_user_email_not_blank',
                violation_error_message='An email address is required.',
            ),
        ]

    def __str__(self):
        """Return a string representation of the user."""
        return self.username


def new_invite_token():
    return secrets.token_urlsafe(32)


class Invite(models.Model):
    """A one-time link that lets one person create an account. There is no other signup.

    The token is the whole credential: whoever holds the link may sign up once, before it
    expires. It is stored as-is rather than hashed so the admin can show the link again.
    """
    token = models.CharField(max_length=64, unique=True, default=new_invite_token, editable=False)
    note = models.CharField(
        max_length=100, blank=True,
        help_text='Who this is for, so you can tell invites apart. Not shown to them.',
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='invites_created',
        null=True, blank=True, editable=False,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    used_at = models.DateTimeField(null=True, blank=True, editable=False)
    used_by = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, related_name='invite',
        null=True, blank=True, editable=False,
    )

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.note or f'Invite {self.pk}'

    @property
    def url(self):
        return f'{settings.SITE_URL}/invite/{self.token}'

    def unusable_reason(self):
        """Why this invite can't be used, or None if it can."""
        if self.used_at is not None:
            return 'This invite has already been used.'
        if self.expires_at <= timezone.now():
            return 'This invite has expired.'
        return None
