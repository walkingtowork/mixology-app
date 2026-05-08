import { useState, useEffect, useMemo } from 'react';
import { fetchRecipes, addMenuItem, createRecipe, fetchIngredients, createIngredient } from '../../services/cocktailsApi';
import type { Recipe, Ingredient, GlassType } from '../../types/cocktails';
import { GLASS_OPTIONS } from '../../types/cocktails';
import Button from '../ui/Button';
import './RecipeDrawer.css';

const UNITS = ['oz', 'ml', 'tsp', 'tbsp', 'barspoon', 'dash', 'drops', 'spritz', 'rinse', 'pinch'] as const;

interface Props {
  menuId: number;
  onClose: () => void;
  onAdded: (updatedMenu: import('../../types/cocktails').Menu) => void;
}

type Tab = 'existing' | 'new';

type IngredientRow = {
  ingredient_id: number;
  ingredient_search: string;
  amount: string;
  unit: string;
};

const EMPTY_ROW: IngredientRow = { ingredient_id: 0, ingredient_search: '', amount: '', unit: 'oz' };

function maybeAppendRow(rows: IngredientRow[], changedIndex: number): IngredientRow[] {
  if (changedIndex !== rows.length - 1) return rows;
  const last = rows[changedIndex];
  if (last.ingredient_id !== 0 && last.amount !== '') {
    return [...rows, { ...EMPTY_ROW }];
  }
  return rows;
}

interface ComboboxProps {
  ingredients: Ingredient[];
  ingredientId: number;
  query: string;
  onChange: (id: number, name: string) => void;
  onAddNew: (name: string) => void;
}

