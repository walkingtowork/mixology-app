# Task List: Menu Theming (Decoration Selector) & Menu Order Stats

Two related menu features planned together on 2026-09-18.

- **Feature A — Decoration selector:** each menu picks its own public-page decorations
  instead of every menu inheriting the hardcoded Umeshu & Tacos art. Ships a fall set.
- **Feature B — Menu order stats:** a per-menu admin page showing how many times each
  drink was ordered, plus headline numbers, a guest breakdown, and unordered drinks.

**Feature A is deadline-driven** (party on the weekend of 2026-09-20). Feature B has no
deadline — orders accumulate in the DB regardless, so the stats page is just as useful
built after the party against real data.

## Relevant Files

### Feature A — Decoration selector
- `backend/cocktails/models.py` - Add `top_decoration` / `bottom_decoration` CharFields + `DECORATION_CHOICES` to `Menu`
- `backend/cocktails/migrations/` - New migration for the two fields
- `backend/cocktails/serializers.py` - Expose both fields on `MenuSerializer` (and `MenuListSerializer` if the list view needs them)
- `frontend/src/types/cocktails.ts` - `DecorationKey` type; add both fields to the `Menu` type
- `frontend/src/services/cocktailsApi.ts` - Widen `updateMenu()`'s data param (line ~509) to accept the decoration fields
- `frontend/src/components/menus/MenuDecorations.tsx` - Strip per-SVG positioning; add `DECORATIONS` registry + `DecorationSlot`; add fall SVGs
- `frontend/src/components/menus/PublicMenu.tsx` - Replace hardcoded `<UmeDecoration />` / `<TacoDecoration />` (lines 101-102) with slots driven by menu data
- `frontend/src/components/menus/MenuForm.tsx` - Add edit mode + decoration picker
- `frontend/src/components/menus/MenuForm.css` - Picker grid + selected-tile styles
- `frontend/src/components/menus/MenuDetail.tsx` - "Edit" entry point in the header actions
- `frontend/src/App.tsx` - New `/menus/:id/edit` route

### Feature B — Menu order stats
- `backend/cocktails/views.py` - `stats` action on `MenuViewSet`
- `backend/cocktails/serializers.py` - Stats response shaping (or build the dict inline in the action)
- `frontend/src/types/cocktails.ts` - `MenuStats`, `DrinkStat`, `GuestStat` types
- `frontend/src/services/cocktailsApi.ts` - `fetchMenuStats(menuId)`
- `frontend/src/components/menus/MenuStats.tsx` + `.css` - The stats page (new)
- `frontend/src/components/ui/StatCard.tsx` + `.css` - Extracted from `.home-stat-card` (new)
- `frontend/src/components/HomePage.tsx` / `HomePage.css` - Switch to the extracted `StatCard`
- `frontend/src/components/menus/MenuDetail.tsx` - "Stats" button in header actions
- `frontend/src/components/menus/MenuList.tsx` - Stats link on cards with `item_count > 0`
- `frontend/src/App.tsx` - New `/menus/:id/stats` route

### Notes
- No frontend test framework is set up yet (still open in `backlog.md`), so these tasks
  carry no test files. Verify by hand against a local menu with seeded orders.
- Run the backend from `backend/` with the venv active; frontend from `frontend/`.

## Instructions for Completing Tasks

**IMPORTANT:** As you complete each task, you must check it off in this markdown file by
changing `- [ ]` to `- [x]`. Update the file after completing each sub-task, not just
after completing an entire parent task.

## Agreed Design Decisions

Decided in conversation on 2026-09-18 — do not re-litigate these while implementing.

1. **Decorations default to `none`**, not to the current ume/taco pair. New menus start
   undecorated and opt in. Note this means existing menus render undecorated after the
   migration until someone picks art for them — acceptable, since the only real menu in
   use is being re-themed for fall anyway.
2. **Positioning belongs to the slot, not the SVG.** Today each SVG hardcodes its own
   corner and opacity (`MenuDecorations.tsx:30` and `:63`). Any decoration must be usable
   in either slot, so the wrapper owns `position`, corner, opacity and `aria-hidden`.
3. **Stats are all-time per menu.** No per-night grouping and no date filter.
4. **Stats get their own page per menu** at `/menus/:id/stats` — not a modal, not inline
   on the planning screen.
