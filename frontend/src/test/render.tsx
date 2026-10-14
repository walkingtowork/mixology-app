import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router-dom';

/**
 * Renders `ui` inside a router sitting at `route`, and returns Testing Library's queries
 * plus a `user` for clicks and typing.
 *
 * Pass `<App />` to test routing and guards across the whole app, or a single page wrapped
 * in its own `<Routes>` when it reads URL params.
 *
 * THE MOCKING CONVENTION: components never call `fetch` themselves -- every request goes
 * through `services/cocktailsApi`. So a component test mocks that one module and nothing
 * else:
 *
 *     vi.mock('../services/cocktailsApi');               // every export becomes a vi.fn()
 *     vi.mocked(api.fetchMenus).mockResolvedValue([]);   // then say what each call returns
 *
 * An export left unconfigured returns undefined, so give every call the component makes on
 * mount a value in `beforeEach`. `restoreMocks` resets them between tests. Only
 * `cocktailsApi.test.ts`, which tests the module itself, stubs `fetch`.
 */
export function renderAt(route: string, ui: ReactElement) {
  return {
    user: userEvent.setup(),
    ...render(<MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>),
  };
}
