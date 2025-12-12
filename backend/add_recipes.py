#!/usr/bin/env python
"""
Script to add/update drink recipes to the database.
Run from backend directory: python add_recipes.py
"""
import os
import sys
import django

# Setup Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from cocktails.models import Ingredient, Recipe, RecipeIngredient

# Recipe data for housewarming menu
recipes_data = [
    {
        'name': 'Gin Fizz',
        'garnish': '',
        'notes': 'Small ice',
        'source_url': '',
        'ingredients': [
            ('Gin', 2, 'oz'),
            ('Lemon', 1, 'oz'),
            ('Egg white', 0.5, 'oz'),
            ('Simple syrup', 0.75, 'oz'),
            ('Soda water', 1, 'oz'),  # Using 1 oz for ~1 oz
        ]
    },
    {
        'name': 'Rum Old Fashioned',
        'garnish': 'Orange twist',
        'notes': '',
        'source_url': '',
        'ingredients': [
            ('Rum', 2, 'oz'),
            ('Simple syrup', 1, 'tsp'),
            ('Chai syrup', 1, 'tsp'),
            ('Angostura bitters', 2, 'dash'),
            ('Orange bitters', 2, 'dash'),
        ]
    },
]

def get_or_create_ingredient(name):
    """Get or create an ingredient."""
    ingredient, created = Ingredient.objects.get_or_create(name=name)
    if created:
        print(f"  Created ingredient: {name}")
    return ingredient

def update_existing_recipes():
    """Update existing recipes based on housewarming menu changes."""
    print("Updating existing recipes...\n")
    
    # 1. Remove Angostura bitters from Chaiquiri
    try:
        chaiquiri = Recipe.objects.get(name='Chaiquiri')
        angostura = Ingredient.objects.get(name='Angostura bitters')
        RecipeIngredient.objects.filter(recipe=chaiquiri, ingredient=angostura).delete()
        print("✓ Removed Angostura bitters from Chaiquiri")
    except Recipe.DoesNotExist:
        print("⚠️  Chaiquiri not found, skipping update")
    except Ingredient.DoesNotExist:
        print("⚠️  Angostura bitters not found, skipping update")
    
    # 2. Update Espresso Martini notes to include "Small ice"
    try:
        espresso = Recipe.objects.get(name='Espresso Martini')
        current_notes = espresso.notes or ''
        if 'Small ice' not in current_notes:
            if current_notes:
                espresso.notes = f"Small ice. {current_notes}"
            else:
                espresso.notes = "Small ice"
            espresso.save()
            print("✓ Updated Espresso Martini notes to include 'Small ice'")
        else:
            print("✓ Espresso Martini already has 'Small ice' in notes")
    except Recipe.DoesNotExist:
        print("⚠️  Espresso Martini not found, skipping update")
    
    # 3. Negroni - keep existing (no changes)
    print("✓ Negroni - keeping existing version")
    
    # 4. Irish Coffee - keep existing (no changes)
    print("✓ Irish Coffee - keeping existing version")
    
    # 5. Add Heavy cream to Black Russian
    try:
        black_russian = Recipe.objects.get(name='Black Russian')
        heavy_cream = get_or_create_ingredient('Heavy cream')
        
        # Check if heavy cream already exists in recipe
        if not RecipeIngredient.objects.filter(recipe=black_russian, ingredient=heavy_cream).exists():
            RecipeIngredient.objects.create(
                recipe=black_russian,
                ingredient=heavy_cream,
                amount=0.5,
                unit='oz'
            )
            print("✓ Added Heavy cream (0.5 oz) to Black Russian")
        else:
            print("✓ Black Russian already has Heavy cream")
    except Recipe.DoesNotExist:
        print("⚠️  Black Russian not found, skipping update")
    
    print()

def add_new_recipes():
    """Add new recipes to the database."""
    print("Adding new recipes to database...\n")
    
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
        
        print()
    
    print("Done! All recipes processed successfully.")

if __name__ == '__main__':
    update_existing_recipes()
    add_new_recipes()
