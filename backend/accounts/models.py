from django.contrib.auth.models import AbstractUser
from django.core.validators import RegexValidator
from django.db import models
from django.db.models.functions import Lower

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
