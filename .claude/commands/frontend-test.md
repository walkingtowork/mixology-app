---
description: How to write frontend tests here (Vitest + React Testing Library). Use when adding or changing a component, page, route or cocktailsApi function, or when fixing a frontend bug.
---

# Frontend tests

Vitest and React Testing Library, set up in 9.0. CI runs `npm test` and `npm run build` (the
type check, which covers test files too) on every PR. Run both from `frontend/` before you
finish.

## Where tests go and what they cover

- Put tests in `*.test.ts(x)` files **next to the code they cover**. A feature that spans
  several components gets one file named after the feature
  (`components/auth/passwordReset.test.tsx`).
- `App.test.tsx` covers routing, the route guard and session behaviour across the whole app.
- `services/cocktailsApi.test.ts` tests the service module itself. It is the **only** file
  that stubs `fetch`.
- Test what a person sees and does: text, roles, labels, what happens after a click. Do not
  test component state, hooks or CSS. Name each test as a sentence about behaviour
  (`'shows why the server refused the password, and stays put'`).
- New code that a person interacts with gets tests. A bug fix gets a test that fails without
  the fix.

## The mocking convention

Components never call `fetch`. Every request goes through `services/cocktailsApi`. So a
component test mocks **that one module** and nothing else:

```tsx
import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../App';
import * as api from '../../services/cocktailsApi';
import { user } from '../../test/fixtures';
import { renderAt } from '../../test/render';

vi.mock('../../services/cocktailsApi');   // every export becomes a vi.fn()

beforeEach(() => {
  vi.mocked(api.fetchSession).mockResolvedValue(user);  // signed in; null = signed out
  // ...and a value for every other call the page makes on mount
});
```

- An export you do not configure returns `undefined`. In `beforeEach`, give **every call the
  screen makes on mount** a value. Rendering `<App />` also mounts the home page and nav, so
  copy the `beforeEach` from `App.test.tsx` or `passwordReset.test.tsx` as a starting point.
- `restoreMocks: true` in `vitest.config.ts` resets mocks between tests. `src/test/setup.ts`
  unmounts, clears `localStorage` and deletes the CSRF cookie after each test, so tests do
  not leak state into each other. Don't add your own cleanup for those.
- Use `mockResolvedValueOnce` chains for sequences (first call returns X, then Y), and
  `mockRejectedValue(new Error('message'))` for a refusal from the server. Then check that
  the message is shown to the user.
- Check the call **and** its arguments: `expect(api.createGuestOrder).toHaveBeenCalledWith(TOKEN, 7, 'Sam')`.
  For anything private, also check what was **not** called (`App.test.tsx`, "asks for
  nothing private before signing in").
- When you add a function to `cocktailsApi.ts`, `vi.mock` picks it up automatically. Add a
  case to `cocktailsApi.test.ts` only when the function does more than a plain request:
  building a URL, unwrapping a response, mapping an error message, or deciding which
  endpoint to use (see the "guest order calls" block).

## Rendering

`renderAt(route, ui)` from `src/test/render.tsx` renders `ui` inside a `MemoryRouter` at
`route`, and returns Testing Library's queries plus `user` (a `userEvent` instance).

- **Whole app**: `renderAt('/menus', <App />)`. Use this for routing, the login guard,
  nav, the account menu, and pages reached through a link.
- **One page that reads URL params**: wrap it in its own routes, as in `PublicMenu.test.tsx`:
  `renderAt(`/share/${TOKEN}`, <Routes><Route path="/share/:shareToken" element={<PublicMenu />} /></Routes>)`.
- **Small presentational component**: `renderAt('/', <StatCard ... />)`.
- `renderAt` returns `user`, which is easy to confuse with the `user` fixture. Rename one
  when a file needs both: `const { user: u } = renderAt(...)`.

## Queries and async

- Query in this order of preference: `getByRole(role, { name })`, then `getByLabelText`, then
  `getByText`. Use `getByPlaceholderText` or `getByTitle` only when nothing better exists.
  If a role query can't find an element by name, the markup is usually missing a label.
  Fix the component rather than reaching for `data-testid`. The repo has none.
- Anything that appears after a request resolves needs `await screen.findBy…`. Use
  `queryBy…` with `.not.toBeInTheDocument()` to show that something is absent.
- Use `waitFor` only for assertions that are not about the DOM, such as
  `await waitFor(() => expect(api.fetchMenus).toHaveBeenCalled())`.
- Use `within(dialog)` to scope queries to a menu, drawer or dialog.
- For errors, assert on `findByRole('alert')` and `toHaveTextContent(...)`.
- Matchers from `@testing-library/jest-dom` are available: `toBeInTheDocument`,
  `toBeDisabled`, `toBeEnabled`, `toHaveValue`, `toHaveAttribute`, `toHaveTextContent`.

## Timers

For polling, auto-dismissing messages and anything else on a timer:

```tsx
vi.useFakeTimers({ shouldAdvanceTime: true });   // user-event needs the clock to keep moving
try {
  // render AFTER installing fake timers, so the component's intervals use them
  await act(() => vi.advanceTimersByTimeAsync(3000));
} finally {
  vi.useRealTimers();
}
```

See `invites.test.tsx` (polling) and `PublicMenu.test.tsx` (a message that clears itself).

## Fixtures

Shared sample data lives in `src/test/fixtures.ts`: `user`, `negroni`, and `menu(overrides)`.
Use them, and add to them when several files need the same thing. If you add a field to a
type in `types/cocktails.ts`, update the fixture too, or `npm run build` fails. Keep
one-off data local to its test file.

## Rules

- Test globals are off. Import `describe`, `it`, `expect`, `vi` and `beforeEach` from
  `vitest`.
- Don't stub `fetch`, mock `react-router-dom`, or install another test library (MSW and the
  like) without asking the user.
- Don't skip or loosen a failing test to get it to pass. Find out why it fails first. A
  failing test caught a real bug in 9.0.

## Before you finish

```bash
npm test          # all tests pass
npm run build     # type check including test files
npx eslint . -f json -o eslint-report.json; node scripts/check-lint-baseline.mjs
```

The last line is CI's lint check. `npm run lint` on its own always exits non-zero because of
standing problems. The check fails only if your change adds new ones.
