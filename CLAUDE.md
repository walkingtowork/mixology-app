# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Frontend (run from `frontend/`)
```bash
npm run dev       # Start Vite dev server (http://localhost:5173)
npm run build     # TypeScript check + production build
npm run lint      # ESLint
npm test          # Vitest, once (npm run test:watch to re-run on change)
```

### Backend (run from `backend/` with venv activated)
```bash
source venv/bin/activate
python manage.py runserver        # Start Django on http://localhost:8000
python manage.py migrate          # Apply migrations
python manage.py makemigrations   # Generate new migrations
python manage.py createsuperuser  # Create admin user
python manage.py test             # Django tests (SQLite; CI runs the same on Python 3.12)
```

Both servers must run simultaneously for the app to work. The Vite dev server proxies `/api`, `/admin` and `/static` to `http://localhost:8000` (`vite.config.ts`), mirroring the Vercel rewrites in `frontend/vercel.json`, so the browser only ever talks to one origin.

## Architecture

### Data Model
The core domain lives in `backend/cocktails/models.py`:
- `IngredientCategory` → groups ingredients (e.g., "Whiskey", "Citrus")
- `Ingredient` → belongs to a category; has `is_generic` flag for auto-created category representatives
- `Recipe` → a cocktail with name, notes, garnish, optional source URL
- `RecipeIngredient` — through model linking Recipe ↔ Ingredient with `amount` + `unit`

When a category is created, a generic ingredient is auto-created for it (e.g., category "Rum" → ingredient "Rum"). This allows recipes to reference a category generically.

### Backend API
- Django 4.2 + Django REST Framework; SQLite in development, Postgres on Railway
- URL namespace: all API routes under `/api/` (`backend/backend/urls.py` includes `api.urls`, `cocktails.urls` and `accounts.urls`)
- ViewSets and serializers in `backend/cocktails/` handle CRUD for recipes, ingredients, categories, menus, orders and the buy list
- `backend/accounts/` holds the custom `User`, login/logout/session, invite-only signup and password reset
- **Default-deny**: `REST_FRAMEWORK` requires a session for every endpoint unless a view opts out (see below). Not signed in is a 401, not a 403
- `backend/api/` contains the legacy hello-world endpoint only

### Multi-user: every query is owner-scoped
**The core invariant: every queryset is scoped to the signed-in user unless it is deliberately public.** Several friends share one database; a single unscoped query shows or lets someone edit another person's bar. Breaking this is the most serious bug this app can have.

- Owned models carry `owner = owner_field(...)` (`cocktails/models.py`). Child rows (`RecipeIngredient`, `MenuItem`, `Order`) have no owner column; they belong to whoever owns their parent and are scoped through it (`menu__owner=request.user`)
- ViewSets use `OwnerScopedMixin`, which scopes `get_queryset()` and sets `owner` on create. It does **not** scope any other query you write inside an action, or ids arriving in a request body or query string. Those need `owner=request.user` by hand, and `OwnedPrimaryKeyRelatedField` in serializers
- Someone else's object is a **404**, never a 403. Someone else's id in a request body fails validation exactly like a nonexistent one
- The only deliberately public endpoints are keyed by a menu's unguessable `share_token` (`PublicMenuView`, the guest order views). Each sets both `permission_classes = [AllowAny]` and `authentication_classes = []`
- Never mark owner-scoped or per-guest responses `Cache-Control: public` (`PublicCacheMixin` is for the shared menu only): Vercel sits in front of the API, and a cached private response is served to the next person
- New names are unique per owner, not globally (`unique_name_per_owner`, `UniqueNamePerOwnerMixin`)

Use the `owner-scoping` skill whenever you add or change a model, endpoint, action or serializer field, and the `safe-migration` skill for any migration: Railway runs `migrate` in its start command, so a failed migration is an outage.

### Frontend
- React 19 + TypeScript + Vite; React Router v7 for navigation
- **No component library or design system** — currently vanilla CSS with inline styles
- Single service module: `frontend/src/services/cocktailsApi.ts` — all fetch calls go here, typed against `frontend/src/types/cocktails.ts`
- Routes: `/` (home), `/recipes`, `/recipes/:id`, `/recipes/new`, `/recipes/:id/edit`, `/ingredients`, `/categories`
- Navigation and the "+ New Recipe" button live in `App.tsx`, not in page components

### Key Patterns
- The `RecipeForm` component handles both create and edit via the same route wrapper
- Inline styles are used throughout `App.tsx` nav; component-level CSS is minimal
- API calls are same-origin by default (`VITE_API_BASE_URL` defaults to empty); set it only to bypass the proxy and call a backend directly

### Frontend tests
- Vitest + React Testing Library, in `*.test.ts(x)` files next to the code they cover
- Components never call `fetch`; they go through `services/cocktailsApi`. So a component test mocks that one module (`vi.mock('…/services/cocktailsApi')`) and gives each call it makes a return value. Only `cocktailsApi.test.ts` stubs `fetch`
- `src/test/render.tsx` has `renderAt(route, ui)` and the full convention; `src/test/fixtures.ts` has shared sample data
- Test globals are off: import `describe`, `it`, `expect`, `vi` from `vitest`
- Use the `frontend-test` skill when writing or changing frontend tests

## Project Context

`PROJECT_CONTEXT.md` records decisions, plans, and environment details that aren't
derivable from the code: deployment setup (Railway + Vercel), agreed Menus feature
decisions, the menu decoration plan, the color system cleanup, and the next features
to build. Read it before working on menus, theming, or deployment.
