# Product Requirements Document: URL Routing Feature

## Introduction/Overview

This PRD outlines the requirements for implementing URL-based routing in the React frontend of the mixology application. Currently, the app uses state-based view switching where all views are rendered at the root path ("/"). This feature will convert the application to use proper URL routing, allowing users to navigate using browser URLs, share direct links to specific pages, and use browser back/forward buttons naturally.

The primary goal is to replace the current state-based navigation system with React Router, enabling proper URL routing for all application views including recipes list, recipe details, recipe creation/editing, ingredients list, and categories list.

## Goals

1. Install and configure React Router (react-router-dom) in the React application
2. Replace state-based view switching with URL-based routing
3. Create a homepage route ("/") with brief app description and navigation
4. Implement routes for all existing views: recipes list, recipe detail, recipe creation, recipe editing, ingredients list, and categories list
5. Ensure navigation bar is always visible across all routes
6. Remove the Hello World component and its related code
7. Maintain all existing functionality while using URL routing
8. Enable browser back/forward buttons to work correctly
9. Allow direct linking to specific pages (e.g., sharing a recipe detail URL)

## User Stories

1. **As a user**, I want to see a homepage when I visit the root URL ("/") so that I understand what the application is about.

2. **As a user**, I want to navigate to different sections of the app using URLs (e.g., "/recipes", "/ingredients", "/categories") so that I can bookmark and share specific pages.

3. **As a user**, I want to view a recipe detail page at a URL like "/recipes/123" so that I can share direct links to specific recipes.

4. **As a user**, I want to use my browser's back and forward buttons to navigate between pages so that navigation feels natural and familiar.

5. **As a user**, I want the navigation bar to always be visible so that I can easily navigate between sections from any page.

6. **As a user**, I want to create a new recipe at "/recipes/new" and edit an existing recipe at "/recipes/123/edit" so that the URLs reflect the current action I'm performing.

## Functional Requirements

1. The system must install `react-router-dom` package as a dependency.

2. The system must configure React Router with a `BrowserRouter` component wrapping the main App component.

3. The system must create a homepage route at "/" that displays:
   - A brief description of the mixology app
   - Navigation links or buttons to main sections (recipes, ingredients, categories)

4. The system must create a route at "/recipes" that displays the recipe list view (currently `RecipeList` component).

5. The system must create a route at "/recipes/:id" that displays the recipe detail view (currently `RecipeDetail` component), where `:id` is the recipe ID parameter.

6. The system must create a route at "/recipes/new" that displays the recipe creation form (currently `RecipeForm` component without `recipeId` prop).

7. The system must create a route at "/recipes/:id/edit" that displays the recipe editing form (currently `RecipeForm` component with `recipeId` prop).

8. The system must create a route at "/ingredients" that displays the ingredients list view (currently `IngredientList` component).

9. The system must create a route at "/categories" that displays the categories list view (currently `CategoryList` component).

10. The system must ensure the navigation bar (with "Recipes", "Ingredients", and "Categories" buttons) is visible on all routes.

11. The system must update navigation buttons to use React Router's `Link` component or `useNavigate` hook instead of state-based `onClick` handlers.

12. The system must update all components that navigate between views to use React Router navigation methods (e.g., `useNavigate` hook, `Link` component).

13. The system must handle recipe deletion by navigating back to the recipes list after successful deletion.

14. The system must handle recipe save (create/update) by navigating to the recipe detail page after successful save.

15. The system must handle form cancellation by navigating back to the appropriate page (recipe detail if editing, recipes list if creating).

16. The system must ensure that CategoryList component continues to work with inline form display (CategoryForm is shown within CategoryList, not as a separate route).

17. The system must remove the Hello World component (`HelloWorld.tsx`) from the codebase.

18. The system must remove Hello World related imports and usage from `App.tsx`.

19. The system must remove or update the Hello World API service if it's no longer needed.

20. The system must ensure that clicking the browser back button returns to the previous page correctly.

21. The system must ensure that browser forward button works correctly after using back button.

