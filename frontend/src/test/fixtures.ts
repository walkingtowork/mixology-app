import type { Menu, Recipe, User } from '../types/cocktails';

export const user: User = {
  id: 1,
  username: 'walkingtowork',
  email: 'host@example.com',
  fullname: '',
  can_invite: false,
};

export const negroni: Recipe = {
  id: 7,
  name: 'Negroni',
  description: 'Bitter, sweet, strong.',
  ingredients: [],
} as unknown as Recipe;

export function menu(overrides: Partial<Menu> = {}): Menu {
  return {
    id: 3,
    name: 'Friday Night',
    is_active: true,
    is_published: true,
    share_token: '11111111-2222-3333-4444-555555555555',
    theme_notes: '',
    top_decoration: 'none',
    bottom_decoration: 'none',
    created_at: '2026-10-14T10:00:00Z',
    updated_at: '2026-10-14T10:00:00Z',
    items: [{ id: 1, recipe: negroni, order: 1 }],
    item_count: 1,
    ...overrides,
  } as Menu;
}
