from collections import Counter

from django.db import migrations

# 0003 makes usernames and emails unique ignoring case and makes email required. This runs
# first so that a database which would break those rules fails here, with a message that
# says what to fix, instead of on a bare IntegrityError. Railway runs `migrate` in its start
# command, so either failure keeps the app from booting -- the difference is whether the
# log explains why.
#
# A blank email is filled in rather than refused: it is unambiguous, the placeholder can
# never receive mail (.invalid is reserved for exactly this), and the owner can replace it
# in the admin. A clash between two accounts cannot be settled automatically.


def prepare(apps, schema_editor):
    User = apps.get_model('accounts', 'User')

    for user in User.objects.filter(email=''):
        user.email = f'{user.username.lower()}@placeholder.invalid'
        user.save(update_fields=['email'])

    for field in ('username', 'email'):
        counts = Counter(value.lower() for value in User.objects.values_list(field, flat=True))
        clashes = sorted(value for value, count in counts.items() if count > 1)
        if clashes:
            raise RuntimeError(
                f"More than one user shares the same {field} once case is ignored: "
                f"{', '.join(clashes)}. Change or remove the duplicates in the Django "
                f"admin (or a shell) and run migrate again."
            )


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(prepare, migrations.RunPython.noop),
    ]
