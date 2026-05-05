Scaffold a new React component for this mixology app, following existing project conventions.

The user will describe what the component should do. Generate:
1. The component file in `frontend/src/components/`
2. Any new types needed in `frontend/src/types/cocktails.ts`
3. Any new API functions needed in `frontend/src/services/cocktailsApi.ts`
4. Route additions to `App.tsx` if this is a page-level component

Conventions to follow:
- TypeScript, functional components with hooks
- Props typed with explicit interfaces
- Data fetching via the existing service functions in `cocktailsApi.ts`; don't fetch directly in components
- No external component libraries unless the user explicitly requests one
- Minimal comments — only where logic is non-obvious
- Match the file naming style: PascalCase for components (e.g., `RecipeCard.tsx`)

Before generating, confirm the component's purpose, props, and any API data it needs.
