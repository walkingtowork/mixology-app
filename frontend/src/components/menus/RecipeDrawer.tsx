import { useState, useEffect } from 'react';
import { fetchRecipes, addMenuItem, createRecipe, fetchIngredients, createIngredient } from '../../services/cocktailsApi';
import type { Recipe, Ingredient } from '../../types/cocktails';
import Button from '../ui/Button';
import './RecipeDrawer.css';

const UNITS = ['oz', 'ml', 'tsp', 'tbsp', 'barspoon', 'dash', 'drops', 'spritz', 'rinse', 'pinch'] as const;

interface Props {
  menuId: number;
  onClose: () => void;
  onAdded: (updatedMenu: import('../../types/cocktails').Menu) => void;
}

type Tab = 'existing' | 'new';

export default function RecipeDrawer({ menuId, onClose, onAdded }: Props) {
  const [tab, setTab] = useState<Tab>('existing');
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New recipe form state
  const [newName, setNewName] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newGarnish, setNewGarnish] = useState('');
  const [newRows, setNewRows] = useState([{ ingredient_id: 0, amount: '', unit: 'oz' as string }]);
  const [quickAdd, setQuickAdd] = useState('');

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

  const handleQuickAddIngredient = async () => {
    const name = quickAdd.trim();
    if (!name) return;
    try {
      const ing = await createIngredient(name, { stock_level: 100 });
      setIngredients((prev) => [...prev, ing]);
      setNewRows((prev) => [...prev, { ingredient_id: ing.id, amount: '', unit: 'oz' }]);
      setQuickAdd('');
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
        notes: newNotes,
        garnish: newGarnish,
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
              <label className="form-label">Name</label>
              <input
                type="text"
                className="form-input"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Recipe name"
                autoFocus
              />

              <label className="form-label">Ingredients</label>
              {newRows.map((row, i) => (
                <div key={i} className="drawer-ingredient-row">
                  <select
                    className="form-select"
                    value={row.ingredient_id}
                    onChange={(e) =>
                      setNewRows((prev) =>
                        prev.map((r, j) => j === i ? { ...r, ingredient_id: Number(e.target.value) } : r)
                      )
                    }
                  >
                    <option value={0}>Select ingredient…</option>
                    {ingredients.map((ing) => (
                      <option key={ing.id} value={ing.id}>{ing.name}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="Amt"
                    min="0.01"
                    step="0.25"
                    value={row.amount}
                    onChange={(e) =>
                      setNewRows((prev) =>
                        prev.map((r, j) => j === i ? { ...r, amount: e.target.value } : r)
                      )
                    }
                  />
                  <select
                    className="form-select"
                    value={row.unit}
                    onChange={(e) =>
                      setNewRows((prev) =>
                        prev.map((r, j) => j === i ? { ...r, unit: e.target.value } : r)
                      )
                    }
                  >
                    {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => setNewRows((prev) => prev.filter((_, j) => j !== i))}
                  >✕</button>
                </div>
              ))}

              <div className="drawer-quick-add">
                <input
                  type="text"
                  className="form-input"
                  placeholder="Quick-add new ingredient…"
                  value={quickAdd}
                  onChange={(e) => setQuickAdd(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleQuickAddIngredient(); } }}
                />
                <Button type="button" variant="secondary" size="sm" onClick={handleQuickAddIngredient}>Add</Button>
              </div>

              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setNewRows((prev) => [...prev, { ingredient_id: 0, amount: '', unit: 'oz' }])}
              >
                + Add row
              </button>

              <label className="form-label">Notes</label>
              <textarea
                className="form-input"
                rows={2}
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder="Optional notes…"
              />

              <label className="form-label">Garnish</label>
              <input
                type="text"
                className="form-input"
                value={newGarnish}
                onChange={(e) => setNewGarnish(e.target.value)}
                placeholder="Optional garnish…"
              />

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
