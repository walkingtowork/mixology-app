# Task List: Ingredient Categories Feature

## Relevant Files

- `backend/cocktails/models.py` - IngredientCategory model and updates to Ingredient model
- `backend/cocktails/serializers.py` - IngredientCategorySerializer and updates to IngredientSerializer
- `backend/cocktails/views.py` - IngredientCategoryViewSet and updates to RecipeViewSet for category filtering
- `backend/cocktails/urls.py` - URL routing for categories API
- `backend/cocktails/admin.py` - Django admin registration for IngredientCategory
- `backend/cocktails/signals.py` - Django signals for auto-creating generic ingredients
- `frontend/src/types/cocktails.ts` - TypeScript type definitions for IngredientCategory
- `frontend/src/services/cocktailsApi.ts` - API service functions for categories endpoints
- `frontend/src/components/CategoryList.tsx` - Component to display list of categories
- `frontend/src/components/CategoryForm.tsx` - Component for creating/editing categories
- `frontend/src/components/IngredientList.tsx` - Updates to group ingredients by category
- `frontend/src/components/RecipeList.tsx` - Updates to support category filtering

## Instructions for Completing Tasks

**IMPORTANT:** As you complete each task, you must check it off in this markdown file by changing `- [ ]` to `- [x]`. This helps track progress and ensures you don't skip any steps.

Example:
- `- [ ] 1.1 Read file` → `- [x] 1.1 Read file` (after completing)

Update the file after completing each sub-task, not just after completing an entire parent task.

## Tasks

- [ ] 0.0 Create feature branch
  - [ ] 0.1 Create and checkout a new branch for this feature (e.g., `git checkout -b feature/ingredient-categories`)

- [ ] 1.0 Create Django models and migrations (IngredientCategory, update Ingredient)
  - [ ] Sub-tasks will be generated after confirmation

- [ ] 2.0 Create Django signals for auto-creating generic ingredients
  - [ ] Sub-tasks will be generated after confirmation

- [ ] 3.0 Create Django REST Framework API (serializers, viewsets, URLs)
  - [ ] Sub-tasks will be generated after confirmation

- [ ] 4.0 Register IngredientCategory with Django admin
  - [ ] Sub-tasks will be generated after confirmation

- [ ] 5.0 Update React TypeScript types and API service
  - [ ] Sub-tasks will be generated after confirmation

- [ ] 6.0 Create React components for category management
  - [ ] Sub-tasks will be generated after confirmation

- [ ] 7.0 Update existing React components for category support
  - [ ] Sub-tasks will be generated after confirmation

- [ ] 8.0 Test full-stack integration
  - [ ] Sub-tasks will be generated after confirmation