22. The system must handle invalid recipe IDs gracefully (e.g., show 404 or error message if recipe ID doesn't exist).

23. The system must maintain all existing component functionality (data fetching, form validation, etc.) while using routing.

24. The system must ensure that the active route is visually indicated in the navigation bar (e.g., highlight the current page button).

## Non-Goals (Out of Scope)

1. **Authentication/Authorization**: This feature does not include adding authentication or protected routes. All routes remain publicly accessible.

2. **Route Guards**: This feature does not include implementing route guards or redirects based on user state.

3. **Nested Routes**: This feature does not include complex nested routing structures beyond the specified routes.

4. **Route Animations**: This feature does not include page transition animations or route-based animations.

5. **Route-based Code Splitting**: This feature does not include lazy loading or code splitting based on routes (can be added later if needed).

6. **Query Parameters**: This feature does not include handling URL query parameters (e.g., `/recipes?search=gin`), though the structure should allow for future addition.

7. **404 Page**: This feature does not include a custom 404 error page for invalid routes (default browser behavior is acceptable for now).

8. **Route History Management**: This feature does not include custom history management beyond React Router's default behavior.

## Design Considerations

1. **Navigation Bar**: The existing navigation bar should be extracted into a reusable component (e.g., `Navigation.tsx`) that can be used across all routes, or kept in the main App component that wraps all routes.

2. **Active Route Styling**: The navigation buttons should visually indicate which route is currently active. This can be achieved using React Router's `NavLink` component or by checking the current location with `useLocation` hook.

3. **Homepage Content**: The homepage should be simple and welcoming, with clear navigation options. Consider including:
   - App title/logo
   - Brief description (1-2 sentences)
   - Navigation buttons or links to main sections

4. **URL Structure**: Follow RESTful conventions:
   - List views: `/recipes`, `/ingredients`, `/categories`
   - Detail views: `/recipes/:id`
   - Create views: `/recipes/new`
   - Edit views: `/recipes/:id/edit`
   - Note: CategoryForm is displayed inline within CategoryList, so no separate routes needed for category create/edit

5. **Component Structure**: The main App component should contain the Router setup and route definitions, with the navigation bar rendered outside the Routes component so it's always visible.

## Technical Considerations

1. **React Router Version**: Use the latest stable version of `react-router-dom` (v6.x recommended for modern React apps).

2. **Router Type**: Use `BrowserRouter` for clean URLs (e.g., `/recipes`) instead of `HashRouter` (which would create URLs like `/#/recipes`).

3. **Navigation Hook**: Use the `useNavigate` hook for programmatic navigation (e.g., after form submission, after deletion).

4. **Route Parameters**: Use `useParams` hook to extract route parameters (e.g., recipe ID from `/recipes/:id`).

5. **Location Hook**: Use `useLocation` hook if needed to determine the current route for active state styling.

6. **Link Component**: Use `Link` component for navigation links instead of anchor tags to prevent full page reloads.

7. **Component Updates**: Existing components (`RecipeList`, `RecipeDetail`, `RecipeForm`, `IngredientList`, `CategoryList`) may need minor updates to:
   - Remove navigation-related props (e.g., `onRecipeSelect`, `onBack`, `onEdit`)
   - Use React Router hooks for navigation instead
   - Extract route parameters from URL instead of props
   - Note: `CategoryList` displays `CategoryForm` inline, so no separate route is needed for category create/edit

8. **State Management**: The current state management for `currentView` and `selectedRecipeId` in App.tsx should be removed, as routing will handle view switching.

9. **Hello World Cleanup**: Remove:
   - `frontend/src/components/HelloWorld.tsx`
   - Hello World imports from `App.tsx`
   - Hello World API service usage (if not needed elsewhere)
   - Any Hello World related types

10. **Backend Compatibility**: No backend changes are required. The existing API endpoints remain unchanged.

11. **Build Configuration**: Ensure Vite configuration supports client-side routing (typically requires a catch-all route configuration for production builds).

## Success Metrics

1. **Routing Functionality**: All specified routes work correctly and display the appropriate components.

2. **Navigation**: Users can navigate between all pages using the navigation bar buttons.

3. **Browser Navigation**: Browser back and forward buttons work correctly.

4. **Direct Linking**: Users can directly access any route by typing the URL (e.g., `/recipes/123`).

5. **URL Sharing**: Users can share URLs to specific recipes and others can access them directly.

6. **Code Cleanup**: Hello World component and related code are completely removed.

7. **No Regressions**: All existing functionality (recipe CRUD, ingredient viewing, category CRUD) works exactly as before.

8. **User Experience**: Navigation feels natural and intuitive, with clear visual indication of current page.

## Open Questions

1. Should the homepage include any additional content beyond description and navigation? (e.g., featured recipes, statistics)

2. Should we add a "Home" link/button in the navigation bar, or is clicking the app title sufficient?

3. Should recipe deletion show a confirmation dialog before navigating away, or is the existing confirmation sufficient?

4. Should we add breadcrumb navigation for nested routes (e.g., Home > Recipes > Recipe Detail)?

5. Should the app title in the navigation bar link back to the homepage?

