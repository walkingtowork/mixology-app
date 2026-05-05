# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Frontend (run from `frontend/`)
```bash
npm run dev       # Start Vite dev server (http://localhost:5173)
npm run build     # TypeScript check + production build
npm run lint      # ESLint
```

### Backend (run from `backend/` with venv activated)
```bash
source venv/bin/activate
python manage.py runserver        # Start Django on http://localhost:8000
python manage.py migrate          # Apply migrations
python manage.py makemigrations   # Generate new migrations
python manage.py createsuperuser  # Create admin user
```

Both servers must run simultaneously for the app to work. Frontend proxies API calls to `http://localhost:8000` via `VITE_API_BASE_URL`.

## Architecture

### Data Model
The core domain lives in `backend/cocktails/models.py`:
- `IngredientCategory` → groups ingredients (e.g., "Whiskey", "Citrus")
- `Ingredient` → belongs to a category; has `is_generic` flag for auto-created category representatives
- `Recipe` → a cocktail with name, notes, garnish, optional source URL
- `RecipeIngredient` — through model linking Recipe ↔ Ingredient with `amount` + `unit`

When a category is created, a generic ingredient is auto-created for it (e.g., category "Rum" → ingredient "Rum"). This allows recipes to reference a category generically.

### Backend API
- Django 4.2 + Django REST Framework; SQLite in development
- URL namespace: all API routes under `/api/` (`backend/backend/urls.py` includes both `api.urls` and `cocktails.urls`)
- ViewSets and serializers in `backend/cocktails/` handle CRUD for recipes, ingredients, and categories
- `backend/api/` contains the legacy hello-world endpoint only

### Frontend
- React 19 + TypeScript + Vite; React Router v7 for navigation
- **No component library or design system** — currently vanilla CSS with inline styles
- Single service module: `frontend/src/services/cocktailsApi.ts` — all fetch calls go here, typed against `frontend/src/types/cocktails.ts`
- Routes: `/` (home), `/recipes`, `/recipes/:id`, `/recipes/new`, `/recipes/:id/edit`, `/ingredients`, `/categories`
- Navigation and the "+ New Recipe" button live in `App.tsx`, not in page components

### Key Patterns
- The `RecipeForm` component handles both create and edit via the same route wrapper
- Inline styles are used throughout `App.tsx` nav; component-level CSS is minimal
- API base URL is set via `VITE_API_BASE_URL` env var (defaults to `http://localhost:8000`)
