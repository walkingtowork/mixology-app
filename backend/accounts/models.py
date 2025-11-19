from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """
    Custom User model extending Django's AbstractUser.
    Adds a fullname field while inheriting all standard user fields.
    """
    fullname = models.CharField(max_length=150, blank=True, help_text="User's full name")

    class Meta:
        verbose_name = "User"
        verbose_name_plural = "Users"

    def __str__(self):
        """Return a string representation of the user."""
        if self.fullname:
            return f"{self.fullname} ({self.username})"
        return self.username
