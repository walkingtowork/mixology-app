from django.test import TestCase
from rest_framework.test import APITestCase
from rest_framework import status
from .models import Ingredient, Recipe, RecipeIngredient, IngredientCategory


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
        recipe = Recipe.objects.create(name='Test Recipe')
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


class IngredientCategoryAPITests(APITestCase):
    """Test cases for IngredientCategory API endpoints."""

    def setUp(self):
        """Set up test data."""
        self.category1 = IngredientCategory.objects.create(name='Whiskey', notes='Various whiskey types')
        self.category2 = IngredientCategory.objects.create(name='Gin', notes='Gin category')

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
        existing_ingredient = Ingredient.objects.create(name='Brandy')
        
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
        ingredient1 = Ingredient.objects.create(name='Jameson', category=self.category1)
        ingredient2 = Ingredient.objects.create(name='Red Breast 12', category=self.category1)
        
        url = f'/api/categories/{self.category1.id}/'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('ingredients', response.data)
        self.assertEqual(len(response.data['ingredients']), 2)

    def test_retrieve_category_with_generic_ingredient(self):
        """Test that category retrieval includes generic ingredient if it exists."""
        # Create generic ingredient
        generic = Ingredient.objects.create(
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
        ingredient = Ingredient.objects.create(name='Jameson', category=self.category1)
        
        # Create recipe using that ingredient
        recipe = Recipe.objects.create(name='Irish Coffee')
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
        ingredient1 = Ingredient.objects.create(name='Jameson', category=self.category1)
        ingredient2 = Ingredient.objects.create(name='Red Breast 12', category=self.category1)
        ingredient3 = Ingredient.objects.create(name='Gin', category=self.category2)  # Different category
        
        url = f'/api/categories/{self.category1.id}/ingredients/'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)
        ingredient_names = [ing['name'] for ing in response.data]
        self.assertIn('Jameson', ingredient_names)
        self.assertIn('Red Breast 12', ingredient_names)
        self.assertNotIn('Gin', ingredient_names)


class IngredientWithCategoryTests(APITestCase):
    """Test cases for Ingredient API with category support."""

    def setUp(self):
        """Set up test data."""
        self.category = IngredientCategory.objects.create(name='Whiskey')
        self.ingredient = Ingredient.objects.create(name='Jameson', category=self.category)

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
        ingredient = Ingredient.objects.create(name='Uncategorized Ingredient')
        url = f'/api/ingredients/{ingredient.id}/'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.data['category'])

    def test_update_ingredient_category(self):
        """Test that ingredient category can be updated."""
        new_category = IngredientCategory.objects.create(name='Rum')
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
        new_category = IngredientCategory.objects.create(name='Rum')
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


class RecipeCategoryFilterTests(APITestCase):
    """Test cases for recipe filtering by category."""

    def setUp(self):
        """Set up test data."""
        self.whiskey_category = IngredientCategory.objects.create(name='Whiskey')
        self.gin_category = IngredientCategory.objects.create(name='Gin')
        
        # Create generic ingredients
        self.whiskey_generic = Ingredient.objects.create(
            name='Whiskey',
            category=self.whiskey_category,
            is_generic=True
        )
        self.gin_generic = Ingredient.objects.create(
            name='Gin',
            category=self.gin_category,
            is_generic=True
        )
        
        # Create brand ingredients
        self.jameson = Ingredient.objects.create(name='Jameson', category=self.whiskey_category)
        self.red_breast = Ingredient.objects.create(name='Red Breast 12', category=self.whiskey_category)
        self.tanqueray = Ingredient.objects.create(name='Tanqueray', category=self.gin_category)
        
        # Create recipes
        self.recipe1 = Recipe.objects.create(name='Irish Coffee')
        RecipeIngredient.objects.create(
            recipe=self.recipe1,
            ingredient=self.jameson,
            amount=1.5,
            unit='oz'
        )
        
        self.recipe2 = Recipe.objects.create(name='Whiskey Sour')
        RecipeIngredient.objects.create(
            recipe=self.recipe2,
            ingredient=self.whiskey_generic,
            amount=2.0,
            unit='oz'
        )
        
        self.recipe3 = Recipe.objects.create(name='Gin and Tonic')
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
        recipe4 = Recipe.objects.create(name='Complex Recipe')
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
        empty_category = IngredientCategory.objects.create(name='Empty Category')
        url = f'/api/recipes/?category={empty_category.id}'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)
