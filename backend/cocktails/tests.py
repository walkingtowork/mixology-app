from django.core.management import call_command
from django.db import IntegrityError, connection, transaction
from django.db.migrations.executor import MigrationExecutor
from django.test import TestCase, TransactionTestCase, override_settings
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient, APITestCase
from rest_framework import status
from .models import (
    Ingredient, Recipe, RecipeIngredient, IngredientCategory,
    Menu, MenuItem, Order, BuyListItem,
)


class AuthenticatedAPITestCase(APITestCase):
    """Base class for API tests that write.

    The API is default-deny (IsAuthenticated), so every call to an owner-facing endpoint
    has to act as a signed-in user. Authenticating here
    keeps that concern in one place, and means anonymous behaviour is asserted
    deliberately in AnonymousAccessTests rather than relied on by accident everywhere
    else. When ownership lands in task 8.0 this is where the owning user comes from.
    """

    def setUp(self):
        super().setUp()
        # No password: force_authenticate bypasses the login path entirely, and hashing one
        # per test added ~9s to the suite for nothing.
        self.user = get_user_model().objects.create_user(
            username='tester',
            email='tester@example.com',
        )
        self.client.force_authenticate(user=self.user)


class IngredientAPITests(AuthenticatedAPITestCase):
    """Test cases for Ingredient API endpoints."""

    def setUp(self):
        """Set up test data."""
        super().setUp()
        self.ingredient1 = Ingredient.objects.create(owner=self.user, name='Gin')
        self.ingredient2 = Ingredient.objects.create(owner=self.user, name='Vermouth')
        self.ingredient3 = Ingredient.objects.create(owner=self.user, name='Lemon Juice')

    def test_list_ingredients(self):
        """Test GET /api/ingredients/ returns all ingredients."""
        url = '/api/ingredients/'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 3)
        self.assertEqual(response.data[0]['name'], 'Gin')
        self.assertEqual(response.data[1]['name'], 'Lemon Juice')  # Ordered by name
        self.assertEqual(response.data[2]['name'], 'Vermouth')

    def test_create_ingredient(self):
        """Test POST /api/ingredients/ creates a new ingredient."""
        url = '/api/ingredients/'
        data = {'name': 'Bitters'}
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['name'], 'Bitters')
        self.assertTrue(Ingredient.objects.filter(name='Bitters').exists())

    def test_create_ingredient_duplicate_name(self):
        """Test that creating an ingredient with duplicate name fails."""
        url = '/api/ingredients/'
        data = {'name': 'Gin'}  # Already exists
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_retrieve_ingredient(self):
        """Test GET /api/ingredients/{id}/ returns a single ingredient."""
        url = f'/api/ingredients/{self.ingredient1.id}/'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], self.ingredient1.id)
        self.assertEqual(response.data['name'], 'Gin')

    def test_retrieve_ingredient_not_found(self):
        """Test GET /api/ingredients/{id}/ returns 404 for non-existent ingredient."""
        url = '/api/ingredients/999/'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_update_ingredient_name(self):
        """Test PATCH /api/ingredients/{id}/ updates ingredient name."""
        url = f'/api/ingredients/{self.ingredient1.id}/'
        data = {'name': 'Updated Gin'}
        response = self.client.patch(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], 'Updated Gin')
        
        # Verify in database
        self.ingredient1.refresh_from_db()
        self.assertEqual(self.ingredient1.name, 'Updated Gin')

    def test_update_ingredient_name_duplicate(self):
        """Test that updating ingredient name to duplicate name fails."""
        url = f'/api/ingredients/{self.ingredient1.id}/'
        data = {'name': 'Vermouth'}  # Already exists (ingredient2)
        response = self.client.patch(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_delete_ingredient(self):
        """Test DELETE /api/ingredients/{id}/ deletes an ingredient."""
        ingredient_id = self.ingredient1.id
        url = f'/api/ingredients/{ingredient_id}/'
        response = self.client.delete(url)
        
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Ingredient.objects.filter(id=ingredient_id).exists())

    def test_delete_ingredient_used_in_recipes(self):
        """Test that deleting an ingredient used in recipes deletes the ingredient and related RecipeIngredients."""
        # Create a recipe using ingredient1
        recipe = Recipe.objects.create(owner=self.user, name='Test Recipe')
        RecipeIngredient.objects.create(
            recipe=recipe,
            ingredient=self.ingredient1,
            amount=2.0,
            unit='oz'
        )
        
        ingredient_id = self.ingredient1.id
        recipe_ingredient_id = RecipeIngredient.objects.get(
            recipe=recipe,
            ingredient=self.ingredient1
        ).id
        
        url = f'/api/ingredients/{ingredient_id}/'
        response = self.client.delete(url)
        
        # Should succeed (CASCADE delete)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Ingredient.objects.filter(id=ingredient_id).exists())
        # RecipeIngredient should also be deleted
        self.assertFalse(RecipeIngredient.objects.filter(id=recipe_ingredient_id).exists())
        # Recipe should still exist
        self.assertTrue(Recipe.objects.filter(id=recipe.id).exists())


