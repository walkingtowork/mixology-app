# Task List: Multi-User Accounts

Planned in conversation on 2026-09-21. The **why** behind every decision below lives in
`PROJECT_CONTEXT.md` under "Multi-user accounts — agreed decisions" — read it first and do
not re-litigate those choices while implementing.

Turning a single-user personal app into a multi-tenant one for a handful of invited friends.
Three things are being fixed at once, and they are genuinely separate problems:

- **Exposure** — there is no `REST_FRAMEWORK` block, so DRF defaults to `AllowAny`. Anyone
  can `curl -X DELETE` any record today, with no browser and no share link involved.
- **Tenancy** — no model belongs to anybody, so "only see your own data" has nowhere to hang.
- **Accounts** — no signup, login, reset or profile flows exist at all.

## Sequencing — read before starting

The ordering below is deliberate and is the part most likely to go wrong if improvised.

**The exposure fix cannot simply go first.** Flipping the API to `IsAuthenticated` before a
login UI exists would lock *you* out too, because the frontend has no way to authenticate.
The path around that is tasks 3.0 → 6.0: once `/api` **and** `/admin` are both proxied through
Vercel, logging in at `…vercel.app/admin/` sets a first-party session cookie on the Vercel
origin, which the app's own `fetch` calls then carry. That closes the hole to the whole
internet while the real auth UI is still weeks away, and it needs no throwaway code.

**The cache fix must land with or before the proxy** (task 4.0 before 5.0). Putting a CDN in
front of responses marked `Cache-Control: public` is how one user gets served another user's
data. Today that header is on exactly the three viewsets about to become per-user.

**The ownership migration is phased across separate deploys** (7.0, then 8.0). Railway runs
`migrate` inside its start command, so a migration that fails partway does not warn — gunicorn
never boots and the app is down until it is fixed.

## Current state — updated 2026-10-13

