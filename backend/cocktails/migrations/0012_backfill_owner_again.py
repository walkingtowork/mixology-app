from importlib import import_module

from django.conf import settings
from django.db import migrations

# Nothing set `owner` on create until this release, so any row added since 0011 ran has
# none. Hand those to the original user too, with the same rules as before -- 0011's
# function only touches rows where owner IS NULL and honours BACKFILL_OWNER_USERNAME.
#
# Separate from 0013, which makes the column NOT NULL: Postgres will not ALTER a table in
# the same transaction that updated its rows.
backfill_owner = import_module('cocktails.migrations.0011_backfill_owner').backfill_owner


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('cocktails', '0011_backfill_owner'),
    ]

    operations = [
        migrations.RunPython(backfill_owner, migrations.RunPython.noop),
    ]