class RecipeAPITests(AuthenticatedAPITestCase):
    """Test cases for Recipe API endpoints."""

    def setUp(self):
        """Set up test data."""
        super().setUp()
        self.gin = Ingredient.objects.create(owner=self.user, name='Gin')
        self.vermouth = Ingredient.objects.create(owner=self.user, name='Vermouth')
        self.lemon = Ingredient.objects.create(owner=self.user, name='Lemon Juice')
        
        self.recipe = Recipe.objects.create(
            owner=self.user,
            name='Martini',
            notes='Stir with ice',
            garnish='Olive'
        )
        RecipeIngredient.objects.create(
            recipe=self.recipe,
            ingredient=self.gin,
            amount=2.0,
            unit='oz'
        )
        RecipeIngredient.objects.create(
            recipe=self.recipe,
            ingredient=self.vermouth,
            amount=0.5,
            unit='oz'
        )

    def test_list_recipes(self):
        """Test GET /api/recipes/ returns all recipes."""
        url = '/api/recipes/'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['name'], 'Martini')
        self.assertEqual(len(response.data[0]['ingredients']), 2)

    def test_list_recipes_with_ingredients_nested(self):
        """Test that recipe list includes nested ingredient data."""
        url = '/api/recipes/'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        recipe_data = response.data[0]
        self.assertIn('ingredients', recipe_data)
        self.assertEqual(len(recipe_data['ingredients']), 2)
        
        # Check nested ingredient structure
        first_ingredient = recipe_data['ingredients'][0]
        self.assertIn('ingredient', first_ingredient)
        self.assertIn('amount', first_ingredient)
        self.assertIn('unit', first_ingredient)
        self.assertIn('name', first_ingredient['ingredient'])

    def test_filter_recipes_by_ingredient(self):
        """Test GET /api/recipes/?ingredient={id} filters recipes by ingredient."""
        # Create another recipe without gin
        recipe2 = Recipe.objects.create(owner=self.user, name='Whiskey Sour')
        RecipeIngredient.objects.create(
            recipe=recipe2,
            ingredient=self.lemon,
            amount=1.0,
            unit='oz'
        )
        
        url = f'/api/recipes/?ingredient={self.gin.id}'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['name'], 'Martini')

    def test_create_recipe_with_ingredients(self):
        """Test POST /api/recipes/ creates a recipe with ingredients."""
        url = '/api/recipes/'
        data = {
            'name': 'Negroni',
            'notes': 'Stir all ingredients',
            'garnish': 'Orange peel',
            'ingredients': [
                {
                    'ingredient_id': self.gin.id,
                    'amount': 1.0,
                    'unit': 'oz'
                },
                {
                    'ingredient_id': self.vermouth.id,
                    'amount': 1.0,
                    'unit': 'oz'
                }
            ]
        }
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['name'], 'Negroni')
        self.assertEqual(len(response.data['ingredients']), 2)
        
        # Verify recipe was created in database
        recipe = Recipe.objects.get(name='Negroni')
        self.assertEqual(recipe.recipe_ingredients.count(), 2)

    def test_create_recipe_without_ingredients(self):
        """Test that creating a recipe without ingredients is allowed."""
        url = '/api/recipes/'
        data = {
            'name': 'Simple Recipe',
            'ingredients': []
        }
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['name'], 'Simple Recipe')
        self.assertEqual(len(response.data['ingredients']), 0)

    def test_create_recipe_with_invalid_amount(self):
        """Test that creating a recipe with amount <= 0 fails validation."""
        url = '/api/recipes/'
        data = {
            'name': 'Invalid Recipe',
            'ingredients': [
                {
                    'ingredient_id': self.gin.id,
                    'amount': 0,  # Invalid: must be > 0
                    'unit': 'oz'
                }
            ]
        }
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_recipe_with_negative_amount(self):
        """Test that creating a recipe with negative amount fails validation."""
        url = '/api/recipes/'
        data = {
            'name': 'Invalid Recipe',
            'ingredients': [
                {
                    'ingredient_id': self.gin.id,
                    'amount': -1.0,  # Invalid: must be > 0
                    'unit': 'oz'
                }
            ]
        }
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_retrieve_recipe(self):
        """Test GET /api/recipes/{id}/ returns a single recipe with ingredients."""
        url = f'/api/recipes/{self.recipe.id}/'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], 'Martini')
        self.assertEqual(response.data['notes'], 'Stir with ice')
        self.assertEqual(response.data['garnish'], 'Olive')
        self.assertEqual(len(response.data['ingredients']), 2)

    def test_update_recipe(self):
        """Test PATCH /api/recipes/{id}/ updates a recipe."""
        url = f'/api/recipes/{self.recipe.id}/'
        data = {
            'name': 'Dry Martini',
            'notes': 'Extra dry'
        }
        response = self.client.patch(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], 'Dry Martini')
        self.assertEqual(response.data['notes'], 'Extra dry')
        
        # Verify in database
        self.recipe.refresh_from_db()
        self.assertEqual(self.recipe.name, 'Dry Martini')

    def test_update_recipe_ingredients(self):
        """Test that updating recipe ingredients replaces existing ones."""
        url = f'/api/recipes/{self.recipe.id}/'
        data = {
            'ingredients': [
                {
                    'ingredient_id': self.lemon.id,
                    'amount': 1.0,
                    'unit': 'oz'
                }
            ]
        }
        response = self.client.patch(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['ingredients']), 1)
        self.assertEqual(response.data['ingredients'][0]['ingredient']['name'], 'Lemon Juice')
        
        # Verify old ingredients were removed
        self.recipe.refresh_from_db()
        self.assertEqual(self.recipe.recipe_ingredients.count(), 1)

    def test_delete_recipe(self):
        """Test DELETE /api/recipes/{id}/ deletes a recipe."""
        recipe_id = self.recipe.id
        url = f'/api/recipes/{recipe_id}/'
        response = self.client.delete(url)
        
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Recipe.objects.filter(id=recipe_id).exists())
        # RecipeIngredients should also be deleted (CASCADE)
        self.assertEqual(RecipeIngredient.objects.filter(recipe_id=recipe_id).count(), 0)

    def test_recipe_same_ingredient_different_amounts(self):
        """Test that the same ingredient can be used in multiple recipes with different amounts."""
        recipe2 = Recipe.objects.create(owner=self.user, name='Gin and Tonic')
        RecipeIngredient.objects.create(
            recipe=recipe2,
            ingredient=self.gin,
            amount=2.5,  # Different amount
            unit='oz'
        )
        
        # Both recipes should exist
        url = '/api/recipes/'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)
        
        # Check that gin appears in both recipes with different amounts
        gin_amounts = []
        for recipe_data in response.data:
            for ri in recipe_data['ingredients']:
                if ri['ingredient']['name'] == 'Gin':
                    gin_amounts.append(ri['amount'])
        
        self.assertEqual(len(gin_amounts), 2)
        self.assertIn(2.0, gin_amounts)
        self.assertIn(2.5, gin_amounts)

    def test_recipe_ingredient_unit_choices(self):
        """Test that only valid unit choices are accepted."""
        url = '/api/recipes/'
        data = {
            'name': 'Test Recipe',
            'ingredients': [
                {
                    'ingredient_id': self.gin.id,
                    'amount': 1.0,
                    'unit': 'invalid_unit'  # Invalid unit
                }
            ]
        }
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_recipe_with_new_units(self):
        """Test that new unit types (tbsp, drops, spritz, rinse, pinch) work correctly."""
        url = '/api/recipes/'
        
        # Test tbsp
        data = {
            'name': 'Test Recipe with tbsp',
            'ingredients': [
                {
                    'ingredient_id': self.gin.id,
                    'amount': 1.0,
                    'unit': 'tbsp'
                }
            ]
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['ingredients'][0]['unit'], 'tbsp')
        
        # Test drops
        data = {
            'name': 'Test Recipe with drops',
            'ingredients': [
                {
                    'ingredient_id': self.gin.id,
                    'amount': 2.0,
                    'unit': 'drops'
                }
            ]
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['ingredients'][0]['unit'], 'drops')
        
        # Test spritz
        data = {
            'name': 'Test Recipe with spritz',
            'ingredients': [
                {
                    'ingredient_id': self.gin.id,
                    'amount': 1.0,
                    'unit': 'spritz'
                }
            ]
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['ingredients'][0]['unit'], 'spritz')
        
        # Test rinse
        data = {
            'name': 'Test Recipe with rinse',
            'ingredients': [
                {
                    'ingredient_id': self.gin.id,
                    'amount': 1.0,
                    'unit': 'rinse'
                }
            ]
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['ingredients'][0]['unit'], 'rinse')
        
        # Test pinch
        data = {
            'name': 'Test Recipe with pinch',
            'ingredients': [
                {
                    'ingredient_id': self.gin.id,
                    'amount': 1.0,
                    'unit': 'pinch'
                }
            ]
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['ingredients'][0]['unit'], 'pinch')

    def test_create_recipe_with_source_url(self):
        """Test that recipes can be created with source_url field."""
        url = '/api/recipes/'
        data = {
            'name': 'Test Recipe with Source',
            'source_url': 'https://www.example.com/recipe',
            'ingredients': [
                {
                    'ingredient_id': self.gin.id,
                    'amount': 2.0,
                    'unit': 'oz'
                }
            ]
        }
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['source_url'], 'https://www.example.com/recipe')
        
        # Verify in database
        recipe = Recipe.objects.get(name='Test Recipe with Source')
        self.assertEqual(recipe.source_url, 'https://www.example.com/recipe')

    def test_retrieve_recipe_with_source_url(self):
        """Test that source_url is included in recipe retrieval."""
        # Create recipe with source_url
        recipe = Recipe.objects.create(
            owner=self.user,
            name='Test Recipe',
            source_url='https://www.example.com/test'
        )
        RecipeIngredient.objects.create(
            recipe=recipe,
            ingredient=self.gin,
            amount=2.0,
            unit='oz'
        )
        
        url = f'/api/recipes/{recipe.id}/'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('source_url', response.data)
        self.assertEqual(response.data['source_url'], 'https://www.example.com/test')

    def test_update_recipe_source_url(self):
        """Test that source_url can be updated."""
        url = f'/api/recipes/{self.recipe.id}/'
        data = {
            'source_url': 'https://www.example.com/updated'
        }
        response = self.client.patch(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['source_url'], 'https://www.example.com/updated')
        
        # Verify in database
        self.recipe.refresh_from_db()
        self.assertEqual(self.recipe.source_url, 'https://www.example.com/updated')

    def test_create_recipe_without_source_url(self):
        """Test that source_url is optional when creating recipes."""
        url = '/api/recipes/'
        data = {
            'name': 'Test Recipe No Source',
            'ingredients': [
                {
                    'ingredient_id': self.gin.id,
                    'amount': 2.0,
                    'unit': 'oz'
                }
            ]
        }
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIsNone(response.data.get('source_url'))


class IngredientCategoryAPITests(AuthenticatedAPITestCase):
    """Test cases for IngredientCategory API endpoints."""

    def setUp(self):
        """Set up test data."""
        super().setUp()
        self.category1 = IngredientCategory.objects.create(owner=self.user, name='Whiskey', notes='Various whiskey types')
        self.category2 = IngredientCategory.objects.create(owner=self.user, name='Gin', notes='Gin category')

    def test_list_categories(self):
        """Test GET /api/categories/ returns all categories."""
        url = '/api/categories/'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)
        self.assertEqual(response.data[0]['name'], 'Gin')  # Ordered by name
        self.assertEqual(response.data[1]['name'], 'Whiskey')

    def test_create_category(self):
        """Test POST /api/categories/ creates a new category."""
        url = '/api/categories/'
        data = {'name': 'Vodka', 'notes': 'Vodka category'}
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['name'], 'Vodka')
        self.assertEqual(response.data['notes'], 'Vodka category')
        self.assertTrue(IngredientCategory.objects.filter(name='Vodka').exists())

    def test_create_category_with_auto_create_generic_ingredient(self):
        """Test that creating a category with create_generic_ingredient=True creates generic ingredient."""
        url = '/api/categories/'
        data = {
            'name': 'Rum',
            'notes': 'Rum category',
            'create_generic_ingredient': True
        }
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Check that generic ingredient was created
        generic_ingredient = Ingredient.objects.filter(name='Rum', is_generic=True).first()
        self.assertIsNotNone(generic_ingredient)
        self.assertEqual(generic_ingredient.category.name, 'Rum')
        self.assertTrue(generic_ingredient.is_generic)

    def test_create_category_without_auto_create_generic_ingredient(self):
        """Test that creating a category with create_generic_ingredient=False doesn't create generic ingredient."""
        url = '/api/categories/'
        data = {
            'name': 'Tequila',
            'create_generic_ingredient': False
        }
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Check that generic ingredient was NOT created
        generic_ingredient = Ingredient.objects.filter(name='Tequila', is_generic=True).first()
        self.assertIsNone(generic_ingredient)

    def test_create_category_with_existing_ingredient_name(self):
        """Test that creating a category with existing ingredient name links it to category."""
        # Create an ingredient first
        existing_ingredient = Ingredient.objects.create(owner=self.user, name='Brandy')
        
        url = '/api/categories/'
        data = {
            'name': 'Brandy',
            'create_generic_ingredient': True
        }
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Check that existing ingredient was linked to category and marked as generic
        existing_ingredient.refresh_from_db()
        self.assertIsNotNone(existing_ingredient.category)
        self.assertEqual(existing_ingredient.category.name, 'Brandy')
        self.assertTrue(existing_ingredient.is_generic)

    def test_create_category_duplicate_name(self):
        """Test that creating a category with duplicate name fails."""
        url = '/api/categories/'
        data = {'name': 'Whiskey'}  # Already exists
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_retrieve_category(self):
        """Test GET /api/categories/{id}/ returns a single category."""
        url = f'/api/categories/{self.category1.id}/'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], self.category1.id)
        self.assertEqual(response.data['name'], 'Whiskey')
        self.assertEqual(response.data['notes'], 'Various whiskey types')

    def test_retrieve_category_with_ingredients(self):
        """Test that category retrieval includes ingredients."""
        # Create ingredients in category
        ingredient1 = Ingredient.objects.create(owner=self.user, name='Jameson', category=self.category1)
        ingredient2 = Ingredient.objects.create(owner=self.user, name='Red Breast 12', category=self.category1)
        
        url = f'/api/categories/{self.category1.id}/'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('ingredients', response.data)
        self.assertEqual(len(response.data['ingredients']), 2)

    def test_retrieve_category_with_generic_ingredient(self):
        """Test that category retrieval includes generic ingredient if it exists."""
        # Create generic ingredient
        generic = Ingredient.objects.create(
            owner=self.user,
            name='Whiskey',
            category=self.category1,
            is_generic=True
        )
        
        url = f'/api/categories/{self.category1.id}/'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('generic_ingredient', response.data)
        self.assertIsNotNone(response.data['generic_ingredient'])
        self.assertEqual(response.data['generic_ingredient']['name'], 'Whiskey')

    def test_update_category(self):
        """Test PATCH /api/categories/{id}/ updates a category."""
        url = f'/api/categories/{self.category1.id}/'
        data = {
            'name': 'Scotch Whiskey',
            'notes': 'Updated notes'
        }
        response = self.client.patch(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], 'Scotch Whiskey')
        self.assertEqual(response.data['notes'], 'Updated notes')
        
        # Verify in database
        self.category1.refresh_from_db()
        self.assertEqual(self.category1.name, 'Scotch Whiskey')

    def test_update_category_name_updates_generic_ingredient(self):
        """Test that updating category name also updates generic ingredient name."""
        # Create generic ingredient
        generic = Ingredient.objects.create(
            owner=self.user,
            name='Whiskey',
            category=self.category1,
            is_generic=True
        )
        
        url = f'/api/categories/{self.category1.id}/'
        data = {'name': 'Scotch Whiskey'}
        response = self.client.patch(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check that generic ingredient name was updated
        generic.refresh_from_db()
        self.assertEqual(generic.name, 'Scotch Whiskey')

    def test_delete_category(self):
        """Test DELETE /api/categories/{id}/ deletes a category."""
        category_id = self.category1.id
        url = f'/api/categories/{category_id}/'
        response = self.client.delete(url)
        
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(IngredientCategory.objects.filter(id=category_id).exists())

    def test_delete_category_with_recipes_prevents_deletion(self):
        """Test that deleting a category used in recipes is prevented."""
        # Create ingredient in category
        ingredient = Ingredient.objects.create(owner=self.user, name='Jameson', category=self.category1)
        
        # Create recipe using that ingredient
        recipe = Recipe.objects.create(owner=self.user, name='Irish Coffee')
        RecipeIngredient.objects.create(
            recipe=recipe,
            ingredient=ingredient,
            amount=1.5,
            unit='oz'
        )
        
        url = f'/api/categories/{self.category1.id}/'
        response = self.client.delete(url)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('detail', response.data)
        self.assertIn('used in one or more recipes', response.data['detail'])
        
        # Verify category still exists
        self.assertTrue(IngredientCategory.objects.filter(id=self.category1.id).exists())

    def test_category_ingredients_endpoint(self):
        """Test GET /api/categories/{id}/ingredients/ returns ingredients in category."""
        ingredient1 = Ingredient.objects.create(owner=self.user, name='Jameson', category=self.category1)
        ingredient2 = Ingredient.objects.create(owner=self.user, name='Red Breast 12', category=self.category1)
        ingredient3 = Ingredient.objects.create(owner=self.user, name='Gin', category=self.category2)  # Different category
        
        url = f'/api/categories/{self.category1.id}/ingredients/'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)
        ingredient_names = [ing['name'] for ing in response.data]
        self.assertIn('Jameson', ingredient_names)
        self.assertIn('Red Breast 12', ingredient_names)
        self.assertNotIn('Gin', ingredient_names)