5. **Stats include** headline tiles (total drinks, unique guests, top drink), a ranked
   by-drink bar chart, an explicit "nobody ordered" section, and a by-guest breakdown.
6. **Stats must be reachable on mobile** — the host will check it behind the bar during
   ordering lulls. Follow the treatment the Orders badge got in `525bf73`.
7. **No chart library.** A horizontal bar is a div with a percentage width; pulling in
   Recharts would outweigh the feature.
8. **`MenuForm` handles create and edit through one route wrapper**, matching the
   `RecipeForm` pattern documented in `CLAUDE.md`.

## Tasks

- [x] 0.0 Create feature branch
  - [x] 0.1 Branch created as `feature/menu-theming-and-stats`, cut from `docs/project-context`
        (not from `main` — `PROJECT_CONTEXT.md` is not on `main` yet). Note that an old
        `feature/menu-theme-decorations` branch exists with a zero-line diff against `main`;
        it is stale and was avoided to prevent confusion.

- [ ] 1.0 Add decoration fields to the Menu model and API
  - [ ] 1.1 Add `DECORATION_CHOICES` to `backend/cocktails/models.py` with `none`, the two
        existing entries (`ume`, `taco`), and the fall additions (`maple`, `acorn`,
        `pumpkin`, `wheat`)
  - [ ] 1.2 Add `top_decoration` and `bottom_decoration` CharFields to `Menu`, both
        `max_length=32`, `choices=DECORATION_CHOICES`, `default='none'`
  - [ ] 1.3 Generate and apply the migration
  - [ ] 1.4 Add both fields to `MenuSerializer.Meta.fields` (they must be writable — unlike
        `is_active`, which is deliberately read-only)
  - [ ] 1.5 Widen the `updateMenu()` data param in `cocktailsApi.ts` and add both fields to
        the `Menu` type plus a `DecorationKey` union in `types/cocktails.ts`
  - [ ] 1.6 Confirm `GET /api/menus/:id/` returns the new fields

- [ ] 2.0 Refactor decorations into a registry + slot (no visual change yet)
  - [ ] 2.1 Remove the inline `position`/`top`/`left`/`bottom`/`right`/`opacity`/`zIndex`
        styles from `UmeDecoration` and `TacoDecoration`, leaving pure `viewBox` drawings
  - [ ] 2.2 Add the `DECORATIONS` registry mapping each `DecorationKey` to `{ label, Component }`,
        with `none` mapping to a null component
  - [ ] 2.3 Add `DecorationSlot({ position, name })` owning absolute positioning
        (top → top-left, bottom → bottom-right), `opacity: 0.3`, `pointerEvents: none`,
        `zIndex: 0`, `aria-hidden`
  - [ ] 2.4 Make unknown/missing keys render nothing rather than crash — a key removed from
        the registry later will still be sitting in the database
  - [ ] 2.5 Wire `PublicMenu.tsx` to render two slots from `menu.top_decoration` /
        `menu.bottom_decoration`, replacing the hardcoded imports
  - [ ] 2.6 Verify: a menu with `ume`/`taco` set renders pixel-identically to before the refactor

- [ ] 3.0 Draw the fall decoration SVGs
  - [ ] 3.1 Maple/oak leaf branch for the top slot, echoing the existing branch composition
        (the parameterized `Blossom` helper at `MenuDecorations.tsx:6` is the model to follow)
  - [ ] 3.2 Acorn-and-gourd cluster for the bottom slot
  - [ ] 3.3 Check both at 0.3 opacity against `--color-bg`, and confirm they don't collide
        with the menu title or the "My Orders" button at phone width
  - [ ] 3.4 Register both in `DECORATIONS`

