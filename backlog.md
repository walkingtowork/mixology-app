# Product Backlog

Last reviewed: 2026-09-20. Status verified against the code, not just memory — several
items below had shipped long ago but were never checked off.

See `PROJECT_CONTEXT.md` for the *why* behind agreed decisions, and `tasks/` for
per-feature task breakdowns.

## In progress

- [ ] **Multi-user accounts** (planned 2026-09-21, no deadline) — auth, invite-only signup,
      per-user ownership of every model, password reset, personal info. Closes the standing
      hole where the API has no authentication at all.
      → `tasks/tasks-multi-user-accounts.md`, decisions in `PROJECT_CONTEXT.md`

- [ ] **Menu theming — decoration selector** (deadline 2026-09-20)
      `top_decoration` / `bottom_decoration` on `Menu`, a thumbnail picker, a fall SVG set,
      and the menu edit UI it depends on.
      → `tasks/tasks-menu-theming-and-stats.md`, branch `feature/menu-theming-and-stats`

- [ ] **Menu order stats** (planned, no deadline)
      Per-menu admin page at `/menus/:id/stats`: per-drink counts, headline numbers,
      guest breakdown, unordered drinks.
      → `tasks/tasks-menu-theming-and-stats.md`

## Features

- [ ] **Starter-ingredient wizard** — a new account starts completely empty (every
      category, ingredient, recipe and menu belongs to exactly one user, with nothing
      shared or seeded). That means a friend's first load is three empty pages and they
      must create a category before they can do anything. A guided "stock your bar"
      wizard on first login would fill that gap. Deferred deliberately during the
      multi-user planning on 2026-09-20 to keep the ownership model totally open —
      build it after multi-user ships, against a real first-run experience.

- [ ] Add ingredient substitutions
- [ ] Add recipes for home-made ingredients
- [ ] Think more about handling sugar cubes
- [ ] Add tags to recipes (and ingredients?) Use the existing `tasks/prd-tags.md`, but review first
- [ ] **Orders nav badge collides with the active nav link.** `.nav-orders` and
      `.nav-link.active` use the identical pair — `--color-accent` text on
      `--color-accent-light` — so when you're on any nav page it reads as two selected
      items at once (`App.css:88` and `:62`). Needs a third colour for Orders, or a
      different device entirely (outline, dot, count badge). Tied up with the
      `--color-primary` / `--color-accent` cleanup in `PROJECT_CONTEXT.md`, since a real
      primary colour would give Orders somewhere to go. Raised 2026-09-20.
- [ ] **Buy list / shopping list view** — the model, API and "add to buy list" from
      `IngredientDetail` all exist, but there is no route or page that actually shows the
      list. Small, high-value gap.
- [ ] **Standalone "add ingredient" on the Ingredients page** — ingredients can currently
      only be created inline from `RecipeForm` while building a recipe
      (`RecipeForm.tsx:83`); the Ingredients page has no add action of its own.

### Menus — near-future

- [ ] **Background images for menu theming** — consider whether menus should support full
      background imagery rather than only corner SVG decorations. Deferred from the
      2026-09-18 decoration work; revisit once the selector is in and we've seen the fall
      theme in use.
- [ ] **Guest name hint on the order form** — add a note to the "What is your name?" step
      nudging guests toward distinct names. Guest names are self-entered and not unique, so
      two guests named "Sam" merge into one row in menu stats. Agreed to consider, not to
      implement yet.
- [ ] **View recipes from the stats page** — drink names on `/menus/:id/stats` are plain
      text. Consider linking them through to the recipe, or showing the recipe inline, so
      you can go from "the Federation went 6 times" straight to how it's made. Raised
      2026-09-20; no design decisions yet.
- [ ] **Last call / ordering cutoff** for the public menu — the one piece of the original
      ordering plan that was never built.
- [ ] **Non-alcoholic / N/A menu options** — either a separate N/A menu type or tagging
      recipes as N/A. No decision made yet.

## Security — deferred from multi-user planning (2026-09-21)

Raised while planning the multi-user overhaul and explicitly paused, not dismissed.
Revisit before inviting anyone in, and again before any public launch.

**Agreed 2026-09-21:** rate limiting goes in at "Tier 1" — DRF throttling plus `django-axes`,
both of which are settings-and-a-dependency rather than new infrastructure. Redis-backed
accurate throttling and any Vercel shared-secret gate are deferred until there is a reason.

- [ ] **Rotate `SECRET_KEY` and fix the fallback — ships in the first PR, not deferred.**
      `settings.py:36` falls back to the committed `django-insecure-…` placeholder from commit
      `ade7f58`, and `backend/.env.example` documents the variable as `DJANGO_SECRET_KEY` while
      settings reads `SECRET_KEY` — so following the repo's own example lands you silently on the
      public key. Align the name, raise on startup when `DEBUG=False` and the key is missing, and
      rotate the Railway value now while there are no real sessions to invalidate. No real `.env`
      was ever committed and `.gitignore` has always covered it, so history does not need rewriting.

- [ ] **`OrderViewSet` is unauthenticated by design but under-scoped.** `views.py:249` is
      `AllowAny` with `authentication_classes = []` so guests can order without accounts.
      But anyone can POST an order against *any* menu id, and GET returns every order for
      every user. Needs splitting: anonymous create gated on possession of the menu's
      `share_token`, owner-only read and fulfil. No rate limiting either — it is a spam
      target by construction.
