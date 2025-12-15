from django.apps import AppConfig


class CocktailsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'cocktails'
    
    def ready(self):
        """Import signals when the app is ready."""
        import cocktails.signals  # noqa
