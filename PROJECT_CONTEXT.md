# Project Context

Decisions, plans, and environment details for the mixology app ("The Bar Cart") that
aren't derivable from the code or git history. Companion to `PROJECT_REFERENCE.md`
(what exists) and `backlog.md` (what's queued) — this file captures *why* and *what's agreed*.

Last updated: 2026-09-02

---

## Deployment

**Backend** — Django on Railway: `https://mixology-app-production.up.railway.app`
- Railway project: `distinguished-courage`
- Postgres attached in the same Railway project; `DATABASE_URL` auto-injected
- Root directory: `backend/`
- Start command: `python manage.py migrate && gunicorn backend.wsgi --workers 3`
- Env vars: `SECRET_KEY`, `ALLOWED_HOSTS=.railway.app`, `DEBUG=False`,
  `CORS_ALLOWED_ORIGINS=https://mixology-app-eight.vercel.app`, `DATABASE_URL` (auto)

**Frontend** — React/Vite on Vercel: `https://mixology-app-eight.vercel.app`
- Repo: `walkingtowork/mixology-app`, root directory: `frontend/`
- Env var: `VITE_API_BASE_URL=https://mixology-app-production.up.railway.app`
- Vercel agent plugin is installed for Vercel-related tasks

**Data** — `backend/data.json` fixture holds 304 records (recipes, ingredients, categories),
already loaded into production Postgres. Restore a local SQLite DB with
`python manage.py loaddata data.json`.

**Local dev** — still SQLite automatically (`dj_database_url` falls back when `DATABASE_URL`
is unset). Run the backend with:
```bash
cd backend && source venv/bin/activate && python manage.py runserver
```

---

## Menus feature — agreed design decisions

Motivation: plan drink menus, track ingredient stock, and share menus with friends.

- Public shareable route works for **any** menu (not just the active one) — no auth required
- Only **one active menu at a time**; activating a new one deactivates the old one behind a
  confirmation modal
- The buy list is **global**, not per-menu
- "Add new recipe" from menu planning opens a **right-side drawer** to keep context; on save,
  the recipe is auto-added to the current menu
- Drinks can be removed from a menu during planning (typical flow: start with ~10, pare to ~5)
- Drink ordering within a menu: a "Reorder" button enters drag-and-drop mode
- `Ingredient` stock level: enum `0/25/50/75/100`; existing rows default to 75, new rows to 100
- Stock UI: vertical bottle-shaped CSS art, amber fill from the bottom, 5 clickable segments
- `IngredientDetail` page gets a "Used in…" recipes section
- `Menu` model carries a theming placeholder field (`TextField`, `blank=True`) — styled later
- Menus appear in the main nav (top + bottom) but **not** in the homepage stat cards

---

## Menu decoration system

Decorations are currently hardcoded in `frontend/src/components/menus/PublicMenu.tsx`
(`UmeDecoration` top-left, `TacoDecoration` bottom-right), with the SVG components in
`frontend/src/components/menus/MenuDecorations.tsx`. The `theme_notes` field on `Menu` is
free text and is not used for decoration selection.

**Why it needs to change:** each menu needs its own theme; the current "Umeshu & Tacos"
decorations won't suit future menus.

**Plan:** add structured `top_decoration` / `bottom_decoration` `CharField` choices to the
`Menu` model, expose them in the serializer and `MenuForm` picker, then conditionally render
the matching SVG component in `PublicMenu`. Grow the SVG component list over time.

---

## Color system cleanup

`--color-primary` and `--color-accent` are both `#B45309` (dark amber) in
`frontend/src/index.css`. The alias is temporary so existing code using `--color-primary`
doesn't break.

**Why:** primary and accent are meant to be distinct, but the palette was never fully
designed — only the amber family was built out.

**How to fix:** define `--color-primary` as a true primary brand color (likely a different
hue), reserve `--color-accent` for the amber highlight, and audit every usage of both
variables to confirm the right semantic token is used.

---

## Next features to build

1. **Public menu page visual polish** (next up)
   - `/share/:token` currently shows a minimal list of drink names, notes, and garnish
   - Wanted: theming, imagery, and general polish so it feels guest-worthy
   - No specific design decisions yet — discuss before building

2. **Drink ordering via the public menu page** (after polish)
   - Guests order drinks directly from the share page
   - Host needs a dashboard/queue in the main app for incoming orders
   - Possibly a "last call" or cutoff mechanism
   - No design decisions yet

3. **Non-alcoholic / N/A menu options** (revisit once Menus is stable)
   - Options considered: a separate N/A menu type, or tagging recipes as N/A
   - No decision made yet

Bring these up proactively when working on menus, recipe features, or the public menu page.

---

## Working notes

- The `gh` CLI is not installed locally, so PRs have to be created via a URL. Suggest
  `brew install gh` followed by `gh auth login` next time a PR comes up.
- Preference is to plan before building — open a design discussion before implementing
  larger features.
