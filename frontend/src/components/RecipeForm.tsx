import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { fetchIngredients, createIngredient, createRecipe, updateRecipe, fetchRecipe } from '../services/cocktailsApi';
import type { Ingredient, Recipe, Unit, GlassType } from '../types/cocktails';
import { GLASS_OPTIONS } from '../types/cocktails';
import Button from './ui/Button';
import FormField from './ui/FormField';
import LoadingSpinner from './ui/LoadingSpinner';
import './RecipeForm.css';

const UNIT_OPTIONS: Unit[] = ['oz', 'ml', 'tsp', 'tbsp', 'barspoon', 'dash', 'drops', 'spritz', 'rinse', 'pinch'];

interface IngredientRow {
  ingredientId: number;
  amount: number;
  unit: Unit;
}

export default function RecipeForm() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const recipeId = id ? parseInt(id, 10) : undefined;

  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [garnish, setGarnish] = useState('');
  const [glass, setGlass] = useState<GlassType | ''>('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [rows, setRows] = useState<IngredientRow[]>([{ ingredientId: 0, amount: 0, unit: 'oz' }]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Quick-add state
  const [newIngredientName, setNewIngredientName] = useState('');
  const [addingIngredient, setAddingIngredient] = useState(false);

  useEffect(() => {
    const load = async () => {
      const ingredientsData = await fetchIngredients();
      setIngredients(ingredientsData);
      if (recipeId) {
        const recipe = await fetchRecipe(recipeId);
        setName(recipe.name);
        setDescription(recipe.description || '');
        setNotes(recipe.notes || '');
        setGarnish(recipe.garnish || '');
        setGlass((recipe.glass as GlassType | '') || '');
        setSourceUrl(recipe.source_url || '');
        setRows(recipe.ingredients.map((ri) => ({
          ingredientId: ri.ingredient.id,
          amount: ri.amount,
          unit: ri.unit,
        })));
      }
      setLoading(false);
    };
    load().catch(() => setLoading(false));
  }, [recipeId]);

  const addRow = () => setRows([...rows, { ingredientId: 0, amount: 0, unit: 'oz' }]);

  const removeRow = (i: number) => setRows(rows.filter((_, idx) => idx !== i));

  const updateRow = (i: number, field: keyof IngredientRow, value: number | string) => {
    const next = [...rows];
    if (field === 'unit') {
      next[i].unit = value as Unit;
    } else {
      (next[i][field] as number) = typeof value === 'string' ? parseFloat(value) || 0 : value;
    }
    setRows(next);
  };

  const handleQuickAdd = async () => {
    const trimmed = newIngredientName.trim();
    if (!trimmed) return;
    setAddingIngredient(true);
    try {
      const created = await createIngredient(trimmed);
      setIngredients((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setRows([...rows, { ingredientId: created.id, amount: 0, unit: 'oz' }]);
      setNewIngredientName('');
    } catch {
      // leave the name in the input so the user can see what failed
    } finally {
      setAddingIngredient(false);
    }
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Recipe name is required';
    if (rows.length === 0) e.ingredients = 'At least one ingredient is required';
    rows.forEach((r, i) => {
      if (r.ingredientId === 0) e[`ingredient_${i}`] = 'Select an ingredient';
      if (r.amount <= 0) e[`amount_${i}`] = 'Amount must be > 0';
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    setSubmitError(null);
    try {
      const recipeData: Omit<Recipe, 'id'> = {
        name: name.trim(),
        description: description.trim() || null,
        notes: notes.trim() || null,
        garnish: garnish.trim() || null,
        glass: glass || null,
        source_url: sourceUrl.trim() || null,
        ingredients: rows.map((r) => ({
          id: 0,
          ingredient: ingredients.find((ing) => ing.id === r.ingredientId)!,
          amount: r.amount,
          unit: r.unit,
        })),
      };
      const saved = recipeId
        ? await updateRecipe(recipeId, recipeData)
        : await createRecipe(recipeData);
      navigate(`/recipes/${saved.id}`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to save recipe');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner label="Loading…" />;

  return (
    <div className="recipe-form">
      <Link to={recipeId ? `/recipes/${recipeId}` : '/recipes'} className="recipe-form-back">
        ← {recipeId ? 'Back to recipe' : 'Recipes'}
      </Link>

      <h1>{recipeId ? 'Edit Recipe' : 'New Recipe'}</h1>

      {submitError && <div className="recipe-form-error">{submitError}</div>}

      <form onSubmit={handleSubmit}>
        <div className="recipe-form-fields">
          <FormField label="Recipe name" htmlFor="name" required error={errors.name}>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="off"
              autoFocus={!recipeId}
            />
          </FormField>

          <FormField label="Glass" htmlFor="glass">
            <select
              id="glass"
              value={glass}
              onChange={(e) => setGlass(e.target.value as GlassType | '')}
            >
              <option value="">No glass specified</option>
              {GLASS_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </FormField>

          <FormField label="Description" htmlFor="description">
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Guest-facing description…"
              autoComplete="off"
            />
          </FormField>

          <FormField label="Garnish" htmlFor="garnish">
            <input
              id="garnish"
              type="text"
              value={garnish}
              onChange={(e) => setGarnish(e.target.value)}
              autoComplete="off"
            />
          </FormField>

          <FormField label="Notes" htmlFor="notes">
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              autoComplete="off"
            />
          </FormField>

          <FormField label="Source URL" htmlFor="sourceUrl">
            <input
              id="sourceUrl"
              type="url"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://…"
              autoComplete="off"
            />
          </FormField>
        </div>

        <div className="recipe-form-section">
          <div className="recipe-form-section-header">
            <span className="recipe-form-section-title">
              Ingredients{errors.ingredients && (
                <span style={{ color: 'var(--color-danger)', marginLeft: 'var(--space-2)', textTransform: 'none', letterSpacing: 0 }}>
                  — {errors.ingredients}
                </span>
              )}
            </span>
            <Button type="button" variant="secondary" size="sm" onClick={addRow}>
              + Add row
            </Button>
          </div>

          <div className="ingredient-rows">
            {rows.map((row, i) => (
              <div key={i}>
                <div className="ingredient-row">
                  <select
                    value={row.ingredientId}
                    onChange={(e) => updateRow(i, 'ingredientId', parseInt(e.target.value, 10))}
                    className={errors[`ingredient_${i}`] ? 'has-error' : ''}
                  >
                    <option value={0}>Select ingredient…</option>
                    {ingredients.map((ing) => (
                      <option key={ing.id} value={ing.id}>{ing.name}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={row.amount || ''}
                    onChange={(e) => updateRow(i, 'amount', e.target.value)}
                    placeholder="0.5"
                    className={errors[`amount_${i}`] ? 'has-error' : ''}
                  />
                  <select
                    value={row.unit}
                    onChange={(e) => updateRow(i, 'unit', e.target.value)}
                  >
                    {UNIT_OPTIONS.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeRow(i)}
                    disabled={rows.length === 1}
                    style={{ color: 'var(--color-danger)' }}
                  >
                    ✕
                  </Button>
                </div>
                {(errors[`ingredient_${i}`] || errors[`amount_${i}`]) && (
                  <div className="ingredient-row-error">
                    {errors[`ingredient_${i}`] || errors[`amount_${i}`]}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="ingredient-quick-add">
            <span className="ingredient-quick-add-label">New ingredient:</span>
            <input
              type="text"
              value={newIngredientName}
              onChange={(e) => setNewIngredientName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleQuickAdd(); } }}
              placeholder="Type a name and press Enter…"
              autoComplete="off"
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleQuickAdd}
              disabled={addingIngredient || !newIngredientName.trim()}
            >
              {addingIngredient ? 'Adding…' : 'Add'}
            </Button>
          </div>
        </div>

        <div className="recipe-form-actions">
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? 'Saving…' : recipeId ? 'Update Recipe' : 'Create Recipe'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate(recipeId ? `/recipes/${recipeId}` : '/recipes')}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
