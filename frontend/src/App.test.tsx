import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import * as api from './services/cocktailsApi';
import { menu, user } from './test/fixtures';
import { renderAt } from './test/render';

vi.mock('./services/cocktailsApi');

const loginHeading = () => screen.findByRole('heading', { name: 'What are we making tonight?' });
const accountChip = () => screen.findByRole('button', { name: 'Account: walkingtowork' });

async function signIn(u: ReturnType<typeof renderAt>['user'], identifier = 'walkingtowork') {
  await u.type(await screen.findByLabelText('Email or username'), identifier);
  await u.type(screen.getByLabelText('Password'), 'correct-horse');
  await u.click(screen.getByRole('button', { name: 'Sign in' }));
}

beforeEach(() => {
  // Signed out unless a test says otherwise.
  vi.mocked(api.fetchSession).mockResolvedValue(null);
  vi.mocked(api.login).mockResolvedValue(user);
  vi.mocked(api.logout).mockResolvedValue();
  // What the pages these tests land on ask for when they mount.
  vi.mocked(api.fetchOrders).mockResolvedValue([]);
  vi.mocked(api.fetchRecipes).mockResolvedValue([]);
  vi.mocked(api.fetchIngredients).mockResolvedValue([]);
  vi.mocked(api.fetchCategories).mockResolvedValue([]);
  vi.mocked(api.fetchMenus).mockResolvedValue([]);
  vi.mocked(api.fetchPublicMenu).mockResolvedValue(menu());
});

describe('signed out', () => {
  it('sends every app route to the login page', async () => {
    for (const route of ['/', '/recipes', '/menus/3', '/orders', '/share/', '/nonsense']) {
      const { unmount } = renderAt(route, <App />);
      expect(await loginHeading(), route).toBeInTheDocument();
      unmount();
    }
  });

  it('asks for nothing private before signing in', async () => {
    renderAt('/menus', <App />);
    await loginHeading();
    expect(api.fetchMenus).not.toHaveBeenCalled();
    expect(api.fetchOrders).not.toHaveBeenCalled();
  });

  it('shows nothing of the app while the session check is still running', async () => {
    vi.mocked(api.fetchSession).mockReturnValue(new Promise(() => {}));
    renderAt('/menus', <App />);
    expect(await screen.findByText('Loading…')).toBeInTheDocument();
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    expect(api.fetchMenus).not.toHaveBeenCalled();
  });

  it('falls back to the login page when the session check fails', async () => {
    vi.mocked(api.fetchSession).mockRejectedValue(new Error('network down'));
    renderAt('/', <App />);
    expect(await loginHeading()).toBeInTheDocument();
  });
});

describe('signing in', () => {
  it('returns to the page that was asked for', async () => {
    const { user: u } = renderAt('/menus', <App />);
    await signIn(u, ' Host@Example.com ');
    expect(api.login).toHaveBeenCalledWith('Host@Example.com', 'correct-horse');
    expect(await accountChip()).toBeInTheDocument();
    await waitFor(() => expect(api.fetchMenus).toHaveBeenCalled());
  });

  it("shows the server's message and stays put when the password is wrong", async () => {
    vi.mocked(api.login).mockRejectedValue(new Error('Incorrect email, username or password.'));
    const { user: u } = renderAt('/', <App />);
    await signIn(u);
    expect(await screen.findByRole('alert')).toHaveTextContent('Incorrect email, username or password.');
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeEnabled();
    expect(api.fetchRecipes).not.toHaveBeenCalled();
  });

  it('keeps the button disabled until both fields are filled', async () => {
    const { user: u } = renderAt('/login', <App />);
    const button = await screen.findByRole('button', { name: 'Sign in' });
    expect(button).toBeDisabled();
    await u.type(screen.getByLabelText('Email or username'), 'walkingtowork');
    expect(button).toBeDisabled();
    await u.type(screen.getByLabelText('Password'), 'x');
    expect(button).toBeEnabled();
  });

  it('skips the login page for someone already signed in', async () => {
    vi.mocked(api.fetchSession).mockResolvedValue(user);
    renderAt('/login', <App />);
    expect(await accountChip()).toBeInTheDocument();
    expect(screen.queryByLabelText('Password')).not.toBeInTheDocument();
  });
});

describe('signed in', () => {
  beforeEach(() => {
    vi.mocked(api.fetchSession).mockResolvedValue(user);
  });

  it('logging out returns to the login page and clears the user', async () => {
    const { user: u } = renderAt('/menus', <App />);
    await u.click(await accountChip());
    await u.click(screen.getByRole('menuitem', { name: 'Log out' }));
    expect(api.logout).toHaveBeenCalled();
    expect(await loginHeading()).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Account:/ })).not.toBeInTheDocument();
  });

  it('signing in after a deliberate log out goes home, not back to the old page', async () => {
    const { user: u } = renderAt('/menus', <App />);
    await u.click(await accountChip());
    await u.click(screen.getByRole('menuitem', { name: 'Log out' }));
    vi.mocked(api.fetchMenus).mockClear();
    await signIn(u);
    await waitFor(() => expect(api.fetchRecipes).toHaveBeenCalled());  // the home page's stats
    expect(api.fetchMenus).not.toHaveBeenCalled();
  });

  it('a 401 from any request drops back to the login page', async () => {
    renderAt('/menus', <App />);
    await accountChip();
    const onUnauthorized = vi.mocked(api.setUnauthorizedHandler).mock.lastCall![0];
    onUnauthorized();
    expect(await loginHeading()).toBeInTheDocument();
  });

  it('the account menu closes on Escape', async () => {
    const { user: u } = renderAt('/', <App />);
    await u.click(await accountChip());
    expect(screen.getByRole('menu')).toBeInTheDocument();
    await u.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('shows the Orders link only when something is waiting', async () => {
    const { unmount } = renderAt('/', <App />);
    await accountChip();
    expect(screen.queryByRole('link', { name: 'Orders' })).not.toBeInTheDocument();
    unmount();

    vi.mocked(api.fetchOrders).mockResolvedValue([
      { id: 1, recipe: menu().items[0].recipe, menu_id: 3, guest_name: 'Sam', is_fulfilled: false, created_at: '' },
    ]);
    renderAt('/', <App />);
    expect((await screen.findAllByRole('link', { name: 'Orders' })).length).toBeGreaterThan(0);
  });
});

describe('the shared menu', () => {
  it('opens signed out, with no session check at all', async () => {
    renderAt(`/share/${menu().share_token}`, <App />);
    expect(await screen.findByRole('heading', { name: 'Friday Night' })).toBeInTheDocument();
    expect(api.fetchPublicMenu).toHaveBeenCalledWith(menu().share_token);
    expect(api.fetchSession).not.toHaveBeenCalled();
    expect(api.fetchOrders).not.toHaveBeenCalled();
    expect(screen.queryByLabelText('Password')).not.toBeInTheDocument();
  });
});
