import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchIngredients, createRecipe, updateRecipe, fetchRecipe } from '../services/cocktailsApi';
import type { Ingredient, Recipe, Unit } from '../types/cocktails';

const UNIT_OPTIONS: Unit[] = ['oz', 'ml', 'tsp', 'tbsp', 'barspoon', 'dash', 'drops', 'spritz', 'rinse', 'pinch'];

const RecipeForm = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const recipeId = id ? parseInt(id, 10) : undefined;
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [name, setName] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [garnish, setGarnish] = useState<string>('');
  const [sourceUrl, setSourceUrl] = useState<string>('');
  const [recipeIngredients, setRecipeIngredients] = useState<Array<{
    ingredientId: number;
    amount: number;
    unit: Unit;
  }>>([{ ingredientId: 0, amount: 0, unit: 'oz' }]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const ingredientsData = await fetchIngredients();
        setIngredients(ingredientsData);

        if (recipeId) {
          const recipeData = await fetchRecipe(recipeId);
          setName(recipeData.name);
          setNotes(recipeData.notes || '');
          setGarnish(recipeData.garnish || '');
          setSourceUrl(recipeData.source_url || '');
          setRecipeIngredients(
            recipeData.ingredients.map((ri) => ({
              ingredientId: ri.ingredient.id,
              amount: ri.amount,
              unit: ri.unit,
            }))
          );
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [recipeId]);

  const addIngredient = () => {
    setRecipeIngredients([...recipeIngredients, { ingredientId: 0, amount: 0, unit: 'oz' }]);
  };

  const removeIngredient = (index: number) => {
    const newIngredients = recipeIngredients.filter((_, i) => i !== index);
    setRecipeIngredients(newIngredients);
  };

  const updateIngredient = (index: number, field: 'ingredientId' | 'amount' | 'unit', value: number | string) => {
    const newIngredients = [...recipeIngredients];
    if (field === 'ingredientId' || field === 'amount') {
      newIngredients[index][field] = typeof value === 'number' ? value : parseFloat(value);
    } else {
      newIngredients[index][field] = value as Unit;
    }
    setRecipeIngredients(newIngredients);
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'Recipe name is required';
    }

    if (recipeIngredients.length === 0) {
      newErrors.ingredients = 'Recipe must have at least one ingredient';
    }

    recipeIngredients.forEach((ri, index) => {
      if (ri.ingredientId === 0) {
        newErrors[`ingredient_${index}`] = 'Please select an ingredient';
      }
      if (ri.amount <= 0) {
        newErrors[`amount_${index}`] = 'Amount must be greater than 0';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const recipeData: Omit<Recipe, 'id'> = {
        name: name.trim(),
        notes: notes.trim() || null,
        garnish: garnish.trim() || null,
        source_url: sourceUrl.trim() || null,
        ingredients: recipeIngredients.map((ri) => ({
          id: 0, // Will be assigned by backend
          ingredient: ingredients.find((ing) => ing.id === ri.ingredientId)!,
          amount: ri.amount,
          unit: ri.unit,
        })),
      };

      let savedRecipe: Recipe;
      if (recipeId) {
        savedRecipe = await updateRecipe(recipeId, recipeData);
      } else {
        savedRecipe = await createRecipe(recipeData);
      }

      // Navigate to recipe detail page after save
      navigate(`/recipes/${savedRecipe.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save recipe');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1>{recipeId ? 'Edit Recipe' : 'Create Recipe'}</h1>

      {error && (
        <div style={{ padding: '1rem', marginBottom: '1rem', backgroundColor: '#fee', color: '#c00', borderRadius: '4px' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="name" style={{ display: 'block', marginBottom: '0.5rem' }}>
            Recipe Name <span style={{ color: 'red' }}>*</span>
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="off"
            style={{
              width: '100%',
              padding: '0.5rem',
              border: errors.name ? '2px solid red' : '1px solid #ddd',
              borderRadius: '4px',
            }}
          />
          {errors.name && <p style={{ color: 'red', margin: '0.25rem 0 0 0', fontSize: '0.875rem' }}>{errors.name}</p>}
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="notes" style={{ display: 'block', marginBottom: '0.5rem' }}>
            Notes
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            autoComplete="off"
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #ddd',
              borderRadius: '4px',
            }}
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="garnish" style={{ display: 'block', marginBottom: '0.5rem' }}>
            Garnish
          </label>
          <input
            id="garnish"
            type="text"
            value={garnish}
            onChange={(e) => setGarnish(e.target.value)}
            autoComplete="off"
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #ddd',
              borderRadius: '4px',
            }}
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="sourceUrl" style={{ display: 'block', marginBottom: '0.5rem' }}>
            Source URL
          </label>
          <input
            id="sourceUrl"
            type="url"
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            placeholder="https://..."
            autoComplete="off"
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #ddd',
              borderRadius: '4px',
            }}
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <label>
              Ingredients <span style={{ color: 'red' }}>*</span>
            </label>
            <button
              type="button"
              onClick={addIngredient}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              + Add Ingredient
            </button>
          </div>
          {errors.ingredients && (
            <p style={{ color: 'red', margin: '0 0 0.5rem 0', fontSize: '0.875rem' }}>{errors.ingredients}</p>
          )}

          {recipeIngredients.map((ri, index) => (
            <div
              key={index}
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr 1fr auto',
                gap: '0.5rem',
                marginBottom: '0.5rem',
                alignItems: 'start',
              }}
            >
              <div>
                <select
                  value={ri.ingredientId}
                  onChange={(e) => updateIngredient(index, 'ingredientId', parseInt(e.target.value, 10))}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: errors[`ingredient_${index}`] ? '2px solid red' : '1px solid #ddd',
                    borderRadius: '4px',
                  }}
                >
                  <option value={0}>Select ingredient...</option>
                  {ingredients.map((ing) => (
                    <option key={ing.id} value={ing.id}>
                      {ing.name}
                    </option>
                  ))}
                </select>
                {errors[`ingredient_${index}`] && (
                  <p style={{ color: 'red', margin: '0.25rem 0 0 0', fontSize: '0.875rem' }}>
                    {errors[`ingredient_${index}`]}
                  </p>
                )}
              </div>

              <div>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={ri.amount || ''}
                  onChange={(e) => updateIngredient(index, 'amount', parseFloat(e.target.value) || 0)}
                  placeholder="Amount"
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: errors[`amount_${index}`] ? '2px solid red' : '1px solid #ddd',
                    borderRadius: '4px',
                  }}
                />
                {errors[`amount_${index}`] && (
                  <p style={{ color: 'red', margin: '0.25rem 0 0 0', fontSize: '0.875rem' }}>
                    {errors[`amount_${index}`]}
                  </p>
                )}
              </div>

              <div>
                <select
                  value={ri.unit}
                  onChange={(e) => updateIngredient(index, 'unit', e.target.value as Unit)}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                  }}
                >
                  {UNIT_OPTIONS.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={() => removeIngredient(index)}
                disabled={recipeIngredients.length === 1}
                style={{
                  padding: '0.5rem',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: recipeIngredients.length === 1 ? 'not-allowed' : 'pointer',
                  opacity: recipeIngredients.length === 1 ? 0.5 : 1,
                }}
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
          <button
            type="submit"
            disabled={saving}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? 'Saving...' : recipeId ? 'Update Recipe' : 'Create Recipe'}
          </button>
          <button
            type="button"
            onClick={() => {
              if (recipeId) {
                navigate(`/recipes/${recipeId}`);
              } else {
                navigate('/recipes');
              }
            }}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default RecipeForm;

