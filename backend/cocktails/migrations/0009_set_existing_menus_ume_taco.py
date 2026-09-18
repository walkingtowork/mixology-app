from django.db import migrations


def set_existing_decorations(apps, schema_editor):
    """Preserve how menus already look.

    Decorations used to be hardcoded in PublicMenu.tsx, so every existing menu
    renders the ume branch top-left and the taco bottom-right. The new fields
    default to 'none' for menus created from here on, so without this backfill
    every already-published share link would silently lose its artwork.
    """
    Menu = apps.get_model('cocktails', 'Menu')
    Menu.objects.all().update(top_decoration='ume', bottom_decoration='taco')


def unset_decorations(apps, schema_editor):
    Menu = apps.get_model('cocktails', 'Menu')
    Menu.objects.all().update(top_decoration='none', bottom_decoration='none')


class Migration(migrations.Migration):

    dependencies = [
        ('cocktails', '0008_menu_bottom_decoration_menu_top_decoration'),
    ]

    operations = [
        migrations.RunPython(set_existing_decorations, unset_decorations),
    ]