class IngredientWithCategoryTests(AuthenticatedAPITestCase):
    """Test cases for Ingredient API with category support."""

    def setUp(self):
        """Set up test data."""
        super().setUp()
        self.category = IngredientCategory.objects.create(owner=self.user, name='Whiskey')
        self.ingredient = Ingredient.objects.create(owner=self.user, name='Jameson', category=self.category)

    def test_ingredient_includes_category(self):
        """Test that ingredient API response includes category information."""
        url = f'/api/ingredients/{self.ingredient.id}/'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('category', response.data)
        self.assertIsNotNone(response.data['category'])
        self.assertEqual(response.data['category']['name'], 'Whiskey')
        self.assertIn('is_generic', response.data)
        self.assertFalse(response.data['is_generic'])

    def test_ingredient_without_category(self):
        """Test that ingredient without category returns null category."""
        ingredient = Ingredient.objects.create(owner=self.user, name='Uncategorized Ingredient')
        url = f'/api/ingredients/{ingredient.id}/'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.data['category'])

    def test_update_ingredient_category(self):
        """Test that ingredient category can be updated."""
        new_category = IngredientCategory.objects.create(owner=self.user, name='Rum')
        url = f'/api/ingredients/{self.ingredient.id}/'
        data = {'category_id': new_category.id}
        response = self.client.patch(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['category']['name'], 'Rum')
        
        # Verify in database
        self.ingredient.refresh_from_db()
        self.assertEqual(self.ingredient.category.name, 'Rum')

    def test_remove_ingredient_category(self):
        """Test that ingredient category can be removed."""
        url = f'/api/ingredients/{self.ingredient.id}/'
        data = {'category_id': None}
        response = self.client.patch(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.data['category'])
        
        # Verify in database
        self.ingredient.refresh_from_db()
        self.assertIsNone(self.ingredient.category)

    def test_update_ingredient_name_and_category(self):
        """Test that ingredient name and category can be updated together."""
        new_category = IngredientCategory.objects.create(owner=self.user, name='Rum')
        url = f'/api/ingredients/{self.ingredient.id}/'
        data = {
            'name': 'Updated Jameson',
            'category_id': new_category.id
        }
        response = self.client.patch(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], 'Updated Jameson')
        self.assertEqual(response.data['category']['name'], 'Rum')
        
        # Verify in database
        self.ingredient.refresh_from_db()
        self.assertEqual(self.ingredient.name, 'Updated Jameson')
        self.assertEqual(self.ingredient.category.name, 'Rum')


class RecipeCategoryFilterTests(AuthenticatedAPITestCase):
    """Test cases for recipe filtering by category."""

    def setUp(self):
        """Set up test data."""
        super().setUp()
        self.whiskey_category = IngredientCategory.objects.create(owner=self.user, name='Whiskey')
        self.gin_category = IngredientCategory.objects.create(owner=self.user, name='Gin')
        
        # Create generic ingredients
        self.whiskey_generic = Ingredient.objects.create(
            owner=self.user,
            name='Whiskey',
            category=self.whiskey_category,
            is_generic=True
        )
        self.gin_generic = Ingredient.objects.create(
            owner=self.user,
            name='Gin',
            category=self.gin_category,
            is_generic=True
        )
        
        # Create brand ingredients
        self.jameson = Ingredient.objects.create(owner=self.user, name='Jameson', category=self.whiskey_category)
        self.red_breast = Ingredient.objects.create(owner=self.user, name='Red Breast 12', category=self.whiskey_category)
        self.tanqueray = Ingredient.objects.create(owner=self.user, name='Tanqueray', category=self.gin_category)
        
        # Create recipes
        self.recipe1 = Recipe.objects.create(owner=self.user, name='Irish Coffee')
        RecipeIngredient.objects.create(
            recipe=self.recipe1,
            ingredient=self.jameson,
            amount=1.5,
            unit='oz'
        )
        
        self.recipe2 = Recipe.objects.create(owner=self.user, name='Whiskey Sour')
        RecipeIngredient.objects.create(
            recipe=self.recipe2,
            ingredient=self.whiskey_generic,
            amount=2.0,
            unit='oz'
        )
        
        self.recipe3 = Recipe.objects.create(owner=self.user, name='Gin and Tonic')
        RecipeIngredient.objects.create(
            recipe=self.recipe3,
            ingredient=self.tanqueray,
            amount=2.0,
            unit='oz'
        )

    def test_filter_recipes_by_category(self):
        """Test that filtering recipes by category returns all recipes with ingredients in that category."""
        url = f'/api/recipes/?category={self.whiskey_category.id}'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)
        recipe_names = [recipe['name'] for recipe in response.data]
        self.assertIn('Irish Coffee', recipe_names)
        self.assertIn('Whiskey Sour', recipe_names)
        self.assertNotIn('Gin and Tonic', recipe_names)

    def test_filter_recipes_by_category_and_ingredient(self):
        """Test that both category and ingredient filters can be used together."""
        # Create recipe with both whiskey category ingredient and specific ingredient
        recipe4 = Recipe.objects.create(owner=self.user, name='Complex Recipe')
        RecipeIngredient.objects.create(
            recipe=recipe4,
            ingredient=self.jameson,
            amount=1.0,
            unit='oz'
        )
        RecipeIngredient.objects.create(
            recipe=recipe4,
            ingredient=self.tanqueray,
            amount=1.0,
            unit='oz'
        )
        
        # Filter by category and ingredient - should return recipes that match both
        url = f'/api/recipes/?category={self.whiskey_category.id}&ingredient={self.jameson.id}'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should return recipes that have both whiskey category ingredient AND jameson
        recipe_names = [recipe['name'] for recipe in response.data]
        self.assertIn('Irish Coffee', recipe_names)
        self.assertIn('Complex Recipe', recipe_names)

    def test_filter_recipes_by_category_no_matches(self):
        """Test that filtering by category with no matches returns empty list."""
        empty_category = IngredientCategory.objects.create(owner=self.user, name='Empty Category')
        url = f'/api/recipes/?category={empty_category.id}'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)


