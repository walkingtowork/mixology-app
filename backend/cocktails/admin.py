from django.contrib import admin
from .models import Ingredient, Recipe, RecipeIngredient


class RecipeIngredientInline(admin.TabularInline):
    """Inline admin for managing RecipeIngredients within Recipe admin."""
    model = RecipeIngredient
    extra = 1
    fields = ['ingredient', 'amount', 'unit']


@admin.register(Recipe)
class RecipeAdmin(admin.ModelAdmin):
    """Admin configuration for Recipe model."""
    list_display = ['name', 'garnish', 'ingredient_count']
    list_filter = ['garnish']
    search_fields = ['name', 'notes', 'garnish']
    inlines = [RecipeIngredientInline]
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'notes', 'garnish')
        }),
    )
    
    def ingredient_count(self, obj):
        """Display the number of ingredients in the recipe."""
        return obj.recipe_ingredients.count()
    ingredient_count.short_description = 'Ingredients'


@admin.register(Ingredient)
class IngredientAdmin(admin.ModelAdmin):
    """Admin configuration for Ingredient model."""
    list_display = ['name', 'recipe_count']
    search_fields = ['name']
    ordering = ['name']
    
    def recipe_count(self, obj):
        """Display the number of recipes using this ingredient."""
        return obj.recipes.count()
    recipe_count.short_description = 'Used in Recipes'


# Optionally register RecipeIngredient for direct management
@admin.register(RecipeIngredient)
class RecipeIngredientAdmin(admin.ModelAdmin):
    """Admin configuration for RecipeIngredient model (optional direct management)."""
    list_display = ['recipe', 'ingredient', 'amount', 'unit']
    list_filter = ['unit', 'recipe', 'ingredient']
    search_fields = ['recipe__name', 'ingredient__name']
    ordering = ['recipe', 'ingredient']
