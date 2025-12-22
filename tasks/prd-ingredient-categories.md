# Product Requirements Document: Ingredient Categories Feature

## Introduction/Overview

This PRD outlines the requirements for implementing ingredient categories in the mixology application. The feature will create an `IngredientCategory` model to organize ingredients into logical groups (e.g., "Irish Whiskey", "Rye Whiskey", "Gin"). When a category is created, the system will automatically create a corresponding generic ingredient with the same name (e.g., creating "Irish Whiskey" category also creates "Irish Whiskey" ingredient), allowing recipes to reference either the generic category ingredient or specific brand ingredients (e.g., "Jameson", "Red Breast 12") that belong to that category.

The primary goal is to enable users to organize ingredients hierarchically and search for recipes by category, returning all recipes that use any ingredient within that category. This solves the problem where recipes may specify a generic category (e.g., "1oz Irish Whiskey") or a specific brand (e.g., "1oz Jameson"), and users should be able to find all relevant recipes when searching for the category.

## Goals

1. Create `IngredientCategory` Django model to organize ingredients into categories
2. Add category relationship to `Ingredient` model (optional field)
3. Implement automatic creation of generic ingredient when category is created (with option to skip)
4. Create REST API endpoints for managing categories
5. Build React TypeScript frontend components for category management
6. Enable recipe filtering by category (returns recipes using any ingredient in that category)
7. Display categories separately and group ingredients by category in the frontend
8. Prevent category deletion if any recipes use ingredients in that category

## User Stories

1. **As a user**, I want to view a list of all ingredient categories so that I can see how ingredients are organized.

2. **As a user**, I want to create a new ingredient category so that I can organize related ingredients together.

3. **As a user**, I want to optionally skip auto-creating a generic ingredient when creating a category so that I have control over ingredient creation.

4. **As a user**, I want to assign ingredients to categories so that I can organize my ingredient library.

5. **As a user**, I want to search for recipes by category (e.g., "Irish Whiskey") so that I can find all recipes using any ingredient in that category, whether they specify the generic category or a specific brand.

6. **As a user**, I want to see categories displayed separately from ingredients in the UI so that I can understand the organizational structure.

7. **As a user**, I want to see ingredients grouped by their categories so that I can easily browse ingredients within each category.

8. **As a user**, I want to create categories through both the Django admin and the frontend interface so that I can manage categories in the way that's most convenient.

9. **As a user**, I want the system to prevent me from deleting a category if any recipes use ingredients in that category so that I don't accidentally break recipe references.

## Functional Requirements

1. The system must include an `IngredientCategory` model with:
   - `name` field (string, unique, required)
   - `notes` field (TextField, optional, blank=True)

2. The system must add a `category` field to the `Ingredient` model:
   - ForeignKey to `IngredientCategory`
   - Optional (null=True, blank=True)
   - Related name: 'ingredients'

3. The system must add an `is_generic` boolean field to the `Ingredient` model:
   - Default: False
   - True when the ingredient is the auto-created generic ingredient for a category
   - Used to identify generic category ingredients

4. When creating an `IngredientCategory`, the system must:
   - Automatically create a corresponding `Ingredient` with the same name as the category
   - Set the ingredient's `category` field to the newly created category
   - Set the ingredient's `is_generic` field to True
   - Allow users to skip this auto-creation via a checkbox option (default: checked)

5. The category creation form (both Django admin and frontend) must include:
   - A "name" field (required)
   - A "notes" field (optional, textarea)
   - A "Create generic ingredient" checkbox (default: checked)
   - When unchecked, skip the auto-creation of the generic ingredient

6. The system must create Django REST Framework API endpoints for categories:
   - List all categories (GET `/api/categories/`)
   - Create category (POST `/api/categories/`)
   - Retrieve category (GET `/api/categories/{id}/`)
   - Update category (PUT/PATCH `/api/categories/{id}/`)
   - Delete category (DELETE `/api/categories/{id}/`)
   - List ingredients in a category (GET `/api/categories/{id}/ingredients/`)

7. The category API create/update endpoints must accept:
   - `name` (string, required)
   - `notes` (string, optional)
   - `create_generic_ingredient` (boolean, optional, default: true)

8. The category API response must include:
   - `id`, `name`, `notes`
   - `ingredients` (nested list of ingredients in this category)
   - `generic_ingredient` (reference to the generic ingredient if it exists)

9. The ingredient API response must include:
   - `category` (category object or null)
   - `is_generic` (boolean)

