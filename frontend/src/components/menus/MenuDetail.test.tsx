import { screen, within } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '../../services/cocktailsApi';
import { menu } from '../../test/fixtures';
import { renderAt } from '../../test/render';
import MenuDetail from './MenuDetail';

vi.mock('../../services/cocktailsApi');

function renderDetail() {
  return renderAt('/menus/3', (
    <Routes><Route path="/menus/:id" element={<MenuDetail />} /></Routes>
  ));
}

beforeEach(() => {
  vi.mocked(api.fetchMenu).mockResolvedValue(menu());
  vi.mocked(api.fetchMenus).mockResolvedValue([menu()]);
});

describe('MenuDetail notes', () => {
  it('explains the formatting shortcuts', async () => {
    renderDetail();
    expect(await screen.findByLabelText('Notes')).toBeInTheDocument();
    expect(screen.getByText(/for a header and/)).toBeInTheDocument();
  });

  it('previews the notes and saves them to the menu', async () => {
    const saved = '# Neat Pours\n- Hibiki Harmony';
    vi.mocked(api.updateMenu).mockResolvedValue(menu({ notes: saved }));
    const { user } = renderDetail();

    const save = await screen.findByRole('button', { name: 'Save Notes' });
    expect(save).toBeDisabled();
    await user.type(screen.getByLabelText('Notes'), '# Neat Pours{enter}- Hibiki Harmony');

    const preview = screen.getByRole('region', { name: 'More from the bar' });
    expect(within(preview).getByRole('heading', { name: 'Neat Pours' })).toBeInTheDocument();
    expect(within(preview).getByRole('listitem')).toHaveTextContent('Hibiki Harmony');

    await user.click(save);
    expect(api.updateMenu).toHaveBeenCalledWith(3, { notes: saved });
    expect(await screen.findByText('Saved')).toBeInTheDocument();
    expect(save).toBeDisabled();
  });

  it('says so when the notes fail to save, and keeps what was typed', async () => {
    vi.mocked(api.updateMenu).mockRejectedValue(new Error('nope'));
    const { user } = renderDetail();
    await user.type(await screen.findByLabelText('Notes'), 'Ask about umeshu');
    await user.click(screen.getByRole('button', { name: 'Save Notes' }));
    expect(await screen.findByText('Failed to save notes.')).toBeInTheDocument();
    expect(screen.getByLabelText('Notes')).toHaveValue('Ask about umeshu');
  });
});
