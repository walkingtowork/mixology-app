# Product Requirements Document: Edit Ingredients Feature

## Introduction/Overview

This PRD outlines the requirements for implementing ingredient editing functionality in the React frontend of the mixology application. Currently, users can view ingredients in a list grouped by category, but there is no way to view ingredient details or edit ingredient information from the frontend. This feature will add a new ingredient detail page that displays ingredient information and allows users to edit ingredient names and categories using inline editing on that page.

The primary goal is to enable users to view ingredient details and edit ingredient information (name and category) on a dedicated detail page, following the same routing pattern as recipes. Users will click on an ingredient from the list to navigate to `/ingredients/:id`, where they can view and edit the ingredient information.

## Goals

1. Create a new IngredientDetail component and route for viewing individual ingredients
2. Add navigation from IngredientList to IngredientDetail (clickable ingredients)
3. Implement inline editing on the detail page for modifying ingredient names and categories
4. Add delete functionality with confirmation dialog (especially when ingredient is used in recipes)
5. Ensure proper validation (unique name constraint enforced by backend)
6. Provide clear user feedback for successful edits, errors, and deletions
7. Follow the same design patterns as RecipeDetail for consistency

## User Stories

1. **As a user**, I want to click on an ingredient in the list to see its details so that I can view all information about that ingredient.

2. **As a user**, I want to edit an ingredient's name on the detail page so that I can correct typos or update naming conventions.

3. **As a user**, I want to change an ingredient's category on the detail page so that I can reorganize ingredients as my collection grows.

4. **As a user**, I want to delete an ingredient from the detail page so that I can remove ingredients that are no longer needed.

5. **As a user**, I want to see a confirmation dialog when deleting an ingredient that is used in recipes so that I don't accidentally break existing recipes.

6. **As a user**, I want to navigate back to the ingredients list from the detail page so that I can browse other ingredients.

7. **As a user**, I want inline editing on the detail page so that I can edit fields directly without switching to a separate edit mode.

## Functional Requirements

1. The system must make ingredients in the IngredientList component clickable (using Link component) to navigate to `/ingredients/:id`.

2. The system must create a new route at `/ingredients/:id` that displays the IngredientDetail component.

3. The IngredientDetail component must display:
   - The ingredient name (editable inline)
   - The ingredient category (editable inline via dropdown)
   - An indicator if the ingredient is generic (`is_generic` field, read-only)
   - An "Edit" button to enable editing mode
   - A "Delete" button
   - A "Back to Ingredients" button to navigate to the list

4. The system must support inline editing mode where:
   - Clicking "Edit" makes the name field editable (text input)
   - The category field becomes a dropdown for selection
   - "Edit" button changes to "Save" and "Cancel" buttons appear
   - Fields can be modified directly on the page

5. The system must allow users to edit the ingredient name field when in edit mode.

6. The system must allow users to change the ingredient category by selecting from a dropdown of available categories when in edit mode.

7. The system must allow users to set the category to "Uncategorized" (null) by selecting an appropriate option in the category dropdown.

8. When a user clicks "Save", the system must:
   - Validate that the name field is not empty
   - Send an update request to the backend API (`PATCH /api/ingredients/{id}/`)
   - Display a success message or update the UI to reflect the changes
   - Exit edit mode and return to view mode
   - Optionally navigate back to the list or stay on the detail page

9. When a user clicks "Cancel", the system must:
   - Discard any unsaved edits
   - Exit edit mode and return to view mode
   - Restore the original values

10. The system must handle validation errors from the backend (e.g., duplicate name) and display appropriate error messages to the user.

11. The system must display error messages on the detail page when validation fails.

12. When a user clicks the "Delete" button, the system must:
    - Show a confirmation dialog asking "Are you sure you want to delete this ingredient?"
    - If the ingredient is used in recipes, show additional warning text: "This ingredient is used in X recipe(s). Deleting it will remove it from those recipes."
    - If the user confirms, send a delete request to the backend API (`DELETE /api/ingredients/{id}/`)
    - Navigate back to the ingredients list on successful deletion
    - Display an error message if deletion fails (e.g., if backend prevents deletion)

13. The system must prevent editing of the `is_generic` field (this is a system-managed field, display only).

14. The system must handle loading states appropriately (e.g., disable buttons while save/delete is in progress, show loading spinner).

15. The system must fetch ingredient data when the detail page loads using the ingredient ID from the route parameter.

