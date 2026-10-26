# The Bar Cart — visual and UX redesign brief

A handoff for working on the redesign outside the codebase (claude.ai). Written 2026-10-26
from the repo at `81d2466` on `main`. The screenshots in `screenshots/` are of that exact
build, taken locally with real recipe data.

## What the app is

**The Bar Cart** is a home-bar cocktail manager for a small group of friends, each with their
own private bar in one shared database (invite-only signup). React 19 + TypeScript + Vite
frontend, Django REST backend, deployed on Vercel + Railway. One person builds and maintains
it alone, with Claude.

What a user does in it:
- **Recipes**: name, glass, ingredients with amount + unit, garnish, notes, source URL.
  Every recipe has a glass, shown as a small glass icon.
- **Ingredients**: grouped into **categories** (Whiskey, Citrus…). Each has a **stock level**
  (0/25/50/75/100) shown as a clickable bottle-shaped meter, plus a "Used in…" list.
- **Menus**: a drink list planned for a party. Drag to reorder, add drinks from a side
  drawer, one menu is "active" at a time. Each menu can have decorative corner artwork
  (top + bottom slot) chosen from a thumbnail picker.
- **Public menu** (`/share/<token>`): what guests see on their phone, from a QR code. No
  login. Guests type their name and tap **Order**; they can see "My Orders".
- **Orders**: the host's live queue of guest orders (Served / Cancel), with history.
- **Menu stats**: what was ordered, by whom, after a party.
- **Account**: personal info, password, an avatar that is a glass icon.

Two very different audiences: the **host** (managing the bar, often on desktop, sometimes
mid-party on a phone) and **guests** (phone only, at a party, never logged in).

## Why a redesign

The UI grew feature by feature with no design system: no component library, vanilla CSS
per component plus inline styles in the nav. It is coherent-ish (warm neutrals, amber, a
Playfair Display + Inter pairing) but plain, and has known problems:

1. **No real primary colour.** `--color-primary` is an alias of `--color-accent` (both
   `#B45309` amber). Only the amber family was ever built, so there is nothing else to
   reach for.
2. **Nav shows two selected items.** The Orders badge and the active nav link use the
   identical amber-on-pale-amber pair. See `desktop-10-menu-detail.png`: "Orders" and
   "Menus" both look selected. A fix needs a palette that has somewhere else to go, not a
   spot-patch.
3. **Desktop is a centred phone column.** Pages are sized for mobile (`max-width` ~600px),
   leaving most of a desktop screen empty (see any `desktop-*` shot, e.g. Orders). The owner
   wants desktop to get its own layout.
4. **Glass icons are CSS boxes** that can't draw curves and render inconsistently at 1.5px
   borders. Three glasses (Glencairn, Hurricane, Tiki Mug) are already SVG and are the
   template; the rest (rocks, old fashioned, martini, coupe, flute, collins, shot…) should
   probably follow.
5. **The account chip** (warm grey pill, white disc with the avatar) shipped as "good enough
   for now", not a final look.
6. Buttons, chips and cards vary page to page; there is no shared spec for them.

## Scope (from the backlog, epic ~39 points)

1. **Design direction** — rendered options to choose between. ← *the part to do here*
2. Design tokens and core components — real primary colour, type, spacing, buttons,
   inputs, cards.
3. Recipes and ingredients pages.
4. Menus and the public menu.
5. Orders and account screens.
6. Mobile polish.

A signed-out marketing homepage comes *after* the redesign, built on its tokens.

## Current design tokens (`frontend/src/index.css`)

```
Surface   bg #FAFAF8 · surface #FFFFFF · surface-alt #F4F1EB · border #E2DDD5 · border-strong #C8C0B4
Text      primary #1C1917 · secondary #78716C · disabled #A8A29E
Amber     primary = accent #B45309 · hover #92400E · light #FEF3C7 · border #FCD34D
Danger    #DC2626 · hover #B91C1C · light #FEE2E2
Success   #16A34A · light #DCFCE7
Spacing   4px base: 4 8 12 16 20 24 32 40 48 64
Type      Inter (UI) + Playfair Display (display); xs .75 → 4xl 2.25rem
Radius    4 / 8 / 12 / full     Shadows sm / md / lg
```
Single breakpoint at 640px. Below it, the top nav collapses and a fixed bottom tab bar
(Recipes / Ingred. / Categs. / Menus / + New) appears.

## Constraints to respect

- **Phone-first stays.** Guests only ever use phones; the host often does mid-party. Desktop
  should gain a real layout without the phone experience getting worse.
- **Menu decorations are part of the brand.** Soft, low-opacity illustrated corner art
  (ume blossom branch + taco; maple branch + pumpkins). Art is composed for a specific
  corner and must never be auto-mirrored. A new direction should leave room for this art
  and ideally make it look more intentional. Full-background theming was considered and
  deliberately deferred; it's fair to propose it as an option.
- **The public menu must work for any menu's decorations**, including none.
- **Glass icons are everywhere** (recipe cards, menu items, home page, avatar), so their
  style is a big lever.
- Plain CSS with custom-property tokens: no component library, no Tailwind today. A
  proposal can recommend changing that, but should say what it costs.
- Light theme only today. Dark mode is not requested; mention it only if a direction makes
  it cheap.
- Accessible contrast (WCAG AA) for text and buttons, including amber-on-white.

## What the owner wants from this phase

- **Rendered options, not prose.** Show 2–4 distinct directions as rendered mock-ups, in
  context, using the real content from the screenshots (real drink names, real
  ingredients), not lorem ipsum. A good previous example: four decoration candidates shown
  inside a mock of the real public menu, at the 30% opacity they actually ship at. That got
  a decision immediately.
- **Show each direction on the screens that matter most:** the public menu (guest, phone),
  menu detail (host), recipe list/detail, and the nav (including how the Orders badge and
  active state differ). Show at least one desktop layout per direction.
- **Explain the reasoning, then recommend.** For each direction: what it's going for, the
  honest trade-off, and which you'd pick and why — including where that recommendation is
  weak. Prose plus a recommendation beats a bare multiple-choice list.
- Only the chosen direction gets developed into tokens and components. Don't
  over-build rejected options.

## Deliverable to bring back to the codebase

Once a direction is picked: a token table (colours with roles, type scale, spacing, radius,
shadows), specs for the core components (button variants, input, chip, card, nav item
active/badge states, tab bar), the desktop layout grid, and the glass icon style. That
goes back to Claude Code, which implements it page by page on branches with tests.

## Screenshot index (`screenshots/`)

Each page at `mobile-` (390×844 @2x) and `desktop-` (1440×900), full-page captures.
Logged in as the owner; the "Umeshu & Tacos" menu is active with four pending guest orders.

| # | Page | Notes |
|---|---|---|
| 00 | Login | signed out |
| 01 | Home | stat cards, glass row |
| 02 | Recipes | list |
| 03 | Recipe detail | |
| 04 | Recipe edit | same form as new |
| 05 | New recipe | |
| 06 | Ingredients | list |
| 07 | Ingredient detail | stock bottle, "Used in…" |
| 08 | Categories | |
| 09 | Menus | list |
| 10 | Menu detail | host view; shows the Orders/active-nav clash |
| 11 | Menu edit | decoration picker |
| 12 | Menu stats | |
| 13 | Orders | live queue |
| 14 | Account | Personal Info |
| 15 | Public menu | ume + taco decorations |
| 16 | Public menu | maple + pumpkin decorations |

In the mobile full-page shots, the fixed bottom tab bar can appear partway down a long
page; that is a capture artefact, not the real layout.
