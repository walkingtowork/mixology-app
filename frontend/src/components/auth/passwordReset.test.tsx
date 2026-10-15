import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../App';
import * as api from '../../services/cocktailsApi';
import { user } from '../../test/fixtures';
import { renderAt } from '../../test/render';

vi.mock('../../services/cocktailsApi');

beforeEach(() => {
  vi.mocked(api.fetchSession).mockResolvedValue(null);
  vi.mocked(api.checkPasswordReset).mockResolvedValue();
  vi.mocked(api.fetchRecipes).mockResolvedValue([]);
  vi.mocked(api.fetchIngredients).mockResolvedValue([]);
  vi.mocked(api.fetchCategories).mockResolvedValue([]);
  vi.mocked(api.fetchMenus).mockResolvedValue([]);
  vi.mocked(api.fetchOrders).mockResolvedValue([]);
});

describe('forgot password', () => {
  it('is linked from the login page', async () => {
    const { user: u } = renderAt('/login', <App />);
    await u.click(await screen.findByRole('link', { name: 'Forgot your password?' }));
    expect(screen.getByRole('heading', { name: 'Forgot your password?' })).toBeInTheDocument();
  });

  it('says to ask the host while links are not emailed', async () => {
    vi.mocked(api.requestPasswordReset).mockResolvedValue({ emailed: false });
    const { user: u } = renderAt('/forgot-password', <App />);
    await u.type(await screen.findByLabelText('Email or username'), ' sam ');
    await u.click(screen.getByRole('button', { name: 'Get a reset link' }));
    expect(api.requestPasswordReset).toHaveBeenCalledWith('sam');
    expect(await screen.findByRole('heading', { name: 'Ask your host' })).toBeInTheDocument();
    expect(screen.getByText(/Ask whoever invited you/)).toBeInTheDocument();
  });

  it('says to check email once links are emailed', async () => {
    vi.mocked(api.requestPasswordReset).mockResolvedValue({ emailed: true });
    const { user: u } = renderAt('/forgot-password', <App />);
    await u.type(await screen.findByLabelText('Email or username'), 'sam@example.com');
    await u.click(screen.getByRole('button', { name: 'Get a reset link' }));
    expect(await screen.findByRole('heading', { name: 'Check your email' })).toBeInTheDocument();
  });
});

describe('reset password', () => {
  async function fillIn(u: ReturnType<typeof renderAt>['user'], confirm = 'a-brand-new-password') {
    await u.type(await screen.findByLabelText('New password'), 'a-brand-new-password');
    await u.type(screen.getByLabelText('Confirm new password'), confirm);
  }

  it('sets the new password, signs in and lands on the home page', async () => {
    vi.mocked(api.resetPassword).mockResolvedValue(user);
    const { user: u } = renderAt('/reset-password/MQ/abc-123', <App />);
    await fillIn(u);
    await u.click(screen.getByRole('button', { name: 'Set new password' }));
    expect(api.checkPasswordReset).toHaveBeenCalledWith('MQ', 'abc-123');
    expect(api.resetPassword).toHaveBeenCalledWith('MQ', 'abc-123', 'a-brand-new-password');
    expect(await screen.findByRole('button', { name: `Account: ${user.username}` })).toBeInTheDocument();
  });

  it('will not submit until the passwords match', async () => {
    const { user: u } = renderAt('/reset-password/MQ/abc-123', <App />);
    await fillIn(u, 'a-brand-new-passwrd');
    expect(screen.getByText("The passwords don't match.")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Set new password' })).toBeDisabled();
  });

  it("shows why the server refused the password, and stays put", async () => {
    vi.mocked(api.resetPassword).mockRejectedValue(new Error('This password is too common.'));
    const { user: u } = renderAt('/reset-password/MQ/abc-123', <App />);
    await fillIn(u);
    await u.click(screen.getByRole('button', { name: 'Set new password' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('This password is too common.');
    expect(screen.getByRole('button', { name: 'Set new password' })).toBeEnabled();
  });

  it('explains a used or expired link and offers a new one', async () => {
    vi.mocked(api.checkPasswordReset).mockRejectedValue(
      new Error('This reset link has expired or has already been used.'),
    );
    const { user: u } = renderAt('/reset-password/MQ/old', <App />);
    expect(await screen.findByRole('alert')).toHaveTextContent('expired or has already been used');
    expect(screen.queryByLabelText('New password')).not.toBeInTheDocument();
    await u.click(screen.getByRole('link', { name: 'Get a new link' }));
    expect(screen.getByRole('heading', { name: 'Forgot your password?' })).toBeInTheDocument();
  });
});
