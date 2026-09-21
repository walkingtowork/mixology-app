# Project Context

Decisions, plans, and environment details for the mixology app ("The Bar Cart") that
aren't derivable from the code or git history. Companion to `PROJECT_REFERENCE.md`
(what exists) and `backlog.md` (what's queued) — this file captures *why* and *what's agreed*.

Last updated: 2026-09-21

---

## Deployment

**Backend** — Django on Railway: `https://mixology-app-production.up.railway.app`
- Railway project: `distinguished-courage`
- Postgres attached in the same Railway project; `DATABASE_URL` auto-injected
- Root directory: `backend/`
- Start command: `python manage.py migrate && gunicorn backend.wsgi --workers 3`
- Env vars: `SECRET_KEY`, `ALLOWED_HOSTS=.railway.app`, `DEBUG=False`,
  `CORS_ALLOWED_ORIGINS=https://thebarcart.vercel.app,https://mixology-app-eight.vercel.app`,
  `DATABASE_URL` (auto)

**Frontend** — React/Vite on Vercel: `https://thebarcart.vercel.app` (renamed 2026-09-21;
the old `mixology-app-eight.vercel.app` stays as a 307 redirect, which keeps already-printed
QR codes working). Share URLs are built from `window.location.origin`
(`MenuDetail.tsx:273`, `:384`), so nothing is hardcoded and new QR codes pick up the new
domain automatically. **Renaming the Vercel domain breaks the API until
`CORS_ALLOWED_ORIGINS` is updated in Railway** — it is an env var, so no redeploy is needed.
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

## Multi-user accounts — agreed decisions

**Status: planned**, not started. Full task breakdown in `tasks/tasks-multi-user-accounts.md`.

Motivation: the app was built single-user with no authentication at all. Sharing a menu link
lets a guest truncate the URL and reach the full app, and — more seriously — the API has no
`REST_FRAMEWORK` block, so DRF defaults to `AllowAny` and anyone can `curl -X DELETE` any
record without a browser. Decided in conversation on 2026-09-21:

- **Session cookie auth**, not tokens. Django's own session machinery, `HttpOnly`, immune to
  XSS token theft, and it reuses the built-in password-reset crypto.
- **Same-origin via a Vercel proxy**, not a custom domain (yet). `vercel.app` and
  `up.railway.app` are both on the Public Suffix List, so no shared parent cookie is possible
  and a cross-site session cookie would be blocked outright by Safari/iOS — the exact devices
  used behind the bar. An `/api/:path*` rewrite in `frontend/vercel.json` makes the browser
  talk to one origin, so the cookie is first-party, `SameSite=Lax` keeps working, and CORS
  stops being load-bearing. A custom domain is strictly better and remains the upgrade path:
  delete the rewrite, change one env var. Nothing built on the proxy is wasted.
- **`SameSite=Lax`** (Django's default) set *explicitly* in settings, so it reads as a
  decision and won't move under a future Django upgrade. It is defence in depth, not a
  replacement for CSRF tokens — keep `CsrfViewMiddleware` and DRF's CSRF enforcement.
- **Email is the login identifier**, not username. Friends expect it, and it matches the
  "change the email you signed up with" requirement.
- **Invite-only signup.** No public registration form to find and farm.
- **New accounts start completely empty.** Every category, ingredient, recipe and menu belongs
  to exactly one user; nothing is shared or seeded. A starter-ingredient wizard is deliberately
  deferred to `backlog.md` so the ownership model stays totally open.
- **Django admin is the admin area.** `accounts/admin.py` already registers `User` with list
  display, filters and search; it just needs the domain models to expose and filter by owner.
  No custom React admin — that would be the single largest chunk of work here for the least
  return. Accepted cost: admin is a separate login, so you sign in twice.
- **Password reset is built in full now, but delivered by hand at first.** Django's reset is
  two separable halves — token generation/validation needs nothing external; only *delivery*
  needs email. Build the real flow, point `EMAIL_BACKEND` at the console backend, and add an
  admin action that prints a copyable reset link. Switching to Gmail SMTP later is four env
  vars and zero code. The trap to avoid is not building the flow and retrofitting it.
- **Invites are delivered by hand too** — generate a link in Django admin, text it over.
  With invite-only signup the invite *is* the email verification, so that's one fewer
  dependency.
- **Rate limiting at "Tier 1" only**: DRF throttling plus `django-axes`. No Redis, no Vercel
  shared-secret gate. Note DRF throttling is inaccurate under `gunicorn --workers 3` (each
  worker counts separately), but `django-axes` is DB-backed and therefore accurate across
  workers — and login brute-force is the case that actually matters.
- **CI plus a rehearsed backup**, not a full staging environment. They cover different
  failures: CI catches code regressions (a broken tenant-isolation test is worthless if
  nobody runs it), a backup catches data disasters. Restoring a production dump locally and
  running the migration against it gets most of staging's value for a fraction of the cost.
- **The ownership migration is phased across separate deploys** — add nullable `owner`,
  backfill, then enforce `NOT NULL` and per-owner uniqueness. This matters more than usual
  because Railway runs `migrate` inside its start command: a migration that fails partway
  doesn't warn, it stops gunicorn from booting at all.

**Two landmines this uncovered**, both recorded because they are easy to miss:

- `CacheReadsMixin` (`cocktails/views.py:11`) stamps `Cache-Control: public` on every 200 GET
  for `Ingredient`, `Recipe` and `IngredientCategory` — precisely the three viewsets about to
  become per-user — while `PublicMenuView`, the one endpoint that genuinely benefits, has no
  caching at all. Putting a CDN in front of `public` responses is how one user gets served
  another's data. The fix is to invert it: drop caching from the owner-scoped viewsets and
  move it to the public menu (short max-age, so a late typo fix still propagates fast). This
  must land *with or before* the proxy.
- `backend/.env.example` documents `DJANGO_SECRET_KEY` while `settings.py:36` reads
  `SECRET_KEY`, falling back to the committed `django-insecure-…` placeholder from commit
  `ade7f58`. Following the repo's own example file lands you silently on a public key, at
  which point session cookies are forgeable. No real `.env` was ever committed and
  `.gitignore` has always covered it, so git history does *not* need rewriting — rotating the
  Railway value makes the old one worthless.

**Deferred security work** is listed in `backlog.md` under "Security — deferred from
multi-user planning". It is safe for a handful of invited friends and explicitly *not* safe
for a public launch; raise it before any such conversation.

---

## Next features to build

**The multi-user overhaul above is now the active project** and supersedes the ordering below
until it ships.

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
- **There is no CI.** No `.github/workflows` exists, and both Railway and Vercel auto-deploy
  on push to `main`, so nothing catches a broken build or a failing test before it reaches
  production. Run `manage.py check`, `manage.py makemigrations --check --dry-run`,
  `manage.py test`, `npm run build` and `npx eslint .` before pushing.
- **Lint has a standing baseline of 8 problems** (7 errors, 1 warning) — pre-existing
  `no-explicit-any` and `set-state-in-effect` issues. Treat "still 8" as clean and anything
  above it as newly introduced.
- **Confirming a deploy landed:** for the frontend, read the bundle name from the root HTML,
  then download it to a *file* and grep the file — capturing a ~370KB bundle into a shell
  variable produced a truncated, confidently wrong "not deployed" reading once. Vercel's
  bundle hash differs from a local build's, so hashes aren't comparable.
- **`origin/01-23-demo_89bc1ee1_add_activity_feed_api` is deliberately kept.** It holds one
  unmerged commit from 2026-01-23 adding `graphite-demo/server.js`, a file that exists
  nowhere else in the repo. It survived the 2026-09-20 branch cleanup on purpose.
- Preference is to plan before building — open a design discussion before implementing
  larger features.
