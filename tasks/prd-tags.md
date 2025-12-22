# Product Requirements Document: Tags Feature

## Introduction/Overview

This PRD outlines the requirements for implementing a flexible tagging system in the mixology application. Tags are lightweight labels that can be applied to both recipes and ingredients to enable flexible filtering, searching, and organization. Unlike categories (which are hierarchical and ingredient-specific), tags are flat, reusable labels that can be applied to multiple items and serve different purposes.

Tags allow users to label recipes with attributes like "Summer", "Quick", "Vegan", or "Classic", and ingredients with attributes like "Premium", "Organic", or "Local". This enables users to find recipes and ingredients based on flexible criteria beyond the structured category system.

The primary goal is to provide a flexible labeling system that complements the existing category system, allowing users to add multiple descriptive tags to recipes and ingredients for enhanced discoverability and filtering.

## Goals

1. Create a reusable `Tag` model that can be applied to both recipes and ingredients
2. Implement many-to-many relationships between Tag and Recipe, and Tag and Ingredient
3. Create REST API endpoints for managing tags and tag assignments
4. Build React TypeScript frontend components for tag management
5. Enable filtering of recipes and ingredients by tags
6. Display tags visually on recipe and ingredient cards/lists
7. Allow users to create, edit, and delete tags
8. Support tag autocomplete/suggestions when adding tags to items

## User Stories

1. **As a user**, I want to add tags to recipes (e.g., "Summer", "Quick", "Vegan") so that I can organize and find recipes by flexible criteria.

2. **As a user**, I want to add tags to ingredients (e.g., "Premium", "Organic") so that I can label ingredients with additional attributes beyond their category.

3. **As a user**, I want to filter recipes by tags so that I can find all recipes matching specific criteria (e.g., all "Summer" recipes).

4. **As a user**, I want to filter ingredients by tags so that I can find all ingredients with specific attributes (e.g., all "Premium" ingredients).

5. **As a user**, I want to see tags displayed on recipe and ingredient cards so that I can quickly identify their attributes.

6. **As a user**, I want to create new tags when adding them to recipes or ingredients so that I don't need to pre-create all tags.

7. **As a user**, I want to see tag suggestions/autocomplete when typing tag names so that I can reuse existing tags and maintain consistency.

8. **As a user**, I want to view a list of all tags so that I can see what tags exist and manage them.

9. **As a user**, I want to edit tag names so that I can fix typos or update tag terminology.

10. **As a user**, I want to delete tags so that I can remove unused or incorrect tags.

11. **As a user**, I want to filter by multiple tags at once so that I can find recipes that match multiple criteria (e.g., "Summer" AND "Quick").

## Functional Requirements

1. The system must include a `Tag` model with:
   - `name` field (string, unique, required, max_length=50)
   - `color` field (string, optional, for UI display - e.g., hex color code)
   - Timestamps: `created_at`, `updated_at` (auto-managed)

2. The system must implement many-to-many relationships:
   - `Recipe.tags` - ManyToManyField to Tag (related_name='recipes')
   - `Ingredient.tags` - ManyToManyField to Tag (related_name='ingredients')

3. The system must create Django REST Framework API endpoints for tags:
   - List all tags (GET `/api/tags/`)
   - Create tag (POST `/api/tags/`)
   - Retrieve tag (GET `/api/tags/{id}/`)
   - Update tag (PUT/PATCH `/api/tags/{id}/`)
   - Delete tag (DELETE `/api/tags/{id}/`)
   - Search tags by name (GET `/api/tags/?search={query}`)

4. The recipe API must support:
   - Including tags in recipe responses
   - Filtering recipes by tags (GET `/api/recipes/?tags={tag_id1},{tag_id2}` or `?tags={tag_id1}&tags={tag_id2}`)
   - Adding/removing tags when creating/updating recipes

5. The ingredient API must support:
   - Including tags in ingredient responses
   - Filtering ingredients by tags (GET `/api/ingredients/?tags={tag_id1},{tag_id2}`)
   - Adding/removing tags when creating/updating ingredients

6. The tag API response must include:
   - `id`, `name`, `color`
   - `recipe_count` (number of recipes using this tag)
   - `ingredient_count` (number of ingredients using this tag)

7. The recipe API response must include:
   - `tags` (array of tag objects)

8. The ingredient API response must include:
   - `tags` (array of tag objects)

