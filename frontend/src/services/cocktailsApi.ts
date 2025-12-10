import type { Ingredient, Recipe } from '../types/cocktails';

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
 * Fetches all recipes from the API, optionally filtered by ingredient
 * @param ingredientId - Optional ingredient ID to filter recipes
 * @returns Promise resolving to an array of Recipe objects
 * @throws Error if the API request fails
 */
export async function fetchRecipes(ingredientId?: number): Promise<Recipe[]> {
  let url = `${API_BASE_URL}/api/recipes/`;
  if (ingredientId) {
    url += `?ingredient=${ingredientId}`;
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

