import type { Ingredient, Recipe, IngredientCategory } from '../types/cocktails';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

/**
 * Fetches all ingredients from the API
 * @returns Promise resolving to an array of Ingredient objects
 * @throws Error if the API request fails
 */
export async function fetchIngredients(): Promise<Ingredient[]> {
  const response = await fetch(`${API_BASE_URL}/api/ingredients/`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ingredients: ${response.status} ${response.statusText}`);
  }

  const data: Ingredient[] = await response.json();
  return data;
}

/**
 * Creates a new ingredient
 * @param name - The name of the ingredient
 * @returns Promise resolving to the created Ingredient object
 * @throws Error if the API request fails
 */
export async function createIngredient(name: string): Promise<Ingredient> {
  const response = await fetch(`${API_BASE_URL}/api/ingredients/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || errorData.name?.[0] || `Failed to create ingredient: ${response.status} ${response.statusText}`);
  }

  const data: Ingredient = await response.json();
  return data;
}

/**
 * Fetches all recipes from the API, optionally filtered by ingredient or category
 * @param ingredientId - Optional ingredient ID to filter recipes
 * @param categoryId - Optional category ID to filter recipes
 * @returns Promise resolving to an array of Recipe objects
 * @throws Error if the API request fails
 */
export async function fetchRecipes(ingredientId?: number, categoryId?: number): Promise<Recipe[]> {
  let url = `${API_BASE_URL}/api/recipes/`;
  const params = new URLSearchParams();
  if (ingredientId) {
    params.append('ingredient', ingredientId.toString());
  }
  if (categoryId) {
    params.append('category', categoryId.toString());
  }
  if (params.toString()) {
    url += `?${params.toString()}`;
  }

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch recipes: ${response.status} ${response.statusText}`);
  }

  const data: Recipe[] = await response.json();
  return data;
}

/**
 * Fetches a single recipe by ID
 * @param id - The recipe ID
 * @returns Promise resolving to the Recipe object
 * @throws Error if the API request fails
 */
export async function fetchRecipe(id: number): Promise<Recipe> {
  const response = await fetch(`${API_BASE_URL}/api/recipes/${id}/`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Recipe with ID ${id} not found`);
    }
    throw new Error(`Failed to fetch recipe: ${response.status} ${response.statusText}`);
  }

  const data: Recipe = await response.json();
  return data;
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
    notes: recipe.notes || '',
    garnish: recipe.garnish || '',
    ingredients: recipe.ingredients.map(ri => ({
      ingredient_id: ri.ingredient.id,
      amount: ri.amount,
      unit: ri.unit,
    })),
  };

  const response = await fetch(`${API_BASE_URL}/api/recipes/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(recipeData),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.detail || 
                        errorData.name?.[0] || 
                        errorData.ingredients?.[0] || 
                        `Failed to create recipe: ${response.status} ${response.statusText}`;
    throw new Error(errorMessage);
  }

  const data: Recipe = await response.json();
  return data;
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
  if (recipe.notes !== undefined) recipeData.notes = recipe.notes || '';
  if (recipe.garnish !== undefined) recipeData.garnish = recipe.garnish || '';
  
  if (recipe.ingredients !== undefined) {
    recipeData.ingredients = recipe.ingredients.map(ri => ({
      ingredient_id: ri.ingredient.id,
      amount: ri.amount,
      unit: ri.unit,
    }));
  }

  const response = await fetch(`${API_BASE_URL}/api/recipes/${id}/`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(recipeData),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.detail || 
                        errorData.name?.[0] || 
                        errorData.ingredients?.[0] || 
                        `Failed to update recipe: ${response.status} ${response.statusText}`;
    throw new Error(errorMessage);
  }

  const data: Recipe = await response.json();
  return data;
}

/**
 * Deletes a recipe
 * @param id - The recipe ID
 * @returns Promise resolving when the recipe is deleted
 * @throws Error if the API request fails
 */
export async function deleteRecipe(id: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/recipes/${id}/`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Recipe with ID ${id} not found`);
    }
    throw new Error(`Failed to delete recipe: ${response.status} ${response.statusText}`);
  }
}

/**
 * Fetches all ingredient categories from the API
 * @returns Promise resolving to an array of IngredientCategory objects
 * @throws Error if the API request fails
 */
export async function fetchCategories(): Promise<IngredientCategory[]> {
  const response = await fetch(`${API_BASE_URL}/api/categories/`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch categories: ${response.status} ${response.statusText}`);
  }

  const data: IngredientCategory[] = await response.json();
  return data;
}

/**
 * Fetches a single category by ID
 * @param id - The category ID
 * @returns Promise resolving to the IngredientCategory object
 * @throws Error if the API request fails
 */
export async function fetchCategory(id: number): Promise<IngredientCategory> {
  const response = await fetch(`${API_BASE_URL}/api/categories/${id}/`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Category with ID ${id} not found`);
    }
    throw new Error(`Failed to fetch category: ${response.status} ${response.statusText}`);
  }

  const data: IngredientCategory = await response.json();
  return data;
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

  const response = await fetch(`${API_BASE_URL}/api/categories/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(categoryData),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.detail || 
                        errorData.name?.[0] || 
                        `Failed to create category: ${response.status} ${response.statusText}`;
    throw new Error(errorMessage);
  }

  const data: IngredientCategory = await response.json();
  return data;
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

  const response = await fetch(`${API_BASE_URL}/api/categories/${id}/`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(categoryData),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.detail || 
                        errorData.name?.[0] || 
                        `Failed to update category: ${response.status} ${response.statusText}`;
    throw new Error(errorMessage);
  }

  const data: IngredientCategory = await response.json();
  return data;
}

/**
 * Deletes a category
 * @param id - The category ID
 * @returns Promise resolving when the category is deleted
 * @throws Error if the API request fails
 */
export async function deleteCategory(id: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/categories/${id}/`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Category with ID ${id} not found`);
    }
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.detail || 
                        `Failed to delete category: ${response.status} ${response.statusText}`;
    throw new Error(errorMessage);
  }
}

/**
 * Fetches all ingredients in a category
 * @param categoryId - The category ID
 * @returns Promise resolving to an array of Ingredient objects
 * @throws Error if the API request fails
 */
export async function fetchCategoryIngredients(categoryId: number): Promise<Ingredient[]> {
  const response = await fetch(`${API_BASE_URL}/api/categories/${categoryId}/ingredients/`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch category ingredients: ${response.status} ${response.statusText}`);
  }

  const data: Ingredient[] = await response.json();
  return data;
}