9. The system must support filtering by multiple tags:
   - When multiple tag IDs are provided, return items that have ALL specified tags (AND logic)
   - Support both comma-separated and multiple query parameter formats

10. The system must include React TypeScript components for:
    - Displaying tags as badges/chips on recipe and ingredient cards
    - Tag input component with autocomplete for adding tags
    - Tag list view for managing all tags
    - Tag creation/edit form

11. The tag input component must:
    - Show autocomplete suggestions as user types
    - Allow creating new tags on-the-fly
    - Display selected tags as removable chips/badges
    - Support keyboard navigation (arrow keys, enter to select, backspace to remove)

12. The frontend must display tags visually:
    - As colored badges/chips on recipe cards
    - As colored badges/chips on ingredient cards
    - In recipe detail view
    - In ingredient lists

13. The frontend must support tag filtering:
    - Add tag filter dropdown/selector to RecipeList
    - Add tag filter dropdown/selector to IngredientList
    - Support selecting multiple tags for filtering
    - Clear indication of active tag filters

14. The system must run database migrations to:
    - Create the `Tag` table
    - Create many-to-many relationship tables for Recipe-Tag and Ingredient-Tag

15. The `Tag` model must be registered with Django admin for management.

16. The Django admin for `Tag` must:
    - Display tag name and color
    - Show related recipes and ingredients counts
    - Allow bulk tag management

17. The system must include TypeScript type definitions for:
    - `Tag` data structure
    - Updated `Recipe` type with tags array
    - Updated `Ingredient` type with tags array
    - Tag-related API requests/responses

18. The system must handle tag deletion:
    - When a tag is deleted, remove it from all recipes and ingredients (automatic via many-to-many)
    - No need to prevent deletion if tag is in use (unlike categories)

19. The system must validate tag names:
    - Tag names must be unique
    - Tag names should be trimmed of whitespace
    - Tag names should be case-insensitive for uniqueness checks (or normalize to lowercase)

20. The frontend must handle loading states and error states when fetching/managing tags.

## Non-Goals (Out of Scope)

1. **Tag Hierarchies**: Nested tags or tag categories are not included (tags are flat).

2. **Tag Descriptions**: Tags do not have descriptions or notes (just name and optional color).

3. **Tag Permissions**: All users can create and manage tags (no permission system).

4. **Tag Statistics/Analytics**: Displaying detailed statistics about tag usage is not included in the initial version.

5. **Tag Import/Export**: Importing or exporting tags is not included.

6. **Tag Suggestions Based on Content**: Automatic tag suggestions based on recipe/ingredient content are not included (manual tagging only).

7. **Tag Synonyms/Aliases**: Tag aliases or synonym management is not included.

8. **Tag Colors Management UI**: Advanced color picker or color management is not included (simple color field, can be enhanced later).

9. **Tag Usage History**: Tracking when tags were added/removed is not included.

10. **Tag-based Recommendations**: Recommending recipes based on tag similarity is not included.

## Design Considerations

1. **Tag Display**: Tags should be displayed as small, colored badges or chips that are visually distinct but not overwhelming.

2. **Tag Input UX**: The tag input should feel intuitive - users should be able to type and see suggestions, or create new tags easily.

3. **Tag Colors**: Tags can have optional colors for visual organization. Default to a neutral color if not specified.

4. **Tag Filtering UI**: Tag filters should be easy to add/remove, with clear visual indication of active filters.

5. **Tag Consistency**: Autocomplete helps maintain tag name consistency (e.g., "summer" vs "Summer" vs "Summer Drinks").

6. **Tag Limit**: Consider if there should be a maximum number of tags per recipe/ingredient (not enforced in initial version, but UI should handle many tags gracefully).

7. **Tag Name Validation**: Tag names should be reasonable length and avoid special characters that might cause issues.

8. **Tag Search**: Tag search should be fast and support partial matching for autocomplete.

## Technical Considerations

1. **Django Models**:
   - Create `Tag` model in the `cocktails` app
   - Add `tags` ManyToManyField to `Recipe` model
   - Add `tags` ManyToManyField to `Ingredient` model
   - Use `through` model only if additional metadata is needed (not required initially)

2. **Database Migrations**:
   - Create migration for `Tag` model
   - Create migrations to add many-to-many relationships
   - Handle existing data (existing recipes/ingredients will have no tags initially)

