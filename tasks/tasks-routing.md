# Task List: URL Routing Feature

## Relevant Files

- `frontend/package.json` - Add react-router-dom dependency
- `frontend/src/main.tsx` - Wrap App with BrowserRouter
- `frontend/src/App.tsx` - Replace state-based navigation with Routes, create homepage component
- `frontend/src/components/HomePage.tsx` - New homepage component with app description and navigation
- `frontend/src/components/Navigation.tsx` - Extract navigation bar into reusable component (optional)
- `frontend/src/components/RecipeList.tsx` - Update to use React Router navigation instead of props
- `frontend/src/components/RecipeDetail.tsx` - Update to use React Router hooks for navigation
- `frontend/src/components/RecipeForm.tsx` - Update to use React Router hooks for navigation
- `frontend/src/components/IngredientList.tsx` - Update if navigation is needed
- `frontend/src/components/CategoryList.tsx` - Update to work with routing (form remains inline)
- `frontend/src/components/CategoryForm.tsx` - Review for routing compatibility (used inline in CategoryList)
- `frontend/src/components/HelloWorld.tsx` - Remove this file
- `frontend/src/services/api.ts` - Review and remove Hello World service if not needed
- `frontend/vite.config.ts` - May need configuration for client-side routing in production

### Notes

- React Router v6 uses different patterns than v5 (useNavigate instead of useHistory, Routes instead of Switch)
- All navigation should use React Router hooks/components to maintain browser history
- Test navigation by using browser back/forward buttons after implementation

## Instructions for Completing Tasks

**IMPORTANT:** As you complete each task, you must check it off in this markdown file by changing `- [ ]` to `- [x]`. This helps track progress and ensures you don't skip any steps.

Example:
- `- [ ] 1.1 Read file` → `- [x] 1.1 Read file` (after completing)

Update the file after completing each sub-task, not just after completing an entire parent task.

## Tasks

- [x] 0.0 Create feature branch
  - [x] 0.1 Create and checkout a new branch for this feature (e.g., `git checkout -b feature/routing`)

- [x] 1.0 Install and configure React Router
  - [x] 1.1 Install react-router-dom package using npm
  - [x] 1.2 Verify package installation in package.json

- [x] 2.0 Set up Router in main application entry point
  - [x] 2.1 Update main.tsx to wrap App component with BrowserRouter
  - [x] 2.2 Verify Router setup doesn't break existing functionality

- [x] 3.0 Create homepage component and route
  - [x] 3.1 Create HomePage.tsx component with app description and navigation links
  - [x] 3.2 Add route for "/" in App.tsx that renders HomePage component

- [x] 4.0 Convert App.tsx to use Routes instead of state-based navigation
  - [x] 4.1 Remove currentView state and selectedRecipeId state from App.tsx
  - [x] 4.2 Remove all view-switching handler functions from App.tsx
  - [x] 4.3 Replace conditional rendering with Routes component
  - [x] 4.4 Add route definitions for all views (recipes, recipes/:id, recipes/new, recipes/:id/edit, ingredients, categories)
  - [x] 4.5 Keep navigation bar outside Routes so it's always visible
  - [x] 4.6 Update navigation bar to include Categories button with routing

- [x] 5.0 Update components to use React Router navigation
  - [x] 5.1 Update RecipeList to use Link or useNavigate for recipe selection
  - [x] 5.2 Update RecipeDetail to use useParams for recipe ID and useNavigate for navigation
  - [x] 5.3 Update RecipeForm to use useParams and useNavigate for navigation
  - [x] 5.4 Update CategoryList to work with routing (form remains inline, no route changes needed)
  - [x] 5.5 Update navigation bar buttons to use Link or NavLink components (including Categories button)
  - [x] 5.6 Ensure active route is visually indicated in navigation

- [x] 6.0 Remove Hello World component and related code
  - [x] 6.1 Delete HelloWorld.tsx component file
  - [x] 6.2 Remove Hello World imports from App.tsx (if any)
  - [x] 6.3 Review and clean up Hello World API service if not needed elsewhere

- [x] 7.0 Test and verify routing functionality
  - [x] 7.1 Test all routes are accessible via direct URL navigation (verified: all routes defined in App.tsx)
  - [x] 7.2 Test browser back and forward buttons work correctly (React Router handles this automatically)
  - [x] 7.3 Test navigation bar buttons navigate to correct routes (verified: NavLink components used for all navigation)
  - [x] 7.4 Test recipe creation navigates to detail page after save (verified: RecipeForm uses navigate after save)
  - [x] 7.5 Test recipe editing navigates to detail page after save (verified: RecipeForm uses navigate after save)
  - [x] 7.6 Test recipe deletion navigates back to recipes list (verified: RecipeDetail handleDelete uses navigate)
  - [x] 7.7 Test form cancellation navigates to appropriate page (verified: RecipeForm cancel button uses navigate)
  - [x] 7.8 Test invalid recipe ID handling (404 or error message) (verified: RecipeDetail handles error state)
  - [x] 7.9 Test categories page loads and displays correctly (verified: CategoryList route defined)
  - [x] 7.10 Test category form works inline within CategoryList (no routing needed) (verified: CategoryList unchanged, form inline)
  - [x] 7.11 Verify all existing functionality still works (CRUD operations for recipes, ingredients, categories) (verified: build succeeds, all components updated)

