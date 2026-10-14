import type { Ingredient, Recipe, IngredientCategory, Menu, BuyListItem, StockLevel, Order, DecorationKey, MenuStats } from '../types/cocktails';

// Empty by default: every path below already starts with /api, which the Vercel rewrite
// (and the Vite dev proxy) forwards to Django, so the app is same-origin with no
// configuration. Setting the variable bypasses the proxy and talks to a backend directly.
// `??`, not `||` -- an explicitly empty value must not fall back to anything.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

/** The fields DRF error bodies use that call sites read messages from. */
interface ApiErrorBody {
  detail?: string;
  name?: string[];
  ingredients?: string[];
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Builds the thrown message from the failed response and its parsed body ({} if unparseable). */
  error: (response: Response, body: ApiErrorBody) => string;
}

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

let onUnauthorized: () => void = () => {};

/**
 * Registers what happens when any request comes back 401. A no-op until the auth UI
 * exists; the auth context wires this to a redirect to the login page.
 */
export function setUnauthorizedHandler(handler: () => void): void {
  onUnauthorized = handler;
}

function readCookie(name: string): string | undefined {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

/**
 * The single path every API call goes through: base URL, JSON headers, session
 * cookies, CSRF token on unsafe methods, 401 handling and error shaping.
 * Resolves to the parsed JSON body, or undefined for an empty one (e.g. 204).
 */
async function request<T>(path: string, { method = 'GET', body, error }: RequestOptions): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (UNSAFE_METHODS.has(method)) {
    const csrfToken = readCookie('csrftoken');
    if (csrfToken) headers['X-CSRFToken'] = csrfToken;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    credentials: 'include',
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!response.ok) {
    if (response.status === 401) onUnauthorized();
    const errorBody: ApiErrorBody = await response.json().catch(() => ({}));
    throw new Error(error(response, errorBody));
  }

  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

/**
 * Fetches all ingredients from the API
 * @returns Promise resolving to an array of Ingredient objects
 * @throws Error if the API request fails
 */
export async function fetchIngredients(): Promise<Ingredient[]> {
  return request<Ingredient[]>('/api/ingredients/', {
    error: (res) => `Failed to fetch ingredients: ${res.status} ${res.statusText}`,
  });
}

/**
 * Fetches a single ingredient by ID
 * @param id - The ingredient ID
 * @returns Promise resolving to the Ingredient object
 * @throws Error if the API request fails
 */
export async function fetchIngredient(id: number): Promise<Ingredient> {
  return request<Ingredient>(`/api/ingredients/${id}/`, {
    error: (res) =>
      res.status === 404
        ? `Ingredient with ID ${id} not found`
        : `Failed to fetch ingredient: ${res.status} ${res.statusText}`,
  });
}

/**
 * Creates a new ingredient
 * @param name - The name of the ingredient
 * @returns Promise resolving to the created Ingredient object
 * @throws Error if the API request fails
 */
export async function createIngredient(
  name: string,
  options: { stock_level?: StockLevel; category_id?: number | null } = {}
): Promise<Ingredient> {
  return request<Ingredient>('/api/ingredients/', {
    method: 'POST',
    body: { name, ...options },
    error: (res, data) =>
      data.detail || data.name?.[0] || `Failed to create ingredient: ${res.status} ${res.statusText}`,
  });
}

/**
 * Updates an existing ingredient
 * @param id - The ingredient ID
 * @param ingredient - Partial ingredient data to update (name and/or category_id)
 * @returns Promise resolving to the updated Ingredient object
 * @throws Error if the API request fails
 */
export async function updateIngredient(
  id: number,
  ingredient: { name?: string; category_id?: number | null; stock_level?: StockLevel }
): Promise<Ingredient> {
  const ingredientData: any = {};
  if (ingredient.name !== undefined) ingredientData.name = ingredient.name;
  if (ingredient.category_id !== undefined) ingredientData.category_id = ingredient.category_id;
  if (ingredient.stock_level !== undefined) ingredientData.stock_level = ingredient.stock_level;

  return request<Ingredient>(`/api/ingredients/${id}/`, {
    method: 'PATCH',
    body: ingredientData,
    error: (res, data) =>
      data.detail || data.name?.[0] || `Failed to update ingredient: ${res.status} ${res.statusText}`,
  });
}

/**
 * Deletes an ingredient
 * @param id - The ingredient ID
 * @returns Promise resolving when the ingredient is deleted
 * @throws Error if the API request fails
 */
export async function deleteIngredient(id: number): Promise<void> {
  return request<void>(`/api/ingredients/${id}/`, {
    method: 'DELETE',
    error: (res) =>
      res.status === 404
        ? `Ingredient with ID ${id} not found`
        : `Failed to delete ingredient: ${res.status} ${res.statusText}`,
  });
}

/**
 * Fetches all recipes from the API, optionally filtered by ingredient or category
 * @param ingredientId - Optional ingredient ID to filter recipes
 * @param categoryId - Optional category ID to filter recipes
 * @returns Promise resolving to an array of Recipe objects
 * @throws Error if the API request fails
 */
export async function fetchRecipes(ingredientId?: number, categoryId?: number): Promise<Recipe[]> {
  let path = '/api/recipes/';
  const params = new URLSearchParams();
  if (ingredientId) {
    params.append('ingredient', ingredientId.toString());
  }
  if (categoryId) {
    params.append('category', categoryId.toString());
  }
  if (params.toString()) {
    path += `?${params.toString()}`;
  }

  return request<Recipe[]>(path, {
    error: (res) => `Failed to fetch recipes: ${res.status} ${res.statusText}`,
  });
}

/**
 * Fetches a single recipe by ID
 * @param id - The recipe ID
 * @returns Promise resolving to the Recipe object
 * @throws Error if the API request fails
 */
export async function fetchRecipe(id: number): Promise<Recipe> {
  return request<Recipe>(`/api/recipes/${id}/`, {
    error: (res) =>
      res.status === 404
        ? `Recipe with ID ${id} not found`
        : `Failed to fetch recipe: ${res.status} ${res.statusText}`,
  });
}

/**
 * Creates a new recipe
 * @param recipe - Recipe data without the id field
 * @returns Promise resolving to the created Recipe object
 * @throws Error if the API request fails
 */
export async function createRecipe(recipe: Omit<Recipe, 'id'>): Promise<Recipe> {
  // Transform the recipe data to match API expectations
  const recipeData = {
    name: recipe.name,
    description: recipe.description || '',
    notes: recipe.notes || '',
    garnish: recipe.garnish || '',
    glass: recipe.glass || '',
    ingredients: recipe.ingredients.map(ri => ({
      ingredient_id: ri.ingredient.id,
      amount: ri.amount,
      unit: ri.unit,
    })),
  };

  return request<Recipe>('/api/recipes/', {
    method: 'POST',
    body: recipeData,
    error: (res, data) =>
      data.detail ||
      data.name?.[0] ||
      data.ingredients?.[0] ||
      `Failed to create recipe: ${res.status} ${res.statusText}`,
  });
}

/**
 * Updates an existing recipe
 * @param id - The recipe ID
 * @param recipe - Partial recipe data to update
 * @returns Promise resolving to the updated Recipe object
 * @throws Error if the API request fails
 */
export async function updateRecipe(id: number, recipe: Partial<Recipe>): Promise<Recipe> {
  // Transform the recipe data to match API expectations
  const recipeData: any = {};

  if (recipe.name !== undefined) recipeData.name = recipe.name;
  if (recipe.description !== undefined) recipeData.description = recipe.description || '';
  if (recipe.notes !== undefined) recipeData.notes = recipe.notes || '';
  if (recipe.garnish !== undefined) recipeData.garnish = recipe.garnish || '';
  if (recipe.glass !== undefined) recipeData.glass = recipe.glass || '';

  if (recipe.ingredients !== undefined) {
    recipeData.ingredients = recipe.ingredients.map(ri => ({
      ingredient_id: ri.ingredient.id,
      amount: ri.amount,
      unit: ri.unit,
    }));
  }

  return request<Recipe>(`/api/recipes/${id}/`, {
    method: 'PATCH',
    body: recipeData,
    error: (res, data) =>
      data.detail ||
      data.name?.[0] ||
      data.ingredients?.[0] ||
      `Failed to update recipe: ${res.status} ${res.statusText}`,
  });
}

/**
 * Deletes a recipe
 * @param id - The recipe ID
 * @returns Promise resolving when the recipe is deleted
 * @throws Error if the API request fails
 */
export async function deleteRecipe(id: number): Promise<void> {
  return request<void>(`/api/recipes/${id}/`, {
    method: 'DELETE',
    error: (res) =>
      res.status === 404
        ? `Recipe with ID ${id} not found`
        : `Failed to delete recipe: ${res.status} ${res.statusText}`,
  });
}

/**
 * Fetches all ingredient categories from the API
 * @returns Promise resolving to an array of IngredientCategory objects
 * @throws Error if the API request fails
 */
export async function fetchCategories(): Promise<IngredientCategory[]> {
  return request<IngredientCategory[]>('/api/categories/', {
    error: (res) => `Failed to fetch categories: ${res.status} ${res.statusText}`,
  });
}

/**
 * Fetches a single category by ID
 * @param id - The category ID
 * @returns Promise resolving to the IngredientCategory object
 * @throws Error if the API request fails
 */
export async function fetchCategory(id: number): Promise<IngredientCategory> {
  return request<IngredientCategory>(`/api/categories/${id}/`, {
    error: (res) =>
      res.status === 404
        ? `Category with ID ${id} not found`
        : `Failed to fetch category: ${res.status} ${res.statusText}`,
  });
}

/**
 * Creates a new ingredient category
 * @param category - Category data without the id field
 * @param createGenericIngredient - Whether to auto-create a generic ingredient (default: true)
 * @returns Promise resolving to the created IngredientCategory object
 * @throws Error if the API request fails
 */
export async function createCategory(
  category: Omit<IngredientCategory, 'id' | 'ingredients' | 'generic_ingredient'>,
  createGenericIngredient: boolean = true
): Promise<IngredientCategory> {
  const categoryData = {
    name: category.name,
    notes: category.notes || '',
    create_generic_ingredient: createGenericIngredient,
  };

  return request<IngredientCategory>('/api/categories/', {
    method: 'POST',
    body: categoryData,
    error: (res, data) =>
      data.detail || data.name?.[0] || `Failed to create category: ${res.status} ${res.statusText}`,
  });
}

/**
 * Updates an existing category
 * @param id - The category ID
 * @param category - Partial category data to update
 * @returns Promise resolving to the updated IngredientCategory object
 * @throws Error if the API request fails
 */
export async function updateCategory(
  id: number,
  category: Partial<Omit<IngredientCategory, 'id' | 'ingredients' | 'generic_ingredient'>>
): Promise<IngredientCategory> {
  const categoryData: any = {};

  if (category.name !== undefined) categoryData.name = category.name;
  if (category.notes !== undefined) categoryData.notes = category.notes || '';

  return request<IngredientCategory>(`/api/categories/${id}/`, {
    method: 'PATCH',
    body: categoryData,
    error: (res, data) =>
      data.detail || data.name?.[0] || `Failed to update category: ${res.status} ${res.statusText}`,
  });
}

/**
 * Deletes a category
 * @param id - The category ID
 * @returns Promise resolving when the category is deleted
 * @throws Error if the API request fails
 */
export async function deleteCategory(id: number): Promise<void> {
  return request<void>(`/api/categories/${id}/`, {
    method: 'DELETE',
    error: (res, data) =>
      res.status === 404
        ? `Category with ID ${id} not found`
        : data.detail || `Failed to delete category: ${res.status} ${res.statusText}`,
  });
}

/**
 * Fetches all ingredients in a category
 * @param categoryId - The category ID
 * @returns Promise resolving to an array of Ingredient objects
 * @throws Error if the API request fails
 */
export async function fetchCategoryIngredients(categoryId: number): Promise<Ingredient[]> {
  return request<Ingredient[]>(`/api/categories/${categoryId}/ingredients/`, {
    error: (res) => `Failed to fetch category ingredients: ${res.status}`,
  });
}

export async function fetchIngredientRecipes(ingredientId: number): Promise<Recipe[]> {
  return request<Recipe[]>(`/api/ingredients/${ingredientId}/recipes/`, {
    error: (res) => `Failed to fetch ingredient recipes: ${res.status}`,
  });
}

// ── Menus ──────────────────────────────────────────────────────────────────

export async function fetchMenus(): Promise<Menu[]> {
  return request<Menu[]>('/api/menus/', {
    error: (res) => `Failed to fetch menus: ${res.status}`,
  });
}

export async function fetchMenu(id: number): Promise<Menu> {
  return request<Menu>(`/api/menus/${id}/`, {
    error: (res) => `Failed to fetch menu: ${res.status}`,
  });
}

export async function fetchPublicMenu(shareToken: string): Promise<Menu> {
  return request<Menu>(`/api/public/menu/${shareToken}/`, {
    error: (res) => `Failed to fetch menu: ${res.status}`,
  });
}

export async function createMenu(
  name: string,
  decorations?: { top_decoration?: DecorationKey; bottom_decoration?: DecorationKey },
): Promise<Menu> {
  return request<Menu>('/api/menus/', {
    method: 'POST',
    body: { name, ...decorations },
    error: (res) => `Failed to create menu: ${res.status}`,
  });
}

export async function updateMenu(
  id: number,
  data: {
    name?: string;
    theme_notes?: string;
    is_published?: boolean;
    top_decoration?: DecorationKey;
    bottom_decoration?: DecorationKey;
  },
): Promise<Menu> {
  return request<Menu>(`/api/menus/${id}/`, {
    method: 'PATCH',
    body: data,
    error: (res) => `Failed to update menu: ${res.status}`,
  });
}

export async function deleteMenu(id: number): Promise<void> {
  return request<void>(`/api/menus/${id}/`, {
    method: 'DELETE',
    error: (res) => `Failed to delete menu: ${res.status}`,
  });
}

export async function activateMenu(id: number): Promise<Menu> {
  return request<Menu>(`/api/menus/${id}/activate/`, {
    method: 'POST',
    error: (res) => `Failed to activate menu: ${res.status}`,
  });
}

export async function fetchMenuStats(menuId: number): Promise<MenuStats> {
  return request<MenuStats>(`/api/menus/${menuId}/stats/`, {
    error: (res) => `Failed to fetch menu stats: ${res.status}`,
  });
}

export async function addMenuItem(menuId: number, recipeId: number): Promise<Menu> {
  return request<Menu>(`/api/menus/${menuId}/add-item/`, {
    method: 'POST',
    body: { recipe_id: recipeId },
    error: (res, data) => data.detail || `Failed to add item: ${res.status}`,
  });
}

export async function removeMenuItem(menuItemId: number): Promise<void> {
  return request<void>(`/api/menu-items/${menuItemId}/`, {
    method: 'DELETE',
    error: (res) => `Failed to remove menu item: ${res.status}`,
  });
}

export async function reorderMenuItems(menuId: number, items: { id: number; order: number }[]): Promise<Menu> {
  return request<Menu>(`/api/menus/${menuId}/reorder-items/`, {
    method: 'PATCH',
    body: items,
    error: (res) => `Failed to reorder menu items: ${res.status}`,
  });
}

// ── Buy List ───────────────────────────────────────────────────────────────

export async function fetchBuyList(): Promise<BuyListItem[]> {
  return request<BuyListItem[]>('/api/buy-list/', {
    error: (res) => `Failed to fetch buy list: ${res.status}`,
  });
}

export async function addToBuyList(ingredientId: number, notes = ''): Promise<BuyListItem> {
  return request<BuyListItem>('/api/buy-list/', {
    method: 'POST',
    body: { ingredient_id: ingredientId, notes },
    error: (res) => `Failed to add to buy list: ${res.status}`,
  });
}

export async function removeBuyListItem(id: number): Promise<void> {
  return request<void>(`/api/buy-list/${id}/`, {
    method: 'DELETE',
    error: (res) => `Failed to remove buy list item: ${res.status}`,
  });
}

export async function updateBuyListItem(id: number, notes: string): Promise<BuyListItem> {
  return request<BuyListItem>(`/api/buy-list/${id}/`, {
    method: 'PATCH',
    body: { notes },
    error: (res) => `Failed to update buy list item: ${res.status}`,
  });
}

// ── Orders ─────────────────────────────────────────────────────────────────

// The bartender's side: needs the owner's session.

export async function fetchOrders(params?: {
  today?: boolean;
  fulfilled?: boolean;
}): Promise<Order[]> {
  const qs = new URLSearchParams();
  if (params?.today) qs.set('today', 'true');
  if (params?.fulfilled !== undefined) qs.set('fulfilled', String(params.fulfilled));
  return request<Order[]>(`/api/orders/?${qs}`, {
    error: () => 'Failed to fetch orders',
  });
}

export async function fulfillOrder(id: number): Promise<Order> {
  return request<Order>(`/api/orders/${id}/`, {
    method: 'PATCH',
    body: { is_fulfilled: true },
    error: () => 'Failed to fulfill order',
  });
}

export async function cancelOrder(id: number): Promise<void> {
  return request<void>(`/api/orders/${id}/`, {
    method: 'DELETE',
    error: () => 'Failed to cancel order',
  });
}

// The guest's side: no session. The menu's share token is the credential, and a guest's
// orders are the ones on that menu under the name they typed.

export async function createGuestOrder(shareToken: string, recipeId: number, guestName: string): Promise<Order> {
  return request<Order>(`/api/public/menu/${shareToken}/orders/`, {
    method: 'POST',
    body: { recipe_id: recipeId, guest_name: guestName },
    error: (_res, body) => body.detail ?? 'Failed to place order',
  });
}

export async function fetchGuestOrders(shareToken: string, guestName: string): Promise<Order[]> {
  const qs = new URLSearchParams({ guest_name: guestName });
  return request<Order[]>(`/api/public/menu/${shareToken}/orders/?${qs}`, {
    error: () => 'Failed to fetch orders',
  });
}

export async function cancelGuestOrder(shareToken: string, id: number, guestName: string): Promise<void> {
  const qs = new URLSearchParams({ guest_name: guestName });
  return request<void>(`/api/public/menu/${shareToken}/orders/${id}/?${qs}`, {
    method: 'DELETE',
    error: (_res, body) => body.detail ?? 'Failed to cancel order',
  });
}
