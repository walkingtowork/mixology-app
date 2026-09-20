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

export type DecorationKey =
  | 'none'
  | 'ume'
  | 'taco'
  | 'maple'
  | 'acorn'
  | 'pumpkin'
  | 'wheat';

export interface Menu {
  id: number;
  name: string;
  is_active: boolean;
  is_published: boolean;
  share_token: string;
  theme_notes: string;
  top_decoration: DecorationKey;
  bottom_decoration: DecorationKey;
  created_at: string;
  updated_at: string;
  items: MenuItem[];
  item_count: number;
}

export interface Order {
  id: number;
  recipe: Recipe;
  menu_id: number;
  guest_name: string;
  is_fulfilled: boolean;
  created_at: string;
}

export interface BuyListItem {
  id: number;
  ingredient: Ingredient;
  notes: string;
  added_at: string;
}

export interface DrinkStat {
  recipe_id: number;
  name: string;
  count: number;
  /** False for orders whose drink was removed from the menu after the fact. */
  on_menu: boolean;
}

export interface GuestStat {
  name: string;
  count: number;
  drinks: { name: string; count: number }[];
}

export interface MenuStats {
  menu_id: number;
  menu_name: string;
  total_orders: number;
  unique_guests: number;
  first_order_at: string | null;
  last_order_at: string | null;
  drinks: DrinkStat[];
  guests: GuestStat[];
}
