import { act, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../App';
import * as api from '../../services/cocktailsApi';
import { user } from '../../test/fixtures';
import { renderAt } from '../../test/render';
import type { Invite } from '../../types/cocktails';

vi.mock('../../services/cocktailsApi');

const host = { ...user, can_invite: true };
const invite = (id: number, used_by: string | null = null): Invite => ({
  id, url: `https://thebarcart.vercel.app/invite/token-${id}`, expires_at: '2026-10-15T20:00:00Z', used_by,
});

beforeEach(() => {
  vi.mocked(api.fetchSession).mockResolvedValue(null);
  vi.mocked(api.checkInvite).mockResolvedValue();
  vi.mocked(api.logout).mockResolvedValue();
  vi.mocked(api.fetchRecipes).mockResolvedValue([]);
  vi.mocked(api.fetchIngredients).mockResolvedValue([]);
  vi.mocked(api.fetchCategories).mockResolvedValue([]);
  vi.mocked(api.fetchMenus).mockResolvedValue([]);
  vi.mocked(api.fetchOrders).mockResolvedValue([]);
});

describe('signup page', () => {
  async function fillIn(u: ReturnType<typeof renderAt>['user'], confirm = 'a-fine-password') {
    await u.type(await screen.findByLabelText('Username'), 'newbie');
    await u.type(screen.getByLabelText('Email'), 'newbie@example.com');
    await u.type(screen.getByLabelText('Password'), 'a-fine-password');
    await u.type(screen.getByLabelText('Confirm password'), confirm);
  }

  it('opens signed out, creates the account and lands on the home page', async () => {
    vi.mocked(api.signup).mockResolvedValue({ ...user, username: 'newbie' });
    const { user: u } = renderAt('/invite/abc123', <App />);
    await fillIn(u);
    await u.click(screen.getByRole('button', { name: 'Create account' }));
    expect(api.checkInvite).toHaveBeenCalledWith('abc123');
    expect(api.signup).toHaveBeenCalledWith('abc123', {
      username: 'newbie', email: 'newbie@example.com', password: 'a-fine-password',
    });
    expect(await screen.findByRole('button', { name: 'Account: newbie' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Confirm password')).not.toBeInTheDocument();
  });

  it('will not submit until the passwords match', async () => {
    const { user: u } = renderAt('/invite/abc123', <App />);
    await fillIn(u, 'a-fine-passwrd');
    expect(screen.getByText("The passwords don't match.")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create account' })).toBeDisabled();
  });

  it('flags a username with symbols before submitting', async () => {
    const { user: u } = renderAt('/invite/abc123', <App />);
    await u.type(await screen.findByLabelText('Username'), 'new.bie');
    expect(screen.getByText('Letters and numbers only.')).toBeInTheDocument();
  });

  it('shows and hides both passwords together', async () => {
    const { user: u } = renderAt('/invite/abc123', <App />);
    const password = await screen.findByLabelText('Password');
    expect(password).toHaveAttribute('type', 'password');
    await u.click(screen.getByRole('button', { name: 'Show' }));
    expect(password).toHaveAttribute('type', 'text');
    expect(screen.getByLabelText('Confirm password')).toHaveAttribute('type', 'text');
    await u.click(screen.getByRole('button', { name: 'Hide' }));
    expect(password).toHaveAttribute('type', 'password');
  });

  it("shows the server's reason when signup is refused", async () => {
    vi.mocked(api.signup).mockRejectedValue(new Error('That username is taken.'));
    const { user: u } = renderAt('/invite/abc123', <App />);
    await fillIn(u);
    await u.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('That username is taken.');
  });

  it('explains a used or expired invite instead of showing the form', async () => {
    vi.mocked(api.checkInvite).mockRejectedValue(new Error('This invite has expired.'));
    renderAt('/invite/abc123', <App />);
    expect(await screen.findByRole('alert')).toHaveTextContent('This invite has expired.');
    expect(screen.queryByLabelText('Username')).not.toBeInTheDocument();
  });

  it('asks a signed-in visitor to log out rather than replace their session', async () => {
    vi.mocked(api.fetchSession).mockResolvedValue(user);
    const { user: u } = renderAt('/invite/abc123', <App />);
    expect(await screen.findByText(/Log out to use this invite/)).toBeInTheDocument();
    await u.click(screen.getByRole('button', { name: 'Log out' }));
    expect(await screen.findByLabelText('Username')).toBeInTheDocument();
  });
});

describe('invite screen', () => {
  async function openInvite(u: ReturnType<typeof renderAt>['user']) {
    await u.click(await screen.findByRole('button', { name: 'Account: walkingtowork' }));
    await u.click(screen.getByRole('menuitem', { name: 'Invite someone' }));
    return screen.findByRole('dialog');
  }

  it('is only offered to accounts allowed to invite', async () => {
    vi.mocked(api.fetchSession).mockResolvedValue(user);
    const { user: u } = renderAt('/', <App />);
    await u.click(await screen.findByRole('button', { name: 'Account: walkingtowork' }));
    expect(screen.queryByRole('menuitem', { name: 'Invite someone' })).not.toBeInTheDocument();
  });

  it('shows a fresh code and its link', async () => {
    vi.mocked(api.fetchSession).mockResolvedValue(host);
    vi.mocked(api.createInvite).mockResolvedValue(invite(1));
    const { user: u } = renderAt('/', <App />);
    const dialog = await openInvite(u);
    expect(await within(dialog).findByLabelText('Invite link')).toHaveValue(invite(1).url);
    expect(within(dialog).getByTitle('Invite QR code')).toBeInTheDocument();
  });

  it('makes a new code on request, and closes', async () => {
    vi.mocked(api.fetchSession).mockResolvedValue(host);
    vi.mocked(api.createInvite).mockResolvedValueOnce(invite(1)).mockResolvedValueOnce(invite(2));
    const { user: u } = renderAt('/', <App />);
    const dialog = await openInvite(u);
    await within(dialog).findByDisplayValue(invite(1).url);
    await u.click(within(dialog).getByRole('button', { name: 'New code' }));
    expect(await within(dialog).findByDisplayValue(invite(2).url)).toBeInTheDocument();
    await u.click(within(dialog).getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('says who joined and moves on to a new code by itself', async () => {
    vi.mocked(api.fetchSession).mockResolvedValue(host);
    vi.mocked(api.createInvite).mockResolvedValueOnce(invite(1)).mockResolvedValueOnce(invite(2));
    vi.mocked(api.fetchInvite).mockResolvedValueOnce(invite(1)).mockResolvedValue(invite(1, 'sam'));
    // Installed before the screen opens, so its polling interval runs on the fake clock.
    // shouldAdvanceTime keeps the clock moving with real time, which user-event needs.
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const { user: u } = renderAt('/', <App />);
      const dialog = await openInvite(u);
      await within(dialog).findByDisplayValue(invite(1).url);

      await act(() => vi.advanceTimersByTimeAsync(3000));
      expect(within(dialog).queryByText('✓ sam joined')).not.toBeInTheDocument();
      await act(() => vi.advanceTimersByTimeAsync(3000));
      expect(within(dialog).getByText('✓ sam joined')).toBeInTheDocument();
      await act(() => vi.advanceTimersByTimeAsync(2500));
      await waitFor(() => expect(within(dialog).getByLabelText('Invite link')).toHaveValue(invite(2).url));
      expect(within(dialog).queryByText('✓ sam joined')).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
    expect(api.fetchInvite).toHaveBeenCalledWith(1);
  });
});
