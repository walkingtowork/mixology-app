import { useState, useEffect } from 'react';
import { fetchCategories, deleteCategory } from '../services/cocktailsApi';
import type { IngredientCategory } from '../types/cocktails';
import Button from './ui/Button';
import LoadingSpinner from './ui/LoadingSpinner';
import CategoryForm from './CategoryForm';
import './CategoryList.css';

export default function CategoryList() {
  const [categories, setCategories] = useState<IngredientCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<IngredientCategory | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      setCategories(await fetchCategories());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleEdit = (cat: IngredientCategory) => {
    setEditing(cat);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditing(null);
    load();
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteCategory(id);
      setConfirmDeleteId(null);
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete category');
    }
  };

  if (showForm) {
    return <CategoryForm category={editing} onClose={handleFormClose} onSave={handleFormClose} />;
  }

  if (loading) return <LoadingSpinner label="Loading categories…" />;

  if (error) {
    return (
      <div className="category-list">
        <p style={{ color: 'var(--color-danger)' }}>{error}</p>
        <Button variant="secondary" onClick={load} style={{ marginTop: 'var(--space-4)' }}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="category-list">
      <div className="category-list-header">
        <h2>Categories</h2>
        <Button variant="primary" onClick={() => { setEditing(null); setShowForm(true); }}>
          + New Category
        </Button>
      </div>

      {categories.length === 0 ? (
        <div className="category-list-empty">
          No categories yet. Create one to get started.
        </div>
      ) : (
        <div className="category-cards">
          {categories.map((cat) => (
            <div key={cat.id} className="category-card">
              <div className="category-card-body">
                <div className="category-card-name">{cat.name}</div>
                {cat.notes && <div className="category-card-notes">{cat.notes}</div>}
                <div className="category-card-meta">
                  <span>{cat.ingredients?.length ?? 0} ingredient{cat.ingredients?.length !== 1 ? 's' : ''}</span>
                  {cat.generic_ingredient && (
                    <span>Generic: {cat.generic_ingredient.name}</span>
                  )}
                </div>
              </div>
              <div className="category-card-actions">
                <Button variant="secondary" size="sm" onClick={() => handleEdit(cat)}>Edit</Button>
                {confirmDeleteId === cat.id ? (
                  <>
                    <Button variant="danger" size="sm" onClick={() => handleDelete(cat.id)}>Confirm</Button>
                    <Button variant="ghost" size="sm" onClick={() => setConfirmDeleteId(null)}>Cancel</Button>
                  </>
                ) : (
                  <Button variant="ghost" size="sm" onClick={() => setConfirmDeleteId(cat.id)}
                    style={{ color: 'var(--color-danger)' }}>
                    Delete
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
