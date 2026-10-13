from django.contrib import admin
from django import forms
from django.core.exceptions import ValidationError
from .models import (
    Ingredient, Recipe, RecipeIngredient, IngredientCategory,
    Menu, MenuItem, Order, BuyListItem,
)


class OwnedAdmin(admin.ModelAdmin):
    """Base for models that belong to a user: show the owner and filter by it.

    The API sets the owner from the session, but here the person at the keyboard is an
    administrator acting on somebody else's data -- the superuser owns nothing by design --
    so the owner is chosen explicitly in the form.
    """

    def get_list_display(self, request):
        return [*super().get_list_display(request), 'owner']

    def get_list_filter(self, request):
        return ['owner', *super().get_list_filter(request)]

    def get_list_select_related(self, request):
        return ['owner']


class RecipeIngredientInline(admin.TabularInline):
    """Inline admin for managing RecipeIngredients within Recipe admin."""
    model = RecipeIngredient
    extra = 1
    fields = ['ingredient', 'amount', 'unit']


@admin.register(Recipe)
class RecipeAdmin(OwnedAdmin):
    """Admin configuration for Recipe model."""
    list_display = ['name', 'garnish', 'ingredient_count']
    list_filter = ['garnish']
    search_fields = ['name', 'notes', 'garnish']
    inlines = [RecipeIngredientInline]
    fieldsets = (
        ('Basic Information', {
            'fields': ('owner', 'name', 'notes', 'garnish', 'source_url')
        }),
    )
    
    def ingredient_count(self, obj):
        """Display the number of ingredients in the recipe."""
        return obj.recipe_ingredients.count()
    ingredient_count.short_description = 'Ingredients'


@admin.register(Ingredient)
class IngredientAdmin(OwnedAdmin):
    """Admin configuration for Ingredient model."""
    list_display = ['name', 'category', 'is_generic', 'recipe_count']
    list_filter = ['category', 'is_generic']
    search_fields = ['name']
    ordering = ['name']
    fieldsets = (
        ('Basic Information', {
            'fields': ('owner', 'name', 'category', 'is_generic')
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
        fields = ['owner', 'name', 'notes', 'create_generic_ingredient']
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Don't show the checkbox for existing categories (only for new ones)
        if self.instance and self.instance.pk:
            self.fields['create_generic_ingredient'].widget = forms.HiddenInput()
            self.fields['create_generic_ingredient'].required = False


@admin.register(IngredientCategory)
class IngredientCategoryAdmin(OwnedAdmin):
    """Admin configuration for IngredientCategory model."""
    form = IngredientCategoryAdminForm
    list_display = ['name', 'ingredient_count', 'generic_ingredient_display']
    search_fields = ['name', 'notes']
    ordering = ['name']
    fieldsets = (
        ('Basic Information', {
            'fields': ('owner', 'name', 'notes', 'create_generic_ingredient')
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
            existing_ingredient = Ingredient.objects.filter(owner=obj.owner, name=obj.name).first()
            
            if existing_ingredient:
                # Link existing ingredient to category and mark as generic
                if existing_ingredient.category is None:
                    existing_ingredient.category = obj
                    existing_ingredient.is_generic = True
                    existing_ingredient.save()
            else:
                # Create new generic ingredient
                Ingredient.objects.create(
                    owner=obj.owner,
                    name=obj.name,
                    category=obj,
                    is_generic=True
                )
        elif change and 'name' in form.changed_data:
            # Update generic ingredient name if category name changed
            generic_ingredient = Ingredient.objects.filter(
                owner=obj.owner,
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


# Menu, MenuItem, Order and BuyListItem were never registered here, so the only way to
# manage them was the API. Now that anonymous writes are refused, admin is the only way to
# edit them until the real auth UI lands -- and task 8.12 needs them registered anyway, to
# expose and filter by owner once ownership exists.

class MenuItemInline(admin.TabularInline):
    """Manage a menu's drinks inline, in their display order."""
    model = MenuItem
    extra = 1
    fields = ['recipe', 'order']
    ordering = ['order']


@admin.register(Menu)
class MenuAdmin(OwnedAdmin):
    """Admin configuration for Menu."""
    list_display = ['name', 'is_active', 'is_published', 'item_count', 'created_at']
    list_filter = ['is_active', 'is_published', 'created_at']
    search_fields = ['name', 'theme_notes']
    inlines = [MenuItemInline]
    # share_token is editable=False on the model, so it can only be displayed, never edited.
    readonly_fields = ['share_token', 'created_at', 'updated_at']
    fieldsets = (
        ('Basic Information', {
            'fields': ('owner', 'name', 'is_active', 'is_published')
        }),
        ('Decoration', {
            'fields': ('top_decoration', 'bottom_decoration', 'theme_notes')
        }),
        ('Sharing', {
            'fields': ('share_token',),
            'description': 'The public menu lives at /share/&lt;share token&gt; on the frontend.',
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )

    def item_count(self, obj):
        """Display how many drinks are on this menu."""
        return obj.items.count()
    item_count.short_description = 'Drinks'


@admin.register(MenuItem)
class MenuItemAdmin(admin.ModelAdmin):
    """Admin configuration for MenuItem (usually managed inline from Menu)."""
    list_display = ['menu', 'recipe', 'order']
    list_filter = ['menu']
    search_fields = ['menu__name', 'recipe__name']
    ordering = ['menu', 'order']


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    """Admin configuration for Order.

    Guest names are self-entered and not unique, so two guests who both type 'Sam'
    are indistinguishable here, exactly as in the menu stats page.
    """
    list_display = ['guest_name', 'recipe', 'menu', 'is_fulfilled', 'created_at']
    list_filter = ['is_fulfilled', 'menu', 'created_at']
    search_fields = ['guest_name', 'recipe__name']
    ordering = ['-created_at']
    readonly_fields = ['created_at']


@admin.register(BuyListItem)
class BuyListItemAdmin(OwnedAdmin):
    """Admin configuration for BuyListItem."""
    list_display = ['ingredient', 'added_at']
    search_fields = ['ingredient__name', 'notes']
    ordering = ['-added_at']
    readonly_fields = ['added_at']