function IngredientCombobox({ ingredients, ingredientId, query, onChange, onAddNew }: ComboboxProps) {
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    if (!query) return ingredients.slice(0, 8);
    return ingredients
      .filter(i => i.name.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 8);
  }, [query, ingredients]);

  const hasExactMatch = ingredients.some(i => i.name.toLowerCase() === query.toLowerCase());

  return (
    <div className="ingredient-combobox">
      <input
        type="text"
        className="form-input"
        value={query}
        placeholder="Ingredient…"
        autoComplete="off"
        onChange={e => { onChange(0, e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && (filtered.length > 0 || (query.trim() && !hasExactMatch)) && (
        <ul className="ingredient-combobox-dropdown">
          {filtered.map(ing => (
            <li
              key={ing.id}
              className={`ingredient-combobox-option${ing.id === ingredientId ? ' selected' : ''}`}
              onMouseDown={() => { onChange(ing.id, ing.name); setOpen(false); }}
            >
              {ing.name}
            </li>
          ))}
          {query.trim() && !hasExactMatch && (
            <li
              className="ingredient-combobox-option ingredient-combobox-add"
              onMouseDown={() => { onAddNew(query.trim()); setOpen(false); }}
            >
              + Add "{query.trim()}"
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

export default function RecipeDrawer({ menuId, onClose, onAdded }: Props) {
  const [tab, setTab] = useState<Tab>('existing');
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newGarnish, setNewGarnish] = useState('');
  const [newGlass, setNewGlass] = useState<GlassType | ''>('');
  const [newRows, setNewRows] = useState<IngredientRow[]>([{ ...EMPTY_ROW }]);

  useEffect(() => {
    Promise.all([fetchRecipes(), fetchIngredients()])
      .then(([r, i]) => { setRecipes(r); setIngredients(i); })
      .finally(() => setLoading(false));
  }, []);

  function drawerCardStockClass(recipe: Recipe) {
    const worst = recipe.ingredients.reduce(
      (min, ri) => Math.min(min, ri.ingredient.stock_level), 100
    );
    if (worst === 0) return 'drawer-recipe-item--stock-out';
    if (worst <= 25) return 'drawer-recipe-item--stock-low';
    return '';
  }

  const q = search.toLowerCase().trim();
  const filtered = !q ? recipes : recipes.filter((r) => {
    if (r.name.toLowerCase().includes(q)) return true;
    return r.ingredients.some((ri) => {
      if (ri.ingredient.name.toLowerCase().includes(q)) return true;
      const fullIng = ingredients.find((i) => i.id === ri.ingredient.id);
      return fullIng?.category?.name.toLowerCase().includes(q) ?? false;
    });
  });

  const handleSelectExisting = async (recipe: Recipe) => {
    setSaving(true);
    setError(null);
    try {
      const updated = await addMenuItem(menuId, recipe.id);
      onAdded(updated);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add recipe.');
      setSaving(false);
    }
  };

  const handleAddNewIngredient = async (name: string, rowIndex: number) => {
    try {
      const ing = await createIngredient(name, { stock_level: 100 });
      setIngredients(prev => [...prev, ing]);
      setNewRows(prev => {
        const updated = prev.map((r, j) =>
          j === rowIndex ? { ...r, ingredient_id: ing.id, ingredient_search: ing.name } : r
        );
        return maybeAppendRow(updated, rowIndex);
      });
    } catch {
      setError('Failed to create ingredient.');
    }
  };

  const handleCreateRecipe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const recipe = await createRecipe({
        name: newName.trim(),
        description: newDescription,
        notes: newNotes,
        garnish: newGarnish,
        glass: newGlass || null,
        source_url: null,
        ingredients: newRows
          .filter((r) => r.ingredient_id && r.amount)
          .map((r) => ({
            id: 0,
            ingredient: ingredients.find((i) => i.id === r.ingredient_id)!,
            amount: parseFloat(r.amount),
            unit: r.unit as any,
          })),
      });
      const updated = await addMenuItem(menuId, recipe.id);
      onAdded(updated);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create recipe.');
      setSaving(false);
    }
  };

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <div className="drawer">
        <div className="drawer-header">
          <h2>Add a Drink</h2>
          <button className="drawer-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="drawer-tabs">
          <button
            className={`drawer-tab ${tab === 'existing' ? 'active' : ''}`}
            onClick={() => setTab('existing')}
          >
            Existing Recipe
          </button>
          <button
            className={`drawer-tab ${tab === 'new' ? 'active' : ''}`}
            onClick={() => setTab('new')}
          >
            New Recipe
          </button>
        </div>

        <div className="drawer-body">
          {error && <p className="drawer-error">{error}</p>}

          {tab === 'existing' && (
            <>
              <input
                type="search"
                className="drawer-search"
                placeholder="Search recipes…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
              />
              {loading ? (
                <p className="drawer-loading">Loading…</p>
              ) : (
                <ul className="drawer-recipe-list">
                  {filtered.map((recipe) => (
                    <li key={recipe.id}>
                      <button
                        className={`drawer-recipe-item ${drawerCardStockClass(recipe)}`}
                        onClick={() => handleSelectExisting(recipe)}
                        disabled={saving}
                      >
                        <span className="drawer-recipe-name">{recipe.name}</span>
                        <div className="drawer-recipe-chips">
                          {recipe.ingredients.map((ri) => {
                            const chipClass = ri.ingredient.stock_level === 0
                              ? 'drawer-recipe-chip--out'
                              : ri.ingredient.stock_level <= 25
                              ? 'drawer-recipe-chip--low'
                              : '';
                            return (
                              <span key={ri.id} className={`drawer-recipe-chip ${chipClass}`}>
                                {ri.ingredient.name}
                              </span>
                            );
                          })}
                          {recipe.ingredients.length === 0 && (
                            <span className="drawer-recipe-chip-empty">No ingredients listed</span>
                          )}
                        </div>
                      </button>
                    </li>
                  ))}
                  {filtered.length === 0 && (
                    <li className="drawer-empty">No recipes match "{search}"</li>
                  )}
                </ul>
              )}
            </>
          )}

          {tab === 'new' && (
            <form onSubmit={handleCreateRecipe} className="drawer-new-recipe">
              <div className="drawer-field">
                <label className="form-label">Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Recipe name"
                  autoFocus
                />
              </div>

              <div className="drawer-field">
                <label className="form-label">Glass</label>
                <select
                  className="form-select"
                  value={newGlass}
                  onChange={(e) => setNewGlass(e.target.value as GlassType | '')}
                >
                  <option value="">No glass specified</option>
                  {GLASS_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              <div className="drawer-field">
                <label className="form-label">Description</label>
                <textarea
                  className="form-input"
                  rows={2}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Guest-facing description…"
                />
              </div>

              <div className="drawer-field">
                <label className="form-label">Ingredients</label>
                <div className="drawer-ingredients-card">
                  {newRows.map((row, i) => (
                    <div key={i} className="drawer-ingredient-row">
                      <IngredientCombobox
                        ingredients={ingredients}
                        ingredientId={row.ingredient_id}
                        query={row.ingredient_search}
                        onChange={(id, name) => {
                          setNewRows(prev => {
                            const updated = prev.map((r, j) =>
                              j === i ? { ...r, ingredient_id: id, ingredient_search: name } : r
                            );
                            return id !== 0 ? maybeAppendRow(updated, i) : updated;
                          });
                        }}
                        onAddNew={(name) => handleAddNewIngredient(name, i)}
                      />
                      <input
                        type="text"
                        inputMode="decimal"
                        className="form-input"
                        placeholder="0.5"
                        value={row.amount}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNewRows(prev => {
                            const updated = prev.map((r, j) => j === i ? { ...r, amount: val } : r);
                            return maybeAppendRow(updated, i);
                          });
                        }}
                      />
                      <select
                        className="form-select"
                        value={row.unit}
                        onChange={(e) =>
                          setNewRows(prev =>
                            prev.map((r, j) => j === i ? { ...r, unit: e.target.value } : r)
                          )
                        }
                      >
                        {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                      </select>
                      <button
                        type="button"
                        className="drawer-row-delete"
                        style={{ visibility: newRows.length > 1 ? 'visible' : 'hidden' }}
                        onClick={() => setNewRows(prev => prev.filter((_, j) => j !== i))}
                        aria-label="Remove ingredient"
                      >✕</button>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="drawer-add-row"
                    onClick={() => setNewRows(prev => [...prev, { ...EMPTY_ROW }])}
                  >
                    + Add row
                  </button>
                </div>
              </div>

              <div className="drawer-field">
                <label className="form-label">Garnish</label>
                <input
                  type="text"
                  className="form-input"
                  value={newGarnish}
                  onChange={(e) => setNewGarnish(e.target.value)}
                  placeholder="Optional garnish…"
                />
              </div>

              <div className="drawer-field">
                <label className="form-label">Notes</label>
                <textarea
                  className="form-input"
                  rows={2}
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Optional notes…"
                />
              </div>

              <div className="drawer-actions">
                <Button type="submit" variant="primary" disabled={saving || !newName.trim()}>
                  {saving ? 'Saving…' : 'Create & Add to Menu'}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
