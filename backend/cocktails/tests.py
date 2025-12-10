from django.test import TestCase
from rest_framework.test import APITestCase
from rest_framework import status
from .models import Ingredient, Recipe, RecipeIngredient


class IngredientAPITests(APITestCase):
    """Test cases for Ingredient API endpoints."""

    def setUp(self):
        """Set up test data."""
        self.ingredient1 = Ingredient.objects.create(name='Gin')
        self.ingredient2 = Ingredient.objects.create(name='Vermouth')
        self.ingredient3 = Ingredient.objects.create(name='Lemon Juice')

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


class RecipeAPITests(APITestCase):
    """Test cases for Recipe API endpoints."""

    def setUp(self):
        """Set up test data."""
        self.gin = Ingredient.objects.create(name='Gin')
        self.vermouth = Ingredient.objects.create(name='Vermouth')
        self.lemon = Ingredient.objects.create(name='Lemon Juice')
        
        self.recipe = Recipe.objects.create(
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
        recipe2 = Recipe.objects.create(name='Whiskey Sour')
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
        recipe2 = Recipe.objects.create(name='Gin and Tonic')
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
