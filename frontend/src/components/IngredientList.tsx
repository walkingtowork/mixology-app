import { useState, useEffect } from 'react';
import { fetchIngredients } from '../services/cocktailsApi';
import type { Ingredient } from '../types/cocktails';

const IngredientList = () => {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadIngredients = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchIngredients();
        setIngredients(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load ingredients');
      } finally {
        setLoading(false);
      }
    };

    loadIngredients();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Loading ingredients...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'red' }}>
        <p>Error: {error}</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Ingredients</h2>
      {ingredients.length === 0 ? (
        <p>No ingredients found.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {ingredients.map((ingredient) => (
            <li key={ingredient.id} style={{ padding: '0.5rem 0', borderBottom: '1px solid #eee' }}>
              {ingredient.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default IngredientList;

