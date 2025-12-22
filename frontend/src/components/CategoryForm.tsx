import { useState, useEffect } from 'react';
import { createCategory, updateCategory } from '../services/cocktailsApi';
import type { IngredientCategory } from '../types/cocktails';

interface CategoryFormProps {
  category?: IngredientCategory | null;
  onClose: () => void;
  onSave: () => void;
}

const CategoryForm = ({ category, onClose, onSave }: CategoryFormProps) => {
  const [name, setName] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [createGenericIngredient, setCreateGenericIngredient] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (category) {
      setName(category.name);
      setNotes(category.notes || '');
      // Don't show checkbox for editing existing categories
      setCreateGenericIngredient(false);
    }
  }, [category]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (category) {
        // Update existing category
        await updateCategory(category.id, { name, notes });
      } else {
        // Create new category
        await createCategory({ name, notes }, createGenericIngredient);
      }
      onSave();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save category');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '600px' }}>
      <h2>{category ? 'Edit Category' : 'Create Category'}</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="name" style={{ display: 'block', marginBottom: '0.5rem' }}>
            Name <span style={{ color: 'red' }}>*</span>
          </label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="off"
            style={{ width: '100%', padding: '0.5rem', fontSize: '1rem' }}
          />
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
            style={{ width: '100%', padding: '0.5rem', fontSize: '1rem' }}
          />
        </div>

        {!category && (
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="checkbox"
                checked={createGenericIngredient}
                onChange={(e) => setCreateGenericIngredient(e.target.checked)}
              />
              <span>Create generic ingredient with same name</span>
            </label>
            <p style={{ margin: '0.25rem 0 0 1.5rem', fontSize: '0.85rem', color: '#666' }}>
              Automatically creates an ingredient with the same name as this category
            </p>
          </div>
        )}

        {error && (
          <div style={{ padding: '0.5rem', marginBottom: '1rem', backgroundColor: '#fee', color: '#c00', borderRadius: '4px' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button type="submit" disabled={loading} style={{ padding: '0.5rem 1rem' }}>
            {loading ? 'Saving...' : category ? 'Update' : 'Create'}
          </button>
          <button type="button" onClick={onClose} disabled={loading} style={{ padding: '0.5rem 1rem' }}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default CategoryForm;
