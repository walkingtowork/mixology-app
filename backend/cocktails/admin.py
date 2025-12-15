from django.contrib import admin
from django import forms
from django.core.exceptions import ValidationError
from .models import Ingredient, Recipe, RecipeIngredient, IngredientCategory


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
            'fields': ('name', 'notes', 'garnish', 'source_url')
        }),
    )
    
    def ingredient_count(self, obj):
        """Display the number of ingredients in the recipe."""
        return obj.recipe_ingredients.count()
    ingredient_count.short_description = 'Ingredients'


@admin.register(Ingredient)
class IngredientAdmin(admin.ModelAdmin):
    """Admin configuration for Ingredient model."""
    list_display = ['name', 'category', 'is_generic', 'recipe_count']
    list_filter = ['category', 'is_generic']
    search_fields = ['name']
    ordering = ['name']
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'category', 'is_generic')
        }),
    )
    
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


class IngredientCategoryAdminForm(forms.ModelForm):
    """Custom form for IngredientCategory with auto-create generic ingredient option."""
    create_generic_ingredient = forms.BooleanField(
        label='Create generic ingredient',
        required=False,
        initial=True,
        help_text='Automatically create an ingredient with the same name as this category'
    )
    
    class Meta:
        model = IngredientCategory
        fields = ['name', 'notes', 'create_generic_ingredient']
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Don't show the checkbox for existing categories (only for new ones)
        if self.instance and self.instance.pk:
            self.fields['create_generic_ingredient'].widget = forms.HiddenInput()
            self.fields['create_generic_ingredient'].required = False


@admin.register(IngredientCategory)
class IngredientCategoryAdmin(admin.ModelAdmin):
    """Admin configuration for IngredientCategory model."""
    form = IngredientCategoryAdminForm
    list_display = ['name', 'ingredient_count', 'generic_ingredient_display']
    search_fields = ['name', 'notes']
    ordering = ['name']
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'notes', 'create_generic_ingredient')
        }),
    )
    
    def ingredient_count(self, obj):
        """Display the number of ingredients in this category."""
        return obj.ingredients.count()
    ingredient_count.short_description = 'Ingredients'
    
    def generic_ingredient_display(self, obj):
        """Display the generic ingredient name if it exists."""
        generic = Ingredient.objects.filter(category=obj, is_generic=True).first()
        if generic:
            return generic.name
        return '—'
    generic_ingredient_display.short_description = 'Generic Ingredient'
    
    def save_model(self, request, obj, form, change):
        """Override save to handle auto-creation of generic ingredient."""
        # Get the create_generic_ingredient flag
        create_generic = form.cleaned_data.get('create_generic_ingredient', True)
        
        # Save the category first
        super().save_model(request, obj, form, change)
        
        # Auto-create generic ingredient if requested and this is a new category
        if not change and create_generic:
            # Check if an ingredient with the same name already exists
            existing_ingredient = Ingredient.objects.filter(name=obj.name).first()
            
            if existing_ingredient:
                # Link existing ingredient to category and mark as generic
                if existing_ingredient.category is None:
                    existing_ingredient.category = obj
                    existing_ingredient.is_generic = True
                    existing_ingredient.save()
            else:
                # Create new generic ingredient
                Ingredient.objects.create(
                    name=obj.name,
                    category=obj,
                    is_generic=True
                )
        elif change and 'name' in form.changed_data:
            # Update generic ingredient name if category name changed
            generic_ingredient = Ingredient.objects.filter(
                category=obj,
                is_generic=True
            ).first()
            
            if generic_ingredient:
                generic_ingredient.name = obj.name
                generic_ingredient.save()
    
    def delete_model(self, request, obj):
        """Override delete to check for recipe usage."""
        # Check if any recipes use ingredients from this category
        ingredients_in_category = Ingredient.objects.filter(category=obj)
        recipes_using_category = RecipeIngredient.objects.filter(
            ingredient__in=ingredients_in_category
        ).exists()
        
        if recipes_using_category:
            raise ValidationError(
                f"Cannot delete category '{obj.name}' because it is used in one or more recipes. "
                "Please remove all recipes using ingredients from this category before deleting."
            )
        
        super().delete_model(request, obj)
