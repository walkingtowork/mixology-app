export type Unit = 'oz' | 'ml' | 'tsp' | 'tbsp' | 'barspoon' | 'dash' | 'drops' | 'spritz' | 'rinse' | 'pinch';

export type GlassType = 'rocks' | 'old_fashioned' | 'martini' | 'coupe' | 'champagne_flute' | 'collins' | 'shot' | 'glencairn';

export const GLASS_OPTIONS: { value: GlassType; label: string }[] = [
  { value: 'rocks', label: 'Rocks' },
  { value: 'old_fashioned', label: 'Old Fashioned' },
  { value: 'martini', label: 'Martini' },
  { value: 'coupe', label: 'Coupe' },
  { value: 'champagne_flute', label: 'Champagne Flute' },
  { value: 'collins', label: 'Collins' },
  { value: 'shot', label: 'Shot' },
  { value: 'glencairn', label: 'Glencairn' },
];

export type StockLevel = 0 | 25 | 50 | 75 | 100;

export interface IngredientCategory {
  id: number;
  name: string;
  notes: string | null;
  ingredients?: Ingredient[];
  generic_ingredient?: Ingredient | null;
}

export interface Ingredient {
  id: number;
  name: string;
  category: IngredientCategory | null;
  is_generic: boolean;
  stock_level: StockLevel;
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
  description: string | null;
  notes: string | null;
  garnish: string | null;
  glass: GlassType | null;
  source_url: string | null;
  ingredients: RecipeIngredient[];
}

export interface MenuItem {
  id: number;
  recipe: Recipe;
  order: number;
}

export interface Menu {
  id: number;
  name: string;
  is_active: boolean;
  is_published: boolean;
  share_token: string;
  theme_notes: string;
  created_at: string;
  updated_at: string;
  items: MenuItem[];
  item_count: number;
}

export interface BuyListItem {
  id: number;
  ingredient: Ingredient;
  notes: string;
  added_at: string;
}
