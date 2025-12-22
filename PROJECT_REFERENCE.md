# Mixology App - Project Reference

## Overview
A full-stack cocktail recipe management application built with Django REST Framework (backend) and React with TypeScript (frontend). The app allows users to manage cocktail recipes, ingredients, and their relationships.

## Project Structure

```
mixology-app/
├── backend/              # Django backend
│   ├── accounts/         # Custom User model app
│   ├── cocktails/        # Main app for recipes and ingredients
│   ├── api/              # Hello World API endpoint
│   └── backend/          # Django project settings
├── frontend/             # React TypeScript frontend
│   └── src/
│       ├── components/   # React components
│       ├── services/     # API service functions
│       └── types/        # TypeScript type definitions
├── parsed_recipes/       # Parsed menu files
├── tasks/                # PRDs and task lists
└── backlog.md            # Product backlog

```

## Technology Stack

### Backend
- **Django 4.2.26** - Web framework
- **Django REST Framework** - API framework
- **django-cors-headers** - CORS handling
- **python-dotenv** - Environment variable management
- **Python 3.12+** - Python version requirement

### Frontend
- **React** - UI library
- **TypeScript** - Type-safe JavaScript
- **Vite** - Build tool and dev server
- **Node.js 20 LTS** - Runtime requirement

## Features Implemented

### 1. Hello World Foundation
- Django backend with DRF API endpoint (`/api/hello/`)
- React frontend that fetches and displays message from backend
- CORS configured for cross-origin requests
- Environment variable configuration for both frontend and backend

### 2. Custom User Model
- **App**: `accounts`
- **Model**: Custom `User` extending `AbstractUser`
- **Fields**:
  - `username` (inherited)
  - `email` (inherited)
  - `password` (inherited)
  - `fullname` (CharField, optional)
  - Standard Django user fields (`is_staff`, `is_superuser`, etc.)
- **Admin**: Custom `UserAdmin` with fullname field
- **Superuser**: Created with username "admin" / password "admin"
- **Tests**: 10 unit tests covering user creation, validation, and inheritance

### 3. Ingredients and Recipes System
- **App**: `cocktails`
- **Models**:
  - `Ingredient`: Name field only, unique constraint
  - `Recipe`: Name, notes, garnish, source_url, many-to-many with Ingredient
  - `RecipeIngredient`: Through model with amount and unit
- **Units**: `oz`, `ml`, `tsp`, `tbsp`, `barspoon`, `dash`, `drops`, `spritz`, `rinse`, `pinch`
- **Validation**: Amount must be > 0 (MinValueValidator)
- **API Endpoints**:
  - `/api/ingredients/` - CRUD operations
  - `/api/recipes/` - CRUD operations
  - Filter recipes by ingredient: `/api/recipes/?ingredient={id}`
- **Frontend Components**:
  - Recipe list view
  - Recipe detail view
  - Recipe form (create/edit)
  - Ingredient list view
- **Tests**: 23 unit tests covering all API operations

### 4. Recipe Import System
- Python scripts to import recipes from parsed menu files
- Scripts created:
  - `add_recipes.py` - March Party and Housewarming menus
  - `add_christmas_recipes.py` - Christmas drinks
  - `add_valentines_recipes.py` - Valentine's Party
  - `add_salads_smoothies_recipes.py` - Salads Smoothies Sicily
  - `add_spoopy_dumplings_recipes.py` - Spoopy Dumplings
- Features:
  - Automatic ingredient creation/reuse
  - Recipe update logic for existing recipes
  - Source URL support
  - Handles various unit conversions

### 5. Migration Management
- Squashed migrations 0002-0006 into single migration
- Final migration: `0002_add_units_and_source_url.py`
- Clean migration history with only 2 files

### 6. Ingredient Categories System
- **App**: `cocktails`
- **Models**:
  - `IngredientCategory`: Name and optional notes field
  - Updated `Ingredient`: Added `category` (ForeignKey, optional) and `is_generic` (Boolean) fields
- **Features**:
  - Auto-create generic ingredient when category is created (with optional skip checkbox)
  - Name conflict handling (links existing ingredient if name matches)
  - Category name updates automatically update generic ingredient name
  - Recipe filtering by category (returns recipes using any ingredient in that category)
  - Deletion protection (prevents category deletion if recipes use category ingredients)
- **API Endpoints**:
  - `/api/categories/` - CRUD operations for categories
  - `/api/categories/{id}/ingredients/` - Get ingredients in a category
  - `/api/recipes/?category={id}` - Filter recipes by category
- **Frontend Components**:
  - `CategoryList.tsx` - Display and manage categories
  - `CategoryForm.tsx` - Create/edit category form with auto-create checkbox
  - Updated `IngredientList.tsx` - Groups ingredients by category
  - Updated `RecipeList.tsx` - Supports category filtering
- **Tests**: 21 new tests (44 total tests passing)

## Database Schema

