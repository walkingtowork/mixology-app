# Task List: Ingredients and Recipes Feature

## Relevant Files

- `backend/cocktails/models.py` - Ingredient, Recipe, and RecipeIngredient models
- `backend/cocktails/serializers.py` - DRF serializers for Ingredient and Recipe
- `backend/cocktails/views.py` - DRF viewsets for API endpoints
- `backend/cocktails/urls.py` - URL routing for cocktails API
- `backend/cocktails/admin.py` - Django admin registration for models
- `backend/cocktails/apps.py` - Django app configuration
- `backend/backend/settings.py` - Django settings (add cocktails to INSTALLED_APPS)
- `backend/backend/urls.py` - Main URL configuration (include cocktails URLs)
- `frontend/src/types/cocktails.ts` - TypeScript type definitions for Ingredient, Recipe, RecipeIngredient
- `frontend/src/services/cocktailsApi.ts` - API service functions for cocktails endpoints
- `frontend/src/components/IngredientList.tsx` - Component to display list of ingredients
- `frontend/src/components/RecipeList.tsx` - Component to display list of recipes
- `frontend/src/components/RecipeDetail.tsx` - Component to display recipe details
- `frontend/src/components/RecipeForm.tsx` - Component for creating/editing recipes
- `frontend/src/App.tsx` - Main app component (integrate new components)

## Instructions for Completing Tasks

**IMPORTANT:** As you complete each task, you must check it off in this markdown file by changing `- [ ]` to `- [x]`. This helps track progress and ensures you don't skip any steps.

Example:
- `- [ ] 1.1 Read file` → `- [x] 1.1 Read file` (after completing)

Update the file after completing each sub-task, not just after completing an entire parent task.

## Tasks

- [x] 0.0 Create feature branch
  - [x] 0.1 Create and checkout a new branch for this feature (e.g., `git checkout -b feature/ingredients-and-recipes`)

- [x] 1.0 Create Django app and models (Ingredient, Recipe, RecipeIngredient)
  - [x] 1.1 Create `cocktails` Django app using `python manage.py startapp cocktails` in the backend directory
  - [x] 1.2 Add `cocktails` to `INSTALLED_APPS` in `backend/backend/settings.py`
  - [x] 1.3 Open `backend/cocktails/models.py` and define unit choices constant: `UNIT_CHOICES = [('oz', 'oz'), ('ml', 'ml'), ('tsp', 'tsp'), ('barspoon', 'barspoon'), ('dash', 'dash')]`
  - [x] 1.4 Create `Ingredient` model with `name` field (CharField, max_length=200, unique=True)
  - [x] 1.5 Create `RecipeIngredient` through model with ForeignKey to Recipe, ForeignKey to Ingredient, `amount` field (FloatField with MinValueValidator to ensure > 0), and `unit` field (CharField with choices=UNIT_CHOICES)
  - [x] 1.6 Create `Recipe` model with `name` field (CharField, max_length=200), `notes` field (TextField, blank=True), `garnish` field (CharField, max_length=200, blank=True), and `ingredients` field (ManyToManyField to Ingredient through RecipeIngredient)
  - [x] 1.7 Add `__str__` methods to all three models for meaningful string representation
  - [x] 1.8 Import `MinValueValidator` from `django.core.validators` and apply it to the `amount` field in RecipeIngredient

- [x] 2.0 Create and run database migrations
  - [x] 2.1 Run `python manage.py makemigrations cocktails` to create migration files
  - [x] 2.2 Verify that migrations were created in `backend/cocktails/migrations/` directory
  - [x] 2.3 Review migration files to ensure Ingredient, Recipe, and RecipeIngredient models are included
  - [x] 2.4 Run `python manage.py migrate` to apply migrations to the database
  - [x] 2.5 Verify migration completed successfully with no errors

- [x] 3.0 Create Django REST Framework API (serializers, viewsets, URLs)
  - [x] 3.1 Create `backend/cocktails/serializers.py` file
  - [x] 3.2 Create `IngredientSerializer` with fields: id, name
  - [x] 3.3 Create `RecipeIngredientSerializer` with fields: id, ingredient (nested IngredientSerializer), amount, unit
  - [x] 3.4 Create `RecipeSerializer` with fields: id, name, notes, garnish, ingredients (using RecipeIngredientSerializer, many=True, read_only=False)
  - [x] 3.5 Override `create` and `update` methods in RecipeSerializer to handle nested ingredient creation through RecipeIngredient
  - [x] 3.6 Create `backend/cocktails/views.py` file
  - [x] 3.7 Create `IngredientViewSet` using `ModelViewSet` with queryset and serializer_class
  - [x] 3.8 Create `RecipeViewSet` using `ModelViewSet` with queryset, serializer_class, and filtering capability
  - [x] 3.9 Implement filtering in RecipeViewSet to filter by ingredient (use `django_filters` or custom `get_queryset` method with `ingredient` query parameter)
  - [x] 3.10 Create `backend/cocktails/urls.py` file and configure URL routing using DRF router
  - [x] 3.11 Register `IngredientViewSet` and `RecipeViewSet` with the router
  - [x] 3.12 Include cocktails URLs in main `backend/backend/urls.py` under `/api/`
  - [x] 3.13 Install `django-filter` if using it for filtering (add to requirements.txt and install)

