import uuid
from django.conf import settings
from django.db import models
from django.core.validators import MinValueValidator


GLASS_CHOICES = [
    ('rocks', 'Rocks'),
    ('old_fashioned', 'Old Fashioned'),
    ('martini', 'Martini'),
    ('coupe', 'Coupe'),
    ('champagne_flute', 'Champagne Flute'),
    ('collins', 'Collins'),
    ('shot', 'Shot'),
    ('glencairn', 'Glencairn'),
    ('hurricane', 'Hurricane'),
    ('tiki_mug', 'Tiki Mug'),
]

DECORATION_CHOICES = [
    ('none', 'None'),
    ('ume', 'Ume Blossom Branch'),
    ('taco', 'Taco'),
    ('maple', 'Maple Branch'),
    ('acorn', 'Acorns & Oak'),
    ('pumpkin', 'Pumpkins'),
    ('wheat', 'Wheat & Dried Grass'),
    ('ghost', 'Little Ghost'),
    ('black_cat', 'Black Cat & Moon'),
    ('cobweb', 'Cobweb & Spider'),
    ('bats', 'Bats & Moon'),
]

UNIT_CHOICES = [
    ('oz', 'oz'),
    ('ml', 'ml'),
    ('tsp', 'tsp'),
    ('tbsp', 'tbsp'),
    ('barspoon', 'barspoon'),
    ('dash', 'dash'),
    ('drops', 'drops'),
    ('spritz', 'spritz'),
    ('rinse', 'rinse'),
    ('pinch', 'pinch'),
]

def unique_name_per_owner(model_name):
    """Names are unique within one user's data, not across users: two people can both
    have "Rum"."""
    return models.UniqueConstraint(
        fields=['owner', 'name'], name=f'{model_name}_unique_name_per_owner',
    )


def owner_field(related_name):
    """The user a row belongs to.

    Required: every row belongs to exactly one user, every query is scoped by it, and
    nothing is shared between accounts.

    PROTECT, not CASCADE or SET_NULL: deleting a user must never silently take their
    recipes and a menu's order history with it, nor leave rows that belong to nobody.
    Removing an account that still owns data is refused until the data is dealt with.
    """
    return models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name=related_name,
    )


STOCK_LEVEL_CHOICES = [
    (0,   '0%'),
    (25,  '25%'),
    (50,  '50%'),
    (75,  '75%'),
    (100, '100%'),
]


class IngredientCategory(models.Model):
    owner = owner_field('ingredient_categories')
    name = models.CharField(max_length=200)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['name']
        verbose_name_plural = 'Ingredient Categories'
        constraints = [unique_name_per_owner('ingredientcategory')]

    def __str__(self):
        return self.name


class Ingredient(models.Model):
    owner = owner_field('ingredients')
    name = models.CharField(max_length=200)
    category = models.ForeignKey(
        IngredientCategory,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='ingredients',
    )
    is_generic = models.BooleanField(default=False)
    stock_level = models.IntegerField(
        choices=STOCK_LEVEL_CHOICES,
        default=100,
    )

    class Meta:
        ordering = ['name']
        constraints = [unique_name_per_owner('ingredient')]

    def __str__(self):
        return self.name


class Recipe(models.Model):
    owner = owner_field('recipes')
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    garnish = models.CharField(max_length=200, blank=True)
    glass = models.CharField(max_length=20, choices=GLASS_CHOICES, blank=True)
    source_url = models.URLField(blank=True, null=True)
    ingredients = models.ManyToManyField(
        Ingredient,
        through='RecipeIngredient',
        related_name='recipes'
    )

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class RecipeIngredient(models.Model):
    recipe = models.ForeignKey(Recipe, on_delete=models.CASCADE, related_name='recipe_ingredients')
    ingredient = models.ForeignKey(Ingredient, on_delete=models.CASCADE, related_name='recipe_ingredients')
    amount = models.FloatField(validators=[MinValueValidator(0.01)])
    unit = models.CharField(max_length=20, choices=UNIT_CHOICES)

    class Meta:
        unique_together = ['recipe', 'ingredient']
        ordering = ['recipe', 'ingredient']

    def __str__(self):
        return f"{self.amount} {self.unit} {self.ingredient.name} in {self.recipe.name}"


class Menu(models.Model):
    owner = owner_field('menus')
    name = models.CharField(max_length=200)
    is_active = models.BooleanField(default=False)
    is_published = models.BooleanField(default=False)
    share_token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    theme_notes = models.TextField(blank=True)
    top_decoration = models.CharField(
        max_length=32, choices=DECORATION_CHOICES, default='none'
    )
    bottom_decoration = models.CharField(
        max_length=32, choices=DECORATION_CHOICES, default='none'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        # One active menu per owner: activating this one must not switch off anybody else's.
        if self.is_active:
            Menu.objects.filter(owner=self.owner).exclude(pk=self.pk).update(is_active=False)
        super().save(*args, **kwargs)


# MenuItem and Order have no owner of their own: they belong to whoever owns their menu.
class MenuItem(models.Model):
    menu = models.ForeignKey(Menu, on_delete=models.CASCADE, related_name='items')
    recipe = models.ForeignKey(Recipe, on_delete=models.CASCADE, related_name='menu_items')
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order']
        unique_together = [('menu', 'recipe')]

    def __str__(self):
        return f"{self.recipe.name} on {self.menu.name}"


class Order(models.Model):
    recipe = models.ForeignKey(Recipe, on_delete=models.CASCADE, related_name='orders')
    menu = models.ForeignKey(Menu, on_delete=models.CASCADE, related_name='orders')
    guest_name = models.CharField(max_length=100)
    is_fulfilled = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"{self.guest_name} ordered {self.recipe.name}"


class BuyListItem(models.Model):
    owner = owner_field('buy_list_items')
    ingredient = models.OneToOneField(
        Ingredient,
        on_delete=models.CASCADE,
        related_name='buy_list_item',
    )
    notes = models.TextField(blank=True)
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-added_at']

    def __str__(self):
        return f"Buy: {self.ingredient.name}"
