import { useState, useEffect, useMemo } from 'react';
import { fetchIngredients, createIngredient, updateRecipe } from '../../services/cocktailsApi';
import type { Recipe, Ingredient, GlassType } from '../../types/cocktails';
import { GLASS_OPTIONS } from '../../types/cocktails';
import Button from '../ui/Button';
import './RecipeDrawer.css';

const UNITS = ['oz', 'ml', 'tsp', 'tbsp', 'barspoon', 'dash', 'drops', 'spritz', 'rinse', 'pinch'] as const;

interface Props {
  recipe: Recipe;
  onClose: () => void;
  onSaved: (recipe: Recipe) => void;
}

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

function recipeToRows(recipe: Recipe): IngredientRow[] {
  const rows = recipe.ingredients.map(ri => ({
    ingredient_id: ri.ingredient.id,
    ingredient_search: ri.ingredient.name,
    amount: String(ri.amount),
    unit: ri.unit,
  }));
  return [...rows, { ...EMPTY_ROW }];
}

export default function EditRecipeDrawer({ recipe, onClose, onSaved }: Props) {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(recipe.name);
  const [description, setDescription] = useState(recipe.description ?? '');
  const [notes, setNotes] = useState(recipe.notes ?? '');
  const [garnish, setGarnish] = useState(recipe.garnish ?? '');
  const [glass, setGlass] = useState<GlassType | ''>(recipe.glass ?? '');
  const [rows, setRows] = useState<IngredientRow[]>(() => recipeToRows(recipe));

  useEffect(() => {
    fetchIngredients().then(setIngredients);
  }, []);

  const handleAddNewIngredient = async (name: string, rowIndex: number) => {
    try {
      const ing = await createIngredient(name, { stock_level: 100 });
      setIngredients(prev => [...prev, ing]);
      setRows(prev => {
        const updated = prev.map((r, j) =>
          j === rowIndex ? { ...r, ingredient_id: ing.id, ingredient_search: ing.name } : r
        );
        return maybeAppendRow(updated, rowIndex);
      });
    } catch {
      setError('Failed to create ingredient.');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await updateRecipe(recipe.id, {
        name: name.trim(),
        description,
        notes,
        garnish,
        glass: glass || null,
        ingredients: rows
          .filter(r => r.ingredient_id && r.amount)
          .map(r => ({
            id: 0,
            ingredient: ingredients.find(i => i.id === r.ingredient_id)!,
            amount: parseFloat(r.amount),
            unit: r.unit as any,
          })),
      });
      onSaved(updated);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save recipe.');
      setSaving(false);
    }
  };

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <div className="drawer">
        <div className="drawer-header">
          <h2>Edit Recipe</h2>
          <button className="drawer-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="drawer-body">
          {error && <p className="drawer-error">{error}</p>}

          <form onSubmit={handleSave} className="drawer-new-recipe">
            <div className="drawer-field">
              <label className="form-label">Name</label>
              <input
                type="text"
                className="form-input"
                value={name}
                onChange={e => setName(e.target.value)}
                autoFocus
              />
            </div>

            <div className="drawer-field">
              <label className="form-label">Glass</label>
              <select
                className="form-select"
                value={glass}
                onChange={e => setGlass(e.target.value as GlassType | '')}
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
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Guest-facing description…"
              />
            </div>

            <div className="drawer-field">
              <label className="form-label">Ingredients</label>
              <div className="drawer-ingredients-card">
                {rows.map((row, i) => (
                  <div key={i} className="drawer-ingredient-row">
                    <IngredientCombobox
                      ingredients={ingredients}
                      ingredientId={row.ingredient_id}
                      query={row.ingredient_search}
                      onChange={(id, nm) => {
                        setRows(prev => {
                          const updated = prev.map((r, j) =>
                            j === i ? { ...r, ingredient_id: id, ingredient_search: nm } : r
                          );
                          return id !== 0 ? maybeAppendRow(updated, i) : updated;
                        });
                      }}
                      onAddNew={nm => handleAddNewIngredient(nm, i)}
                    />
                    <input
                      type="text"
                      inputMode="decimal"
                      className="form-input"
                      placeholder="0.5"
                      value={row.amount}
                      onChange={e => {
                        const val = e.target.value;
                        setRows(prev => {
                          const updated = prev.map((r, j) => j === i ? { ...r, amount: val } : r);
                          return maybeAppendRow(updated, i);
                        });
                      }}
                    />
                    <select
                      className="form-select"
                      value={row.unit}
                      onChange={e => setRows(prev => prev.map((r, j) => j === i ? { ...r, unit: e.target.value } : r))}
                    >
                      {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                    <button
                      type="button"
                      className="drawer-row-delete"
                      style={{ visibility: rows.length > 1 ? 'visible' : 'hidden' }}
                      onClick={() => setRows(prev => prev.filter((_, j) => j !== i))}
                      aria-label="Remove ingredient"
                    >✕</button>
                  </div>
                ))}
                <button
                  type="button"
                  className="drawer-add-row"
                  onClick={() => setRows(prev => [...prev, { ...EMPTY_ROW }])}
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
                value={garnish}
                onChange={e => setGarnish(e.target.value)}
                placeholder="Optional garnish…"
              />
            </div>

            <div className="drawer-field">
              <label className="form-label">Notes</label>
              <textarea
                className="form-input"
                rows={2}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Internal notes…"
              />
            </div>

            <div className="drawer-actions">
              <Button type="submit" variant="primary" disabled={saving || !name.trim()}>
                {saving ? 'Saving…' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
