#!/usr/bin/env python
"""
Script to add Christmas drink recipes to the database.
Run from backend directory: python add_christmas_recipes.py
"""
import os
import sys
import django

# Setup Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from cocktails.models import Ingredient, Recipe, RecipeIngredient

# Recipe data for Christmas drinks menu
recipes_data = [
    {
        'name': 'Winter Welcome',
        'garnish': 'Lemon twist',
        'notes': '',
        'source_url': 'https://www.youtube.com/watch?v=N7VBqDCWUMI',
        'ingredients': [
            ('Rittenhouse Rye', 1.5, 'oz'),
            ('Smith & Cross', 0.5, 'oz'),
            ('Tempus Fugit Banana Liqueur', 0.5, 'oz'),
            ('Arabica infused Carpano Antica', 0.5, 'oz'),
            ('Angostura bitters', 2, 'dash'),
            ('Mole Bitters', 2, 'drops'),
        ]
    },
    {
        'name': 'Rum Hot Toddy',
        'garnish': 'Cinnamon stick, Lemon twist with cloves',
        'notes': '',
        'source_url': 'https://www.youtube.com/watch?v=W50W19vwjmk',
        'ingredients': [
            ('Appleton Estate', 1.5, 'oz'),
            ('Demerara syrup', 0.5, 'oz'),
            ('Lemon juice', 0.25, 'oz'),
            ('Black tea', 4.5, 'oz'),  # Using 4.5 oz as average of 4-5 oz
        ]
    },
    {
        'name': 'Brandy Alexander',
        'garnish': 'Grated nutmeg',
        'notes': '',
        'source_url': 'https://www.youtube.com/watch?v=W50W19vwjmk',
        'ingredients': [
            ('Cognac', 1.5, 'oz'),
            ('Creme de cacao', 0.75, 'oz'),
            ('Heavy cream', 0.75, 'oz'),
        ]
    },
    {
        'name': "Elk's Own",
        'garnish': 'Grated nutmeg',
        'notes': '',
        'source_url': 'https://www.youtube.com/watch?v=zxDfN7UCTZs&t=30s',
        'ingredients': [
            ('100 proof rye', 1, 'oz'),
            ('Fonseca Bin Ruby Port', 0.75, 'oz'),
            ('Lemon juice', 0.75, 'oz'),
            ('Demerara syrup', 0.5, 'oz'),
            ('Egg white', 0.75, 'oz'),
        ]
    },
    {
        'name': 'The Stinger',
        'garnish': '',
        'notes': '',
        'source_url': 'https://www.youtube.com/watch?v=mBGgu3qRztY&t=1s',
        'ingredients': [
            ('VSOP Cognac', 2, 'oz'),
            ('Creme de Menthe', 1, 'oz'),
        ]
    },
    {
        'name': 'Chocolate Punch',
        'garnish': 'Grated chocolate',
        'notes': '',
        'source_url': 'https://www.youtube.com/watch?v=s30L-iu171E&t=215s',
        'ingredients': [
            ('Cognac', 1, 'oz'),
            ('Ruby Port', 0.5, 'oz'),
            ('Creme de Cacao', 0.5, 'oz'),
            ('Semi-rich syrup', 0.25, 'oz'),
            ('Heavy cream', 1, 'oz'),
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
    print("Adding Christmas drink recipes to database...\n")
    
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