- [ ] 4.0 Add menu edit mode with the decoration picker
  - [ ] 4.1 Add the `/menus/:id/edit` route in `App.tsx`, wrapping `MenuForm` the way
        `RecipeFormWrapper` wraps `RecipeForm`
  - [ ] 4.2 Teach `MenuForm` edit mode: load the menu when `:id` is present, prefill name and
        decorations, `PATCH` via `updateMenu()` instead of `POST`, and adjust the heading and
        submit label
  - [ ] 4.3 Build the decoration picker as a thumbnail grid — render each registry SVG scaled
        into a ~72px tile, one group for the top slot and one for the bottom
  - [ ] 4.4 Style tiles: `--color-surface`, `--radius-md`, `1px solid --color-border`;
        selected gets 2px `--color-accent-border` + `--color-accent-light`. Grid
        `repeat(auto-fill, minmax(88px, 1fr))`, gap `--space-3`
  - [ ] 4.5 Add an "Edit" entry point to the `MenuDetail` header action cluster
  - [ ] 4.6 Verify the full loop: create undecorated → edit → pick fall art → check `/share/:token`

--- Party-ready after task 4. Tasks 5-7 can land any time after. ---

- [ ] 5.0 Build the stats API endpoint
  - [ ] 5.1 Add a `stats` action to `MenuViewSet` (detail, GET)
  - [ ] 5.2 Aggregate order counts per recipe for the menu — start the query from `menu.items`
        and left-join counts so that **drinks with zero orders still appear**; aggregating over
        `Order` alone can only ever return drinks somebody ordered
  - [ ] 5.3 Handle orders whose recipe has since been removed from the menu — they still exist
        and still point at this menu. Flag them `on_menu: false` so the totals reconcile
  - [ ] 5.4 Add `total_orders`, `unique_guests`, `first_order_at`, `last_order_at`
  - [ ] 5.5 Add the per-guest breakdown: name, total count, and their per-drink counts
  - [ ] 5.6 Sort drinks by count descending, breaking ties alphabetically so ordering is
        stable between loads
  - [ ] 5.7 Add `fetchMenuStats(menuId)` to `cocktailsApi.ts` and the matching types

- [ ] 6.0 Build the stats page
  - [ ] 6.1 Extract `StatCard` from `.home-stat-card` (`HomePage.css:66`) into
        `components/ui/`, then repoint `HomePage` at it so both screens stay identical
  - [ ] 6.2 Add the `/menus/:id/stats` route and the `MenuStats` page shell with loading and
        error states
  - [ ] 6.3 Headline row: total drinks served, unique guests, top drink — plus the
        first-to-last order time range beneath
  - [ ] 6.4 By-drink section: rank, name, bar, count. Track `--color-surface-alt`, fill
        `--color-accent`, width `${count / max * 100}%`, `transition: width 400ms ease`
  - [ ] 6.5 "Nobody ordered" section, styled with `--color-text-disabled` — not red; an
        unordered drink is information, not an error
  - [ ] 6.6 By-guest section with expandable rows, mirroring the existing expand interaction
        on `MenuDetail`'s drink cards. Cap at ~15 with a "show all" toggle
  - [ ] 6.7 Add the note that guest names are self-entered and not unique, so two guests
        named "Sam" merge into one row
  - [ ] 6.8 Empty state — the pre-party state, and what shows right up until Saturday night:
        a single centred "No orders yet" message with a copy-share-link button, not empty
        tiles over a blank chart
  - [ ] 6.9 Empty-menu state: point back to the planning page instead
  - [ ] 6.10 Add a ↻ Refresh control matching `OrdersPage.tsx:66` — neither page polls

- [ ] 7.0 Stats entry points and mobile visibility
  - [ ] 7.1 "Stats" button in the `MenuDetail` header action cluster, beside share and QR
  - [ ] 7.2 Stats link on `MenuList` cards, shown only when `item_count > 0`
  - [ ] 7.3 Make sure the stats entry point survives at phone width — the host will be
        checking this behind the bar. Mirror the Orders badge treatment from `525bf73`
  - [ ] 7.4 Verify end to end: place orders from `/share/:token`, confirm counts, unique
        guests, zero-order drinks and the guest breakdown all reconcile

## Deferred — moved to `backlog.md`, not in scope here

- **Background images instead of SVG decorations.** Worth considering whether menu theming
  should use full background imagery rather than corner SVG art. Explicitly deferred.
- **Guest name disambiguation.** Consider a note on the "What is your name?" step of the
  order form to nudge guests toward distinct names, so stats don't merge two Sams. Decided
  to consider, not to implement yet.
- **Last call / ordering cutoff** for the public menu.
- **Non-alcoholic menu options.**
