import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models

# Ownership, final phase: every row must have an owner, and names are unique per owner
# rather than across the whole database.
#
# 0012 has just assigned an owner to any row that lacked one. That backfill is its own
# migration on purpose: Postgres refuses to ALTER a table in the transaction that updated
# its rows ("pending trigger events"), so the data change and the schema change cannot
# share one.
#
# If a row somehow still has no owner, SET NOT NULL fails and the whole migration rolls
# back, leaving the schema as 0012 left it.

OWNED = {
    'ingredientcategory': 'ingredient_categories',
    'ingredient': 'ingredients',
    'recipe': 'recipes',
    'menu': 'menus',
    'buylistitem': 'buy_list_items',
}


def require_owner(model_name, related_name):
    return migrations.AlterField(
        model_name=model_name,
        name='owner',
        field=models.ForeignKey(
            on_delete=django.db.models.deletion.PROTECT,
            related_name=related_name,
            to=settings.AUTH_USER_MODEL,
        ),
    )


def name_unique_per_owner(model_name):
    # Add the per-owner constraint before dropping the global one, so there is no moment
    # at which duplicate names are allowed.
    return [
        migrations.AddConstraint(
            model_name=model_name,
            constraint=models.UniqueConstraint(
                fields=('owner', 'name'), name=f'{model_name}_unique_name_per_owner',
            ),
        ),
        migrations.AlterField(
            model_name=model_name,
            name='name',
            field=models.CharField(max_length=200),
        ),
    ]


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('cocktails', '0012_backfill_owner_again'),
    ]

    operations = [
        *[require_owner(model_name, related_name) for model_name, related_name in OWNED.items()],
        *name_unique_per_owner('ingredientcategory'),
        *name_unique_per_owner('ingredient'),
    ]
