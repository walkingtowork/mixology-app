# Product Requirements Document: Ingredients and Recipes Feature

## Introduction/Overview

This PRD outlines the requirements for implementing the core data models and full-stack functionality for a mixology application. The feature will create Ingredient and Recipe models with a many-to-many relationship, allowing users to create, view, and manage cocktail recipes with their ingredients. The implementation includes Django backend models, REST API endpoints, and a React TypeScript frontend for displaying and managing recipes and ingredients.

The primary goal is to establish the foundational data structure for the mixology app, enabling users to create recipes that reference reusable ingredients with recipe-specific amounts and units of measurement.

## Goals

1. Create Ingredient and Recipe Django models with proper relationships
2. Implement a many-to-many relationship between Recipe and Ingredient with amount and unit stored on the relationship
3. Create REST API endpoints for managing ingredients and recipes
4. Build React TypeScript frontend components for displaying and managing recipes and ingredients
5. Enable users to create recipes with multiple ingredients, each with specific amounts and units
6. Allow ingredients to be reused across multiple recipes with different amounts

## User Stories

1. **As a user**, I want to view a list of all available ingredients so that I can see what ingredients are in the system.

2. **As a user**, I want to create a new ingredient so that I can add it to recipes.

3. **As a user**, I want to view a list of all recipes so that I can browse available cocktail recipes.

4. **As a user**, I want to view a recipe's details including its ingredients, amounts, units, notes, and garnish so that I can see how to make the cocktail.

5. **As a user**, I want to create a new recipe with multiple ingredients, each with specific amounts and units, so that I can add my own cocktail recipes.

6. **As a user**, I want to edit existing recipes so that I can update recipe information.

7. **As a user**, I want to see the same ingredient used in different recipes with different amounts so that I understand how ingredients are reused.

## Functional Requirements

1. The system must include an `Ingredient` model with a `name` field (string).

2. The system must include a `Recipe` model with the following fields:
   - `name` (string, required)
   - `notes` (string, optional)
   - `garnish` (string, optional)

3. The system must implement a many-to-many relationship between `Recipe` and `Ingredient` using a through model.

4. The through model (e.g., `RecipeIngredient`) must store:
   - Reference to the Recipe
   - Reference to the Ingredient
   - `amount` (float, required, must be greater than 0)
   - `unit` (string, required, choices: 'oz', 'ml', 'tsp', 'barspoon', 'dash')

5. The system must create Django REST Framework API endpoints for:
   - List all ingredients (GET `/api/ingredients/`)
   - Create ingredient (POST `/api/ingredients/`)
   - Retrieve ingredient (GET `/api/ingredients/{id}/`)
   - List all recipes (GET `/api/recipes/`)
   - Filter recipes by ingredient (GET `/api/recipes/?ingredient={ingredient_id}`)
   - Create recipe (POST `/api/recipes/`)
   - Retrieve recipe with ingredients (GET `/api/recipes/{id}/`)
   - Update recipe (PUT/PATCH `/api/recipes/{id}/`)
   - Delete recipe (DELETE `/api/recipes/{id}/`)

6. The Recipe API response must include nested ingredient information with amounts and units.

7. The system must include React TypeScript components for:
   - Displaying a list of ingredients
   - Displaying a list of recipes
   - Viewing recipe details with ingredients
   - Creating new recipes with ingredient selection
   - Editing existing recipes

8. The React frontend must fetch data from the Django API endpoints.

9. The React frontend must handle loading states and error states when fetching data.

10. The system must run database migrations to create the Ingredient, Recipe, and RecipeIngredient tables.

11. The Ingredient and Recipe models must be registered with Django admin for management.

12. The system must include TypeScript type definitions for Ingredient, Recipe, and RecipeIngredient data structures.

## Non-Goals (Out of Scope)

1. **User Authentication for Recipes**: Recipe ownership, user-specific recipes, or recipe sharing are not included.

2. **Recipe Ratings/Reviews**: Rating or review functionality for recipes is not included.

3. **Recipe Images**: Image uploads or photo storage for recipes are not included.

4. **Ingredient Categories/Tags**: Categorizing or tagging ingredients (e.g., "spirit", "mixer", "bitters") is not included.

5. **Recipe Search/Filtering**: Advanced search, filtering, or sorting capabilities are not included in this initial version.

6. **Recipe Instructions/Steps**: Step-by-step preparation instructions are not included (notes field can be used for this).

7. **Unit Conversion**: Automatic conversion between units (e.g., oz to ml) is not included.

8. **Recipe Scaling**: Scaling recipe amounts up or down is not included.

