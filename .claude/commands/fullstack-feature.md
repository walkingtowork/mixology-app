# Full-Stack Feature Planner

You are helping plan and implement a full-stack feature for the Mixology App (Django 4.2 + DRF backend, React 19 + TypeScript frontend). Before writing any code, produce a complete plan covering both sides of the stack.

## Step 1 — Understand the feature

Restate the feature in one paragraph: what the user can do, what data is created/modified, and what the key UX flows are.

## Step 2 — Backend plan

### Models
For each new or modified model, list:
- All fields (name, type, constraints, defaults)
- Relationships (FK, M2M, through models)
- Any signals or `save()` overrides needed
- Migration notes (especially for adding fields to existing models with data)

### Serializers
- Which fields are read-only vs writable
- Nested vs flat representations
- Any custom `create()`/`update()` logic

### ViewSets & endpoints
List every API endpoint as a table:
| Method | URL | Action | Auth | Notes |
|--------|-----|--------|------|-------|

### Permissions & auth
- Which endpoints are public vs require login
- Any object-level permissions needed

## Step 3 — Frontend plan

### New routes
List every new React Router route and the component it renders.

### New components
For each component:
- Props interface (TypeScript)
- Local state it manages
- API calls it makes
- Key UX behaviors (loading, empty, error states)

### Navigation changes
What needs to be added/changed in `App.tsx`, top nav, and mobile bottom nav.

### cocktailsApi.ts additions
List every new fetch function needed, with its signature and return type.

## Step 4 — Cross-cutting concerns

- **Loading & error states**: flag any flows where optimistic UI or skeleton screens would help
- **Mobile UX**: note any flows that need special treatment on small screens (drawers, modals, touch targets)
- **Data dependencies**: which things must be built first (e.g. backend endpoint before frontend can be wired up)
- **Edge cases**: flag anything non-obvious (e.g. deleting an ingredient that's on a buy list)

## Step 5 — Implementation order

Produce a numbered checklist of tasks, ordered so each task builds on the previous. Group into: Backend → Frontend → Polish.

---

After presenting the plan, ask the user: "Does this look right, or should we adjust anything before I start building?"
