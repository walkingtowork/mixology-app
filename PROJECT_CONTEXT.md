# Project Context

Decisions, plans, and environment details for the mixology app ("The Bar Cart") that
aren't derivable from the code or git history. Companion to `PROJECT_REFERENCE.md`
(what exists) and `backlog.md` (what's queued) — this file captures *why* and *what's agreed*.

Last updated: 2026-09-18

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
- `Menu` model carries a theming placeholder field (`theme_notes`, `TextField`, `blank=True`)
  — superseded by the structured decoration fields below; still unused by any UI
- Menus appear in the main nav (top + bottom) but **not** in the homepage stat cards

---

## Menu decoration system

**Status: in progress** on `feature/menu-theming-and-stats`. Full task breakdown in
`tasks/tasks-menu-theming-and-stats.md`.

Decorations were hardcoded in `frontend/src/components/menus/PublicMenu.tsx`
(`UmeDecoration` top-left, `TacoDecoration` bottom-right), with the SVG components in
`frontend/src/components/menus/MenuDecorations.tsx`. The `theme_notes` field on `Menu` is
free text and is *not* used for decoration selection — it remains unused by any UI.

**Why it needs to change:** each menu needs its own theme; the "Umeshu & Tacos"
decorations don't suit future menus.

**Agreed plan:** structured `top_decoration` / `bottom_decoration` `CharField` choices on
the `Menu` model, exposed in the serializer and a thumbnail picker in `MenuForm`, rendered
through a registry in `PublicMenu`. Decided 2026-09-18:

- Both fields **default to `none`** — new menus start undecorated and opt in
- Positioning, corner and opacity move **out of each SVG and into a `DecorationSlot`
  wrapper**, so any decoration can occupy either slot (today each SVG hardcodes its own
  corner at `MenuDecorations.tsx:30` and `:63`)
- Unknown keys must render nothing rather than crash — a key dropped from the registry
  later will still be sitting in the database
- First new set is a fall theme (maple branch + acorn/gourd cluster) for the
  2026-09-20 party

**Blocker this uncovered:** there is no menu edit UI at all. `updateMenu()` exists in
`cocktailsApi.ts` but nothing calls it — you cannot rename a menu or change its theme
after creation. The decoration work therefore includes teaching `MenuForm` to handle
create *and* edit through one route wrapper, matching the `RecipeForm` pattern.

**Deferred:** whether menu theming should use full **background images** rather than
corner SVG art. Worth considering later; see `backlog.md`.

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

**A concrete symptom** (found 2026-09-20): the Orders nav badge and the active nav link are
styled identically — `--color-accent` on `--color-accent-light` — so any nav page looks like
it has two items selected. Only the amber family was ever built out, so there was no third
colour to reach for. Fixing the palette properly gives Orders somewhere to go.

---

## Menu order stats

**Status: planned**, not started. Full task breakdown in
`tasks/tasks-menu-theming-and-stats.md`.

An admin-only, per-menu page answering "what actually got drunk." Not visible to guests.
Decided 2026-09-18:

- Lives at **`/menus/:id/stats`** — its own page per menu, not a modal and not inline on
  `MenuDetail` (the planning screen, which should stay free of pre-party zeros). The
  existing `/menus` list is already the "all menus" view, so no new list screen is needed
- Counts are **all-time per menu** — no per-night grouping, no date filter
- Shows headline tiles (total drinks, unique guests, top drink), a ranked by-drink bar
  chart, an explicit **"nobody ordered"** section, and a **by-guest** breakdown
- Must be **reachable on mobile** — the host checks it behind the bar during ordering
  lulls. Mirror the Orders badge treatment from `525bf73`
- **No chart library**; a bar is a div with a percentage width

Two things the aggregation has to get right, both easy to miss:

- Zero-order menu items must still appear, so the query starts from `menu.items` and
  left-joins counts — aggregating over `Order` alone can only return drinks somebody ordered
- Orders outlive menu membership: pull a drink off a menu after the party and its orders
  still exist and still point at that menu. Flag those `on_menu: false` or the totals
  won't reconcile

Note `cancelOrder` hard-deletes, so cancelled drinks leave no trace — there is no
"cancelled" figure to report.

---

## Next features to build

1. **Menu theming via decoration selector** (in progress — deadline 2026-09-20)
   - See "Menu decoration system" above

2. **Menu order stats** (planned, no deadline)
   - See "Menu order stats" above. Orders accumulate in the DB regardless, so this is
     just as useful built after a party against real data

3. **Last call / ordering cutoff** for the public menu
   - The one piece of the original ordering plan that was never built
   - No design decisions yet

4. **Non-alcoholic / N/A menu options** (revisit once Menus is stable)
   - Options considered: a separate N/A menu type, or tagging recipes as N/A
   - No decision made yet

5. **Buy list has no view.** You can add ingredients to it from `IngredientDetail`, and the
   API is complete, but there is no route or page that shows the list. Easy win.

Bring these up proactively when working on menus, recipe features, or the public menu page.

**Shipped since this file was last updated** (was listed here as "to build"):
guest drink ordering + the bartender Orders view (`82483ae`), and the first pass of public
menu visual polish — SVG decorations, QR code modal, drag-and-drop menu planning.

---

## Working notes

- The `gh` CLI is not installed locally, so PRs have to be created via a URL. Suggest
  `brew install gh` followed by `gh auth login` next time a PR comes up.
- Preference is to plan before building — open a design discussion before implementing
  larger features.