- [x] 4.0 Register models with Django admin
  - [x] 4.1 Open `backend/cocktails/admin.py` and import Ingredient, Recipe, and RecipeIngredient models
  - [x] 4.2 Import `admin` from `django.contrib`
  - [x] 4.3 Create `RecipeIngredientInline` class using `TabularInline` or `StackedInline` for displaying RecipeIngredients within Recipe admin
  - [x] 4.4 Create `RecipeAdmin` class with `inlines = [RecipeIngredientInline]` and configure `list_display`, `list_filter`, and `search_fields`
  - [x] 4.5 Register `Ingredient` model with `admin.site.register(Ingredient)`
  - [x] 4.6 Register `Recipe` model with `admin.site.register(Recipe, RecipeAdmin)`
  - [x] 4.7 (Optional) Register `RecipeIngredient` model if direct management is desired

- [x] 5.0 Create React TypeScript types and API service
  - [x] 5.1 Create `frontend/src/types/cocktails.ts` file
  - [x] 5.2 Define `Unit` type as union type: `type Unit = 'oz' | 'ml' | 'tsp' | 'barspoon' | 'dash'`
  - [x] 5.3 Define `Ingredient` interface with `id: number` and `name: string`
  - [x] 5.4 Define `RecipeIngredient` interface with `id: number`, `ingredient: Ingredient`, `amount: number`, and `unit: Unit`
  - [x] 5.5 Define `Recipe` interface with `id: number`, `name: string`, `notes: string | null`, `garnish: string | null`, and `ingredients: RecipeIngredient[]`
  - [x] 5.6 Create `frontend/src/services/cocktailsApi.ts` file
  - [x] 5.7 Import types and set up API_BASE_URL using environment variable
  - [x] 5.8 Create `fetchIngredients()` function to GET `/api/ingredients/`
  - [x] 5.9 Create `createIngredient(name: string)` function to POST `/api/ingredients/`
  - [x] 5.10 Create `fetchRecipes(ingredientId?: number)` function to GET `/api/recipes/` with optional ingredient filter
  - [x] 5.11 Create `fetchRecipe(id: number)` function to GET `/api/recipes/{id}/`
  - [x] 5.12 Create `createRecipe(recipe: Omit<Recipe, 'id'>)` function to POST `/api/recipes/`
  - [x] 5.13 Create `updateRecipe(id: number, recipe: Partial<Recipe>)` function to PUT/PATCH `/api/recipes/{id}/`
  - [x] 5.14 Create `deleteRecipe(id: number)` function to DELETE `/api/recipes/{id}/`
  - [x] 5.15 Add proper error handling to all API functions

- [x] 6.0 Create React components for ingredients and recipes
  - [x] 6.1 Create `frontend/src/components/IngredientList.tsx` component
  - [x] 6.2 Implement ingredient list display with loading and error states
  - [x] 6.3 Create `frontend/src/components/RecipeList.tsx` component
  - [x] 6.4 Implement recipe list display with loading and error states
  - [x] 6.5 Add ingredient filter functionality to RecipeList (dropdown or input to filter by ingredient)
  - [x] 6.6 Create `frontend/src/components/RecipeDetail.tsx` component
  - [x] 6.7 Display recipe name, ingredients with amounts/units, notes, and garnish
  - [x] 6.8 Format ingredient display (e.g., "2 oz Gin")
  - [x] 6.9 Create `frontend/src/components/RecipeForm.tsx` component
  - [x] 6.10 Implement form for creating/editing recipes with fields: name, notes, garnish
  - [x] 6.11 Add dynamic ingredient selection (add/remove ingredients, set amount and unit for each)
  - [x] 6.12 Add form validation: recipe must have at least one ingredient, name is required, amounts must be > 0
  - [x] 6.13 Handle form submission to create or update recipe via API
  - [x] 6.14 Update `frontend/src/App.tsx` to integrate new components (add routing or component switching logic)
  - [x] 6.15 Add navigation/links between recipe list, recipe detail, and recipe form

- [x] 7.0 Test full-stack integration
  - [x] 7.1 Start Django server and verify API endpoints are accessible
  - [x] 7.2 Test ingredient creation via API (POST `/api/ingredients/`)
  - [x] 7.3 Test recipe creation via API with multiple ingredients (POST `/api/recipes/`)
  - [x] 7.4 Test recipe filtering by ingredient (GET `/api/recipes/?ingredient={id}`)
  - [x] 7.5 Start React development server and verify no TypeScript compilation errors
  - [x] 7.6 Test ingredient list display in React frontend
  - [x] 7.7 Test recipe list display in React frontend
  - [x] 7.8 Test recipe detail view in React frontend
  - [x] 7.9 Test recipe creation form in React frontend
  - [x] 7.10 Test recipe editing form in React frontend
  - [x] 7.11 Test recipe deletion functionality
  - [x] 7.12 Verify that same ingredient can be used in multiple recipes with different amounts
  - [x] 7.13 Verify amount validation works (cannot create recipe with amount <= 0)
  - [x] 7.14 Verify no CORS errors in browser console
  - [x] 7.15 Test error handling (e.g., invalid API calls, network errors)