16. The system must handle invalid ingredient IDs gracefully (e.g., show 404 or error message if ingredient doesn't exist).

17. The system must use React Router's `useParams` hook to extract the ingredient ID from the URL.

18. The system must use React Router's `useNavigate` hook for navigation (back to list, after delete).

## Non-Goals (Out of Scope)

1. **Bulk Editing**: This feature does not include the ability to edit multiple ingredients at once.

2. **Recipe Information Display**: This feature does not include showing which recipes use an ingredient on the detail page. (Note: A separate feature to click on ingredients and see recipes is tracked in the backlog.)

3. **Ingredient Creation**: This feature does not include the ability to create new ingredients from the frontend (this is tracked separately in the backlog).

4. **Advanced Validation**: This feature does not include client-side validation beyond checking for empty name. Backend validation (unique name constraint) will handle the rest.

5. **Undo/Redo**: This feature does not include undo/redo functionality for edits.

6. **Edit History**: This feature does not include tracking or displaying edit history.

7. **Ingredient Merging**: This feature does not include the ability to merge ingredients.

8. **Category Management**: This feature does not include creating or editing categories (only selecting from existing categories).

9. **Separate Edit Route**: This feature does not include a separate `/ingredients/:id/edit` route. Editing happens inline on the detail page.

## Design Considerations

1. **Detail Page Layout**: The ingredient detail page should follow a similar layout to RecipeDetail for consistency:
   - Page title/header with ingredient name
   - Back button to return to ingredients list
   - Information sections for name, category, and other fields
   - Action buttons (Edit, Delete) prominently displayed

2. **Inline Editing**: When in edit mode:
   - The name field should become a text input (styled to look similar to the display text)
   - The category should become a dropdown/select field
   - Visual indication that the page is in edit mode (e.g., subtle background change, border around editable fields)
   - Save and Cancel buttons should replace or supplement the Edit button

3. **Category Dropdown**: The category dropdown should include:
   - An option for "Uncategorized" (or "None") at the top
   - All available categories in alphabetical order
   - The current category pre-selected

4. **Confirmation Dialog**: The delete confirmation dialog should be clear and prominent, with distinct "Cancel" and "Delete" buttons. The delete button should be styled in a warning color (e.g., red).

5. **Error Display**: Error messages should be displayed clearly on the detail page, using a consistent error styling (e.g., red text, error banner at the top).

6. **Loading States**: While saving, deleting, or loading ingredient data, show appropriate loading indicators (spinner, disabled buttons, "Loading..." text).

7. **Success Feedback**: After successful edit or delete, consider showing a brief success message or toast notification.

8. **Navigation**: The "Back to Ingredients" button should use React Router's navigation to return to `/ingredients`.

9. **Clickable List Items**: Ingredients in the list should have clear visual indication that they are clickable (e.g., hover effect, pointer cursor, underline on hover).

## Technical Considerations

1. **API Integration**: The backend API already supports:
   - Ingredient retrieval via `GET /api/ingredients/{id}/`
   - Ingredient updates via `PATCH /api/ingredients/{id}/`
   - Ingredient deletion via `DELETE /api/ingredients/{id}/`
   - The frontend should use or extend the existing `cocktailsApi.ts` service functions.

2. **Route Setup**: Add a new route in `App.tsx`:
   ```tsx
   <Route path="/ingredients/:id" element={<IngredientDetailWrapper />} />
   ```
   Create a wrapper component to extract the ID from route params, similar to RecipeDetailWrapper.

3. **State Management**: The IngredientDetail component will need to track:
   - Ingredient data (fetched from API)
   - Edit mode state (boolean)
   - Form data for editing (name, category_id)
   - Loading states for fetch/save/delete operations
   - Error messages

4. **Category Data**: The component will need to fetch categories for the dropdown. This can be done:
   - On component mount
   - Or passed as a prop if categories are already loaded in a parent component

5. **Backend Validation**: The backend enforces unique name constraints. The frontend should handle 400 Bad Request responses gracefully and display validation errors to the user.

6. **Cascade Behavior**: When an ingredient is deleted, the backend will handle cascade deletion of RecipeIngredient relationships (as defined by `on_delete=models.CASCADE`). The frontend does not need to handle this explicitly.

7. **Generic Ingredients**: The `is_generic` field should be displayed as read-only information (e.g., a badge or label). Generic ingredients can still be edited (name and category), but the `is_generic` flag itself should not be editable.

8. **Component Structure**: Create a new `IngredientDetail.tsx` component following the same patterns as `RecipeDetail.tsx` for consistency.

9. **Error Handling**: Handle network errors, validation errors, and unexpected errors gracefully with appropriate user feedback.

10. **Accessibility**: Ensure all interactive elements are keyboard accessible and have appropriate ARIA labels.

11. **URL Structure**: Follow the same pattern as recipes: `/ingredients` for list, `/ingredients/:id` for detail.

## Success Metrics

1. **Functionality**: Users can successfully navigate to ingredient detail pages and edit ingredient names and categories.

2. **User Experience**: The detail page feels intuitive and consistent with the recipe detail page, with clear feedback for all actions.

3. **Error Handling**: Validation errors and network errors are displayed clearly to users.

4. **Data Integrity**: No duplicate ingredient names are created (backend validation prevents this).

5. **Delete Safety**: Users are properly warned when deleting ingredients used in recipes.

6. **Navigation**: Users can easily navigate between the ingredients list and detail pages.

7. **No Regressions**: Existing ingredient list functionality (grouping, display) continues to work correctly.

## Open Questions

1. Should generic ingredients (`is_generic=true`) show any special restrictions on editing, or can they be edited like any other ingredient? (Recommendation: Allow editing name and category, but keep `is_generic` read-only)

2. Should there be a visual indicator (e.g., icon or badge) on the detail page for ingredients that are used in recipes to help users identify them before editing/deleting?

3. Should the detail page show a count of recipes using this ingredient, even if we don't show the list of recipes? (This could be useful context for users)

4. Should we add keyboard shortcuts for common actions (e.g., Escape to cancel edit, Enter to save)?

5. After saving an edit, should the page stay on the detail view or navigate back to the list? (Recommendation: Stay on detail view to allow further edits if needed)

6. Should the ingredient name in the list be styled differently (e.g., as a link) to indicate it's clickable, or should the entire list item be clickable?
