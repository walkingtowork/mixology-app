#!/usr/bin/env python
"""
Script to add Salads Smoothies Sicily drink recipes to the database.
Run from backend directory: python add_salads_smoothies_recipes.py
"""
import os
import sys
import django

# Setup Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from cocktails.models import Ingredient, Recipe, RecipeIngredient

# Recipe data for Salads Smoothies Sicily menu
recipes_data = [
    {
        'name': 'Espresso Martini (Rum)',
        'garnish': '',
        'notes': 'Small ice. Put espresso in freezer to chill. Optionally express lemon or orange peel.',
        'source_url': '',
        'ingredients': [
            ('Espresso', 1, 'oz'),
            ('Rum', 2, 'oz'),
            ('Homemade coffee liqueur', 0.5, 'oz'),
            ('Simple syrup', 0.25, 'oz'),
        ]
    },
    {
        'name': 'Limoncello Spritz',
        'garnish': 'Orange slice',
        'notes': 'Small ice. Ice first, briefly stir, garnish with orange slice. Mint if you have it.',
        'source_url': '',
        'ingredients': [
            ('Dry Prosecco', 3, 'oz'),
            ('Limoncello', 2, 'oz'),
            ('Soda water', 1, 'oz'),
        ]
    },
    {
        'name': 'Rings a Bell',
        'garnish': 'Grated tonka bean',
        'notes': 'Small ice.',
        'source_url': '',
        'ingredients': [
            ('Gin', 0.5, 'oz'),
            ('Verde Amaro', 1.5, 'oz'),
            ('Egg white', 0.5, 'oz'),
            ('Lemon', 0.33, 'oz'),
            ('Honey syrup', 1, 'tsp'),
        ]
    },
    {
        'name': 'Italian Buck',
        'garnish': 'Lime wheel',
        'notes': 'Small ice. Shake before adding Ginger Beer, lime wheel garnish. Optional bitters',
        'source_url': '',
        'ingredients': [
            ('Cynar', 1.5, 'oz'),
            ('Vecchio del Capo', 1.5, 'oz'),
            ('Lime', 0.75, 'oz'),
            ('Ginger Beer', 3, 'oz'),
        ]
    },
    {
        'name': 'Hibiscus Sour',
        'garnish': 'Grated nutmeg (could try ginger or chai syrup instead of simple?)',
        'notes': 'Ice optional?',
        'source_url': '',
        'ingredients': [
            ('Hibiscus Cinnamon Gin', 1, 'oz'),
            ('Simple Syrup', 1, 'oz'),
            ('Lime', 1, 'oz'),
            ('Egg white', 0.5, 'oz'),
        ]
    },
    {
        'name': 'Spicy Pineapple Daiquiri',
        'garnish': '',
        'notes': 'Small ice. More lime if too sweet?',
        'source_url': '',
        'ingredients': [
            ('Rum', 1, 'oz'),
            ('Chili Amaro', 1, 'oz'),
            ('Lime', 0.5, 'oz'),
            ('Pineapple syrup', 0.5, 'oz'),
        ]
    },
    {
        'name': 'Rancor\'s Toothpick',
        'garnish': 'Orange peel',
        'notes': 'Stir and pour over a large block of ice.',
        'source_url': '',
        'ingredients': [
            ('100-proof Bourbon', 1.5, 'oz'),
            ('Cynar', 1, 'oz'),
            ('Sweet Vermouth', 1, 'oz'),
            ('Mole Bitters', 2, 'dash'),
        ]
    },
    {
        'name': 'Revolver',
        'garnish': 'Flamed orange peel',
        'notes': 'Ice optional.',
        'source_url': '',
        'ingredients': [
            ('Bourbon', 2, 'oz'),
            ('Coffee Liqueur', 0.5, 'oz'),
            ('Orange bitters', 2, 'dash'),
        ]
    },
    {
        'name': 'Leftovers',
        'garnish': '',
        'notes': 'Add ice and shake',
        'source_url': '',
        'ingredients': [
            ('Hibiscus Cinnamon Gin', 1, 'oz'),
            ('Homemade coffee liqueur', 1, 'oz'),
            ('Pineapple syrup', 1, 'oz'),
            ('Lime', 1, 'oz'),
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
    print("Adding Salads Smoothies Sicily drink recipes to database...\n")
    
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

if __name__ == '__main__':
    add_recipes()

