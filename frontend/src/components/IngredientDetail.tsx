import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchIngredient, updateIngredient, deleteIngredient, fetchCategories, fetchRecipes } from '../services/cocktailsApi';
import type { Ingredient, IngredientCategory } from '../types/cocktails';

const IngredientDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const ingredientId = parseInt(id || '0', 10);
  const [ingredient, setIngredient] = useState<Ingredient | null>(null);
  const [categories, setCategories] = useState<IngredientCategory[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editName, setEditName] = useState<string>('');
  const [editCategoryId, setEditCategoryId] = useState<number | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        const [ingredientData, categoriesData] = await Promise.all([
          fetchIngredient(ingredientId),
          fetchCategories(),
        ]);
        setIngredient(ingredientData);
        setCategories(categoriesData);
        setEditName(ingredientData.name);
        setEditCategoryId(ingredientData.category?.id || null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load ingredient');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [ingredientId]);

  const handleEdit = () => {
    if (ingredient) {
      setIsEditing(true);
      setEditName(ingredient.name);
      setEditCategoryId(ingredient.category?.id || null);
      setSaveError(null);
    }
  };

  const handleCancel = () => {
    if (ingredient) {
      setIsEditing(false);
      setEditName(ingredient.name);
      setEditCategoryId(ingredient.category?.id || null);
      setSaveError(null);
    }
  };

  const handleSave = async () => {
    if (!ingredient) return;

    if (!editName.trim()) {
      setSaveError('Ingredient name is required');
      return;
    }

    try {
      setSaving(true);
      setSaveError(null);
      const updatedIngredient = await updateIngredient(ingredientId, {
        name: editName.trim(),
        category_id: editCategoryId,
      });
      setIngredient(updatedIngredient);
      setIsEditing(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to update ingredient');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!ingredient) return;

    // Try to get recipe count by fetching recipes filtered by this ingredient
    let recipeCount = 0;
    try {
      const recipes = await fetchRecipes(ingredientId);
      recipeCount = recipes.length;
    } catch (err) {
      // If we can't get recipe count, proceed with basic confirmation
      console.warn('Could not fetch recipe count:', err);
    }

    let confirmMessage = 'Are you sure you want to delete this ingredient?';
    if (recipeCount > 0) {
      confirmMessage += `\n\nThis ingredient is used in ${recipeCount} recipe(s). Deleting it will remove it from those recipes.`;
    }

    if (window.confirm(confirmMessage)) {
      try {
        await deleteIngredient(ingredientId);
        navigate('/ingredients');
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Failed to delete ingredient');
      }
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Loading ingredient...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'red' }}>
        <p>Error: {error}</p>
        <button onClick={() => navigate('/ingredients')} style={{ marginTop: '1rem', padding: '0.5rem 1rem' }}>
          Back to Ingredients
        </button>
      </div>
    );
  }

  if (!ingredient) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Ingredient not found.</p>
        <button onClick={() => navigate('/ingredients')} style={{ marginTop: '1rem', padding: '0.5rem 1rem' }}>
          Back to Ingredients
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <button onClick={() => navigate('/ingredients')} style={{ marginBottom: '1rem', padding: '0.5rem 1rem' }}>
        ← Back to Ingredients
      </button>

      <h1 style={{ marginBottom: '1rem' }}>
        {isEditing ? (
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            style={{
              fontSize: '2rem',
              fontWeight: 'bold',
              padding: '0.5rem',
              border: '2px solid #007bff',
              borderRadius: '4px',
              width: '100%',
              maxWidth: '500px',
            }}
            autoFocus
          />
        ) : (
          ingredient.name
        )}
      </h1>

      {saveError && (
        <div style={{ padding: '1rem', marginBottom: '1rem', backgroundColor: '#fee', color: '#c00', borderRadius: '4px' }}>
          {saveError}
        </div>
      )}

      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ marginBottom: '0.5rem' }}>Category</h2>
        {isEditing ? (
          <select
            value={editCategoryId || ''}
            onChange={(e) => setEditCategoryId(e.target.value === '' ? null : parseInt(e.target.value, 10))}
            style={{
              padding: '0.5rem',
              fontSize: '1rem',
              border: '2px solid #007bff',
              borderRadius: '4px',
              minWidth: '200px',
            }}
          >
            <option value="">Uncategorized</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        ) : (
          <p>{ingredient.category ? ingredient.category.name : 'Uncategorized'}</p>
        )}
      </div>

      {ingredient.is_generic && (
        <div style={{ marginBottom: '2rem' }}>
          <span
            style={{
              fontSize: '0.875rem',
              backgroundColor: '#e3f2fd',
              color: '#1976d2',
              padding: '0.25rem 0.75rem',
              borderRadius: '12px',
            }}
          >
            Generic Ingredient
          </span>
        </div>
      )}

      <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
        {isEditing ? (
          <>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={handleCancel}
              disabled={saving}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.6 : 1,
              }}
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <button
              onClick={handleEdit}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Edit
            </button>
            <button
              onClick={handleDelete}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Delete
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default IngredientDetail;

