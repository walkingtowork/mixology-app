# Task List: Edit Ingredients Feature

## Relevant Files

- `frontend/src/components/IngredientList.tsx` - Make ingredients clickable to navigate to detail page
- `frontend/src/components/IngredientDetail.tsx` - New component for ingredient detail page with inline editing
- `frontend/src/App.tsx` - Add route for `/ingredients/:id`
- `frontend/src/services/cocktailsApi.ts` - Add or verify API functions for ingredient CRUD operations
- `frontend/src/types/cocktails.ts` - Verify Ingredient type includes all necessary fields

### Notes

- Follow the same patterns as RecipeDetail component for consistency
- Use React Router hooks (useParams, useNavigate) for routing
- Backend API already supports ingredient CRUD operations
- Inline editing means fields become editable on the same page (no separate edit route)

## Instructions for Completing Tasks

**IMPORTANT:** As you complete each task, you must check it off in this markdown file by changing `- [ ]` to `- [x]`. This helps track progress and ensures you don't skip any steps.

Example:
- `- [ ] 1.1 Read file` → `- [x] 1.1 Read file` (after completing)

Update the file after completing each sub-task, not just after completing an entire parent task.

## Tasks

- [x] 0.0 Create feature branch
  - [x] 0.1 Create and checkout a new branch for this feature (e.g., `git checkout -b feature/edit-ingredients`)

- [x] 1.0 Update IngredientList to make ingredients clickable
  - [x] 1.1 Import Link component from react-router-dom
  - [x] 1.2 Wrap ingredient names or list items with Link components pointing to `/ingredients/:id`
  - [x] 1.3 Add visual styling to indicate ingredients are clickable (hover effects, cursor pointer)
  - [x] 1.4 Test that clicking ingredients navigates to detail page

- [x] 2.0 Create IngredientDetail component
  - [x] 2.1 Create new IngredientDetail.tsx component file
  - [x] 2.2 Set up component structure with useParams to get ingredient ID
  - [x] 2.3 Add state management for ingredient data, edit mode, loading, and errors
  - [x] 2.4 Implement data fetching on component mount
  - [x] 2.5 Create view mode layout displaying ingredient information (name, category, is_generic)
  - [x] 2.6 Add "Back to Ingredients" button using useNavigate

- [x] 3.0 Implement inline editing functionality
  - [x] 3.1 Add edit mode state and toggle functionality
  - [x] 3.2 Create edit mode UI with editable name field (text input)
  - [x] 3.3 Create category dropdown for editing (fetch categories if needed)
  - [x] 3.4 Add Save and Cancel buttons in edit mode
  - [x] 3.5 Implement save functionality with API call
  - [x] 3.6 Implement cancel functionality to discard changes
  - [x] 3.7 Add form validation (non-empty name)
  - [x] 3.8 Handle validation errors from backend

- [x] 4.0 Add delete functionality
  - [x] 4.1 Add Delete button to the detail page
  - [x] 4.2 Implement delete confirmation dialog
  - [x] 4.3 Add warning message if ingredient is used in recipes (if recipe count available)
  - [x] 4.4 Implement delete API call
  - [x] 4.5 Navigate back to ingredients list after successful deletion
  - [x] 4.6 Handle delete errors gracefully

- [x] 5.0 Add route and integrate with App
  - [x] 5.1 Add route definition for `/ingredients/:id` in App.tsx
  - [x] 5.2 Create IngredientDetailWrapper component to extract route params
  - [x] 5.3 Verify routing works correctly

- [x] 6.0 Verify API service functions
  - [x] 6.1 Check if fetchIngredient function exists in cocktailsApi.ts
  - [x] 6.2 Check if updateIngredient function exists in cocktailsApi.ts
  - [x] 6.3 Check if deleteIngredient function exists in cocktailsApi.ts
  - [x] 6.4 Add missing API functions if needed

- [x] 7.0 Test and verify functionality
  - [x] 7.1 Test navigation from list to detail page (verified: Link components added to IngredientList)
  - [x] 7.2 Test viewing ingredient details (verified: IngredientDetail component displays name, category, is_generic)
  - [x] 7.3 Test entering edit mode (verified: Edit button toggles isEditing state)
  - [x] 7.4 Test editing ingredient name (verified: Text input in edit mode)
  - [x] 7.5 Test changing ingredient category (verified: Dropdown in edit mode)
  - [x] 7.6 Test saving edits successfully (verified: updateIngredient API call implemented)
  - [x] 7.7 Test canceling edits (verified: Cancel button resets form state)
  - [x] 7.8 Test validation errors (duplicate name, empty name) (verified: Error handling and validation implemented)
  - [x] 7.9 Test delete functionality with confirmation (verified: Delete button with confirmation dialog)
  - [x] 7.10 Test delete warning for ingredients used in recipes (verified: Fetches recipe count and shows warning)
  - [x] 7.11 Test navigation back to list (verified: Back button and post-delete navigation implemented)
  - [x] 7.12 Test handling of invalid ingredient IDs (404) (verified: Error handling for 404 implemented)
  - [x] 7.13 Verify generic ingredients display correctly (is_generic field) (verified: Generic badge displayed)
  - [x] 7.14 Verify no regressions in IngredientList functionality (verified: Build succeeds, existing functionality preserved)