- [ ] **IDOR risk on nested writes.** Scoping `get_queryset` is not enough when an id
      arrives in a request body or query string. Three concrete spots: `MenuViewSet.add_item`
      (recipe id), `BuyListViewSet.create` (`ingredient_id`), and `RecipeViewSet.get_queryset`
      (`?ingredient=` / `?category=`). Each must verify the referenced object belongs to the
      requester, or user A can pull user B's recipe onto their menu.
- [ ] **No login rate limiting.** A login form with unlimited password attempts. Consider
      `django-axes`, plus DRF throttling (see note about `--workers 3` below).
- [ ] **Cookie and transport flags are unset.** `SESSION_COOKIE_SECURE`, `CSRF_COOKIE_SECURE`,
      `SECURE_SSL_REDIRECT`, HSTS, and a deliberate session lifetime. `HttpOnly` is on by
      default. Run `python manage.py check --deploy` — it enumerates these.
- [ ] **Vercel preview deployments proxy to a Railway backend.** If previews point at
      production, an unfinished branch writes to real data. Decide where previews point
      before the `/api` rewrite lands.
- [ ] **Django 4.2.26 is past end of life** (4.2 LTS extended support ended April 2026), so
      it no longer receives security patches. Fine for a private app; a blocker for opening
      to the public. Note `requirements.txt` claims "Python 3.12+ required" while the local
      venv runs Python 3.9.6, itself EOL since October 2025.
- [ ] **CI detects but does not gate — nothing actually blocks a bad merge or deploy.**
      Verified 2026-09-21 by deliberately breaking a test: the backend check went red, and
      GitHub still offered a green "Merge pull request" button. Two separate gaps:
      1. **No branch protection on `main`.** Requiring the CI checks to pass before merge is
         a repo setting, not code — Settings → Branches → add a rule for `main` requiring
         "CI / Backend (Django)" and "CI / Frontend (Vite / TypeScript)".
      2. **Deploys ignore CI entirely.** Railway and Vercel both build from `main` on push,
         independently of the workflow, so a red build on `main` means it already shipped.
      Worth closing *before* the ownership migration in task 7.0/8.0, which is the first
      change where a bad merge reaching production costs more than a quick revert.

- [ ] **Railway has no Python runtime pin.** There is no `runtime.txt`, `.python-version`
      or nixpacks config in `backend/`, so Railway chooses the Python version itself.
      Django 4.2 supports 3.8–3.12 and does **not** support 3.13+, so if Railway's default
      ever moves past 3.12 the deploy breaks with no warning. CI pins 3.12 explicitly.
      Pinning the deploy side too would close the gap — verify which file Railway honours
      before relying on it. Related to the Django 4.2 end-of-life item above.

- [ ] **DRF throttling needs a shared cache to work.** The Railway start command runs
      `gunicorn --workers 3`; with the default local-memory cache each worker keeps its own
      counter, so any rate limit is effectively 3x looser and resets on restart. Accurate
      throttling needs Redis.

## Testing

The backend has 59 tests in `backend/cocktails/tests.py`, but they stop at ingredients,
recipes and categories. The frontend has no test framework at all.

- [ ] **Backend: no Menu test coverage.** The 59 tests in `backend/cocktails/tests.py`
      cover ingredients, recipes and categories only. Menu, MenuItem, Order and BuyList —
      including menu activation, share tokens and ordering — have no tests at all.
- [ ] Set up frontend testing framework (Vitest + React Testing Library)
- [ ] Add unit tests for routing functionality (route rendering, navigation, active states)
- [ ] Add unit tests for React components (RecipeList, RecipeDetail, RecipeForm, etc.)
- [ ] Add integration tests for user flows (create recipe, edit recipe, delete recipe)
- [ ] Add tests for navigation bar and routing behavior

## Shipped

- [x] Create ingredient categories and update existing ingredients
- [x] Update so that we're using routes properly
- [x] Add Menus — planning, drag-and-drop ordering, share links, QR codes, activation
- [x] Add ability to click on an ingredient and see all recipes that use it
- [x] View ingredient, amount remaining — stock levels + `StockBottle` UI, and
      "add to buy list" from `IngredientDetail` (the list *view* is still outstanding, above)
- [x] Deploy — Railway (backend) + Vercel (frontend); see `PROJECT_CONTEXT.md`
- [x] Guest drink ordering from the public menu + bartender Orders view (`82483ae`)
- [x] Public menu visual polish, first pass — SVG decorations, QR modal, mobile fixes

## Ingredient Categories - Out of Scope

- [ ] Nested Categories: Hierarchical categories (categories within categories)
- [ ] Category Icons/Images: Visual representations for categories
- [ ] Category Ordering: Custom ordering or sorting of categories (will use alphabetical by default)
- [ ] Bulk Category Assignment: Assigning multiple ingredients to a category at once
- [ ] Category Import/Export: Importing or exporting categories
- [ ] Category Statistics: Displaying statistics about category usage (e.g., number of recipes, number of ingredients)
- [ ] Category Search: Advanced search or filtering of categories (basic list view only)
- [ ] Category Tags/Labels: Additional tagging or labeling system for categories
- [ ] Category History/Audit Trail: Tracking changes to categories over time