class MenuStatsAPITests(AuthenticatedAPITestCase):
    """Test cases for the per-menu order stats endpoint."""

    def setUp(self):
        super().setUp()
        self.menu = Menu.objects.create(owner=self.user, name='Autumn Equinox')
        self.negroni = Recipe.objects.create(owner=self.user, name='Negroni')
        self.martini = Recipe.objects.create(owner=self.user, name='Espresso Martini')
        self.highball = Recipe.objects.create(owner=self.user, name='Highball')
        for order, recipe in enumerate([self.negroni, self.martini, self.highball]):
            MenuItem.objects.create(menu=self.menu, recipe=recipe, order=order)

    def order(self, recipe, guest, times=1):
        for _ in range(times):
            Order.objects.create(menu=self.menu, recipe=recipe, guest_name=guest)

    def get_stats(self):
        response = self.client.get(f'/api/menus/{self.menu.id}/stats/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        return response.data

    def test_counts_orders_per_drink(self):
        self.order(self.martini, 'Alex', times=3)
        self.order(self.negroni, 'Sam')

        data = self.get_stats()

        self.assertEqual(data['total_orders'], 4)
        counts = {d['name']: d['count'] for d in data['drinks']}
        self.assertEqual(counts['Espresso Martini'], 3)
        self.assertEqual(counts['Negroni'], 1)

    def test_drinks_nobody_ordered_still_appear(self):
        """The whole point of starting from menu.items rather than Order."""
        self.order(self.martini, 'Alex')

        data = self.get_stats()

        names = {d['name'] for d in data['drinks']}
        self.assertIn('Highball', names)
        zero = next(d for d in data['drinks'] if d['name'] == 'Highball')
        self.assertEqual(zero['count'], 0)
        self.assertTrue(zero['on_menu'])

    def test_orders_survive_removal_from_menu(self):
        """Orders outlive menu membership and must still reconcile with the total."""
        self.order(self.negroni, 'Sam', times=2)
        MenuItem.objects.filter(menu=self.menu, recipe=self.negroni).delete()

        data = self.get_stats()

        negroni = next(d for d in data['drinks'] if d['name'] == 'Negroni')
        self.assertEqual(negroni['count'], 2)
        self.assertFalse(negroni['on_menu'])
        self.assertEqual(data['total_orders'], 2)

    def test_counts_unique_guests(self):
        self.order(self.martini, 'Alex', times=2)
        self.order(self.negroni, 'Alex')
        self.order(self.negroni, 'Sam')

        data = self.get_stats()

        self.assertEqual(data['unique_guests'], 2)
        self.assertEqual(data['total_orders'], 4)

    def test_guest_breakdown_lists_each_guests_drinks(self):
        self.order(self.martini, 'Alex', times=2)
        self.order(self.negroni, 'Alex')
        self.order(self.highball, 'Sam')

        data = self.get_stats()

        alex = next(g for g in data['guests'] if g['name'] == 'Alex')
        self.assertEqual(alex['count'], 3)
        self.assertEqual(
            [(d['name'], d['count']) for d in alex['drinks']],
            [('Espresso Martini', 2), ('Negroni', 1)],
        )

    def test_guests_sorted_by_count_descending(self):
        self.order(self.martini, 'Sam')
        self.order(self.negroni, 'Alex', times=3)

        data = self.get_stats()

        self.assertEqual([g['name'] for g in data['guests']], ['Alex', 'Sam'])

    def test_ties_break_alphabetically(self):
        """Stable ordering between loads, rather than whatever the DB returns."""
        self.order(self.negroni, 'Sam')
        self.order(self.martini, 'Alex')
        self.order(self.highball, 'Sam')

        data = self.get_stats()

        self.assertEqual(
            [d['name'] for d in data['drinks']],
            ['Espresso Martini', 'Highball', 'Negroni'],
        )

    def test_menu_with_no_orders(self):
        data = self.get_stats()

        self.assertEqual(data['total_orders'], 0)
        self.assertEqual(data['unique_guests'], 0)
        self.assertIsNone(data['first_order_at'])
        self.assertIsNone(data['last_order_at'])
        self.assertEqual(data['guests'], [])
        self.assertEqual(len(data['drinks']), 3)
        self.assertTrue(all(d['count'] == 0 for d in data['drinks']))

    def test_reports_order_time_span(self):
        self.order(self.martini, 'Alex', times=2)

        data = self.get_stats()

        self.assertIsNotNone(data['first_order_at'])
        self.assertIsNotNone(data['last_order_at'])
        self.assertLessEqual(data['first_order_at'], data['last_order_at'])

    def test_orders_on_another_menu_are_excluded(self):
        other = Menu.objects.create(owner=self.user, name='Summer')
        MenuItem.objects.create(menu=other, recipe=self.martini, order=0)
        Order.objects.create(menu=other, recipe=self.martini, guest_name='Someone')
        self.order(self.negroni, 'Alex')

        data = self.get_stats()

        self.assertEqual(data['total_orders'], 1)
        self.assertEqual(data['unique_guests'], 1)


class TwoUserAPITestCase(AuthenticatedAPITestCase):
    """Two accounts with a full set of data each; the client is signed in as `self.user`.

    `mine` and `theirs` hold one row of every kind. Both bars have a "Rum" category with a
    generic "Rum" ingredient in it, because names are unique per owner, not globally.
    """

    def setUp(self):
        super().setUp()
        self.other = get_user_model().objects.create_user(
            username='other',
            email='other@example.com',
        )
        self.mine = self.make_bar(self.user, 'Gin', 'Plymouth Gin', 'Martini', 'Friday Night')
        self.theirs = self.make_bar(self.other, 'Agave', 'Smith & Cross', 'Daiquiri', 'Tiki Night')

    def make_bar(self, owner, category, ingredient, recipe, menu):
        bar = {}
        shared = IngredientCategory.objects.create(owner=owner, name='Rum')
        bar['category'] = IngredientCategory.objects.create(owner=owner, name=category)
        bar['ingredient'] = Ingredient.objects.create(
            owner=owner, name=ingredient, category=bar['category'],
        )
        Ingredient.objects.create(owner=owner, name='Rum', category=shared, is_generic=True)
        bar['recipe'] = Recipe.objects.create(owner=owner, name=recipe)
        RecipeIngredient.objects.create(
            recipe=bar['recipe'], ingredient=bar['ingredient'], amount=2, unit='oz',
        )
        bar['menu'] = Menu.objects.create(owner=owner, name=menu, is_published=True)
        bar['menu_item'] = MenuItem.objects.create(menu=bar['menu'], recipe=bar['recipe'], order=1)
        bar['buy_list_item'] = BuyListItem.objects.create(owner=owner, ingredient=bar['ingredient'])
        return bar

    def detail_urls(self, bar):
        return {
            'category': f"/api/categories/{bar['category'].id}/",
            'ingredient': f"/api/ingredients/{bar['ingredient'].id}/",
            'recipe': f"/api/recipes/{bar['recipe'].id}/",
            'menu': f"/api/menus/{bar['menu'].id}/",
            'buy_list_item': f"/api/buy-list/{bar['buy_list_item'].id}/",
        }


class CrossUserIsolationTests(TwoUserAPITestCase):
    """One user can never see or touch another user's rows.

    Another user's object is a 404, not a 403: the response must not confirm that the id
    exists at all.
    """

    def test_lists_contain_only_my_rows(self):
        for name, url in [
            ('category', '/api/categories/'),
            ('ingredient', '/api/ingredients/'),
            ('recipe', '/api/recipes/'),
            ('menu', '/api/menus/'),
            ('buy_list_item', '/api/buy-list/'),
        ]:
            with self.subTest(url=url):
                response = self.client.get(url)
                self.assertEqual(response.status_code, status.HTTP_200_OK)
                self.assertIn(self.mine[name].id, [row['id'] for row in response.data])
                model = type(self.mine[name])
                self.assertEqual(
                    {row['id'] for row in response.data},
                    set(model.objects.filter(owner=self.user).values_list('id', flat=True)),
                )

    def test_search_does_not_reach_another_users_rows(self):
        for url in ['/api/ingredients/?search=Smith', '/api/recipes/?search=Daiquiri',
                    '/api/categories/?search=Agave']:
            with self.subTest(url=url):
                self.assertEqual(self.client.get(url).data, [])

    def test_my_own_rows_are_readable(self):
        for name, url in self.detail_urls(self.mine).items():
            with self.subTest(model=name):
                self.assertEqual(self.client.get(url).status_code, status.HTTP_200_OK)

    def test_another_users_rows_cannot_be_read(self):
        for name, url in self.detail_urls(self.theirs).items():
            with self.subTest(model=name):
                self.assertEqual(self.client.get(url).status_code, status.HTTP_404_NOT_FOUND)

    def test_another_users_rows_cannot_be_updated(self):
        for name, url in self.detail_urls(self.theirs).items():
            with self.subTest(model=name):
                response = self.client.patch(url, {'name': 'Hijacked', 'notes': 'Hijacked'}, format='json')
                self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.theirs['recipe'].refresh_from_db()
        self.theirs['buy_list_item'].refresh_from_db()
        self.assertEqual(self.theirs['recipe'].name, 'Daiquiri')
        self.assertEqual(self.theirs['buy_list_item'].notes, '')

    def test_another_users_rows_cannot_be_deleted(self):
        for name, url in self.detail_urls(self.theirs).items():
            with self.subTest(model=name):
                self.assertEqual(self.client.delete(url).status_code, status.HTTP_404_NOT_FOUND)
        for name in ['category', 'ingredient', 'recipe', 'menu', 'buy_list_item']:
            with self.subTest(model=name):
                self.theirs[name].refresh_from_db()  # raises DoesNotExist if it was deleted

    def test_another_users_detail_actions_are_not_found(self):
        menu = self.theirs['menu'].id
        calls = [
            ('get', f"/api/ingredients/{self.theirs['ingredient'].id}/recipes/", None),
            ('get', f"/api/categories/{self.theirs['category'].id}/ingredients/", None),
            ('get', f'/api/menus/{menu}/stats/', None),
            ('post', f'/api/menus/{menu}/activate/', None),
            ('post', f'/api/menus/{menu}/add-item/', {'recipe_id': self.mine['recipe'].id}),
            ('patch', f'/api/menus/{menu}/reorder-items/',
             [{'id': self.theirs['menu_item'].id, 'order': 9}]),
            ('delete', f"/api/menu-items/{self.theirs['menu_item'].id}/", None),
        ]
        for method, url, body in calls:
            with self.subTest(method=method, url=url):
                response = getattr(self.client, method)(url, body, format='json')
                self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.theirs['menu'].refresh_from_db()
        self.theirs['menu_item'].refresh_from_db()
        self.assertFalse(self.theirs['menu'].is_active)
        self.assertEqual(self.theirs['menu_item'].order, 1)
        self.assertEqual(self.theirs['menu'].items.count(), 1)

    def test_reordering_my_menu_cannot_move_another_menus_item(self):
        response = self.client.patch(
            f"/api/menus/{self.mine['menu'].id}/reorder-items/",
            [{'id': self.theirs['menu_item'].id, 'order': 9}],
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.theirs['menu_item'].refresh_from_db()
        self.assertEqual(self.theirs['menu_item'].order, 1)

    def test_recipe_filters_ignore_another_users_ids(self):
        # Put their ingredient in my recipe behind the API's back: even then, filtering by
        # an ingredient or category that is not mine must match nothing.
        RecipeIngredient.objects.create(
            recipe=self.mine['recipe'], ingredient=self.theirs['ingredient'], amount=1, unit='oz',
        )
        for query in [f"ingredient={self.theirs['ingredient'].id}",
                      f"category={self.theirs['category'].id}"]:
            with self.subTest(query=query):
                self.assertEqual(self.client.get(f'/api/recipes/?{query}').data, [])

    def test_stats_do_not_name_another_users_recipe(self):
        # The API no longer lets an order name a drink that is off its menu; a row that
        # predates that check still must not leak the other user's recipe.
        Order.objects.create(menu=self.mine['menu'], recipe=self.theirs['recipe'], guest_name='Sam')
        response = self.client.get(f"/api/menus/{self.mine['menu'].id}/stats/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertNotIn('Daiquiri', str(response.data))

    def test_activating_my_menu_leaves_another_users_active_menu_alone(self):
        self.theirs['menu'].is_active = True
        self.theirs['menu'].save()
        mine_old = Menu.objects.create(owner=self.user, name='Last Week', is_active=True)

        response = self.client.post(f"/api/menus/{self.mine['menu'].id}/activate/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.theirs['menu'].refresh_from_db()
        mine_old.refresh_from_db()
        self.assertTrue(self.theirs['menu'].is_active)
        self.assertFalse(mine_old.is_active)


class ForeignIdTests(TwoUserAPITestCase):
    """Ids in a request body must name the requester's own rows.

    Scoping the queryset does not cover these; each is rejected exactly as a nonexistent id
    would be.
    """

    def test_ingredient_cannot_join_another_users_category(self):
        response = self.client.post(
            '/api/ingredients/',
            {'name': 'Tanqueray', 'category_id': self.theirs['category'].id},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('category_id', response.data)

    def test_ingredient_cannot_be_moved_into_another_users_category(self):
        response = self.client.patch(
            f"/api/ingredients/{self.mine['ingredient'].id}/",
            {'category_id': self.theirs['category'].id},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.mine['ingredient'].refresh_from_db()
        self.assertEqual(self.mine['ingredient'].category, self.mine['category'])

    def recipe_payload(self, ingredient):
        return {
            'name': 'Borrowed',
            'ingredients': [{'ingredient_id': ingredient.id, 'amount': 2, 'unit': 'oz'}],
        }

    def test_recipe_cannot_be_created_with_another_users_ingredient(self):
        response = self.client.post(
            '/api/recipes/', self.recipe_payload(self.theirs['ingredient']), format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(Recipe.objects.filter(name='Borrowed').exists())

    def test_recipe_cannot_be_updated_to_use_another_users_ingredient(self):
        response = self.client.put(
            f"/api/recipes/{self.mine['recipe'].id}/",
            self.recipe_payload(self.theirs['ingredient']),
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            list(self.mine['recipe'].ingredients.all()), [self.mine['ingredient']],
        )

    def test_another_users_recipe_cannot_be_added_to_my_menu(self):
        response = self.client.post(
            f"/api/menus/{self.mine['menu'].id}/add-item/",
            {'recipe_id': self.theirs['recipe'].id},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('recipe_id', response.data)
        self.assertEqual(self.mine['menu'].items.count(), 1)

    def test_another_users_ingredient_cannot_go_on_my_buy_list(self):
        other_ingredient = Ingredient.objects.create(owner=self.other, name='Wray & Nephew')
        response = self.client.post(
            '/api/buy-list/', {'ingredient_id': other_ingredient.id}, format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(BuyListItem.objects.filter(ingredient=other_ingredient).exists())

    def test_buy_list_does_not_hand_back_another_users_existing_item(self):
        """Posting an ingredient already on a list returns that item -- but only my own."""
        response = self.client.post(
            '/api/buy-list/', {'ingredient_id': self.theirs['ingredient'].id}, format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class PerOwnerNameTests(TwoUserAPITestCase):
    """Category and ingredient names are unique within an account, not across accounts."""

    def test_i_can_use_a_name_another_user_already_has(self):
        for url, name in [('/api/categories/', 'Agave'), ('/api/ingredients/', 'Smith & Cross')]:
            with self.subTest(url=url):
                response = self.client.post(url, {'name': name}, format='json')
                self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_new_category_gets_its_own_generic_ingredient_not_another_users(self):
        response = self.client.post('/api/categories/', {'name': 'Agave'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        generic = Ingredient.objects.get(owner=self.user, name='Agave')
        self.assertTrue(generic.is_generic)
        self.assertEqual(generic.category.owner, self.user)
        self.assertFalse(Ingredient.objects.filter(owner=self.other, name='Agave').exists())

    def test_i_cannot_use_one_of_my_own_names_twice(self):
        for url, name in [('/api/categories/', 'Gin'), ('/api/ingredients/', 'Plymouth Gin')]:
            with self.subTest(url=url):
                response = self.client.post(url, {'name': name}, format='json')
                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
                self.assertIn('already exists', str(response.data['name']))

    def test_renaming_onto_one_of_my_own_names_is_rejected(self):
        response = self.client.patch(
            f"/api/ingredients/{self.mine['ingredient'].id}/", {'name': 'Rum'}, format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_saving_a_row_under_its_existing_name_is_fine(self):
        for name, body in [('category', {'name': 'Gin', 'notes': 'juniper'}),
                           ('ingredient', {'name': 'Plymouth Gin', 'stock_level': 50})]:
            with self.subTest(model=name):
                response = self.client.patch(self.detail_urls(self.mine)[name], body, format='json')
                self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_the_database_enforces_it_too(self):
        with self.assertRaises(IntegrityError), transaction.atomic():
            Ingredient.objects.create(owner=self.user, name='Plymouth Gin')
        with self.assertRaises(IntegrityError), transaction.atomic():
            IngredientCategory.objects.create(owner=self.user, name='Gin')

    def test_a_row_cannot_exist_without_an_owner(self):
        for model in [IngredientCategory, Ingredient, Recipe, Menu]:
            with self.subTest(model=model.__name__):
                with self.assertRaises(IntegrityError), transaction.atomic():
                    model.objects.create(name='Nobody')
        with self.assertRaises(IntegrityError), transaction.atomic():
            BuyListItem.objects.create(ingredient=Ingredient.objects.create(owner=self.user, name='Tonic'))


class OwnerAssignmentTests(TwoUserAPITestCase):
    """Everything created through the API belongs to whoever created it, and only them."""

    def test_created_rows_belong_to_the_requester(self):
        ingredient = self.client.post('/api/ingredients/', {'name': 'Campari'}, format='json')
        recipe = self.client.post(
            '/api/recipes/',
            {'name': 'Negroni', 'ingredients': [
                {'ingredient_id': self.mine['ingredient'].id, 'amount': 1, 'unit': 'oz'},
            ]},
            format='json',
        )
        menu = self.client.post('/api/menus/', {'name': 'Sunday'}, format='json')
        buy = self.client.post('/api/buy-list/', {'ingredient_id': ingredient.data['id']}, format='json')
        for response, model in [(ingredient, Ingredient), (recipe, Recipe), (menu, Menu),
                                (buy, BuyListItem)]:
            with self.subTest(model=model.__name__):
                self.assertEqual(response.status_code, status.HTTP_201_CREATED)
                self.assertEqual(model.objects.get(pk=response.data['id']).owner, self.user)

    def test_category_and_its_generic_ingredient_belong_to_the_requester(self):
        response = self.client.post('/api/categories/', {'name': 'Vermouth'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(IngredientCategory.objects.get(name='Vermouth').owner, self.user)
        generic = Ingredient.objects.get(name='Vermouth')
        self.assertEqual(generic.owner, self.user)
        self.assertTrue(generic.is_generic)

    def test_owner_in_the_request_body_is_ignored(self):
        calls = [
            ('/api/ingredients/', {'name': 'Campari'}, Ingredient),
            ('/api/categories/', {'name': 'Amaro'}, IngredientCategory),
            ('/api/recipes/', {'name': 'Negroni', 'ingredients': []}, Recipe),
            ('/api/menus/', {'name': 'Sunday'}, Menu),
        ]
        for url, body, model in calls:
            with self.subTest(url=url):
                body = {**body, 'owner': self.other.id, 'owner_id': self.other.id}
                response = self.client.post(url, body, format='json')
                self.assertEqual(response.status_code, status.HTTP_201_CREATED)
                self.assertNotIn('owner', response.data)
                self.assertEqual(model.objects.get(pk=response.data['id']).owner, self.user)

    def test_owner_cannot_be_reassigned_by_update(self):
        response = self.client.patch(
            f"/api/recipes/{self.mine['recipe'].id}/",
            {'owner': self.other.id, 'owner_id': self.other.id},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.mine['recipe'].refresh_from_db()
        self.assertEqual(self.mine['recipe'].owner, self.user)

    def test_renaming_a_category_renames_only_my_generic_ingredient(self):
        generic = Ingredient.objects.create(
            owner=self.user, name='Gin', category=self.mine['category'], is_generic=True,
        )
        response = self.client.patch(
            f"/api/categories/{self.mine['category'].id}/", {'name': 'Genever'}, format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        generic.refresh_from_db()
        self.assertEqual(generic.name, 'Genever')


class MenuAPITests(AuthenticatedAPITestCase):
    """Menus and their items."""

    def setUp(self):
        super().setUp()
        self.negroni = Recipe.objects.create(owner=self.user, name='Negroni')
        self.martini = Recipe.objects.create(owner=self.user, name='Martini')
        self.menu = Menu.objects.create(owner=self.user, name='Friday Night')

    def test_create_menu(self):
        response = self.client.post(
            '/api/menus/', {'name': 'Sunday', 'top_decoration': 'maple'}, format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['top_decoration'], 'maple')
        self.assertFalse(response.data['is_active'])
        self.assertEqual(response.data['items'], [])

    def test_is_active_cannot_be_set_directly(self):
        response = self.client.patch(
            f'/api/menus/{self.menu.id}/', {'is_active': True}, format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.menu.refresh_from_db()
        self.assertFalse(self.menu.is_active)

    def test_list_reports_item_count(self):
        MenuItem.objects.create(menu=self.menu, recipe=self.negroni, order=1)
        response = self.client.get('/api/menus/')
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['item_count'], 1)
        self.assertNotIn('items', response.data[0])

    def test_activate_publishes_and_deactivates_my_other_menus(self):
        old = Menu.objects.create(owner=self.user, name='Last Week', is_active=True)
        response = self.client.post(f'/api/menus/{self.menu.id}/activate/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['is_active'])
        self.assertTrue(response.data['is_published'])
        old.refresh_from_db()
        self.assertFalse(old.is_active)

    def test_add_item_appends_in_order(self):
        for recipe in [self.negroni, self.martini]:
            response = self.client.post(
                f'/api/menus/{self.menu.id}/add-item/', {'recipe_id': recipe.id}, format='json',
            )
            self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        items = response.data['items']
        self.assertEqual([item['recipe']['name'] for item in items], ['Negroni', 'Martini'])
        self.assertEqual([item['order'] for item in items], [1, 2])

    def test_add_item_twice_is_rejected(self):
        MenuItem.objects.create(menu=self.menu, recipe=self.negroni, order=1)
        response = self.client.post(
            f'/api/menus/{self.menu.id}/add-item/', {'recipe_id': self.negroni.id}, format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['detail'], 'This recipe is already on the menu.')

    def test_reorder_items(self):
        first = MenuItem.objects.create(menu=self.menu, recipe=self.negroni, order=1)
        second = MenuItem.objects.create(menu=self.menu, recipe=self.martini, order=2)
        response = self.client.patch(
            f'/api/menus/{self.menu.id}/reorder-items/',
            [{'id': first.id, 'order': 2}, {'id': second.id, 'order': 1}],
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            list(self.menu.items.values_list('recipe__name', flat=True)), ['Martini', 'Negroni'],
        )

    def test_remove_item(self):
        item = MenuItem.objects.create(menu=self.menu, recipe=self.negroni, order=1)
        response = self.client.delete(f'/api/menu-items/{item.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(self.menu.items.count(), 0)

    def test_deleting_a_menu_takes_its_items_and_orders_with_it(self):
        MenuItem.objects.create(menu=self.menu, recipe=self.negroni, order=1)
        Order.objects.create(menu=self.menu, recipe=self.negroni, guest_name='Sam')
        response = self.client.delete(f'/api/menus/{self.menu.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(MenuItem.objects.count(), 0)
        self.assertEqual(Order.objects.count(), 0)
        self.assertTrue(Recipe.objects.filter(pk=self.negroni.pk).exists())


class OrderAPITests(AuthenticatedAPITestCase):
    """The bartender's side: the signed-in owner lists, fulfils and cancels their orders."""

    def setUp(self):
        super().setUp()
        self.recipe = Recipe.objects.create(owner=self.user, name='Negroni')
        self.menu = Menu.objects.create(owner=self.user, name='Friday Night', is_active=True)
        MenuItem.objects.create(menu=self.menu, recipe=self.recipe, order=1)

    def place(self, guest='Sam'):
        return Order.objects.create(menu=self.menu, recipe=self.recipe, guest_name=guest)

    def test_orders_are_listed_oldest_first(self):
        first, second = self.place('Sam'), self.place('Alex')
        response = self.client.get('/api/orders/')
        self.assertEqual([order['id'] for order in response.data], [first.id, second.id])

    def test_filter_by_fulfilled(self):
        waiting = self.place('Sam')
        done = self.place('Alex')
        done.is_fulfilled = True
        done.save()
        response = self.client.get('/api/orders/?fulfilled=false')
        self.assertEqual([order['id'] for order in response.data], [waiting.id])
        response = self.client.get('/api/orders/?today=true&fulfilled=true')
        self.assertEqual([order['id'] for order in response.data], [done.id])

    def test_fulfil_an_order(self):
        order = self.place()
        response = self.client.patch(
            f'/api/orders/{order.id}/', {'is_fulfilled': True}, format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        order.refresh_from_db()
        self.assertTrue(order.is_fulfilled)

    def test_cancel_an_order(self):
        order = self.place()
        response = self.client.delete(f'/api/orders/{order.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Order.objects.exists())

    def test_orders_cannot_be_created_here(self):
        """An order only ever starts from a shared menu, through the share-token URL."""
        response = self.client.post(
            '/api/orders/',
            {'recipe_id': self.recipe.id, 'menu_id': self.menu.id, 'guest_name': 'Sam'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_put_is_not_allowed(self):
        order = self.place()
        response = self.client.put(f'/api/orders/{order.id}/', {'guest_name': 'X'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)


class OrderOwnershipTests(TwoUserAPITestCase):
    """Orders belong to whoever owns their menu, and nobody else can see or touch them."""

    def setUp(self):
        super().setUp()
        self.my_order = Order.objects.create(
            menu=self.mine['menu'], recipe=self.mine['recipe'], guest_name='Sam',
        )
        self.their_order = Order.objects.create(
            menu=self.theirs['menu'], recipe=self.theirs['recipe'], guest_name='Alex',
        )

    def test_list_holds_only_my_orders(self):
        response = self.client.get('/api/orders/')
        self.assertEqual([order['id'] for order in response.data], [self.my_order.id])

    def test_another_users_order_is_a_404(self):
        url = f'/api/orders/{self.their_order.id}/'
        self.assertEqual(self.client.get(url).status_code, status.HTTP_404_NOT_FOUND)
        response = self.client.patch(url, {'is_fulfilled': True}, format='json')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(self.client.delete(url).status_code, status.HTTP_404_NOT_FOUND)
        self.their_order.refresh_from_db()
        self.assertFalse(self.their_order.is_fulfilled)

    def test_patch_cannot_move_an_order_or_swap_its_recipe(self):
        """Ids in the body are ignored, so they cannot reach into another user's bar."""
        response = self.client.patch(
            f'/api/orders/{self.my_order.id}/',
            {
                'menu_id': self.theirs['menu'].id,
                'recipe_id': self.theirs['recipe'].id,
                'guest_name': 'Mallory',
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['recipe']['name'], 'Martini')
        self.my_order.refresh_from_db()
        self.assertEqual(self.my_order.menu, self.mine['menu'])
        self.assertEqual(self.my_order.recipe, self.mine['recipe'])
        self.assertEqual(self.my_order.guest_name, 'Sam')


class GuestOrderAPITests(APITestCase):
    """Guest ordering through the share-token URLs: no session, scoped to one menu.

    Deliberately anonymous. The share token is the only credential a guest has, and their
    name is the only thing separating their orders from another guest's.
    """

    def setUp(self):
        owner = get_user_model().objects.create_user(username='tester', email='tester@example.com')
        self.recipe = Recipe.objects.create(owner=owner, name='Negroni')
        self.off_menu_recipe = Recipe.objects.create(owner=owner, name='Zombie')
        self.menu = Menu.objects.create(owner=owner, name='Friday Night', is_active=True)
        MenuItem.objects.create(menu=self.menu, recipe=self.recipe, order=1)
        # Saved after the active menu, with is_active False, so it does not deactivate it.
        self.draft_menu = Menu.objects.create(owner=owner, name='Next Month', is_published=True)
        MenuItem.objects.create(menu=self.draft_menu, recipe=self.recipe, order=1)
        self.url = f'/api/public/menu/{self.menu.share_token}/orders/'
        self.draft_url = f'/api/public/menu/{self.draft_menu.share_token}/orders/'

    def place(self, guest='Sam', menu=None):
        return Order.objects.create(menu=menu or self.menu, recipe=self.recipe, guest_name=guest)

    def order(self, url=None, **overrides):
        body = {'recipe_id': self.recipe.id, 'guest_name': 'Sam', **overrides}
        return self.client.post(url or self.url, body, format='json')

    # --- placing ---

    def test_guest_can_place_an_order(self):
        response = self.order()
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['recipe']['name'], 'Negroni')
        self.assertEqual(response.data['menu_id'], self.menu.id)
        self.assertFalse(response.data['is_fulfilled'])

    def test_order_needs_a_guest_name(self):
        response = self.client.post(self.url, {'recipe_id': self.recipe.id}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('guest_name', response.data)

    def test_unknown_share_token_is_a_404(self):
        response = self.order(url='/api/public/menu/00000000-0000-0000-0000-000000000000/orders/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertFalse(Order.objects.exists())

    def test_inactive_menu_does_not_take_orders(self):
        """Published is not enough: a menu can be previewed by its link before the party."""
        response = self.order(url=self.draft_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(Order.objects.exists())

    def test_drink_must_be_on_the_menu(self):
        response = self.order(recipe_id=self.off_menu_recipe.id)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('recipe_id', response.data)
        self.assertFalse(Order.objects.exists())

    def test_body_cannot_redirect_the_order_or_mark_it_served(self):
        response = self.order(menu_id=self.draft_menu.id, is_fulfilled=True)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        order = Order.objects.get()
        self.assertEqual(order.menu, self.menu)
        self.assertFalse(order.is_fulfilled)

    # --- listing ---

    def test_guest_sees_only_their_own_orders_on_this_menu(self):
        mine = self.place('Sam')
        self.place('Alex')
        self.place('Sam', menu=self.draft_menu)
        response = self.client.get(self.url, {'guest_name': 'Sam'})
        self.assertEqual([order['id'] for order in response.data], [mine.id])

    def test_listing_without_a_name_returns_nothing(self):
        """The share token alone must not hand over the whole party's order list."""
        self.place('Sam')
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])

    def test_orders_can_still_be_read_once_the_menu_is_inactive(self):
        order = self.place('Sam', menu=self.draft_menu)
        response = self.client.get(self.draft_url, {'guest_name': 'Sam'})
        self.assertEqual([o['id'] for o in response.data], [order.id])

    def test_guest_order_list_is_not_publicly_cacheable(self):
        """Per-guest data on an anonymous URL: a CDN must never hold on to it."""
        self.place('Sam')
        response = self.client.get(self.url, {'guest_name': 'Sam'})
        self.assertNotIn('Cache-Control', response)

    # --- cancelling ---

    def test_guest_can_cancel_their_own_order(self):
        order = self.place('Sam')
        response = self.client.delete(f'{self.url}{order.id}/?guest_name=Sam')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Order.objects.exists())

    def test_cancel_needs_the_matching_name(self):
        order = self.place('Sam')
        for query in ('', '?guest_name=Alex'):
            with self.subTest(query=query):
                response = self.client.delete(f'{self.url}{order.id}/{query}')
                self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertTrue(Order.objects.exists())

    def test_cancel_needs_the_orders_own_menu_token(self):
        order = self.place('Sam')
        response = self.client.delete(f'{self.draft_url}{order.id}/?guest_name=Sam')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertTrue(Order.objects.exists())

    def test_served_order_cannot_be_cancelled(self):
        order = self.place('Sam')
        order.is_fulfilled = True
        order.save()
        response = self.client.delete(f'{self.url}{order.id}/?guest_name=Sam')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(Order.objects.exists())

    def test_guest_cannot_fulfil_an_order(self):
        order = self.place('Sam')
        response = self.client.patch(
            f'{self.url}{order.id}/?guest_name=Sam', {'is_fulfilled': True}, format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)


class BuyListAPITests(AuthenticatedAPITestCase):
    """The buy list: one entry per ingredient."""

    def setUp(self):
        super().setUp()
        self.category = IngredientCategory.objects.create(owner=self.user, name='Gin')
        self.ingredient = Ingredient.objects.create(
            owner=self.user, name='Plymouth Gin', category=self.category,
        )

    def add(self, **extra):
        return self.client.post(
            '/api/buy-list/', {'ingredient_id': self.ingredient.id, **extra}, format='json',
        )

    def test_add_ingredient(self):
        response = self.add(notes='two bottles')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['ingredient']['name'], 'Plymouth Gin')
        self.assertEqual(response.data['ingredient']['category']['name'], 'Gin')
        self.assertEqual(response.data['notes'], 'two bottles')

    def test_adding_twice_returns_the_existing_entry(self):
        first = self.add(notes='two bottles')
        second = self.add(notes='ignored')
        self.assertEqual(second.status_code, status.HTTP_200_OK)
        self.assertEqual(second.data['id'], first.data['id'])
        self.assertEqual(second.data['notes'], 'two bottles')
        self.assertEqual(BuyListItem.objects.count(), 1)

    def test_list_is_newest_first(self):
        tonic = Ingredient.objects.create(owner=self.user, name='Tonic')
        self.add()
        self.client.post('/api/buy-list/', {'ingredient_id': tonic.id}, format='json')
        response = self.client.get('/api/buy-list/')
        self.assertEqual(
            [row['ingredient']['name'] for row in response.data], ['Tonic', 'Plymouth Gin'],
        )

    def test_update_notes(self):
        item = self.add().data['id']
        response = self.client.patch(f'/api/buy-list/{item}/', {'notes': 'the navy strength'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['notes'], 'the navy strength')

    def test_remove(self):
        item = self.add().data['id']
        response = self.client.delete(f'/api/buy-list/{item}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(BuyListItem.objects.exists())
        self.assertTrue(Ingredient.objects.filter(pk=self.ingredient.pk).exists())

    def test_put_is_not_allowed(self):
        item = self.add().data['id']
        response = self.client.put(f'/api/buy-list/{item}/', {'notes': 'x'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_deleting_the_ingredient_removes_it_from_the_list(self):
        self.add()
        self.client.delete(f'/api/ingredients/{self.ingredient.id}/')
        self.assertFalse(BuyListItem.objects.exists())


class OwnerAdminTests(TestCase):
    """Django admin shows who owns each row and will not create a row nobody owns."""

    def setUp(self):
        User = get_user_model()
        self.admin_user = User.objects.create_superuser(username='admin', email='admin@example.com')
        self.owner = User.objects.create_user(username='tester', email='tester@example.com')
        self.client.force_login(self.admin_user)
        category = IngredientCategory.objects.create(owner=self.owner, name='Gin')
        ingredient = Ingredient.objects.create(owner=self.owner, name='Plymouth Gin', category=category)
        Recipe.objects.create(owner=self.owner, name='Martini')
        Menu.objects.create(owner=self.owner, name='Friday Night')
        BuyListItem.objects.create(owner=self.owner, ingredient=ingredient)

    def test_changelists_show_and_filter_by_owner(self):
        for model in ['ingredientcategory', 'ingredient', 'recipe', 'menu', 'buylistitem']:
            with self.subTest(model=model):
                response = self.client.get(f'/admin/cocktails/{model}/')
                self.assertEqual(response.status_code, 200)
                self.assertContains(response, 'column-owner')
                self.assertContains(response, f'?owner__id__exact={self.owner.id}')
                filtered = self.client.get(
                    f'/admin/cocktails/{model}/?owner__id__exact={self.admin_user.id}'
                )
                self.assertEqual(filtered.context['cl'].result_count, 0)

    def test_add_forms_load(self):
        for model in ['ingredientcategory', 'ingredient', 'recipe', 'menu', 'buylistitem']:
            with self.subTest(model=model):
                response = self.client.get(f'/admin/cocktails/{model}/add/')
                self.assertEqual(response.status_code, 200)
                self.assertContains(response, 'name="owner"')

    def test_a_row_cannot_be_created_without_an_owner(self):
        response = self.client.post('/admin/cocktails/ingredient/add/', {'name': 'Tonic'})
        self.assertEqual(response.status_code, 200)
        self.assertIn('owner', response.context['adminform'].form.errors)
        self.assertFalse(Ingredient.objects.filter(name='Tonic').exists())

    def test_category_created_in_admin_gives_its_generic_ingredient_the_same_owner(self):
        response = self.client.post('/admin/cocktails/ingredientcategory/add/', {
            'owner': self.owner.id, 'name': 'Rum', 'notes': '', 'create_generic_ingredient': 'on',
        })
        self.assertEqual(response.status_code, 302)
        generic = Ingredient.objects.get(name='Rum')
        self.assertEqual(generic.owner, self.owner)
        self.assertTrue(generic.is_generic)


class AnonymousAccessTests(APITestCase):
    """What an unauthenticated caller can and cannot do.

    Nothing, except the two things guests need: reading a menu by its share token and
    ordering from it. Deliberately NOT inheriting AuthenticatedAPITestCase -- these tests
    are about the anonymous client.
    """

    def setUp(self):
        super().setUp()
        owner = get_user_model().objects.create_user(username='tester', email='tester@example.com')
        self.category = IngredientCategory.objects.create(owner=owner, name='Gin')
        self.ingredient = Ingredient.objects.create(
            owner=owner, name='Plymouth Gin', category=self.category,
        )
        self.recipe = Recipe.objects.create(owner=owner, name='Martini')
        RecipeIngredient.objects.create(
            recipe=self.recipe, ingredient=self.ingredient, amount=2.5, unit='oz'
        )
        self.menu = Menu.objects.create(owner=owner, name='Friday Night', is_published=True)
        self.menu_item = MenuItem.objects.create(menu=self.menu, recipe=self.recipe, order=1)

    # --- reads are refused ---
    # 401, not 403: accounts.authentication.SessionAuthentication offers a WWW-Authenticate
    # value so that "not signed in" is distinguishable from "not allowed". The frontend
    # sends a 401 to the login page.

    def test_anonymous_cannot_read_anything_private(self):
        """Truncating a share URL must not hand a guest the owner's whole bar."""
        urls = [
            '/api/ingredients/',
            f'/api/ingredients/{self.ingredient.id}/',
            '/api/recipes/',
            f'/api/recipes/{self.recipe.id}/',
            '/api/categories/',
            f'/api/categories/{self.category.id}/',
            '/api/menus/',
            f'/api/menus/{self.menu.id}/',
            f'/api/menus/{self.menu.id}/stats/',
            '/api/buy-list/',
            '/api/hello/',
        ]
        for url in urls:
            with self.subTest(url=url):
                response = self.client.get(url)
                self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_menu_list_does_not_leak_share_tokens(self):
        """A share token is the only credential a guest has; the menu list hands out all of them."""
        response = self.client.get('/api/menus/')
        self.assertNotIn(str(self.menu.share_token), response.content.decode())

    def test_signed_in_user_can_read(self):
        """The other half of the flip: a session is enough, with no login UI yet."""
        self.client.force_login(
            get_user_model().objects.create_user(username='owner', email='owner@example.com')
        )
        for url in ['/api/ingredients/', '/api/recipes/', '/api/menus/', '/api/buy-list/']:
            with self.subTest(url=url):
                self.assertEqual(self.client.get(url).status_code, status.HTTP_200_OK)

    # --- writes are refused ---

    def test_anonymous_cannot_create_ingredient(self):
        """The destructive hole this whole change exists to close."""
        response = self.client.post('/api/ingredients/', {'name': 'Rye'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertFalse(Ingredient.objects.filter(name='Rye').exists())

    def test_anonymous_cannot_update_ingredient(self):
        response = self.client.patch(
            f'/api/ingredients/{self.ingredient.id}/', {'name': 'Vandalised'}, format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.ingredient.refresh_from_db()
        self.assertEqual(self.ingredient.name, 'Plymouth Gin')

    def test_anonymous_cannot_delete_recipe(self):
        """`curl -X DELETE .../api/recipes/12/` was the exact exposure."""
        response = self.client.delete(f'/api/recipes/{self.recipe.id}/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertTrue(Recipe.objects.filter(pk=self.recipe.pk).exists())

    def test_anonymous_cannot_create_category(self):
        response = self.client.post('/api/categories/', {'name': 'Mezcal'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_anonymous_cannot_create_menu(self):
        response = self.client.post('/api/menus/', {'name': 'Hijacked'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_anonymous_cannot_activate_menu(self):
        """Activation is a POST action, so it falls under the same default."""
        response = self.client.post(f'/api/menus/{self.menu.id}/activate/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.menu.refresh_from_db()
        self.assertFalse(self.menu.is_active)

    def test_anonymous_cannot_remove_menu_item(self):
        response = self.client.delete(f'/api/menu-items/{self.menu_item.id}/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertTrue(MenuItem.objects.filter(pk=self.menu_item.pk).exists())

    def test_anonymous_cannot_add_to_buy_list(self):
        response = self.client.post(
            '/api/buy-list/', {'ingredient_id': self.ingredient.id}, format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertFalse(BuyListItem.objects.exists())

    # --- the two deliberate exemptions must keep working ---

    def test_public_menu_is_readable_by_share_token(self):
        """Guests open a shared menu with no account; breaking this breaks every QR code."""
        response = self.client.get(f'/api/public/menu/{self.menu.share_token}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], 'Friday Night')

    def test_guest_can_still_place_an_order(self):
        """Guests order without accounts, through the share-token URL of the active menu."""
        self.menu.is_active = True
        self.menu.save()
        response = self.client.post(
            f'/api/public/menu/{self.menu.share_token}/orders/',
            {'recipe_id': self.recipe.id, 'guest_name': 'Sam'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Order.objects.filter(guest_name='Sam').exists())

    def test_anonymous_cannot_use_the_bartenders_order_endpoint(self):
        """Listing, fulfilling and cancelling by bare order id all need the owner's session."""
        order = Order.objects.create(menu=self.menu, recipe=self.recipe, guest_name='Alex')
        url = f'/api/orders/{order.id}/'
        self.assertEqual(self.client.get('/api/orders/').status_code, status.HTTP_401_UNAUTHORIZED)
        response = self.client.patch(url, {'is_fulfilled': True}, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(self.client.delete(url).status_code, status.HTTP_401_UNAUTHORIZED)
        order.refresh_from_db()
        self.assertFalse(order.is_fulfilled)


class CacheHeaderTests(APITestCase):
    """`Cache-Control: public` must appear only on anonymous, share-token-keyed responses.

    Task 5.0 puts Vercel's CDN in front of the API. A per-user response marked public would
    then be cached and served to whoever asks next -- one user seeing another's data.
    """

    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username='tester',
            email='tester@example.com',
        )
        self.category = IngredientCategory.objects.create(owner=self.user, name='Gin')
        self.ingredient = Ingredient.objects.create(owner=self.user, name='London Dry', category=self.category)
        self.recipe = Recipe.objects.create(owner=self.user, name='Martini')
        self.menu = Menu.objects.create(owner=self.user, name='Friday Night')

    def private_read_urls(self):
        return [
            '/api/ingredients/',
            f'/api/ingredients/{self.ingredient.id}/',
            '/api/recipes/',
            f'/api/recipes/{self.recipe.id}/',
            '/api/categories/',
            f'/api/categories/{self.category.id}/',
            '/api/menus/',
            f'/api/menus/{self.menu.id}/',
            '/api/buy-list/',
            '/api/orders/',
        ]

    def test_public_menu_is_briefly_publicly_cacheable(self):
        response = self.client.get(f'/api/public/menu/{self.menu.share_token}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        directives = {d.strip() for d in response['Cache-Control'].split(',')}
        self.assertIn('public', directives)
        self.assertIn('max-age=30', directives)
        # A menu fix should reach guests in seconds, not after minutes of stale copies.
        self.assertNotIn('stale-while-revalidate', response['Cache-Control'])

    def test_missing_public_menu_is_not_cached(self):
        response = self.client.get('/api/public/menu/00000000-0000-0000-0000-000000000000/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertNotIn('public', response.get('Cache-Control', ''))

    def test_no_other_read_is_publicly_cacheable(self):
        self.client.force_login(self.user)
        for url in self.private_read_urls():
            with self.subTest(url=url):
                response = self.client.get(url)
                self.assertEqual(response.status_code, status.HTTP_200_OK)
                self.assertNotIn('public', response.get('Cache-Control', ''))

    def test_authenticated_responses_vary_on_cookie(self):
        """SessionMiddleware adds this once the session is read; verified, not assumed.

        Uses a real session login: force_authenticate skips the session entirely, so it
        would never trigger the header and the test would prove nothing.
        """
        self.client.force_login(self.user)
        for url in self.private_read_urls():
            with self.subTest(url=url):
                response = self.client.get(url)
                vary = {v.strip().lower() for v in response.get('Vary', '').split(',')}
                self.assertIn('cookie', vary)


@override_settings(ALLOWED_HOSTS=['.railway.app'])
class ProxiedCsrfTests(APITestCase):
    """Writes arriving through the Vercel rewrite must pass Django's CSRF origin check.

    Behind the proxy the browser's Origin is the Vercel domain while Host is Railway's.
    Django refuses that mismatch unless the origin is in CSRF_TRUSTED_ORIGINS, and the
    failure is a 403 on every write for a logged-in user -- reads keep working, so it is
    easy to ship without noticing.
    """

    RAILWAY_HOST = 'mixology-app-production.up.railway.app'

    def setUp(self):
        self.client = APIClient(enforce_csrf_checks=True)
        # The admin login page is what hands the browser its csrftoken cookie.
        self.client.get('/admin/login/', secure=True, HTTP_HOST=self.RAILWAY_HOST)
        self.csrf_token = self.client.cookies['csrftoken'].value
        self.client.force_login(
            get_user_model().objects.create_user(username='tester', email='tester@example.com')
        )

    def post_category(self, origin):
        return self.client.post(
            '/api/categories/',
            {'name': 'Gin'},
            format='json',
            secure=True,
            HTTP_HOST=self.RAILWAY_HOST,
            HTTP_ORIGIN=origin,
            HTTP_X_CSRFTOKEN=self.csrf_token,
        )

    def test_write_from_the_vercel_origin_is_accepted(self):
        response = self.post_category('https://thebarcart.vercel.app')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_write_from_an_unlisted_origin_is_refused(self):
        response = self.post_category('https://evil.example')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('Origin checking failed', response.data['detail'])


class AdminStaticFilesTests(TestCase):
    """The admin's stylesheet must be served with DEBUG off, as it is in production.

    The test runner forces DEBUG off, so this exercises the same path gunicorn does. Until
    WhiteNoise was added this was a 404 and the production admin was unstyled HTML.
    """

    def test_admin_stylesheet_is_served(self):
        response = self.client.get('/static/admin/css/base.css')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Content-Type'].split(';')[0], 'text/css')

    def test_unknown_static_path_is_a_404(self):
        response = self.client.get('/static/admin/css/does-not-exist.css')
        self.assertEqual(response.status_code, 404)


class OwnerBackfillMigrationTests(TransactionTestCase):
    """Migration 0011 hands every pre-existing row to the app's original user.

    Runs the real migration against rows created at the 0010 schema, because the thing
    worth pinning is what happens to a database that already has data in it.
    """

    BEFORE = [('cocktails', '0010_add_nullable_owner')]
    AFTER = [('cocktails', '0011_backfill_owner')]

    def setUp(self):
        self.executor = MigrationExecutor(connection)
        self.executor.migrate(self.BEFORE)
        self.old_apps = self.executor.loader.project_state(self.BEFORE).apps

    def tearDown(self):
        # Leave the schema fully migrated for whatever test runs next. Flush first: rows a
        # test left unowned would make the backfill refuse to run here too.
        call_command('flush', verbosity=0, interactive=False)
        executor = MigrationExecutor(connection)
        executor.migrate(executor.loader.graph.leaf_nodes())

    def create_unowned_rows(self):
        get = lambda name: self.old_apps.get_model('cocktails', name)
        category = get('IngredientCategory').objects.create(name='Gin')
        ingredient = get('Ingredient').objects.create(name='Plymouth Gin', category=category)
        get('Recipe').objects.create(name='Martini')
        get('Menu').objects.create(name='Friday Night')
        get('BuyListItem').objects.create(ingredient=ingredient)

    def run_backfill(self):
        executor = MigrationExecutor(connection)
        executor.migrate(self.AFTER)
        return executor.loader.project_state(self.AFTER).apps

    def test_existing_rows_go_to_the_original_user_not_the_superuser(self):
        User = self.old_apps.get_model('accounts', 'User')
        User.objects.create(username='admin', email='admin@example.com', is_superuser=True, is_staff=True)
        owner = User.objects.create(username='walkingtowork', email='walkingtowork@example.com')
        self.create_unowned_rows()

        new_apps = self.run_backfill()

        for name in ['IngredientCategory', 'Ingredient', 'Recipe', 'Menu', 'BuyListItem']:
            with self.subTest(model=name):
                rows = new_apps.get_model('cocktails', name).objects
                self.assertEqual(rows.count(), 1)
                self.assertEqual(rows.filter(owner_id=owner.id).count(), 1)

    def test_rows_that_already_have_an_owner_are_left_alone(self):
        User = self.old_apps.get_model('accounts', 'User')
        User.objects.create(username='walkingtowork', email='walkingtowork@example.com')
        friend = User.objects.create(username='friend', email='friend@example.com')
        self.old_apps.get_model('cocktails', 'Recipe').objects.create(name='Negroni', owner=friend)

        new_apps = self.run_backfill()

        recipe = new_apps.get_model('cocktails', 'Recipe').objects.get(name='Negroni')
        self.assertEqual(recipe.owner_id, friend.id)

    def test_empty_database_needs_no_account(self):
        """CI and fresh checkouts have no rows and no users; migrate must still succeed."""
        self.run_backfill()

    def test_missing_account_fails_loudly_instead_of_skipping(self):
        self.create_unowned_rows()
        with self.assertRaisesMessage(RuntimeError, "no user named 'walkingtowork'"):
            self.run_backfill()


class OwnerRebackfillMigrationTests(OwnerBackfillMigrationTests):
    """Migration 0012 runs the same backfill again, for rows created after 0011.

    Nothing set an owner on create between the two, so those rows arrive unowned. Every
    case that matters for 0011 matters here too, so this reruns them one migration later.
    """

    BEFORE = [('cocktails', '0011_backfill_owner')]
    AFTER = [('cocktails', '0012_backfill_owner_again')]
