# Product Backlog

Last reviewed: 2026-09-18. Status verified against the code, not just memory — several
items below had shipped long ago but were never checked off.

See `PROJECT_CONTEXT.md` for the *why* behind agreed decisions, and `tasks/` for
per-feature task breakdowns.

## In progress

- [ ] **Menu theming — decoration selector** (deadline 2026-09-20)
      `top_decoration` / `bottom_decoration` on `Menu`, a thumbnail picker, a fall SVG set,
      and the menu edit UI it depends on.
      → `tasks/tasks-menu-theming-and-stats.md`, branch `feature/menu-theming-and-stats`

- [ ] **Menu order stats** (planned, no deadline)
      Per-menu admin page at `/menus/:id/stats`: per-drink counts, headline numbers,
      guest breakdown, unordered drinks.
      → `tasks/tasks-menu-theming-and-stats.md`

## Features

- [ ] Add ingredient substitutions
- [ ] Add recipes for home-made ingredients
- [ ] Think more about handling sugar cubes
- [ ] Add tags to recipes (and ingredients?) Use the existing `tasks/prd-tags.md`, but review first
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
- [ ] **Last call / ordering cutoff** for the public menu — the one piece of the original
      ordering plan that was never built.
- [ ] **Non-alcoholic / N/A menu options** — either a separate N/A menu type or tagging
      recipes as N/A. No decision made yet.

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
