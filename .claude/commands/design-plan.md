Create a design and implementation plan for a UI feature or page in this mixology app.

The user will describe what they want to build or improve. Produce:

1. **Goal & scope** — what problem this solves for the user
2. **Layout plan** — describe the page/component structure in plain language or ASCII wireframe
3. **Component breakdown** — which components to create or modify, with clear responsibilities
4. **Styling approach** — specific CSS decisions, color/spacing suggestions, responsive considerations
5. **UX flow** — how the user moves through the feature, including edge cases and empty states
6. **Implementation order** — what to build first, what depends on what

Context about this app:
- React 19 + TypeScript + Vite; React Router v7
- No design system yet — we are building one from scratch
- Core entities: Recipe, Ingredient, IngredientCategory, RecipeIngredient (amount + unit)
- Service layer: all API calls go through `frontend/src/services/cocktailsApi.ts`
- Current styling is vanilla CSS + inline styles; open to introducing a CSS approach or library

Ask clarifying questions before planning if the request is ambiguous. Don't start implementing — just plan.