**Shipped:** 1.0 (`SECRET_KEY` + deploy hardening), 2.0 (CI), 2.5 (interim API lockdown,
PR #17), 3.0 + 4.0 + `data.json` deleted (PR #18), **5.0 (same-origin proxy + WhiteNoise for
the admin, PR #19)**. Preview deployments are off (5.8).

**The app is same-origin in production as of 2026-10-13.** `VITE_API_BASE_URL` is deleted in
Vercel, the live bundle contains no Railway URL, and every API call goes to
`thebarcart.vercel.app/api/…`. The user logged in at `thebarcart.vercel.app/admin/`, edited
through the app, and repeated it on a real iPhone. Rolling back is re-adding the variable
(`https://mixology-app-production.up.railway.app`) in Vercel and redeploying.

**In flight — 6.0 code is written** on `feature/default-deny-api` (6.1–6.3 done, 92 backend
tests green). The API default is now `IsAuthenticated`; `PublicMenuView` and `OrderViewSet`
are untouched. Verified locally in headless Chrome through the dev proxy: signed out, the
share page loads and a guest order can be placed, listed and cancelled; signed out, every
other endpoint is a 403; signed in via `/admin/`, all 9 app routes load and a write works.

Left after merge, all against the live site: 6.4 (log in at `thebarcart.vercel.app/admin/`,
use the app), 6.5 (signed-out reads *and* writes are 403 from `curl`), and 6.6 (share link and
guest ordering signed out, on a phone — the regression that matters most).

**What signed-out looks like until 11.0.** There is no login screen, so a signed-out visitor
gets the app shell with "Failed to load …" and empty-state copy ("No menus yet"). No data is
exposed, but it reads as *empty*, not *locked* — including to the owner when the session
expires (Django's default is two weeks). The way back in is `thebarcart.vercel.app/admin/`.
Any device used behind the bar needs to be logged in there first; the Orders page alone still
works signed out, because `/api/orders/` is open.

Locally no `frontend/.env` is needed; the Vite proxy forwards `/api`, `/admin` and `/static`
to `localhost:8000`. `backend/.env` must have `DEBUG=True`, which is what adds the dev origin
to `CSRF_TRUSTED_ORIGINS`.

**Found in 5.0, worth knowing:**
- Vercel rewrites written as `/api/(.*)` → `…/api/$1` keep the trailing slash Django needs
  (verified live: `/api/ingredients/` is a 200 with no redirect). `:path*` was not tried.
- Both proxies rewrite `Host` to the backend's while `Origin` stays the frontend's, so a
  frontend origin missing from `CSRF_TRUSTED_ORIGINS` means every logged-in write is a 403
  while reads keep working. The list is a literal in `settings.py`, so **renaming the Vercel
  domain now needs a code change**, not just the `CORS_ALLOWED_ORIGINS` env var.
- CORS is no longer load-bearing for the app itself; `CORS_ALLOWED_ORIGINS` only matters to
  something calling Railway directly.

**Known issues for later phases (found in 3.0/4.0):**
- The stopgap returns **403, not 401**, to anonymous writes: `SessionAuthentication` sends no
  `WWW-Authenticate` header, so DRF downgrades it. The 401 hook from 3.3
  (`setUnauthorizedHandler`) therefore will not fire for logged-out users. Decide in 9.0+:
  handle 403 as well, or add an auth class that makes DRF return 401.
- `/api/orders/` never reads the session, so it gets no `Vary: Cookie`. Harmless while
  uncached; tracked on the `OrderViewSet` entry in `backlog.md` for 8.0.
**Deferred by choice, all due before 7.0:** branch protection on `main`; a Python runtime pin
on Railway; local Postgres plus `psycopg2-binary` in the venv. See `backlog.md`.

## Relevant Files

### Safety net (tasks 1.0–2.0)
- `backend/backend/settings.py` - `SECRET_KEY` fallback removal, deploy hardening flags
- `backend/.env.example` - rename `DJANGO_SECRET_KEY` → `SECRET_KEY` to match settings
- `.github/workflows/ci.yml` - new; Django tests, migration check, frontend build, lint

### Same-origin + exposure (tasks 3.0–6.0)
- `frontend/src/services/cocktailsApi.ts` - extract one request helper from ~30 hand-written `fetch` calls
- `frontend/vercel.json` - `/api/:path*` and `/admin/:path*` rewrites, ordered *before* the SPA catch-all
- `frontend/vite.config.ts` - matching dev proxy so local and prod behave identically
- `frontend/.env.example` - `VITE_API_BASE_URL` becomes a relative path
- `backend/cocktails/views.py` - done in 4.0: `CacheReadsMixin` replaced by `PublicCacheMixin`, applied only to `PublicMenuView` (line 249)
- `backend/backend/settings.py` - `REST_FRAMEWORK` block, `CSRF_TRUSTED_ORIGINS`, cookie flags

### Ownership (tasks 7.0–8.0)
- `backend/cocktails/models.py` - `owner` FK on `IngredientCategory`, `Ingredient`, `Recipe`, `Menu`, `BuyListItem`; per-owner uniqueness; `Menu.save()` (line 150)
- `backend/cocktails/migrations/` - three migrations: add nullable, backfill, enforce
- `backend/cocktails/views.py` - owner-scoped `get_queryset` on every viewset; id validation on nested writes
- `backend/cocktails/serializers.py` - owner never client-settable
- `backend/cocktails/tests.py` - cross-user isolation tests

### Accounts (tasks 9.0–14.0)
- `backend/accounts/models.py` - email as `USERNAME_FIELD`; `Invite` model
- `backend/accounts/views.py` - login, logout, session, signup-via-invite, password reset, profile
- `backend/accounts/serializers.py` - new
- `backend/accounts/urls.py` - new
- `backend/accounts/admin.py` - `Invite` admin + "copy reset link" / "copy invite link" actions
- `backend/accounts/tests.py` - extends the existing 10 User model tests
- `frontend/src/components/auth/` - new; Login, Signup, ForgotPassword, ResetPassword, PersonalInfo
- `frontend/src/contexts/AuthContext.tsx` - new
- `frontend/src/App.tsx` - route guards; nav gains account controls
- `frontend/vitest.config.ts`, `frontend/src/test/setup.ts` - new test framework

### Notes
- **Backend tests:** 59 exist in `backend/cocktails/tests.py` covering ingredients, recipes
  and categories only — Menu, MenuItem, Order and BuyList have no coverage at all. Ownership
  touches every one of those models, so task 8.0 is where that gap finally gets closed.
- **Frontend tests:** no framework exists yet. Task 9.0 stands up Vitest + React Testing
  Library *before* the auth UI, so the auth flows ship tested rather than retrofitted.
- **Lint baseline is 8 problems** (7 errors, 1 warning). "Still 8" is clean; above 8 is new.
- Run the backend from `backend/` with the venv active; the frontend from `frontend/`.

## Instructions for Completing Tasks

**IMPORTANT:** As you complete each task, check it off in this file by changing `- [ ]` to
`- [x]`. Update the file after each sub-task, not just after a whole parent task.

Each parent task 1.0–8.0 is intended to be its own PR and its own deploy.

## Tasks

- [x] 0.0 Create feature branch
  - [x] 0.1 `git checkout -b feature/multi-user-accounts` from an up-to-date `main`

- [x] 1.0 Fix `SECRET_KEY` and deploy hardening — ships first, breaks nothing
  - [x] 1.1 Rename `DJANGO_SECRET_KEY` → `SECRET_KEY` in `backend/.env.example` so it matches what `settings.py:36` actually reads
  - [x] 1.2 Remove the `django-insecure-…` fallback; raise `ImproperlyConfigured` at startup when `DEBUG=False` and `SECRET_KEY` is unset, keeping a dev-only fallback for `DEBUG=True`
  - [x] 1.3 Generate a fresh key and rotate the Railway env var — do it now, while there are no real sessions to invalidate
  - [x] 1.4 Add `SESSION_COOKIE_SECURE`, `CSRF_COOKIE_SECURE` and HSTS under `if not DEBUG`. `SECURE_SSL_REDIRECT` got its **own env var** instead: the test runner forces `DEBUG` off, so tying the redirect to `DEBUG` would 301 every request in CI and fail the suite. `SECURE_PROXY_SSL_HEADER` is set unconditionally, since Railway terminates TLS and the redirect would otherwise loop
  - [x] 1.5 Set `SESSION_COOKIE_SAMESITE = 'Lax'` and `CSRF_COOKIE_SAMESITE = 'Lax'` explicitly, even though Lax is already Django's default
  - [x] 1.6 Run `python manage.py check --deploy` and resolve or consciously accept each warning
  - [x] 1.7 Confirm history needs no rewriting: no real `.env` was ever committed and `.gitignore` has always covered it — rotation makes the old key worthless
  - [x] 1.8 Deploy and verify the site still loads — merged as PR #15 (`13a98e4`). Verified live rather than assumed: `strict-transport-security: max-age=2592000; includeSubDomains` (the configured 30 days, no `preload`), plain HTTP 301s to HTTPS so Railway is reading `SECURE_SSL_REDIRECT`, and `Vary: Cookie` is present

- [x] 2.0 Continuous integration
  - [x] 2.1 Add `.github/workflows/ci.yml` triggered on push and pull request
  - [x] 2.2 Backend job: install `requirements.txt`, run `python manage.py test`. **The job must set a `SECRET_KEY` env var** — since 1.2 there is no fallback when `DEBUG=False`, and the test runner forces `DEBUG` off, so a bare checkout raises `ImproperlyConfigured` at import. Leave `SECURE_SSL_REDIRECT` unset so CI requests are not redirected
  - [x] 2.3 Backend job: `python manage.py makemigrations --check --dry-run` to catch model changes with no migration
  - [x] 2.4 Backend job: `python manage.py check --deploy`
  - [x] 2.5 Frontend job: `npm ci`, `npm run build` (this runs `tsc -b`), `npx eslint .`
  - [x] 2.6 Decide how to handle the standing 8-problem lint baseline — fail above 8, rather than failing on any problem
  - [x] 2.7 Confirm a deliberately broken test actually fails the workflow, then revert it — done 2026-09-21 (`8b9d30d`, reverted in `8fdf150`). Backend went red in 11s while the frontend stayed green, confirming the jobs are independent. **It also exposed that nothing gates the merge**: GitHub still offered a green merge button with a failing check. Tracked in `backlog.md`
  - [x] 2.8 Note in `PROJECT_CONTEXT.md` that CI now exists, replacing the "there is no CI" working note

- [x] 2.5 **Interim API lockdown — not in the original plan.** Added 2026-10-12 because the
  exposure was the only thing in the project exploitable *today*, and the planned fix (6.0)
  was four PRs away. Closes the destructive half now; reads stay open until 6.0.
  - [x] 2.5.1 `REST_FRAMEWORK` block with `IsAuthenticatedOrReadOnly` and `SessionAuthentication` only — `BasicAuthentication` dropped from DRF's defaults, so there is no password-over-the-wire path to the API
  - [x] 2.5.2 Confirm `PublicMenuView` and `OrderViewSet` keep their explicit `AllowAny` + `authentication_classes = []`
  - [x] 2.5.3 Register `Menu`, `MenuItem`, `Order` and `BuyListItem` in Django admin — they never were, so with the API refusing anonymous writes there would otherwise be no way at all to manage menus. Task 8.12 needs them registered regardless
  - [x] 2.5.4 Create a superuser on production — **`data.json` contained zero user records**, so the production database had no account and `/admin/` was a door with no key. Done 2026-10-12 via the Railway dashboard console
  - [x] 2.5.5 `AuthenticatedAPITestCase` base class: all 34 write calls across the 6 existing test classes were anonymous and would now 403. Uses `force_authenticate` with no password — hashing one per test added ~9s to the suite for nothing
  - [x] 2.5.6 `AnonymousAccessTests`: 14 tests covering reads open, writes refused (403, not 401 — `SessionAuthentication` offers no `WWW-Authenticate` challenge), and both deliberate exemptions still working

- [x] 3.0 Extract a single request helper in `cocktailsApi.ts`
  - [x] 3.1 Write one `request()` helper handling base URL, JSON headers, `credentials: 'include'`, error shaping, and reading the `csrftoken` cookie into an `X-CSRFToken` header for unsafe methods
  - [x] 3.2 Migrate all ~30 `fetch` call sites in the 670-line module onto it, preserving each function's existing error messages and return types — 36 functions; endpoint, method, body and every error message checked by script against the old file, zero mismatches. Each call site passes its own `error` callback so messages stay verbatim. Only intended differences: `fetchMenuStats` now sends the JSON `Content-Type` like every other call, and a 204 body is no longer parsed
  - [x] 3.3 Add a single place for 401 handling, to be wired to a redirect once auth exists
  - [x] 3.4 Verify every page still works against the unchanged backend — this task must be behaviour-neutral — 2026-10-13, headless Chrome against a copy of the dev DB: all 14 routes load with every API call 200; order create/fulfil/cancel round-trip (incl. 204); 404 and anonymous-403 messages surface as before. Note the stopgap returns **403**, not 401, for anonymous writes (`SessionAuthentication` sends no `WWW-Authenticate`), so the 3.3 hook will not fire for them

- [x] 4.0 Invert the cache headers — must precede the proxy
  - [x] 4.1 Remove `CacheReadsMixin` from `IngredientViewSet`, `RecipeViewSet` and `IngredientCategoryViewSet` (`views.py:26`, `:42`, `:62`)
  - [x] 4.2 Apply caching to `PublicMenuView` (`views.py:241`) instead, with a short `max-age` (~30s) and no `stale-while-revalidate`, so a last-minute menu fix still propagates within seconds
  - [x] 4.3 Confirm `Cache-Control: public` now appears *only* on anonymous, share-token-keyed responses
  - [x] 4.4 Sanity-check that `Vary: Cookie` is present on authenticated responses — Django's `SessionMiddleware` adds it automatically once the session is accessed (`sessions/middleware.py:46`), but verify rather than assume — verified in `CacheHeaderTests`, and it was worth checking: **`/api/orders/` does not get it**, because `authentication_classes = []` means the session is never read. Harmless today (no `Cache-Control`, so nothing caches it); recorded on the `OrderViewSet` entry in `backlog.md` for 8.0

- [x] 5.0 Same-origin via the Vercel proxy — merged as PR #19, switched on 2026-10-13
  - [x] 5.1 Add `/api/:path*` → Railway rewrite to `frontend/vercel.json`, placed **before** the existing `"/(.*)"` SPA catch-all (Vercel matches top-down, first match wins; getting this wrong returns the HTML shell and surfaces as a confusing JSON parse error) — written as `/api/(.*)` → `…/api/$1`, not `:path*`: a named param does not capture a trailing slash, and every Django route ends in one. Verified live 2026-10-13
  - [x] 5.2 Add `/admin/:path*` → Railway rewrite as well — task 6.0 depends on being able to log into Django admin on the Vercel origin — plus bare `/admin`, and `/static/(.*)` for the admin's CSS (served by WhiteNoise as of this PR; see Known issues)
  - [x] 5.3 Point `VITE_API_BASE_URL` at a relative path and update `frontend/.env.example` — that means the **empty string**, since `request()` already prefixes `/api`. Change `cocktailsApi.ts:3` from `||` to `??` first, or `''` falls back to `http://localhost:8000` in production. See "Rollout order" under Current state — done as recommended: the default is now `''` with `??`, and `.env.example` leaves the variable commented out
  - [x] 5.4 Add a matching `server.proxy` entry to `vite.config.ts` so local dev is structurally identical and cookie bugs surface on your laptop — one did: the proxy rewrites `Host` to `localhost:8000`, so the admin login 403'd on the CSRF origin check exactly as production would have. `changeOrigin: true` is now explicit so that stays true. Verified 2026-10-13 in headless Chrome on a DB copy: log in at `localhost:5173/admin/`, then create/update/delete a category through the app's own API module
  - [x] 5.5 Add `CSRF_TRUSTED_ORIGINS = ['https://thebarcart.vercel.app']` — the browser's `Origin` says vercel.app while Django's `Host` says railway.app, and Django's CSRF check compares them — plus `localhost:5173` / `127.0.0.1:5173` under `DEBUG` only, for the dev proxy. Pinned by `ProxiedCsrfTests`, which was confirmed to fail with the setting emptied
  - [x] 5.6 Leave `SESSION_COOKIE_DOMAIN` unset; pinning it to the Railway host makes the browser reject the cookie outright — left unset, with a comment in `settings.py` saying why
  - [x] 5.7 Verify Vercel forwards the destination's `Host` so `ALLOWED_HOSTS=.railway.app` still passes — a mismatch appears as a 400 `DisallowedHost` — verified live 2026-10-13: `/admin/login/` and `/api/ingredients/` are 200 through Vercel with `ALLOWED_HOSTS` unchanged
  - [x] 5.8 **Done 2026-09-22 — preview deployments are off.** Behavior set to "Only build production". in the Vercel project settings before the `/api` rewrite lands, so no preview can ever reach production data. A second Vercel project is not what this needs — previews are automatic per-branch within one project, and the risk is which *backend* they reach. Proper preview isolation would need a second Railway environment with its own database plus a proxy function in place of the static rewrite, since `vercel.json` cannot interpolate env vars into a destination. Revisit only if previews start earning their keep. **More urgent than it first looked:** previews are already live — the CI PR produced a Vercel preview deployment on 2026-09-21 — and `VITE_API_BASE_URL` points them at production Railway, so a preview branch can write to real data *today*. This is not only a future-proxy concern. **How:** Vercel Project Settings → Git → *Ignored Build Step* → Behavior: **"Only build production"** (a preset dropdown; the raw shell-command field it replaced used the counterintuitive convention exit 1 = build, exit 0 = skip). Not "Don't build anything", which would stop production deploys too
  - [x] 5.9 Test on a real iOS device, since that is the browser this whole decision exists to satisfy — done by the user 2026-10-13: admin login and an edit through the app, on an iPhone

- [ ] 6.0 Close the exposure — default-deny API
  - [x] 6.1 Change `DEFAULT_PERMISSION_CLASSES` from `IsAuthenticatedOrReadOnly` to `IsAuthenticated` — the block already exists as of task 2.5, so this is a one-word flip that closes the remaining read exposure — `AnonymousAccessTests` now asserts 403 on 11 private read URLs (including `/api/hello/` and menu stats) in place of the three "reads stay open" tests
  - [x] 6.2 Keep `PublicMenuView` explicitly `AllowAny` with `authentication_classes = []` (`views.py:249`)
  - [x] 6.3 Keep `OrderViewSet` create reachable anonymously so guests can still order; full scoping of that endpoint is tracked in `backlog.md` and is **not** in this task — left entirely as it was, so anonymous list/fulfil/cancel of orders also still work. That is the one read still open to the internet
  - [ ] 6.4 Log in at `…vercel.app/admin/` and confirm the app works end to end with the session cookie, no login UI required yet
  - [ ] 6.5 Confirm from a signed-out browser and from `curl` that writes now return 403
  - [ ] 6.6 Confirm the public share link and guest ordering still work signed out — this is the regression that matters most

- [ ] 7.0 Ownership, phase one — add nullable owner and backfill
  - [x] 7.1 Use **`pg_dump`, not `manage.py dumpdata`** — first dump taken 2026-10-12, verified with `pg_restore -l` (18 `TABLE DATA` entries). Repeat immediately before 7.6 and 7.8; this one will be stale by then. A Django fixture is schema-coupled: a fixture taken before this work cannot be loaded back once `owner` is required, because the rows carry no owner. `pg_dump` captures schema *and* data, so restoring it is a genuine point-in-time rollback. `pg_dump "$DATABASE_URL" -Fc -f backup.dump`
  - [ ] 7.2 Stand up a **local Postgres** to restore into. Confirmed 2026-10-12 that `psql` and `pg_dump` are **not installed** locally, and the venv is missing `psycopg2-binary` and `gunicorn` despite both being in `requirements.txt` — so neither the dump nor a Django run against Postgres works from this machine yet — local dev is SQLite (`dj_database_url` falls back when `DATABASE_URL` is unset), so there is nowhere to `pg_restore` to until one exists. Use **Docker with `postgres:18`** — production is Postgres **18.6**, and a rehearsal is only meaningful against the same major version. Local `libpq` 18.6 is installed and matches, so there is no version-skew risk on the dump side
  - [ ] 7.3 Restore into that local Postgres and confirm the app runs against it, before trusting the dump as a rollback
  - [x] 7.4 Check whether Railway's Postgres service offers scheduled backups — **answered 2026-10-12: this plan does not include them.** Backups are manual only, which makes 7.1 load-bearing rather than belt-and-braces. Tracked in `backlog.md`
  - [ ] 7.5 Rehearse every step below against the restored copy before touching production
  - [ ] 7.6 Add a nullable `owner` FK to `IngredientCategory`, `Ingredient`, `Recipe`, `Menu` and `BuyListItem`
  - [ ] 7.7 Decide `on_delete` per model — deleting a user should not silently orphan or cascade away a menu with order history
  - [ ] 7.8 Write a data migration backfilling every existing row to your admin account. **Target the dedicated non-admin account, not the superuser** (decided 2026-10-12): the superuser administers and owns nothing, so day-to-day use has a small blast radius and you travel the same signup/login/reset paths your friends will. Look the account up **by email**, never a hardcoded id. Note this had no account to point at at all until 2026-10-12 — `data.json` held zero user records, so production had no users at all. Resolved by 2.5.4; the migration must look the account up rather than assume a hardcoded id
  - [ ] 7.9 Verify against the restored dump that all 304 records come out owned, with zero nulls remaining
  - [ ] 7.10 Note that `Order` and `MenuItem` derive ownership through `menu`, so they get no `owner` column of their own
  - [ ] 7.11 Deploy this phase alone and confirm the app still works before starting 8.0

- [ ] 8.0 Ownership, phase two — enforce and scope
  - [ ] 8.1 Migration making `owner` `NOT NULL`
  - [ ] 8.2 Replace the global `unique=True` on `Ingredient.name` (`models.py:57`) and `IngredientCategory.name` (`:63`) with per-owner uniqueness — two users must both be able to have "Rum"
  - [ ] 8.3 Fix `Menu.save()` (`models.py:150`): `Menu.objects.exclude(pk=self.pk).update(is_active=False)` currently deactivates every menu belonging to *every* user
  - [ ] 8.4 Scope `get_queryset` to `request.user` on every owner-bearing viewset
  - [ ] 8.5 Set the owner in `perform_create`; ensure the serializers never accept an owner from the client
  - [ ] 8.6 Validate ids arriving in request bodies and query params — `MenuViewSet.add_item` (recipe id), `BuyListViewSet.create` (`ingredient_id`), and `RecipeViewSet.get_queryset` (`?ingredient=`, `?category=`). Scoping `get_queryset` alone does **not** cover these
  - [ ] 8.7 Scope the generic-ingredient creation logic in `IngredientCategoryViewSet.create`/`update` (`views.py:70`, `:87`), which currently looks up ingredients by name globally
  - [ ] 8.8 Scope `MenuViewSet.stats` so the cross-menu recipe lookup cannot reach another user's recipes
  - [ ] 8.9 Cross-user isolation tests: for each model, user A gets 404/403 on user B's object for read, update and delete
  - [ ] 8.10 Tests that the nested-write paths in 8.6 reject a foreign id
  - [ ] 8.11 First-ever tests for Menu, MenuItem, Order and BuyList, closing the gap noted in `backlog.md`
  - [ ] 8.12 Show `owner` in Django admin for every model, with a filter by user
  - [ ] 8.13 Rehearse against the restored dump, then deploy

- [ ] 9.0 Frontend test framework — before the auth UI, not after
  - [ ] 9.1 Add Vitest, React Testing Library, `@testing-library/jest-dom` and `jsdom`
  - [ ] 9.2 Add `vitest.config.ts` and `src/test/setup.ts`
  - [ ] 9.3 Add a `test` script and wire it into the CI workflow from 2.0
  - [ ] 9.4 Write one component test and one routing test to prove the setup
  - [ ] 9.5 Establish and write down the mocking convention for `cocktailsApi`

- [ ] 10.0 Authentication backend
  - [ ] 10.1 Make `email` unique and required on `accounts.User`; set `USERNAME_FIELD = 'email'` and adjust `REQUIRED_FIELDS`
  - [ ] 10.2 Data migration guaranteeing existing users have unique, non-empty emails before the constraint lands
  - [ ] 10.3 Update `UserAdmin` in `accounts/admin.py`, whose fieldsets and `ordering` currently assume username
  - [ ] 10.4 Login, logout and "who am I" session endpoints
  - [ ] 10.5 Verify CSRF is enforced on unsafe methods and that DRF's `SessionAuthentication` is doing it
  - [ ] 10.6 Update the 10 existing tests in `accounts/tests.py`, which all construct users by username
  - [ ] 10.7 Tests for login, logout, session and CSRF rejection

- [ ] 11.0 Authentication UI
  - [ ] 11.1 `AuthContext` exposing current user, loading state, login and logout
  - [ ] 11.2 Login page
  - [ ] 11.3 Route guard redirecting anonymous users to login, with `/share/:shareToken` explicitly exempt — this is the original complaint: truncating a share URL must land on a login screen, not your data
  - [ ] 11.4 Wire the 401 handler from 3.3 to the redirect
  - [ ] 11.5 Account controls in the nav in `App.tsx`
  - [ ] 11.6 Tests: guard redirects, login succeeds, logout clears state, share route stays public

- [ ] 12.0 Invites
  - [ ] 12.1 `Invite` model — token, email, created/used timestamps, issuing user, expiry
  - [ ] 12.2 Signup-via-invite endpoint validating the token, then creating an owned, empty account
  - [ ] 12.3 Django admin action generating a copyable invite link
  - [ ] 12.4 Signup page consuming the token from the URL
  - [ ] 12.5 Confirm no signup path exists without a valid token
  - [ ] 12.6 Tests: valid, expired, already-used and forged tokens

- [ ] 13.0 Password reset — full flow, manual delivery
  - [ ] 13.1 Forgot-password endpoint using Django's `default_token_generator`
  - [ ] 13.2 Token validation and password-set endpoint
  - [ ] 13.3 Call `send_mail()` normally, with `EMAIL_BACKEND` set to the console backend in production for now
  - [ ] 13.4 Django admin action printing a copyable reset link, so recovery works today with no email service
  - [ ] 13.5 Forgot-password and reset pages in the frontend
  - [ ] 13.6 Confirm the response does not reveal whether an address is registered
  - [ ] 13.7 Document the four env vars that switch delivery to Gmail SMTP later, with zero code change
  - [ ] 13.8 Tests: token issued, token validates, expired token rejected, token single-use

- [ ] 14.0 Personal Info screen
  - [ ] 14.1 Profile read and update endpoints for email and fullname
  - [ ] 14.2 Require the current password to change email — with no verification, a typo in the login identifier locks the account out immediately
  - [ ] 14.3 Change-password endpoint requiring the current password
  - [ ] 14.4 Personal Info page
  - [ ] 14.5 Tests including the wrong-current-password rejection

- [ ] 15.0 Rate limiting (Tier 1)
  - [ ] 15.1 DRF `AnonRateThrottle` and `UserRateThrottle` in the `REST_FRAMEWORK` block
  - [ ] 15.2 Record in-code that throttling is ~3x looser than configured under `gunicorn --workers 3`, since each worker counts separately without a shared cache
  - [ ] 15.3 Add `django-axes` for login brute-force protection — DB-backed, so it *is* accurate across workers
  - [ ] 15.4 Wire axes to the login view deliberately; it hooks Django's `authenticate()` path and needs care with DRF
  - [ ] 15.5 Throttle the anonymous order-create endpoint, which is a spam target by construction

- [ ] 16.0 Documentation and skills
  - [ ] 16.1 Add the core invariant to `CLAUDE.md`: every queryset is owner-scoped unless deliberately public. It belongs there rather than only in a skill, because `CLAUDE.md` loads every session
  - [ ] 16.2 Write the `owner-scoping` skill in `.claude/commands/` — the checklist for adding a model or endpoint without leaking data
  - [ ] 16.3 Write the `safe-migration` skill, encoding the phased pattern and the fact that a failed Railway migration is an outage rather than a warning
  - [ ] 16.4 Write the `frontend-test` skill now that conventions exist from 9.0
  - [ ] 16.5 Update `README.md` for signup, login and the superuser flow
  - [ ] 16.6 Run `/security-review` against the full branch before merge
  - [ ] 16.7 Update `backlog.md` and `PROJECT_CONTEXT.md` to reflect what shipped
