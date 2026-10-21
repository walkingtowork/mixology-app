from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from cocktails.models import (
    BuyListItem, Ingredient, IngredientCategory, Menu, MenuItem, Recipe, RecipeIngredient,
)


class Command(BaseCommand):
    """Copy one user's bar (categories, ingredients, recipes, menus, buy list) to another.

    Made for a demo account to test against without touching real data. Every row read is
    filtered by the source owner, and every copy points only at other copies, never back
    at the source's rows. Menus get fresh share tokens, so the copy never answers the
    source's public links. Guest orders are not copied.
    """

    help = "Copy one user's recipes, ingredients, menus and buy list to another user."

    def add_arguments(self, parser):
        parser.add_argument('source', help='Username to copy from')
        parser.add_argument('target', help='Username to copy to')
        parser.add_argument(
            '--reset', action='store_true',
            help="Delete the target's existing bar data (including its menus' orders) first",
        )

    def handle(self, source, target, reset, **options):
        User = get_user_model()
        source_user = self.get_user(User, source)
        target_user = self.get_user(User, target)
        if source_user == target_user:
            raise CommandError('Source and target are the same user.')
        if target_user.is_superuser or target_user.is_staff:
            raise CommandError(f'Refusing to overwrite staff account "{target_user.username}".')

        with transaction.atomic():
            if reset:
                self.delete_bar(target_user)
            elif self.has_bar(target_user):
                raise CommandError(
                    f'"{target_user.username}" already has data. Use --reset to replace it.'
                )
            counts = self.copy_bar(source_user, target_user)

        summary = ', '.join(f'{n} {label}' for label, n in counts.items())
        self.stdout.write(self.style.SUCCESS(
            f'Copied {summary} from {source_user.username} to {target_user.username}.'
        ))

    def get_user(self, User, username):
        try:
            return User.objects.get(username__iexact=username)
        except User.DoesNotExist:
            raise CommandError(f'No user "{username}".')

    def has_bar(self, user):
        return any(
            model.objects.filter(owner=user).exists()
            for model in (IngredientCategory, Ingredient, Recipe, Menu, BuyListItem)
        )

    def delete_bar(self, user):
        # Children first: owner FKs are PROTECT, and menus cascade to their items and orders.
        for model in (Menu, BuyListItem, Recipe, Ingredient, IngredientCategory):
            model.objects.filter(owner=user).delete()

    def copy_bar(self, source, target):
        categories = {}
        for category in IngredientCategory.objects.filter(owner=source):
            categories[category.pk] = IngredientCategory.objects.create(
                owner=target, name=category.name, notes=category.notes,
            )

        ingredients = {}
        for ingredient in Ingredient.objects.filter(owner=source):
            ingredients[ingredient.pk] = Ingredient.objects.create(
                owner=target,
                name=ingredient.name,
                category=categories.get(ingredient.category_id),
                is_generic=ingredient.is_generic,
                stock_level=ingredient.stock_level,
            )

        recipes = {}
        for recipe in Recipe.objects.filter(owner=source):
            recipes[recipe.pk] = Recipe.objects.create(
                owner=target,
                name=recipe.name,
                description=recipe.description,
                notes=recipe.notes,
                garnish=recipe.garnish,
                glass=recipe.glass,
                source_url=recipe.source_url,
            )
        RecipeIngredient.objects.bulk_create(
            RecipeIngredient(
                recipe=recipes[ri.recipe_id],
                ingredient=ingredients[ri.ingredient_id],
                amount=ri.amount,
                unit=ri.unit,
            )
            for ri in RecipeIngredient.objects.filter(recipe__owner=source)
        )

        menus = {}
        for menu in Menu.objects.filter(owner=source):
            # share_token is left to its default, so the copy gets a new one.
            menus[menu.pk] = Menu.objects.create(
                owner=target,
                name=menu.name,
                is_active=menu.is_active,
                is_published=menu.is_published,
                theme_notes=menu.theme_notes,
                top_decoration=menu.top_decoration,
                bottom_decoration=menu.bottom_decoration,
            )
        menu_items = MenuItem.objects.bulk_create(
            MenuItem(menu=menus[item.menu_id], recipe=recipes[item.recipe_id], order=item.order)
            for item in MenuItem.objects.filter(menu__owner=source)
        )

        buy_list = BuyListItem.objects.bulk_create(
            BuyListItem(owner=target, ingredient=ingredients[item.ingredient_id], notes=item.notes)
            for item in BuyListItem.objects.filter(owner=source)
        )

        return {
            'categories': len(categories),
            'ingredients': len(ingredients),
            'recipes': len(recipes),
            'menus': len(menus),
            'menu items': len(menu_items),
            'buy list items': len(buy_list),
        }
