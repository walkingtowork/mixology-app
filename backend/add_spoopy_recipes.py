#!/usr/bin/env python
"""
Script to add Spoopy Dumplings drink recipes to the database.
Run from backend directory: python add_spoopy_recipes.py
"""
import os
import sys
import django

# Setup Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from cocktails.models import Ingredient, Recipe, RecipeIngredient

# Recipe data for Spoopy Dumplings menu
recipes_data = [
    {
        'name': 'Café Molé',
        'garnish': '',
        'notes': '',
        'source_url': '',
        'ingredients': [
            ('Reposado Tequila', 1.5, 'oz'),
            ('Chili Liqueur', 0.5, 'oz'),
            ('Brown sugar syrup', 0.5, 'oz'),
            ('Oat milk', 1.5, 'oz'),
            ('Espresso', 1, 'oz'),
            ('Sea salt', 1, 'pinch'),
        ]
    },
    {
        'name': 'American Trilogy',
        'garnish': 'Orange twist',
        'notes': '',
        'source_url': '',
        'ingredients': [
            ('Bourbon', 1, 'oz'),
            ('Calvados', 1, 'oz'),
            ('Chai syrup', 0.25, 'oz'),
            ('Angostura bitters', 2, 'dash'),
        ]
    },
    {
        'name': 'Psycho Killer',
        'garnish': '',
        'notes': '',
        'source_url': '',
        'ingredients': [
            ('Irish Whiskey', 2, 'oz'),
            ('Campari (infused with cacao nibs)', 0.75, 'oz'),
            ('White Creme de Cacao', 0.5, 'oz'),
            ('Banana liqueur', 0.5, 'oz'),
            ('Absinthe', 2, 'dash'),
        ]
    },
    {
        'name': 'Grasshopper',
        'garnish': 'Grated nutmeg',
        'notes': '',
        'source_url': '',
        'ingredients': [
            ('Creme de Menthe', 1, 'oz'),
            ('White Creme de Cacao', 1, 'oz'),
            ('Heavy cream', 2, 'oz'),
        ]
    },
    {
        'name': 'A La Mode',
        'garnish': 'Heavy cream floated on top',
        'notes': '',
        'source_url': '',
        'ingredients': [
            ('Bourbon', 1, 'oz'),
            ('Licor 43', 0.5, 'oz'),
            ('Apple Cider', 5, 'oz'),
        ]
    },
    {
        'name': 'Dark n Stormy',
        'garnish': 'Lime wheel',
        'notes': '',
        'source_url': '',
        'ingredients': [
            ('Dark Rum', 2, 'oz'),
            ('Lime Juice', 0.5, 'oz'),
            ('Ginger Beer', 5, 'oz'),
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
    print("Adding Spoopy Dumplings drink recipes to database...\n")
    
    # Create Saline Solution ingredient (separate, not used in recipes)
    saline = get_or_create_ingredient('Saline Solution')
    print(f"  (Saline Solution ingredient created for future use)\n")
    
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
    print("\nNote: Hibiscus Sour was skipped as it already exists in the database.")

if __name__ == '__main__':
    add_recipes()