### User Model (accounts app)
```python
User(AbstractUser)
  - username (CharField)
  - email (EmailField)
  - password (CharField)
  - fullname (CharField, optional)
  - is_staff, is_superuser, is_active, etc.
```

### IngredientCategory Model
```python
IngredientCategory
  - id (AutoField)
  - name (CharField, max_length=200, unique=True)
  - notes (TextField, blank=True)
```

### Ingredient Model
```python
Ingredient
  - id (AutoField)
  - name (CharField, max_length=200, unique=True)
  - category (ForeignKey to IngredientCategory, null=True, blank=True)
  - is_generic (BooleanField, default=False)
```

### Recipe Model
```python
Recipe
  - id (AutoField)
  - name (CharField, max_length=200)
  - notes (TextField, blank=True)
  - garnish (CharField, max_length=200, blank=True)
  - source_url (URLField, blank=True, null=True)
  - ingredients (ManyToManyField through RecipeIngredient)
```

### RecipeIngredient Model (Through Model)
```python
RecipeIngredient
  - id (AutoField)
  - recipe (ForeignKey to Recipe, CASCADE)
  - ingredient (ForeignKey to Ingredient, CASCADE)
  - amount (FloatField, validators=[MinValueValidator(0.01)])
  - unit (CharField, choices: oz, ml, tsp, tbsp, barspoon, dash, drops, spritz, rinse, pinch)
  - unique_together: ['recipe', 'ingredient']
```

## API Endpoints

### Ingredients
- `GET /api/ingredients/` - List all ingredients
- `POST /api/ingredients/` - Create ingredient
- `GET /api/ingredients/{id}/` - Retrieve ingredient
- `PATCH /api/ingredients/{id}/` - Update ingredient
- `DELETE /api/ingredients/{id}/` - Delete ingredient
- Query params: `search`, `ordering`

### Recipes
- `GET /api/recipes/` - List all recipes
- `POST /api/recipes/` - Create recipe
- `GET /api/recipes/{id}/` - Retrieve recipe
- `PATCH /api/recipes/{id}/` - Update recipe
- `DELETE /api/recipes/{id}/` - Delete recipe
- Query params: `ingredient={id}` (filter), `category={id}` (filter), `search`, `ordering`

### Categories
- `GET /api/categories/` - List all categories
- `POST /api/categories/` - Create category (with optional `create_generic_ingredient` flag)
- `GET /api/categories/{id}/` - Retrieve category
- `PATCH /api/categories/{id}/` - Update category
- `DELETE /api/categories/{id}/` - Delete category (prevented if recipes use category ingredients)
- `GET /api/categories/{id}/ingredients/` - Get all ingredients in a category
- Query params: `search`, `ordering`

### Hello World
- `GET /api/hello/` - Returns `{"message": "Hello World"}`

## Frontend Components

### Components
- `HelloWorld.tsx` - Displays message from backend
- `RecipeList.tsx` - Lists all recipes with ingredient and category filtering
- `RecipeDetail.tsx` - Shows recipe details with ingredients
- `RecipeForm.tsx` - Create/edit recipe form (with autocomplete disabled)
- `IngredientList.tsx` - Lists all ingredients grouped by category
- `CategoryList.tsx` - Lists and manages ingredient categories
- `CategoryForm.tsx` - Create/edit category form with auto-create generic ingredient option

### Services
- `api.ts` - Hello World API service
- `cocktailsApi.ts` - Ingredients and Recipes API services

### Types
- `api.ts` - Hello World response types
- `cocktails.ts` - Ingredient, Recipe, RecipeIngredient, IngredientCategory types

## Environment Variables

### Backend (.env)
```
DJANGO_SECRET_KEY=your-secret-key-here
API_BASE_URL=http://localhost:8000
```

### Frontend (.env)
```
VITE_API_BASE_URL=http://localhost:8000
```

## Development Setup

### Backend
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser  # username: admin, password: admin
python manage.py runserver
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Testing

### Backend Tests
- **Location**: `backend/cocktails/tests.py`, `backend/accounts/tests.py`
- **Total Tests**: 44 tests
  - Accounts: 10 tests (User model)
  - Cocktails: 34 tests (API endpoints)
    - Ingredient API: 5 tests
    - Recipe API: 18 tests
    - IngredientCategory API: 14 tests
    - Ingredient with Category: 4 tests
    - Recipe Category Filtering: 3 tests
- **Run**: `python manage.py test`

### Test Coverage
- User model creation and validation
- Ingredient CRUD operations
- Recipe CRUD operations
- Nested ingredients handling
- Unit validation
- Amount validation (> 0)
- Source URL handling
- Filtering recipes by ingredient
- Category CRUD operations
- Auto-create generic ingredient functionality
- Category name conflict handling
- Category deletion prevention
- Recipe filtering by category
- Ingredient category assignment
- Edge cases (duplicates, missing data)

## Data Import Scripts

All import scripts follow this pattern:
1. Setup Django environment
2. Get or create ingredients (reuse existing)
3. Create recipes with ingredients
4. Handle source URLs
5. Skip existing recipes (or update as needed)

