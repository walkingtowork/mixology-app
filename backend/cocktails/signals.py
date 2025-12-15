from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import IngredientCategory


@receiver(post_save, sender=IngredientCategory)
def create_generic_ingredient(sender, instance, created, **kwargs):
    """
    Auto-create a generic ingredient when a category is created.
    This is handled via the admin form or API, not automatically on save.
    The actual creation logic will be in the admin form and API serializer.
    """
    # This signal is a placeholder - actual logic will be in admin form and serializer
    pass
