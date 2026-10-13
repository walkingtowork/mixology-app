import os

from django.conf import settings
from django.db import migrations

# Every row that existed before accounts did belongs to the app's original, single user.
#
# That is the dedicated day-to-day account, NOT the superuser: the superuser administers
# and owns nothing. It is looked up by username rather than a hardcoded id (ids differ
# between databases) or an email address (this repository is public).
#
# A database whose original user has a different name -- a local dev copy, say -- can
# override it:  BACKFILL_OWNER_USERNAME=admin python manage.py migrate
OWNER_USERNAME = os.environ.get('BACKFILL_OWNER_USERNAME', 'walkingtowork')

OWNED_MODELS = ['IngredientCategory', 'Ingredient', 'Recipe', 'Menu', 'BuyListItem']


def backfill_owner(apps, schema_editor):
    unowned = [
        apps.get_model('cocktails', name).objects.filter(owner__isnull=True)
        for name in OWNED_MODELS
    ]
    # A fresh database (CI, a new checkout) has nothing to assign and needs no account.
    if not any(queryset.exists() for queryset in unowned):
        return

    app_label, model_name = settings.AUTH_USER_MODEL.split('.')
    owner = apps.get_model(app_label, model_name).objects.filter(username=OWNER_USERNAME).first()
    if owner is None:
        # Fail rather than skip. A skipped backfill would be recorded as applied and
        # leave ownerless rows behind for the NOT NULL migration to trip over later.
        raise RuntimeError(
            f"Cannot backfill ownership: no user named {OWNER_USERNAME!r}, and there are "
            "rows that need an owner. Create that user, or name an existing one with "
            "BACKFILL_OWNER_USERNAME=<username> and run migrate again."
        )

    for queryset in unowned:
        queryset.update(owner=owner)


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('cocktails', '0010_add_nullable_owner'),
    ]

    operations = [
        # Reversing is a no-op: unapplying 0010 drops the column along with its contents.
        migrations.RunPython(backfill_owner, migrations.RunPython.noop),
    ]