10. The recipe filtering API must support filtering by category:
    - GET `/api/recipes/?category={category_id}` - returns recipes using any ingredient in that category
    - GET `/api/recipes/?ingredient={ingredient_id}` - continues to work as before
    - Both query parameters can be used together

11. The system must prevent deletion of a category if:
    - Any recipes use ingredients that belong to that category
    - Return an appropriate error message explaining why deletion is not allowed

12. The system must include React TypeScript components for:
    - Displaying a list of categories
    - Creating a new category (with checkbox for auto-create generic ingredient)
    - Editing an existing category
    - Viewing category details with its ingredients
    - Displaying categories separately from ingredients
    - Grouping ingredients by category in ingredient lists

13. The ingredient creation/edit form must include:
    - An optional category dropdown/selector
    - Display of the selected category

14. The frontend must display categories in a separate section or list view.

15. The frontend must display ingredients grouped by category when showing ingredient lists.

16. The frontend must allow users to filter recipes by category.

17. The system must run database migrations to:
    - Create the `IngredientCategory` table
    - Add `category` and `is_generic` fields to the `Ingredient` table

18. The `IngredientCategory` model must be registered with Django admin for management.

19. The Django admin for `IngredientCategory` must:
    - Display the category name and notes
    - Show related ingredients
    - Include the checkbox for auto-creating generic ingredient
    - Prevent deletion if recipes use category ingredients

20. The system must include TypeScript type definitions for:
    - `IngredientCategory` data structure
    - Updated `Ingredient` type with category and is_generic fields
    - Category-related API responses

21. The system must handle the case where a category name conflicts with an existing ingredient name:
    - If an ingredient with the same name already exists, link it to the category and mark it as generic

22. When updating a category name, the system must:
    - Always update the name of the associated generic ingredient (if it exists) to match the new category name

23. The system must provide a way to view all ingredients that belong to a specific category.

24. The system must provide a way to view all recipes that use ingredients from a specific category.

25. The frontend must handle loading states and error states when fetching categories from the API.

## Non-Goals (Out of Scope)

1. **Nested Categories**: Hierarchical categories (categories within categories) are not included in this version.

2. ~~**Category Descriptions**: Adding descriptions or notes to categories is not included.~~ (Now included - notes field added)

3. **Category Icons/Images**: Visual representations for categories are not included.

4. **Category Ordering**: Custom ordering or sorting of categories is not included (will use alphabetical by default).

5. **Bulk Category Assignment**: Assigning multiple ingredients to a category at once is not included.

6. **Category Import/Export**: Importing or exporting categories is not included.

7. **Category Statistics**: Displaying statistics about category usage (e.g., number of recipes, number of ingredients) is not included in the initial version.

8. **Category Search**: Advanced search or filtering of categories is not included (basic list view only).

9. **Category Tags/Labels**: Additional tagging or labeling system for categories is not included.

10. **Category History/Audit Trail**: Tracking changes to categories over time is not included.

## Design Considerations

1. **Category Display**: Categories should be displayed in a clear, separate section from ingredients to show the organizational structure.

2. **Ingredient Grouping**: When displaying ingredients, they should be visually grouped by category with clear category headers.

3. **Generic Ingredient Indication**: The UI should clearly indicate which ingredients are generic category ingredients (e.g., with a badge or icon).

4. **Form Validation**: The category creation form should validate that the category name is unique and not empty.

5. **Error Messages**: Clear error messages should be displayed if category deletion is prevented due to recipe usage.

6. **Checkbox Default State**: The "Create generic ingredient" checkbox should be checked by default to match the most common use case.

7. **Category Selection in Recipe Forms**: When creating/editing recipes, users should be able to select either generic category ingredients or specific brand ingredients.

8. **Search Results Display**: When searching recipes by category, results should clearly indicate which specific ingredients from that category are used in each recipe.

## Technical Considerations

1. **Django Models**:
   - Create `IngredientCategory` model in the `cocktails` app
   - Add `category` ForeignKey field to `Ingredient` model (null=True, blank=True)
   - Add `is_generic` BooleanField to `Ingredient` model (default=False)
   - Use Django signals (post_save) or override save() method to auto-create generic ingredient
   - Implement custom delete method or signal to prevent deletion if recipes use category ingredients

