import { useState, useEffect } from 'react';
import { fetchCategories, deleteCategory } from '../services/cocktailsApi';
import type { IngredientCategory } from '../types/cocktails';
import CategoryForm from './CategoryForm';

interface CategoryListProps {
  onCategorySelect?: (categoryId: number) => void;
}

const CategoryList = ({ onCategorySelect }: CategoryListProps) => {
  const [categories, setCategories] = useState<IngredientCategory[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState<boolean>(false);
  const [editingCategory, setEditingCategory] = useState<IngredientCategory | null>(null);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchCategories();
      setCategories(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingCategory(null);
    setShowForm(true);
  };

  const handleEdit = (category: IngredientCategory) => {
    setEditingCategory(category);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this category?')) {
      return;
    }

    try {
      await deleteCategory(id);
      await loadCategories();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete category');
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingCategory(null);
    loadCategories();
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Loading categories...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'red' }}>
        <p>Error: {error}</p>
        <button onClick={loadCategories}>Retry</button>
      </div>
    );
  }

  if (showForm) {
    return (
      <CategoryForm
        category={editingCategory}
        onClose={handleFormClose}
        onSave={handleFormClose}
      />
    );
  }

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2>Ingredient Categories</h2>
        <button onClick={handleCreate}>Create Category</button>
      </div>
      {categories.length === 0 ? (
        <p>No categories found. Create one to get started!</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {categories.map((category) => (
            <li
              key={category.id}
              style={{
                padding: '1rem',
                marginBottom: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                backgroundColor: '#f9f9f9',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <h3
                    style={{ margin: 0, marginBottom: '0.5rem', cursor: onCategorySelect ? 'pointer' : 'default' }}
                    onClick={() => onCategorySelect?.(category.id)}
                  >
                    {category.name}
                  </h3>
                  {category.notes && (
                    <p style={{ margin: 0, color: '#666', fontSize: '0.9rem' }}>{category.notes}</p>
                  )}
                  <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#888' }}>
                    {category.ingredients?.length || 0} ingredient{category.ingredients?.length !== 1 ? 's' : ''}
                    {category.generic_ingredient && (
                      <span style={{ marginLeft: '1rem' }}>
                        (Generic: {category.generic_ingredient.name})
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => handleEdit(category)}>Edit</button>
                  <button onClick={() => handleDelete(category.id)}>Delete</button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default CategoryList;
