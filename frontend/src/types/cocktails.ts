/**
 * Type definitions for cocktails API
 */

export type Unit = 'oz' | 'ml' | 'tsp' | 'tbsp' | 'barspoon' | 'dash' | 'drops' | 'spritz' | 'rinse' | 'pinch';

export interface Ingredient {
  id: number;
  name: string;
}

export interface RecipeIngredient {
  id: number;
  ingredient: Ingredient;
  amount: number;
  unit: Unit;
}

export interface Recipe {
  id: number;
  name: string;
  notes: string | null;
  garnish: string | null;
  source_url: string | null;
  ingredients: RecipeIngredient[];
}

