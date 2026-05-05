import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchIngredients, fetchCategories } from '../services/cocktailsApi';
import type { Ingredient, IngredientCategory } from '../types/cocktails';
import LoadingSpinner from './ui/LoadingSpinner';
import './IngredientList.css';

export default function IngredientList() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [categories, setCategories] = useState<IngredientCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchIngredients(), fetchCategories()])
      .then(([ing, cat]) => { setIngredients(ing); setCategories(cat); })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner label="Loading ingredients…" />;

  if (error) {
    return <div className="ingredient-list" style={{ color: 'var(--color-danger)' }}>{error}</div>;
  }

  const byCategory = new Map<number, Ingredient[]>();
  const uncategorized: Ingredient[] = [];

  ingredients.forEach((ing) => {
    if (ing.category) {
      const group = byCategory.get(ing.category.id) ?? [];
      group.push(ing);
      byCategory.set(ing.category.id, group);
    } else {
      uncategorized.push(ing);
    }
  });

  const categoryName = (id: number) =>
    categories.find((c) => c.id === id)?.name ?? 'Unknown';

  const renderGroup = (title: string, items: Ingredient[]) => (
    <div key={title} className="ingredient-group">
      <div className="ingredient-group-title">{title}</div>
      <ul className="ingredient-items">
        {items.map((ing) => (
          <li key={ing.id} className="ingredient-item">
            <Link to={`/ingredients/${ing.id}`}>{ing.name}</Link>
            {ing.is_generic && <span className="ingredient-badge">Generic</span>}
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <div className="ingredient-list">
      <div className="ingredient-list-header">
        <h2>Ingredients</h2>
      </div>

      {ingredients.length === 0 ? (
        <p style={{ color: 'var(--color-text-secondary)' }}>No ingredients yet.</p>
      ) : (
        <>
          {Array.from(byCategory.entries()).map(([id, items]) =>
            renderGroup(categoryName(id), items)
          )}
          {uncategorized.length > 0 && renderGroup('Uncategorized', uncategorized)}
        </>
      )}
    </div>
  );
}