**Scripts Location**: `backend/add_*.py`

**Run from**: `backend/` directory
```bash
python add_recipes.py
python add_christmas_recipes.py
# etc.
```

## Current Data

- **Recipes**: 38 recipes imported from various menus
- **Ingredients**: 87 unique ingredients
- **Units Supported**: 10 unit types

## Django Admin

- **URL**: `http://localhost:8000/admin/`
- **Superuser**: admin / admin
- **Models Registered**:
  - User (custom admin with fullname)
  - Ingredient (with category, is_generic, and recipe count)
  - Recipe (with ingredient count, nested ingredient management)
  - RecipeIngredient
  - IngredientCategory (with custom form for auto-create generic ingredient, deletion prevention)

## CORS Configuration

Allowed origins:
- `http://localhost:3000`
- `http://127.0.0.1:3000`
- `http://localhost:5173` (Vite default)
- `http://127.0.0.1:5173`

## Git Configuration

- **Local repo config**: Uses personal GitHub account (`walkingtowork`, `alexander.lin.kremer@gmail.com`)
- **Global config**: Work account (`alexlin@pixotech.com`)

## Migration History

### cocktails app
1. `0001_initial.py` - Initial models (Ingredient, Recipe, RecipeIngredient)
2. `0002_add_units_and_source_url.py` - Added units (tbsp, drops, spritz, rinse, pinch) and source_url field
3. `0003_ingredientcategory_ingredient_is_generic_and_more.py` - Added IngredientCategory model, category and is_generic fields to Ingredient

### accounts app
1. `0001_initial.py` - Custom User model

## Key Design Decisions

1. **Many-to-Many with Through Model**: RecipeIngredient allows storing amount and unit per ingredient
2. **Hard Delete**: Recipes are permanently deleted (no soft delete)
3. **Ingredient Reuse**: Ingredients are shared across recipes
4. **Unit Validation**: Only predefined units are allowed
5. **Amount Validation**: Must be > 0 (prevents invalid recipes)
6. **Optional Fields**: notes, garnish, source_url are all optional
7. **Monorepo Structure**: Backend and frontend in same repository
8. **Categories vs Tags**: 
   - **Categories** (implemented): Hierarchical organization for ingredients (one category per ingredient). Used for taxonomy/classification (e.g., "Irish Whiskey" category with brands like "Jameson"). Includes auto-create generic ingredient functionality.
   - **Tags** (planned): Flexible labeling system for recipes and ingredients (many tags per item). Used for metadata/attributes (e.g., "Summer", "Quick", "Premium"). See `tasks/prd-tags.md` for details.
9. **Auto-Create Generic Ingredients**: When creating a category, automatically create a generic ingredient with the same name (optional, can be skipped). This allows recipes to reference either the generic category or specific brands.
10. **Category Deletion Protection**: Categories cannot be deleted if any recipes use ingredients from that category, preventing broken recipe references.
11. **Browser Autocomplete Disabled**: Form inputs have `autoComplete="off"` to prevent browser from suggesting irrelevant autocomplete options.

## Future Work (Backlog)

See `backlog.md` for planned features:
- ✅ Ingredient categories (implemented)
- URL routing (PRD: `tasks/prd-routing.md`)
- Ingredient substitutions
- Home-made ingredient recipes
- Recipe tags (PRD: `tasks/prd-tags.md`)
- Menus feature
- Shopping list
- Inventory management
- Deployment

## Recent Work Summary

### Ingredient Categories Feature (Completed)
- **Branch**: `feature/ingredient-categories`
- **Status**: Implemented, tested, and merged
- **Key Features**:
  - IngredientCategory model with name and notes
  - Auto-create generic ingredients when creating categories
  - Recipe filtering by category
  - Category deletion protection
  - Frontend components for category management
- **Tests**: 21 new tests added, all 44 tests passing
- **Documentation**: PRD at `tasks/prd-ingredient-categories.md`

### Tags Feature (Planned)
- **Status**: PRD created, not yet implemented
- **Design**: Flexible tagging system for recipes and ingredients
- **Relationship to Categories**: Tags complement categories - categories are for hierarchical organization (taxonomy), tags are for flexible labeling (metadata)
- **Documentation**: PRD at `tasks/prd-tags.md`
- **Compatibility**: No conflicts with routing feature (tags can use URL query parameters for filtering in the future)

## Related Documentation

- `tasks/` - PRDs and task lists for each feature
- `parsed_recipes/` - Source menu files
- `MIGRATION_SQUASHING_REFERENCE.md` - Migration cleanup details

## Notes

- All tests passing ✅ (44 tests total)
- No linter errors
- Database migrations clean and up-to-date
- CORS properly configured
- Environment variables documented
- TypeScript types match backend models
- Browser autocomplete disabled on form inputs to prevent irrelevant suggestions
- Categories and Tags are separate systems: Categories for taxonomy (one per ingredient), Tags for flexible metadata (many per item)