3. **Django REST Framework**:
   - Create `TagSerializer` with recipe_count and ingredient_count
   - Update `RecipeSerializer` to include tags
   - Update `IngredientSerializer` to include tags
   - Create `TagViewSet` with standard CRUD operations
   - Update `RecipeViewSet` to support tag filtering
   - Update `IngredientViewSet` to support tag filtering
   - Handle tag creation/assignment in recipe/ingredient create/update

4. **Django Admin**:
   - Register `Tag` model with Django admin
   - Display tag usage counts
   - Allow tag management

5. **React Frontend**:
   - Create TypeScript interfaces for `Tag`
   - Update `Recipe` and `Ingredient` interfaces to include tags
   - Create `TagBadge` component for displaying tags
   - Create `TagInput` component with autocomplete
   - Create `TagList` component for tag management
   - Update `RecipeForm` to include tag selection
   - Update `IngredientList` to show tags and support tag filtering
   - Update `RecipeList` to show tags and support tag filtering
   - Update `RecipeDetail` to display tags

6. **Tag Autocomplete**:
   - Implement debounced search for tag suggestions
   - Cache tag list for performance
   - Support creating new tags inline

7. **Tag Filtering Logic**:
   - Backend: Filter by multiple tags using AND logic (items must have all specified tags)
   - Frontend: Allow selecting multiple tags, show active filters clearly

8. **Tag Colors**:
   - Store as hex color codes (e.g., "#FF5733")
   - Default to a neutral color if not specified
   - Use colors for badge/chip background in UI

9. **Performance Considerations**:
   - Tag autocomplete should be fast (consider caching)
   - Tag filtering queries should be efficient
   - Consider indexing on tag name for search performance

10. **URL Routing Compatibility**:
    - Tags feature should work with the planned URL routing system
    - Tag filters could potentially be added as URL query parameters in the future
    - No conflicts with routing PRD requirements

## Success Metrics

1. **Functional Success**:
   - Tag model is created and migrations run successfully
   - Tags can be created, updated, and deleted through API
   - Tags can be assigned to recipes and ingredients
   - Recipe and ingredient filtering by tags works correctly
   - Frontend displays tags on recipes and ingredients
   - Tag autocomplete works smoothly
   - Multiple tag filtering works (AND logic)

2. **User Experience**:
   - Users can easily add tags to recipes and ingredients
   - Tag autocomplete helps maintain consistency
   - Tag filtering is intuitive and fast
   - Tags are visually clear but not overwhelming

3. **Data Integrity**:
   - Tag names are unique and validated
   - Tag deletion properly removes tags from all items
   - No orphaned tag relationships

4. **Code Quality**:
   - TypeScript compiles without errors
   - Django models follow best practices
   - API responses are well-structured
   - React components are properly typed
   - All tests pass

## Resolved Decisions

1. **Tag Model Approach**: Using a separate `Tag` model with many-to-many relationships to both Recipe and Ingredient for maximum flexibility.

2. **Tag Uniqueness**: Tag names must be unique across the entire system (not per recipe/ingredient).

3. **Tag Filtering Logic**: Multiple tags use AND logic (items must have all specified tags) rather than OR logic.

4. **Tag Creation**: Tags can be created on-the-fly when adding to recipes/ingredients, not requiring pre-creation.

5. **Tag Deletion**: Tags can be deleted freely - deletion automatically removes them from all recipes and ingredients (unlike categories which are protected).

6. **Tag Colors**: Tags have optional colors for visual organization, stored as hex codes.

7. **Tag vs Category**: Tags complement categories - categories are for hierarchical organization (one per ingredient), tags are for flexible labeling (many per item).

8. **URL Routing Compatibility**: Tags feature is designed to work with URL routing - tag filters can be added as query parameters in the future without conflicts.

## Open Questions

1. Should there be a maximum number of tags per recipe/ingredient? (Recommended: No hard limit, but UI should handle many tags gracefully)

2. Should tag names be case-sensitive or normalized? (Recommended: Normalize to lowercase for uniqueness, but preserve original case for display)

3. Should there be predefined/common tags that are suggested to users? (Recommended: No predefined tags initially, but can be added later)

4. Should tag colors be required or optional? (Recommended: Optional, with sensible defaults)

5. Should tags support special characters or be limited to alphanumeric? (Recommended: Allow common characters, but validate to prevent issues)

6. Should tag filtering support OR logic as an option? (Recommended: Start with AND logic only, can add OR logic later if needed)

7. Should there be a tag management page separate from recipe/ingredient forms? (Recommended: Yes, for viewing all tags and bulk management)
