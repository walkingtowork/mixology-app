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

**10.0 and 11.0 now come before 9.0** (the user's call, 2026-10-14). The plan was to have the
frontend test framework in place before the auth UI. The user wants a real login screen
before the 2026-10-31 party, so the bar device does not have to sign in through `/admin/`.
The cost: the auth UI ships covered only by backend tests and a browser click-through until
9.0 lands, which then starts by writing the auth UI tests (9.6). Task numbers are unchanged
so existing references still resolve; the list below is in working order.

**The ownership migration is phased across separate deploys** (7.0, then 8.0). Railway runs
`migrate` inside its start command, so a migration that fails partway does not warn — gunicorn
never boots and the app is down until it is fixed.

## Current state — updated 2026-10-14

**Shipped:** 1.0 (`SECRET_KEY` + deploy hardening), 2.0 (CI), 2.5 (interim API lockdown,
PR #17), 3.0 + 4.0 + `data.json` deleted (PR #18), 5.0 (same-origin proxy + WhiteNoise for
the admin, PR #19), 6.0 (default-deny API, PR #20), 7.0 (nullable owner + backfill,
PR #21), **8.0 (ownership enforced and every query scoped, PR #22)**. Preview deployments
are off (5.8).

**The app is same-origin in production as of 2026-10-13.** `VITE_API_BASE_URL` is deleted in
Vercel, the live bundle contains no Railway URL, and every API call goes to
`thebarcart.vercel.app/api/…`. The user logged in at `thebarcart.vercel.app/admin/`, edited
through the app, and repeated it on a real iPhone. Rolling back is re-adding the variable
(`https://mixology-app-production.up.railway.app`) in Vercel and redeploying.

**The API is default-deny in production as of 2026-10-13.** Verified live: signed out, every
private read and write is a 403 from `curl`, both through Vercel and directly on Railway;
logged in at `thebarcart.vercel.app/admin/`, the app is fully populated; signed out on a
phone, the app shows zeros and a shared menu still opens. The user then placed and cancelled a real guest order signed
out on a phone, which closes 6.6.

**Ownership phase one is live as of 2026-10-13.** Migrations `0010` (nullable `owner` on the
five owned models) and `0011` (backfill to `walkingtowork`) are applied in production: the
Railway deploy is active, and a per-table count of unowned rows printed 0 for every table.
The site stayed up throughout. A
pre-migration dump exists at `~/mixology-2026-10-13-pre-7.0.dump`.

**Ownership is enforced and scoped in production as of 2026-10-13 (8.0, PR #22).** Confirmed
by the user: Railway shows the PR #22 deployment active; signed in as `walkingtowork` the app
is fully populated (and its `/admin/` is empty, as it has no permissions); signed in as
`admin` the app is empty; and `owner_id` is `NOT NULL` on all five tables. Checked from
outside, signed out, through Vercel and directly on Railway: seven private reads are 403 and
the public menu is a 200 with `Cache-Control: max-age=30, public`. Anonymous write probes
were not re-sent after this deploy. A pre-deploy dump exists at `~/mixology-2026-10-13.dump`
(taken 23:15). It shipped as one deploy, not the two the handoff notes suggested: the user
would not be writing to production during it, and the split only protected such writes.

**Sign in as `walkingtowork`, not `admin`** — `admin` owns nothing and sees an empty app.

**Order scoping (8.5) is live as of 2026-10-14 (PR #23).** Decisions the user agreed in that
session:

- **Guests and the bartender no longer share an endpoint.** Guests use
  `/api/public/menu/<share_token>/orders/` (place, list by `guest_name`) and
  `…/orders/<id>/?guest_name=…` (cancel); no session, the token in the URL is the credential.
  `/api/orders/` is owner-only (`menu__owner=request.user`), has no POST, and only
  `is_fulfilled` is writable. The share page URL and printed QR codes are unchanged.
- **Only the active menu takes orders**, and only for drinks on it. Any menu can still be
  previewed by its share link; the page hides the Order button when `is_active` is false and
  the API answers 403. "My Orders" stays visible on an inactive menu, deliberately, so someone
  shown a draft link can see the feature exists.
- **Guest identity is still just a typed name.** Cancelling needs the matching name and an
  unserved order. Two guests who type the same name share one order list and can cancel each
  other's drinks; the user is not worried about that for a party. The "guest name hint" item
  in `backlog.md` is the mitigation if it ever matters.
- **A guest can change their name** from a pencil beside "Ordering as …" in the My Orders
  drawer. It only changes the name saved on the phone: earlier orders stay under the old name
  and drop out of that guest's list. Renaming existing orders was left out on purpose — it
  needs a guest endpoint that would let anyone with the link rename another guest's orders.
- **No compatibility shim for the old frontend bundle** — parties are months apart. The old
  `POST /api/orders/` shape is now a 403.
- **The device behind the bar must be signed in.** The Orders page used to work signed out;
  it no longer does, and Django sessions last two weeks. Sign in at `/admin/` shortly before
  a party (next one: 2026-10-31).

Verified locally in headless Chrome on a DB copy with two hosts and a signed-out guest (27
checks, UI and raw requests). The user confirmed both production checks on 2026-10-14: a
signed-out phone can order from the active menu's link, and the Orders page works signed in.

**Next — 10.0 and 11.0 (login), then 9.0** (reordered 2026-10-14, see Sequencing). The user
talked 10.0 through on 2026-10-14 and changed its shape: login accepts email **or** username,
`USERNAME_FIELD` stays `username`, one deploy. See "Log in with email or username" in
`PROJECT_CONTEXT.md`.

**11.0 is live as of 2026-10-14 (PR #25).** The user confirmed in production: signed out, the
site shows the login page; signing in there and logging out from the account chip work; a
share link still opens signed out. The bar device no longer needs `/admin/`.

**9.0 is live as of 2026-10-14 (PR #26).** 34 frontend tests, run by CI. They caught a bug
that was live from 11.0: after a deliberate log out, the next sign-in returned to the
previous page instead of home. PR #26 fixed one cause (`returnAfterLogin` in the auth
context), but **the user still sees the bug in production**, so it is not fixed. It is
tracked in `backlog.md` under "Up next". **CI still gates nothing** (see the deployment
notes), so a red run does not block a merge.

**12.0 is live as of 2026-10-14 (PR #27).** Reshaped for a coding meetup that evening:
besides admin-made invites, the host can show a QR invite from the account menu. Decisions
are under "Invites" in `PROJECT_CONTEXT.md`. The user granted `walkingtowork` "Can add
invite" in Django admin and opened the invite QR in production; a forged token answers 404
from outside. The user then signed up on a second phone in production and confirmed the
whole flow works. Any other account that should invite needs the same permission.

**Next: 13.0 (password reset).**

**10.0 is live as of 2026-10-14 (PR #24)** — the user confirmed Railway booted and `/admin/`
signs in by username and by email. What follows describes how it was built and rehearsed.
**10.0 was built on `feature/auth-backend` (2026-10-14).** Rehearsed
against `prod_1013_2152` in `mixology-pg18`: both migrations apply, the two production users
keep their emails, and a forced case-only email clash stops at `0002` with nothing applied.
Login and logout were exercised through the Vite proxy in a real browser. **Before merging:**
the user takes a fresh production dump. **After deploy:** confirm Railway booted, and that
`/admin/` still signs in as `walkingtowork` and also accepts the email. Nothing in the
frontend uses the new endpoints until 11.0.
- The frontend must re-read the `csrftoken` cookie after login: Django rotates it. The
  `request` helper already reads it per call.
- Usernames are ASCII letters and digits only (the user's call). The rule is enforced by
  validation, not the database, so a legacy username with a symbol still works unless it
  contains `@`, which would be read as an email.

**Loose ends from 8.0:**
- **No anonymous write was re-tested against production after the 8.0 deploy.** Claude's
  POST/DELETE probes were blocked by the session's permission check (they would be real
  writes if the lock had failed). Reads are confirmed 403 and the permission setting did not
  change in PR #22. If wanted, the user can run one themselves; a 403 is the pass.
- **Two docs commits are on local `main`, unpushed** (`6a16923`, `cbd5912`, plus this one).
  They ride along with the next branch push, per the house rules.
- **The local SQLite dev DB has not been migrated past `0011`.** If it has unowned rows it
  needs `BACKFILL_OWNER_USERNAME=admin python manage.py migrate` (there is no
  `walkingtowork` locally); a plain `migrate` will raise.
- **In `mixology-pg18`**, `prod_1013_2152` is a restore of the 21:52 dump at migration `0009`
  and makes a good template for the next rehearsal. Order scoping needs no migration, so a
  rehearsal is only for a two-user check against real data.

What 8.0 did, for reference:

- **What it does.** Every owner-bearing viewset is scoped to `request.user`
  (`OwnerScopedMixin`); every create path sets the owner; ids in request bodies are checked
  by `OwnedPrimaryKeyRelatedField`; `Menu.save()` is per-owner; admin shows and filters by
  owner. Migration `0012` re-runs the backfill, `0013` makes `owner` `NOT NULL` and swaps the
  global unique name for one per owner. `UniqueNamePerOwnerMixin` turns a duplicate name
  into a 400, since DRF cannot derive that check from a constraint on a field it never sees.
- **Tests:** 158 pass on SQLite and Postgres 18 (was 96). The isolation and foreign-id tests
  were confirmed to fail with the scoping removed.
- **Rehearsed against the 21:52 version of `~/mixology-2026-10-13.dump`** (since replaced by
  the 23:15 pre-deploy dump of the same name; it was at migration `0009`, so
  the copy was first migrated to `0011` to match production). With three unowned rows
  inserted to stand in for anything created since 7.0: `0012` and `0013` apply, zero nulls,
  all five `owner_id` columns `NOT NULL`, row counts unchanged (200 recipe-ingredients, 10
  menu items, 9 orders). Reversing to `0011` and re-applying works. `walkingtowork` sees
  12/108/50/2/3 rows; `admin` sees nothing, gets 404s, can create its own "Bourbon" beside
  the owner's, and cannot put the owner's recipe on its menu. Signed out, the share link and
  a guest order still work.

**Rehearsal environment.** Docker container `mixology-pg18` — stopped
as of 2026-10-13, data intact; bring it back with `docker start mixology-pg18`. It runs
`postgres:18` on `127.0.0.1:5433`, password `localonly`; database `mixology` is the pristine
restore, `rehearsal` and `rehearsal_fail` are scratch copies made with
`create database … template mixology`. Port 5432 belongs to another project's container —
leave it alone. `psql`/`pg_dump`/`pg_restore` are at `/opt/homebrew/opt/libpq/bin`, not on
`PATH`. **The project venv is Python 3.9 and cannot build `psycopg2-binary`**, so anything
touching Postgres needs a throwaway 3.12 venv:
`/opt/homebrew/bin/python3.12 -m venv <dir> && <dir>/bin/pip install -r requirements.txt`.
The local SQLite dev DB has only an `admin` user; it was backfilled to `admin` on 2026-10-13
(`BACKFILL_OWNER_USERNAME=admin python manage.py migrate`), so locally `admin` owns everything.

What the rehearsal showed, against a copy of production: both migrations apply cleanly;
all 172 owned rows (11 categories, 107 ingredients, 49 recipes, 2 menus, 3 buy-list items)
come out owned by `walkingtowork` with zero nulls; the 200 recipe-ingredients, 10 menu items
and 9 orders are untouched; reversing to `0009` and re-applying works; and with the owner
account missing, `0010` commits, `0011` raises, and the data stays intact and readable.

**House rules** (held across the 5.0–8.0 sessions):

- One PR per deploy; the user opens PRs from a URL
  (`gh` is not authenticated) and merges them; do not push until asked; after merge, run the
  live checks, delete the branch locally and remotely, then update this block. Docs-only
  commits go straight on `main` and ride along with the next branch push.

**What signed-out looks like until 11.0.** There is no login screen, so a signed-out visitor
gets the app shell with "Failed to load …" and empty-state copy ("No menus yet"). No data is
exposed, but it reads as *empty*, not *locked* — including to the owner when the session
expires (Django's default is two weeks). The way back in is `thebarcart.vercel.app/admin/`.
Any device used behind the bar needs to be logged in there first — including for the Orders
page, since order scoping (8.5).

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
**Deferred by choice:** branch protection on `main`; a Python runtime pin on Railway; and
rebuilding `backend/venv` on Python 3.12, which the user wants first after this project. See
`backlog.md`. Local Postgres is done (above).

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

- [x] 6.0 Close the exposure — default-deny API — merged as PR #20, live 2026-10-13
  - [x] 6.1 Change `DEFAULT_PERMISSION_CLASSES` from `IsAuthenticatedOrReadOnly` to `IsAuthenticated` — the block already exists as of task 2.5, so this is a one-word flip that closes the remaining read exposure — `AnonymousAccessTests` now asserts 403 on 11 private read URLs (including `/api/hello/` and menu stats) in place of the three "reads stay open" tests
  - [x] 6.2 Keep `PublicMenuView` explicitly `AllowAny` with `authentication_classes = []` (`views.py:249`)
  - [x] 6.3 Keep `OrderViewSet` create reachable anonymously so guests can still order; full scoping of that endpoint is tracked in `backlog.md` and is **not** in this task — left entirely as it was, so anonymous list/fulfil/cancel of orders also still work. That is the one read still open to the internet
  - [x] 6.4 Log in at `…vercel.app/admin/` and confirm the app works end to end with the session cookie, no login UI required yet — confirmed by the user on a laptop, 2026-10-13
  - [x] 6.5 Confirm from a signed-out browser and from `curl` that writes now return 403 — 2026-10-13: 7 private GETs, a POST and a DELETE all 403, through Vercel and directly on Railway
  - [x] 6.6 Confirm the public share link and guest ordering still work signed out — this is the regression that matters most — confirmed by the user on a phone 2026-10-13: share link opens, a guest order can be placed and cancelled

- [x] 7.0 Ownership, phase one — add nullable owner and backfill — merged as PR #21, live 2026-10-13
  - [x] 7.1 Use **`pg_dump`, not `manage.py dumpdata`** — first dump taken 2026-10-12, verified with `pg_restore -l` (18 `TABLE DATA` entries). Repeat immediately before 7.6 and 7.8; this one will be stale by then. A Django fixture is schema-coupled: a fixture taken before this work cannot be loaded back once `owner` is required, because the rows carry no owner. `pg_dump` captures schema *and* data, so restoring it is a genuine point-in-time rollback. `pg_dump "$DATABASE_URL" -Fc -f backup.dump`
  - [x] 7.2 Stand up a **local Postgres** to restore into. Confirmed 2026-10-12 that `psql` and `pg_dump` are **not installed** locally, and the venv is missing `psycopg2-binary` and `gunicorn` despite both being in `requirements.txt` — so neither the dump nor a Django run against Postgres works from this machine yet — local dev is SQLite (`dj_database_url` falls back when `DATABASE_URL` is unset), so there is nowhere to `pg_restore` to until one exists. Use **Docker with `postgres:18`** — production is Postgres **18.6**, and a rehearsal is only meaningful against the same major version. Local `libpq` 18.6 is installed and matches, so there is no version-skew risk on the dump side — done 2026-10-13: container `mixology-pg18` on port 5433. `psql`/`pg_dump` turned out to be installed with `libpq`, just not on `PATH`. The venv is Python 3.9 and cannot build `psycopg2-binary`; a throwaway 3.12 venv was used instead (see Current state)
  - [x] 7.3 Restore into that local Postgres and confirm the app runs against it, before trusting the dump as a rollback — restore exits 0; every list endpoint returns the production row counts; the full test suite passes on Postgres 18
  - [x] 7.4 Check whether Railway's Postgres service offers scheduled backups — **answered 2026-10-12: this plan does not include them.** Backups are manual only, which makes 7.1 load-bearing rather than belt-and-braces. Tracked in `backlog.md`
  - [x] 7.5 Rehearse every step below against the restored copy before touching production — apply, verify, reverse, re-apply, and the missing-owner failure mode; results under Current state
  - [x] 7.6 Add a nullable `owner` FK to `IngredientCategory`, `Ingredient`, `Recipe`, `Menu` and `BuyListItem`
  - [x] 7.7 Decide `on_delete` per model — deleting a user should not silently orphan or cascade away a menu with order history — `PROTECT` on all five: deleting a user who still owns anything is refused. Confirmed by the user 2026-10-13 ("fine for now"); changing it later is a state-only migration
  - [x] 7.8 Write a data migration backfilling every existing row to your admin account. **Target the dedicated non-admin account, not the superuser** (decided 2026-10-12): the superuser administers and owns nothing, so day-to-day use has a small blast radius and you travel the same signup/login/reset paths your friends will. Look the account up **by email**, never a hardcoded id. Note this had no account to point at at all until 2026-10-12 — `data.json` held zero user records, so production had no users at all. Resolved by 2.5.4; the migration must look the account up rather than assume a hardcoded id — done, with one deviation: it looks up by **username** (`walkingtowork`), not email, because this repo is public and the email would be committed. `BACKFILL_OWNER_USERNAME` overrides it for databases whose original user has another name. If rows need an owner and the account is missing it raises rather than skips
  - [x] 7.9 Verify against the restored dump that all 304 records come out owned, with zero nulls remaining — zero nulls across 172 owned rows. (304 was a count of every record at planning time; only five tables carry an owner)
  - [x] 7.10 Note that `Order` and `MenuItem` derive ownership through `menu`, so they get no `owner` column of their own
  - [x] 7.11 Deploy this phase alone and confirm the app still works before starting 8.0 — 2026-10-13: no outage across the deploy window; the user confirmed the deployment is active and that every owned table has zero unowned rows in production

- [x] 8.0 Ownership, phase two — enforce and scope — merged as PR #22, live 2026-10-13
  - [x] 8.1 Migration making `owner` `NOT NULL` — `0013`, preceded by `0012` re-running the backfill. Two migrations because Postgres will not `ALTER` a table in the transaction that updated its rows
  - [x] 8.2 Replace the global `unique=True` on `Ingredient.name` (`models.py:57`) and `IngredientCategory.name` (`:63`) with per-owner uniqueness — two users must both be able to have "Rum" — `UniqueConstraint(owner, name)` on both, added before the global one is dropped
  - [x] 8.3 Fix `Menu.save()` (`models.py:150`): `Menu.objects.exclude(pk=self.pk).update(is_active=False)` currently deactivates every menu belonging to *every* user — filters on `owner=self.owner`; pinned by `test_activating_my_menu_leaves_another_users_active_menu_alone`
  - [x] 8.4 Scope `get_queryset` to `request.user` on every owner-bearing viewset — `OwnerScopedMixin` on the ingredient, recipe, category, menu and buy-list viewsets; `MenuItemViewSet` scopes through `menu__owner`
  - [x] 8.5 Set the owner in `perform_create`; ensure the serializers never accept an owner from the client — `perform_create` in the mixin; no serializer lists `owner`, so a client-sent one is ignored (tested for create and update)
  - [x] 8.6 Validate ids arriving in request bodies and query params — `MenuViewSet.add_item` (recipe id), `BuyListViewSet.create` (`ingredient_id`), and `RecipeViewSet.get_queryset` (`?ingredient=`, `?category=`). Scoping `get_queryset` alone does **not** cover these — `OwnedPrimaryKeyRelatedField` on every writable id (`category_id`, both `ingredient_id`s, the menu item's `recipe_id`); it needs `request` in the serializer context and raises without it. The recipe filters look ids up among the requester's own ingredients. `OrderSerializer` is deliberately left global: its callers are anonymous
  - [x] 8.7 Scope the generic-ingredient creation logic in `IngredientCategoryViewSet.create`/`update` (`views.py:70`, `:87`), which currently looks up ingredients by name globally — the admin's copy of the same logic uses the category's owner
  - [x] 8.8 Scope `MenuViewSet.stats` so the cross-menu recipe lookup cannot reach another user's recipes
  - [x] 8.9 Cross-user isolation tests: for each model, user A gets 404/403 on user B's object for read, update and delete — `CrossUserIsolationTests`: 404 throughout, including every detail action
  - [x] 8.10 Tests that the nested-write paths in 8.6 reject a foreign id — `ForeignIdTests`
  - [x] 8.11 First-ever tests for Menu, MenuItem, Order and BuyList, closing the gap noted in `backlog.md` — `MenuAPITests`, `OrderAPITests` (pins today's open behaviour), `BuyListAPITests`
  - [x] 8.12 Show `owner` in Django admin for every model, with a filter by user — `OwnedAdmin` base class; the owner is required in admin forms even while the column is nullable
  - [x] 8.13 Rehearse against the restored dump, then deploy — rehearsed against the 21:52 dump, deployed and confirmed live 2026-10-13 (see Current state)

- [x] 10.0 Authentication backend — merged as PR #24, live 2026-10-14; reshaped that day (email **or** username, see Sequencing and `PROJECT_CONTEXT.md`)
  - [x] 10.1 Email required and unique ignoring case; username unique ignoring case and letters-and-numbers only. `USERNAME_FIELD` stays `username`
  - [x] 10.2 Data migration `accounts.0002` ahead of the constraints in `0003`: blank emails get `<username>@placeholder.invalid`, case-insensitive clashes stop the migration with an explanation
  - [x] 10.3 `EmailOrUsernameBackend` as the only authentication backend (so `/admin/` accepts either too); the admin "add user" form asks for email
  - [x] 10.4 `GET /api/auth/session/`, `POST /api/auth/login/` (`identifier`, `password`), `POST /api/auth/logout/`
  - [x] 10.5 CSRF enforced on login explicitly (`csrf_protect`; DRF only checks it once a session exists) and on logout by `SessionAuthentication`. The session endpoint sets the `csrftoken` cookie
  - [x] 10.6 Existing `accounts/tests.py` kept as is — they already pass emails
  - [x] 10.7 Tests for identity constraints, the backend, login, logout, session, CSRF rejection and the migration

- [x] 11.0 Authentication UI — merged as PR #25, live 2026-10-14
  - [x] 11.1 `AuthContext`/`AuthProvider` in `src/auth/`: current user, loading state, login and logout
  - [x] 11.2 Login page (`components/auth/LoginPage`): one "email or username" field and a password, with the home page's glass and greeting (the user picked this from three rendered options)
  - [x] 11.3 `RequireAuth` guard around the whole app shell; `/share/:shareToken` sits outside the provider entirely, so guests trigger no session check
  - [x] 11.4 The API now answers 401 when nobody is signed in (`accounts.authentication.SessionAuthentication`), and the 401 handler drops to the login page and back
  - [x] 11.5 `AccountMenu` chip in the top bar: initial and username (initial only on phones), opening a menu with Log out (the user picked this over a plain link)
  - [x] 11.6 Clicked through in headless Chrome: guard, wrong password, return to the requested page, reload, expiry, logout, share route public. Automated versions are 9.6

- [x] 9.0 Frontend test framework — live 2026-10-14 (PR #26) (moved after 11.0; numbers kept)
  - [x] 9.1 Vitest, React Testing Library, `@testing-library/jest-dom`, `user-event` and `jsdom`
  - [x] 9.2 `vitest.config.ts` (extends `vite.config.ts`) and `src/test/setup.ts`
  - [x] 9.3 `npm test` script, run in the CI frontend job
  - [x] 9.4 A component test (`StatCard`) and routing tests (`App.test.tsx`)
  - [x] 9.5 Mocking convention written in `src/test/render.tsx` and summarised in `CLAUDE.md`: mock `services/cocktailsApi`, never `fetch`
  - [x] 9.6 Auth UI tests deferred from 11.6, plus `PublicMenu` (ordering, inactive menu, rename) and the request helper (CSRF, 401)

- [x] 12.0 Invites — live 2026-10-14 (PR #27) (reshaped that day for a coding meetup: QR invites from the app)
  - [x] 12.1 `Invite` model — token, note (who it's for; **no email**, decided 2026-10-14), created/used timestamps, issuing user, used-by, expiry
  - [x] 12.2 Signup-via-invite endpoint validating the token, then creating an owned, empty account — `GET/POST /api/auth/signup/<token>/`; row-locked so one link can't make two accounts
  - [x] 12.3 Django admin: an Invite page showing the copyable link once saved (7-day default) — a page field rather than a list action, since an action can't show a link to copy
  - [x] 12.4 Signup page at `/invite/<token>` — username, email, password with Show/Hide, confirm password
  - [x] 12.5 Confirm no signup path exists without a valid token — the only `create_user` outside admin is behind the token check
  - [x] 12.6 Tests: valid, expired, already-used and forged tokens, case-only clashes, weak passwords, CSRF, and the race (Postgres only)
  - [x] 12.7 "Invite someone" in the account menu: a full-screen QR for a fresh 24-hour single-use invite, which notices when it is used and makes the next one. Offered only to accounts with Django's "Can add invite" permission (`can_invite` in the session payload)

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
  - [ ] 14.6 Consider letting the user pick one of the glass icons (`GlassIcon`) as their user icon, replacing the yellow circle and initial in the account chip (`AccountMenu`). The user's idea, 2026-10-14: "a fun twist". Raise it when starting 14.0

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