2. **Django Signals**:
   - Use `post_save` signal on `IngredientCategory` to auto-create generic ingredient
   - Check the `create_generic_ingredient` flag (passed via form or API) before creating
   - Handle name conflicts if ingredient with same name already exists

3. **Django REST Framework**:
   - Create `IngredientCategorySerializer` with nested ingredient information
   - Update `IngredientSerializer` to include category and is_generic fields
   - Create `IngredientCategoryViewSet` with standard CRUD operations
   - Update `RecipeViewSet` to support category filtering
   - Add custom validation for category deletion

4. **Database Migrations**:
   - Create migration for `IngredientCategory` model
   - Create migration to add `category` and `is_generic` fields to `Ingredient`
   - Handle existing data (existing ingredients will have category=None, is_generic=False)

5. **Django Admin**:
   - Register `IngredientCategory` model with Django admin
   - Create custom admin form with checkbox for auto-create generic ingredient
   - Override delete method to check for recipe usage before deletion
   - Display related ingredients in category admin
   - Update ingredient admin to show category field

6. **React Frontend**:
   - Create TypeScript interfaces for `IngredientCategory`
   - Update `Ingredient` interface to include `category` and `is_generic` fields
   - Create `CategoryList` component for displaying categories
   - Create `CategoryForm` component with checkbox for auto-create
   - Update `IngredientList` component to group by category
   - Create separate category section in the main UI
   - Update recipe filtering to support category parameter
   - Add category selector to ingredient forms

7. **TypeScript Types**:
   - Define `IngredientCategory` interface matching API response
   - Update `Ingredient` interface with optional `category` and `is_generic` fields
   - Create types for category-related API requests/responses

8. **API Service Functions**:
   - Create functions for fetching, creating, updating, and deleting categories
   - Update recipe fetching to support category filter parameter
   - Handle category-related errors appropriately

9. **Name Conflict Handling**:
   - When creating a category, check if an ingredient with the same name exists
   - If it exists and has no category, assign it to the new category and mark as generic
   - If it exists and has a different category, prevent creation or provide merge option

10. **Generic Ingredient Update**:
    - When updating category name, always update the generic ingredient name to match (if generic ingredient exists)

## Success Metrics

1. **Functional Success**:
   - `IngredientCategory` model is created and migrations run successfully
   - Categories can be created through both Django admin and frontend
   - Generic ingredients are auto-created when categories are created (when checkbox is checked)
   - Generic ingredient creation can be skipped when checkbox is unchecked
   - Ingredients can be assigned to categories
   - Recipe filtering by category returns all recipes using any ingredient in that category
   - Category deletion is prevented when recipes use category ingredients
   - Frontend displays categories separately and groups ingredients by category

2. **Data Integrity**:
   - No orphaned ingredients (all generic ingredients have a category)
   - Category deletion properly validates recipe usage
   - Name conflicts are handled appropriately

3. **User Experience**:
   - Users can create categories within 2 minutes through the frontend
   - Category creation form is intuitive with clear checkbox option
   - Ingredients are clearly organized by category in the UI
   - Recipe search by category works as expected

4. **Code Quality**:
   - TypeScript compiles without errors
   - Django models follow best practices
   - API responses are well-structured and consistent
   - React components are properly typed and handle edge cases
   - Error handling is comprehensive

## Resolved Decisions

1. **Category Model Approach**: Using a separate `IngredientCategory` model rather than self-referential `Ingredient` model for better type safety and clarity.

2. **Generic Ingredient Auto-Creation**: Automatically creating a generic ingredient with the same name as the category to allow recipes to reference the category directly.

3. **Auto-Create Option**: Providing a checkbox (default checked) to allow users to skip auto-creation of generic ingredient for flexibility.

4. **Category Assignment**: Making category assignment optional on ingredients to allow for uncategorized ingredients.

5. **Recipe Filtering**: Supporting both category and ingredient filtering, with category filtering returning recipes using any ingredient in that category.

6. **Deletion Protection**: Preventing category deletion if any recipes use ingredients in that category to maintain data integrity.

7. **UI Display**: Showing categories separately AND grouping ingredients by category to provide both organizational views.

8. **Management Interface**: Supporting category creation through both Django admin (for initial setup) and frontend (for ongoing use).

9. **Generic Ingredient Flag**: Using `is_generic` boolean field to identify auto-created generic ingredients for easier querying and display.

10. **Name Conflict Handling**: When a category name matches an existing ingredient, linking that ingredient to the category and marking it as generic (if it has no category) or preventing creation with an error message.
