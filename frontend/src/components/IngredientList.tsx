import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchIngredients, fetchCategories } from '../services/cocktailsApi';
import type { Ingredient, IngredientCategory } from '../types/cocktails';

const IngredientList = () => {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [categories, setCategories] = useState<IngredientCategory[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        const [ingredientsData, categoriesData] = await Promise.all([
          fetchIngredients(),
          fetchCategories(),
        ]);
        setIngredients(ingredientsData);
        setCategories(categoriesData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load ingredients');
      } finally {
        setLoading(false);
      }
    };

    loadData();
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

  // Group ingredients by category
  const ingredientsByCategory = new Map<number | null, Ingredient[]>();
  const uncategorized: Ingredient[] = [];

  ingredients.forEach((ingredient) => {
    if (ingredient.category) {
      const categoryId = ingredient.category.id;
      if (!ingredientsByCategory.has(categoryId)) {
        ingredientsByCategory.set(categoryId, []);
      }
      ingredientsByCategory.get(categoryId)!.push(ingredient);
    } else {
      uncategorized.push(ingredient);
    }
  });

  // Get category name by ID
  const getCategoryName = (categoryId: number | null): string => {
    if (categoryId === null) return 'Uncategorized';
    const category = categories.find((c) => c.id === categoryId);
    return category?.name || 'Unknown Category';
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Ingredients</h2>
      {ingredients.length === 0 ? (
        <p>No ingredients found.</p>
      ) : (
        <div>
          {/* Grouped by category */}
          {Array.from(ingredientsByCategory.entries()).map(([categoryId, categoryIngredients]) => (
            <div key={categoryId || 'uncategorized'} style={{ marginBottom: '2rem' }}>
              <h3 style={{ marginBottom: '0.5rem', color: '#333', borderBottom: '2px solid #ddd', paddingBottom: '0.5rem' }}>
                {getCategoryName(categoryId)}
              </h3>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {categoryIngredients.map((ingredient) => (
                  <li
                    key={ingredient.id}
                    style={{
                      padding: '0.5rem 0',
                      paddingLeft: '1rem',
                      borderBottom: '1px solid #eee',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    <Link
                      to={`/ingredients/${ingredient.id}`}
                      style={{
                        textDecoration: 'none',
                        color: '#007bff',
                        flex: 1,
                        cursor: 'pointer',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.textDecoration = 'underline';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.textDecoration = 'none';
                      }}
                    >
                      {ingredient.name}
                    </Link>
                    {ingredient.is_generic && (
                      <span
                        style={{
                          fontSize: '0.75rem',
                          backgroundColor: '#e3f2fd',
                          color: '#1976d2',
                          padding: '0.125rem 0.5rem',
                          borderRadius: '12px',
                        }}
                      >
                        Generic
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Uncategorized ingredients */}
          {uncategorized.length > 0 && (
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ marginBottom: '0.5rem', color: '#333', borderBottom: '2px solid #ddd', paddingBottom: '0.5rem' }}>
                Uncategorized
              </h3>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {uncategorized.map((ingredient) => (
                  <li
                    key={ingredient.id}
                    style={{
                      padding: '0.5rem 0',
                      paddingLeft: '1rem',
                      borderBottom: '1px solid #eee',
                    }}
                  >
                    <Link
                      to={`/ingredients/${ingredient.id}`}
                      style={{
                        textDecoration: 'none',
                        color: '#007bff',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.textDecoration = 'underline';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.textDecoration = 'none';
                      }}
                    >
                      {ingredient.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default IngredientList;

