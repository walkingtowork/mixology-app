import { screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../App';
import * as api from '../../services/cocktailsApi';
import { user } from '../../test/fixtures';
import { renderAt } from '../../test/render';

vi.mock('../../services/cocktailsApi');

const me = { ...user, fullname: 'Alex Lin' };

beforeEach(() => {
  vi.mocked(api.fetchSession).mockResolvedValue(me);
  vi.mocked(api.fetchRecipes).mockResolvedValue([]);
  vi.mocked(api.fetchIngredients).mockResolvedValue([]);
  vi.mocked(api.fetchCategories).mockResolvedValue([]);
  vi.mocked(api.fetchMenus).mockResolvedValue([]);
  vi.mocked(api.fetchOrders).mockResolvedValue([]);
});

const accountChip = () => screen.findByRole('button', { name: 'Account: walkingtowork' });
const details = async () => within(await screen.findByRole('form', { name: 'Your details' }));
const passwordForm = async () => within(await screen.findByRole('form', { name: 'Change password' }));

describe('personal info page', () => {
  it('is reached from the account menu', async () => {
    const { user: u } = renderAt('/', <App />);
    await u.click(await accountChip());
    await u.click(screen.getByRole('menuitem', { name: 'Personal info' }));
    expect(await screen.findByRole('heading', { name: 'Personal info' })).toBeInTheDocument();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('shows the username without letting it be changed, and fills in the rest', async () => {
    renderAt('/account', <App />);
    const username = await screen.findByLabelText('Username');
    expect(username).toHaveValue('walkingtowork');
    expect(username).toBeDisabled();
    expect(screen.getByLabelText('Full name')).toHaveValue('Alex Lin');
    expect(screen.getByLabelText('Email')).toHaveValue('host@example.com');
    expect(screen.getByRole('radio', { name: 'Initial' })).toBeChecked();
  });

  it('saves a new name and glass without asking for the password, and the chip shows the glass', async () => {
    vi.mocked(api.updateProfile).mockResolvedValue({ ...me, fullname: 'Alex L', avatar_glass: 'coupe' });
    const { user: u } = renderAt('/account', <App />);
    const form = await details();
    const save = form.getByRole('button', { name: 'Save' });
    expect(save).toBeDisabled();

    const name = form.getByLabelText('Full name');
    await u.clear(name);
    await u.type(name, 'Alex L');
    await u.click(form.getByRole('radio', { name: 'Coupe' }));
    expect(form.queryByLabelText('Current password')).not.toBeInTheDocument();
    await u.click(save);

    expect(api.updateProfile).toHaveBeenCalledWith({ fullname: 'Alex L', avatar_glass: 'coupe' });
    expect(await screen.findByRole('status')).toHaveTextContent('Saved');
    expect(within(await accountChip()).queryByText('W')).not.toBeInTheDocument();
  });

  it('asks for the current password before changing the email', async () => {
    vi.mocked(api.updateProfile).mockResolvedValue({ ...me, email: 'new@example.com' });
    const { user: u } = renderAt('/account', <App />);
    const form = await details();
    const email = form.getByLabelText('Email');
    await u.clear(email);
    await u.type(email, 'new@example.com');

    const save = form.getByRole('button', { name: 'Save' });
    expect(save).toBeDisabled();
    await u.type(form.getByLabelText('Current password'), 'correct-horse');
    await u.click(save);

    expect(api.updateProfile).toHaveBeenCalledWith({
      fullname: 'Alex Lin', avatar_glass: '', email: 'new@example.com', current_password: 'correct-horse',
    });
    expect(await screen.findByRole('status')).toHaveTextContent('Saved');
  });

  it("shows why the server refused the details, and keeps what was typed", async () => {
    vi.mocked(api.updateProfile).mockRejectedValue(new Error('That password is incorrect.'));
    const { user: u } = renderAt('/account', <App />);
    const form = await details();
    const email = form.getByLabelText('Email');
    await u.clear(email);
    await u.type(email, 'new@example.com');
    await u.type(form.getByLabelText('Current password'), 'wrong');
    await u.click(form.getByRole('button', { name: 'Save' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('That password is incorrect.');
    expect(screen.getByLabelText('Email')).toHaveValue('new@example.com');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});

describe('changing the password', () => {
  async function fillIn(u: ReturnType<typeof renderAt>['user'], confirm = 'a-new-long-passphrase') {
    const form = await passwordForm();
    await u.type(form.getByLabelText('Current password'), 'correct-horse');
    await u.type(form.getByLabelText('New password'), 'a-new-long-passphrase');
    await u.type(form.getByLabelText('Confirm new password'), confirm);
  }

  it('sends the current and new password, then says other devices were signed out', async () => {
    vi.mocked(api.changePassword).mockResolvedValue();
    const { user: u } = renderAt('/account', <App />);
    await fillIn(u);
    await u.click(screen.getByRole('button', { name: 'Change password' }));

    expect(api.changePassword).toHaveBeenCalledWith('correct-horse', 'a-new-long-passphrase');
    expect(await screen.findByRole('status')).toHaveTextContent('other devices have been signed out');
    expect((await passwordForm()).getByLabelText('Current password')).toHaveValue('');
  });

  it("won't submit until the new passwords match", async () => {
    const { user: u } = renderAt('/account', <App />);
    await fillIn(u, 'something-else');
    expect(screen.getByRole('button', { name: 'Change password' })).toBeDisabled();
    expect(screen.getByText("The passwords don't match.")).toBeInTheDocument();
  });

  it('shows a wrong current password, and stays signed in', async () => {
    vi.mocked(api.changePassword).mockRejectedValue(new Error('That password is incorrect.'));
    const { user: u } = renderAt('/account', <App />);
    await fillIn(u);
    await u.click(screen.getByRole('button', { name: 'Change password' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('That password is incorrect.');
    expect(await accountChip()).toBeInTheDocument();
  });
});