9. **Ingredient Inventory**: Tracking ingredient availability or inventory is not included.

10. **Recipe Collections/Favorites**: Saving recipes to collections or favorites is not included.

## Design Considerations

1. **API Response Structure**: Recipe API responses should include nested ingredient data with amounts and units for easy frontend consumption.

2. **Form Validation**: Frontend forms should validate that recipes have at least one ingredient before submission.

3. **Unit Display**: Units should be displayed clearly and consistently (e.g., "2 oz", "1.5 ml").

4. **Error Handling**: Clear error messages should be displayed if recipe creation fails or if required fields are missing.

5. **Loading States**: Loading indicators should be shown while fetching recipes and ingredients from the API.

## Technical Considerations

1. **Django Models**:
   - Create `cocktails` Django app
   - Create `Ingredient` model with `name` field
   - Create `Recipe` model with many-to-many relationship to Ingredient
   - Create `RecipeIngredient` through model with `amount` and `unit` fields
   - Use `CharField` with `choices` parameter for unit field with enum values
   - Add validation to `amount` field to ensure it is greater than 0 (use `MinValueValidator` or custom validation)

2. **Django REST Framework**:
   - Use DRF serializers with nested serializers for Recipe-Ingredient relationships
   - Configure serializers to handle the through model (RecipeIngredient)
   - Use `ModelViewSet` or `ViewSet` for API endpoints
   - Implement filtering for recipes by ingredient (use `django-filter` or custom filtering)
   - Register API routes in URL configuration

3. **Database Migrations**:
   - Create migrations for Ingredient, Recipe, and RecipeIngredient models
   - Run migrations to create database tables

4. **Django Admin**:
   - Register Ingredient and Recipe models with Django admin
   - Configure admin to display relationships clearly
   - Consider using inline admin for RecipeIngredient in Recipe admin

5. **React Frontend**:
   - Create TypeScript interfaces for Ingredient, Recipe, and RecipeIngredient
   - Use `fetch` or `axios` for API calls
   - Create reusable components for ingredient and recipe display
   - Implement form components for creating/editing recipes
   - Use React state management (useState, useEffect) for data fetching

6. **TypeScript Types**:
   - Define interfaces matching the API response structure
   - Include unit enum type for type safety

7. **CORS Configuration**:
   - Ensure CORS is already configured (from previous setup) to allow React frontend to access Django API

8. **Unit Field Choices**:
   - Define unit choices as: 'oz', 'ml', 'tsp', 'barspoon', 'dash'
   - Use Django's `choices` parameter for validation

## Success Metrics

1. **Functional Success**:
   - Ingredient and Recipe models are created and migrations run successfully
   - API endpoints return correct data with nested ingredient information
   - React frontend successfully displays lists of ingredients and recipes
   - Users can create recipes with multiple ingredients through the frontend
   - Recipes can be viewed with all ingredient details (amounts, units)
   - Same ingredient can be used in multiple recipes with different amounts

2. **Setup Success**:
   - A developer can create a recipe with ingredients through the API within 10 minutes
   - Frontend successfully fetches and displays recipe data
   - No CORS errors when frontend calls backend API

3. **Code Quality**:
   - TypeScript compiles without errors
   - Django models follow best practices
   - API responses are well-structured and consistent
   - React components are properly typed and handle edge cases

## Resolved Decisions

1. **Relationship Type**: Many-to-many relationship between Recipe and Ingredient, allowing ingredients to be reused across recipes.

2. **Amount/Unit Storage**: Amount and unit are stored on the relationship (RecipeIngredient through model), not on the Ingredient model itself.

3. **Implementation Scope**: Full-stack implementation including Django models, REST API, and React frontend.

4. **Ingredient Reusability**: Ingredients are reusable across multiple recipes with different amounts.

5. **Optional Fields**: Both `notes` and `garnish` fields on Recipe are optional.

6. **Unit Enum Values**: Units are limited to: 'oz', 'ml', 'tsp', 'barspoon', 'dash'.

## Resolved Decisions (Additional)

7. **Django App**: Create a separate Django app named `cocktails` to house the Ingredient, Recipe, and RecipeIngredient models.

8. **Ingredient Model**: The Ingredient model will only have a `name` field. No additional fields (description, category, etc.) are needed at this time.

9. **Recipe Deletion**: Recipes should be deletable using standard Django delete functionality (hard delete, not soft delete).

10. **Amount Validation**: The `amount` field must be validated to ensure it is positive (greater than 0). No negative amounts or zero values are allowed.

11. **API Filtering**: The API should support filtering recipes by ingredient (e.g., GET `/api/recipes/?ingredient=gin`).

