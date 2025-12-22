from django.db import models
from django.core.validators import MinValueValidator


# Unit choices for recipe ingredients
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


class IngredientCategory(models.Model):
    """Category model for organizing ingredients into groups."""
    name = models.CharField(max_length=200, unique=True)
    notes = models.TextField(blank=True, help_text="Optional notes about this category")

    class Meta:
        ordering = ['name']
        verbose_name_plural = 'Ingredient Categories'

    def __str__(self):
        return self.name


class Ingredient(models.Model):
    """Ingredient model representing a cocktail ingredient."""
    name = models.CharField(max_length=200, unique=True)
    category = models.ForeignKey(
        IngredientCategory,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='ingredients',
        help_text="Optional category this ingredient belongs to"
    )
    is_generic = models.BooleanField(
        default=False,
        help_text="True if this is the auto-created generic ingredient for a category"
    )

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class Recipe(models.Model):
    """Recipe model representing a cocktail recipe."""
    name = models.CharField(max_length=200)
    notes = models.TextField(blank=True)
    garnish = models.CharField(max_length=200, blank=True)
    source_url = models.URLField(blank=True, null=True, help_text="Optional URL to the recipe source")
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
    """Through model for Recipe-Ingredient many-to-many relationship.
    Stores the amount and unit for each ingredient in a recipe.
    """
    recipe = models.ForeignKey(Recipe, on_delete=models.CASCADE, related_name='recipe_ingredients')
    ingredient = models.ForeignKey(Ingredient, on_delete=models.CASCADE, related_name='recipe_ingredients')
    amount = models.FloatField(validators=[MinValueValidator(0.01)])  # Must be greater than 0
    unit = models.CharField(max_length=20, choices=UNIT_CHOICES)

    class Meta:
        unique_together = ['recipe', 'ingredient']
        ordering = ['recipe', 'ingredient']

    def __str__(self):
        return f"{self.amount} {self.unit} {self.ingredient.name} in {self.recipe.name}"
