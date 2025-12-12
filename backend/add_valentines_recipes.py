#!/usr/bin/env python
"""
Script to add Valentine's Party drink recipes to the database.
Run from backend directory: python add_valentines_recipes.py
"""
import os
import sys
import django

# Setup Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from cocktails.models import Ingredient, Recipe, RecipeIngredient

# Recipe data for Valentine's Party menu
recipes_data = [
    {
        'name': '21st Century',
        'garnish': '',
        'notes': 'Stir 10s, strain into glass',
        'source_url': '',
        'ingredients': [
            ('Tequila', 2, 'oz'),
            ('Creme de Cacao', 0.75, 'oz'),
            ('Lemon Juice', 0.75, 'oz'),
            ('Absinthe', 1, 'spritz'),
        ]
    },
    {
        'name': 'Espresso Martini (Chartreuse)',
        'garnish': '',
        'notes': 'Shake, double strain. Put espresso in freezer to chill',
        'source_url': '',
        'ingredients': [
            ('Espresso', 1, 'oz'),
            ('Vodka', 2, 'oz'),
            ('Coffee liqueur', 0.5, 'oz'),
            ('Simple syrup', 0.25, 'oz'),
            ('Chartreuse Bitters', 1, 'dash'),
        ]
    },
    {
        'name': 'Sazerac',
        'garnish': '',
        'notes': 'Can alternatively use a single sugar cube instead of 1 tsp sugar',
        'source_url': '',
        'ingredients': [
            ('Rye Whiskey', 2.5, 'oz'),
            ('Absinthe', 1, 'spritz'),
            ('Sugar', 1, 'tsp'),
            ('Cold water', 0.5, 'tsp'),
            ('Angostura Bitters', 1, 'dash'),
            ('Peychaud\'s Bitters', 4, 'dash'),
        ]
    },
    {
        'name': 'Pegu Club',
        'garnish': '',
        'notes': 'Shake, double strain',
        'source_url': '',
        'ingredients': [
            ('Gin', 2, 'oz'),
            ('Orange Curaçao', 0.75, 'oz'),
            ('Lime Juice', 0.5, 'oz'),
            ('Angostura Bitters', 1, 'dash'),
            ('Orange Bitters', 1, 'dash'),
        ]
    },
    {
        'name': 'Irish Old Fashioned',
        'garnish': '',
        'notes': '',
        'source_url': '',
        'ingredients': [
            ('Irish Whisky', 2, 'oz'),
            ('Benedictine', 0.75, 'oz'),
            ('Orange bitters', 2, 'dash'),
            ('Angostura bitters', 1, 'dash'),
        ]
    },
    {
        'name': 'Chaiquiri',
        'garnish': '',
        'notes': 'Small ice',
        'source_url': '',
        'ingredients': [
            ('Rum', 2, 'oz'),
            ('Chai syrup', 0.75, 'oz'),
            ('Lime', 1, 'oz'),
            ('Angostura bitters', 2, 'dash'),
        ]
    },
    {
        'name': 'The Federation',
        'garnish': 'Orange twist',
        'notes': '',
        'source_url': '',
        'ingredients': [
            ('Añejo Tequila', 2, 'oz'),
            ('Absinthe', 1, 'spritz'),
            ('Creme de Cacao', 0.5, 'oz'),
            ('Angostura bitters', 2, 'dash'),
        ]
    },
]

def get_or_create_ingredient(name):
    """Get or create an ingredient."""
    ingredient, created = Ingredient.objects.get_or_create(name=name)
    if created:
        print(f"  Created ingredient: {name}")
    return ingredient

def add_recipes():
    """Add all recipes to the database."""
    print("Adding Valentine's Party drink recipes to database...\n")
    
    for recipe_data in recipes_data:
        # Check if recipe already exists
        if Recipe.objects.filter(name=recipe_data['name']).exists():
            print(f"⚠️  Recipe '{recipe_data['name']}' already exists. Skipping...")
            continue
        
        # Create recipe
        recipe = Recipe.objects.create(
            name=recipe_data['name'],
            garnish=recipe_data['garnish'] or '',
            notes=recipe_data['notes'] or '',
            source_url=recipe_data.get('source_url', '') or None
        )
        print(f"✓ Created recipe: {recipe.name}")
        
        # Add ingredients
        for ingredient_name, amount, unit in recipe_data['ingredients']:
            ingredient = get_or_create_ingredient(ingredient_name)
            RecipeIngredient.objects.create(
                recipe=recipe,
                ingredient=ingredient,
                amount=amount,
                unit=unit
            )
            print(f"  Added: {amount} {unit} {ingredient_name}")
        
        if recipe.source_url:
            print(f"  Source: {recipe.source_url}")
        
        print()
    
    print("Done! All recipes added successfully.")
    print("\nNote: Japanese Manhattan and Odango were skipped as they already exist in the database.")

if __name__ == '__main__':
    add_recipes()

