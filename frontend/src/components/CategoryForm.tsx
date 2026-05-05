import { useState, useEffect } from 'react';
import { createCategory, updateCategory } from '../services/cocktailsApi';
import type { IngredientCategory } from '../types/cocktails';
import Button from './ui/Button';
import FormField from './ui/FormField';
import './CategoryForm.css';

interface CategoryFormProps {
  category?: IngredientCategory | null;
  onClose: () => void;
  onSave: () => void;
}

export default function CategoryForm({ category, onClose, onSave }: CategoryFormProps) {
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [createGenericIngredient, setCreateGenericIngredient] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (category) {
      setName(category.name);
      setNotes(category.notes || '');
    }
  }, [category]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      if (category) {
        await updateCategory(category.id, { name, notes });
      } else {
        await createCategory({ name, notes }, createGenericIngredient);
      }
      onSave();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save category');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="category-form">
      <h2>{category ? 'Edit Category' : 'New Category'}</h2>

      {error && <div className="category-form-error">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="category-form-fields">
          <FormField label="Name" htmlFor="cat-name" required>
            <input
              id="cat-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="off"
              autoFocus
              required
            />
          </FormField>

          <FormField label="Notes" htmlFor="cat-notes">
            <textarea
              id="cat-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              autoComplete="off"
            />
          </FormField>

          {!category && (
            <div className="category-form-checkbox">
              <label className="category-form-checkbox-row">
                <input
                  type="checkbox"
                  checked={createGenericIngredient}
                  onChange={(e) => setCreateGenericIngredient(e.target.checked)}
                />
                Create a generic ingredient with the same name
              </label>
              <p className="category-form-checkbox-hint">
                Useful for recipes that specify a category (e.g. "any Bourbon") rather than a specific brand.
              </p>
            </div>
          )}
        </div>

        <div className="category-form-actions">
          <Button type="submit" variant="primary" disabled={saving || !name.trim()}>
            {saving ? 'Saving…' : category ? 'Update' : 'Create'}
          </Button>
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
