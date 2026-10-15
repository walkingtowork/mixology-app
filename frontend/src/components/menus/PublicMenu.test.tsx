import { act, screen, within } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '../../services/cocktailsApi';
import { menu, negroni } from '../../test/fixtures';
import { renderAt } from '../../test/render';
import PublicMenu from './PublicMenu';

vi.mock('../../services/cocktailsApi');

const TOKEN = menu().share_token;
const order = (id: number, fulfilled = false) => ({
  id, recipe: negroni, menu_id: 3, guest_name: 'Sam', is_fulfilled: fulfilled, created_at: '2026-10-14T20:00:00Z',
});

function renderMenu() {
  return renderAt(`/share/${TOKEN}`, (
    <Routes><Route path="/share/:shareToken" element={<PublicMenu />} /></Routes>
  ));
}

beforeEach(() => {
  vi.mocked(api.fetchPublicMenu).mockResolvedValue(menu());
  vi.mocked(api.createGuestOrder).mockResolvedValue(order(1));
  vi.mocked(api.fetchGuestOrders).mockResolvedValue([]);
  vi.mocked(api.cancelGuestOrder).mockResolvedValue();
});

describe('PublicMenu', () => {
  it('offers ordering on the active menu', async () => {
    renderMenu();
    expect(await screen.findByRole('button', { name: 'Order' })).toBeInTheDocument();
  });

  it('hides the Order button on an inactive menu but keeps My Orders', async () => {
    vi.mocked(api.fetchPublicMenu).mockResolvedValue(menu({ is_active: false }));
    renderMenu();
    expect(await screen.findByText('Negroni')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Order' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'My Orders' })).toBeInTheDocument();
  });

  it('asks a first-time guest for their name, then orders with the share token', async () => {
    const { user } = renderMenu();
    await user.click(await screen.findByRole('button', { name: 'Order' }));
    await user.type(screen.getByPlaceholderText('Your name…'), ' Sam ');
    await user.click(screen.getByRole('button', { name: "Let's go" }));
    expect(api.createGuestOrder).toHaveBeenCalledWith(TOKEN, negroni.id, 'Sam');
    expect(await screen.findByRole('button', { name: 'Ordered!' })).toBeDisabled();
  });

  it('orders straight away for a guest whose name is remembered', async () => {
    localStorage.setItem('barCart_guestName', 'Sam');
    const { user } = renderMenu();
    await user.click(await screen.findByRole('button', { name: 'Order' }));
    expect(api.createGuestOrder).toHaveBeenCalledWith(TOKEN, negroni.id, 'Sam');
  });

  it('shows why an order was refused', async () => {
    localStorage.setItem('barCart_guestName', 'Sam');
    vi.mocked(api.createGuestOrder).mockRejectedValue(new Error("This menu isn't taking orders right now."));
    const { user } = renderMenu();
    await user.click(await screen.findByRole('button', { name: 'Order' }));
    expect(await screen.findByRole('alert')).toHaveTextContent("This menu isn't taking orders right now.");
    expect(screen.getByRole('button', { name: 'Order' })).toBeEnabled();
  });

  it('shows the order limit, then clears the message by itself', async () => {
    localStorage.setItem('barCart_guestName', 'Sam');
    const refusal = 'You already have 2 drinks on the way. You can order another once one is served.';
    vi.mocked(api.createGuestOrder).mockRejectedValue(new Error(refusal));
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const { user } = renderMenu();
      await user.click(await screen.findByRole('button', { name: 'Order' }));
      expect(await screen.findByRole('alert')).toHaveTextContent(refusal);
      await act(() => vi.advanceTimersByTimeAsync(6000));
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("lists the guest's own orders and cancels one", async () => {
    localStorage.setItem('barCart_guestName', 'Sam');
    vi.mocked(api.fetchGuestOrders).mockResolvedValue([order(1), order(2, true)]);
    const { user } = renderMenu();
    await user.click(await screen.findByRole('button', { name: 'My Orders' }));
    expect(api.fetchGuestOrders).toHaveBeenCalledWith(TOKEN, 'Sam');
    const rows = await screen.findAllByRole('listitem');
    const drawerRows = rows.filter(row => within(row).queryByText(/Served|Cancel/));
    expect(drawerRows).toHaveLength(2);
    expect(screen.getByText('✓ Served')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(api.cancelGuestOrder).toHaveBeenCalledWith(TOKEN, 1, 'Sam');
  });

  it('changing the name switches to the new name and leaves old orders behind', async () => {
    localStorage.setItem('barCart_guestName', 'Samm');
    vi.mocked(api.fetchGuestOrders).mockResolvedValueOnce([order(1)]).mockResolvedValueOnce([]);
    const { user } = renderMenu();
    await user.click(await screen.findByRole('button', { name: 'My Orders' }));
    await user.click(await screen.findByRole('button', { name: 'Change your name' }));
    expect(screen.getByText("Drinks you've already ordered stay under Samm.")).toBeInTheDocument();
    const input = screen.getByPlaceholderText('Your name…');
    expect(input).toHaveValue('Samm');
    await user.clear(input);
    await user.type(input, 'Sam');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(api.createGuestOrder).not.toHaveBeenCalled();
    expect(api.fetchGuestOrders).toHaveBeenLastCalledWith(TOKEN, 'Sam');
    expect(localStorage.getItem('barCart_guestName')).toBe('Sam');
    expect(await screen.findByText('No orders yet.')).toBeInTheDocument();
  });

  it('says so when the menu does not exist', async () => {
    vi.mocked(api.fetchPublicMenu).mockRejectedValue(new Error('Failed to fetch menu: 404'));
    renderMenu();
    expect(await screen.findByText('Menu not found.')).toBeInTheDocument();
  });
});
