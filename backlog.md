# Product Backlog

Last reviewed: 2026-10-15. Reorganised with the user into the agreed build order, with
story points on every item. Status verified against the code, not just memory.

See `PROJECT_CONTEXT.md` for the *why* behind agreed decisions, and `tasks/` for
per-feature task breakdowns.

## Story points

Fibonacci scale (1, 2, 3, 5, 8, 13), sizing effort, complexity and uncertainty relative to
other items, not hours.

- **1** — a setting or a one-file change
- **3** — a small feature across backend and frontend, with tests
- **8** — a multi-part feature on both ends
- **13** — too big or too vague; split it before starting

An **epic** is a total of its child tickets, never estimated as a single piece of work.

---

## 1. Now — before the 2026-10-31 party

- [x] **Guest order limit** (5) — merged 2026-10-15 (PR #28), and tested by the user on a
      phone in production the same day. At most two unserved orders per guest name per menu;
      serving or cancelling frees a slot. The user may do a trial run with a friend or two
      before the party. Revisit the number once non-alcoholic or hot drinks are on menus.

## 2. Finish multi-user accounts

Auth, invite-only signup, per-user ownership, password reset, personal info. Phases 1.0–12.0
are live. → `tasks/tasks-multi-user-accounts.md`, decisions in `PROJECT_CONTEXT.md`

- [x] **13.0 Password reset** (8) — merged 2026-10-15 (PR #29). Manual testing is deferred
      to one pass over all the user-account work once 16.0 is done
- [ ] **14.0 Personal Info screen** (5)
- [ ] **14.6 Glass-icon avatars** (2) — the user's idea: pick a `GlassIcon` in place of the
      yellow initial circle. Raise it when starting 14.0
- [ ] **15.0 Rate limiting, Tier 1** (5) — DRF throttles plus `django-axes` for logins, and
      throttling of the anonymous order endpoint (15.5). Wiring axes to the DRF login view
      needs care
- [ ] **16.0 Documentation and skills** (3)

## 3. Housekeeping after multi-user ships

- [ ] **Rebuild `backend/venv` on Python 3.12** (1) — it is Python 3.9.6 (the macOS system
      Python), while `requirements.txt` says 3.12+, CI runs 3.12, and the venv is missing
      `psycopg2-binary` and `gunicorn` — `psycopg2-binary` will not build on 3.9 here at all.
      `/opt/homebrew/bin/python3.12` is already installed: delete `backend/venv`,
      `python3.12 -m venv venv`, `pip install -r requirements.txt`, run the tests.
      Prioritised by the user 2026-10-13.
- [ ] **Signing in after a log out should land on the home page** (3) — it still returns to
      the page you were on. Reported in production 2026-10-14, after PR #26 shipped a fix
      (`returnAfterLogin` in the auth context) that passed the tests and a headless-Chrome
      check. The live bundle contains the fix, so it is not a stale deploy. Start by
      reproducing it in production with the user's exact steps (which page, phone or
      desktop, any reload or back button). Low impact: the API is scoped.

## 4. Quality and testing — before the redesign

A redesign rewrites every page; these are the safety net that catches it breaking things.

- [ ] **Quality checklist in the task workflow** (3) — an ISO 25010-based "done means…"
      checklist (functional suitability, reliability, usability, security, maintainability,
      performance, compatibility, portability) applied to every task, plus what
      "production-ready" means for this app. Kano belongs in backlog prioritisation rather
      than QA: classify features as basic / performance / delighter when ordering work.
- [ ] **First QA audit** (8) — walk the whole app against the checklist; findings become
      their own tickets
- [ ] **Playwright end-to-end tests** (5) — login, build a recipe, share a menu, guest orders
- [ ] **Frontend component coverage** (8) — routing and nav active states, RecipeList,
      RecipeDetail, RecipeForm, menus, orders. Vitest + Testing Library are in place (9.0);
      split per area when picked up
- [ ] **Coverage reporting in CI** (2)

## 5. Visual and UX redesign — epic (~39)

Full visual and UI/UX redesign and implementation. Absorbs the colour system cleanup
(`--color-primary` is an alias of `--color-accent`; see `PROJECT_CONTEXT.md`) and the
Orders nav badge collision (`.nav-orders` and `.nav-link.active` use the identical
`--color-accent` on `--color-accent-light` pair, `App.css:88` and `:62`, so a nav page looks
like it has two selected items).

- [ ] **Design direction** (5) — rendered options to choose between
- [ ] **Design tokens and core components** (8) — real primary colour, type, spacing,
      buttons, inputs, cards
- [ ] **Recipes and ingredients** (8)
- [ ] **Menus and the public menu** (8)
- [ ] **Orders and account screens** (5)
- [ ] **Mobile polish** (5)

Notes for the redesign (from 14.6, 2026-10-16):
- **Consider moving every glass icon to SVG.** They are CSS boxes today (`GlassIcon.tsx`
  plus `App.css`), which can't make curved shapes, and render differently as the browser
  rounds their 1.5px borders (the rim fix in 14.6). The Glencairn is already an SVG drawn
  to match, so it is the template.
- **Revisit the account chip.** It shipped as "C1" (outline-free warm grey chip, white disc
  holding the glass avatar) as good enough for now, not a final look.

Note from the user, 2026-10-21 (after using Personal Info on desktop):
- **Use the width on desktop.** Pages are sized for a phone column (Personal Info is
  `max-width: 600px`), which is right on mobile but leaves a lot of empty side space on a
  desktop. The redesign should give desktop its own layout rather than a centred phone column.

## 6. Marketing homepage

- [ ] **Public homepage explaining the app** (5) — the app requires a login, so a signed-out
      visitor needs a page that explains recipes, ingredients, menus and guest ordering.
      Built after the redesign's tokens so it is built once.

## 7. Menus and drinks

- [ ] **Menu sections — event vs standard drinks** (8) — sections within one menu ("Tonight's
      specials" / "The usual" / "Zero-proof") rather than separate pages, so guests keep a
      single scroll
- [ ] **Non-alcoholic drinks** (3) — mark a recipe non-alcoholic, label it on the menu and
      filter by it; a "Zero-proof" section comes free with menu sections
- [ ] **Last call / ordering cutoff** (5) — the one piece of the original ordering plan never
      built
- [ ] **Guest name hint on the order form** (1) — nudge guests toward distinct names. Names
      are self-entered and not unique, so two "Sam"s merge into one row in menu stats, and
      share the order limit
- [ ] **View recipes from the stats page** (2) — link drink names on `/menus/:id/stats`
      through to the recipe
- [ ] **Background images for menu theming** (5 / 13) — 5 for curated images, 13 for user
      uploads, which need file storage. Revisit once the fall decorations have seen use

## 8. AI-assisted entry

Both need a model, not hand-written parsing: recipe text is too varied, and bottles need
vision.

- [ ] **AI foundation** (3) — a backend endpoint, the API key in Railway, per-user usage
      limits since every call costs money
- [ ] **Paste-to-import recipes** (5) — paste a recipe (e.g. a YouTube description), review
      the parsed ingredients and amounts, save
- [ ] **Bottle recognition from photos** (8) — photograph several bottles, review the
      matches against existing ingredients and categories, add them in one go

## 9. Features

- [ ] **Buy list page** (3) — the model, API and "add to buy list" from `IngredientDetail`
      all exist; there is no page that shows the list
- [ ] **Standalone "add ingredient" on the Ingredients page** (2) — ingredients can only be
      created inline from `RecipeForm` today (`RecipeForm.tsx:83`)
- [ ] **Starter-ingredient wizard** (8) — a new account starts completely empty, so a
      friend's first load is three empty pages. A guided "stock your bar" wizard on first
      login. Deferred during multi-user planning to keep the ownership model open
- [ ] **Recipe tags** (8) — use `tasks/prd-tags.md`, but review it first
- [ ] **Ingredient substitutions** (8) — not yet defined; may be a 13
- [ ] **Recipes for home-made ingredients** (8) — linking a recipe to the ingredient it
      produces; not yet defined
- [ ] **Sugar cube handling** (2, spike) — work out what the problem actually is

## 10. Security and operations

Raised during multi-user planning and paused, not dismissed. Revisit before any public
launch. **Agreed 2026-09-21:** rate limiting goes in at "Tier 1" (15.0); Redis-backed
throttling is deferred until there is a reason.

- [ ] **Branch protection on `main`** (1) — a repo setting: Settings → Branches → require
      "CI / Backend (Django)" and "CI / Frontend (Vite / TypeScript)". Verified 2026-09-21
      that a red check still offers a green merge button
- [ ] **Deploys wait for CI** (3) — Railway and Vercel both build from `main` on push,
      independently of the workflow, so a red build on `main` has already shipped
- [ ] **Pin Python on Railway** (1) — no `runtime.txt`, `.python-version` or nixpacks config,
      so Railway picks. Django 4.2 does not support 3.13+. Verify which file Railway honours
- [ ] **Decide how long a login lasts** (1) — Django's default two weeks, kept 2026-10-14 as
      "fine for now". Options: a longer `SESSION_COOKIE_AGE`, or `SESSION_SAVE_EVERY_REQUEST`
- [ ] **"New code" should revoke the previous QR invite** (1) — a skipped code stays valid
      for the rest of its 24 hours
- [ ] **Backup routine** (3) — the Railway plan has no automatic backups; production is only
      backed up by a manual `pg_dump`. Until automated: dump before every schema or data
      migration. See `PROJECT_CONTEXT.md`
- [ ] **Upgrade off Django 4.2** (5) — past end of life (April 2026), so no security patches.
      Fine for a private app; a blocker for a public one. Target 5.2 LTS
- [ ] **Verify signup email addresses** (5) — invites are not tied to an email, so anyone with
      an invite can sign up with any address. Needed before public signup or real reset email
- [ ] **Redis-backed throttling** (5) — `gunicorn --workers 3` with the local-memory cache
      gives each worker its own counter, so DRF limits are ~3x looser and reset on restart.
      Deferred

## Shipped

- [x] Create ingredient categories and update existing ingredients
- [x] Update so that we're using routes properly
- [x] Add Menus — planning, drag-and-drop ordering, share links, QR codes, activation
- [x] Add ability to click on an ingredient and see all recipes that use it
- [x] View ingredient, amount remaining — stock levels + `StockBottle` UI, and
      "add to buy list" from `IngredientDetail` (the list *page* is still outstanding)
- [x] Deploy — Railway (backend) + Vercel (frontend); see `PROJECT_CONTEXT.md`
- [x] Guest drink ordering from the public menu + bartender Orders view (`82483ae`)
- [x] Public menu visual polish, first pass — SVG decorations, QR modal, mobile fixes
- [x] Menu theming — decoration selector, fall SVG set, menu edit mode
      (`tasks/tasks-menu-theming-and-stats.md`)
- [x] Menu order stats at `/menus/:id/stats`
- [x] Multi-user 1.0–12.0: `SECRET_KEY` with no fallback, CI, same-origin proxy, default-deny
      API, ownership on every model, nested-write IDOR checks (`OwnedPrimaryKeyRelatedField`),
      secure cookies and HSTS, Vercel previews off, owner-only `/api/orders/` with separate
      guest endpoints, frontend test framework (9.0), login, invite-only signup
- [x] Backend tests for menus, orders, guest ordering and the buy list (159 tests)

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
