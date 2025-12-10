import { useState, useEffect } from 'react';
import { fetchRecipes, fetchIngredients } from '../services/cocktailsApi';
import type { Recipe, Ingredient } from '../types/cocktails';

interface RecipeListProps {
  onRecipeSelect?: (recipeId: number) => void;
}

const RecipeList = ({ onRecipeSelect }: RecipeListProps) => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [selectedIngredientId, setSelectedIngredientId] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadIngredients = async () => {
      try {
        const data = await fetchIngredients();
        setIngredients(data);
      } catch (err) {
        console.error('Failed to load ingredients for filter:', err);
      }
    };

    loadIngredients();
  }, []);

  useEffect(() => {
    const loadRecipes = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchRecipes(selectedIngredientId);
        setRecipes(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load recipes');
      } finally {
        setLoading(false);
      }
    };

    loadRecipes();
  }, [selectedIngredientId]);

  const handleIngredientFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedIngredientId(value === '' ? undefined : parseInt(value, 10));
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Loading recipes...</p>
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
      <h2>Recipes</h2>
      
      <div style={{ marginBottom: '1rem' }}>
        <label htmlFor="ingredient-filter" style={{ marginRight: '0.5rem' }}>
          Filter by ingredient:
        </label>
        <select
          id="ingredient-filter"
          value={selectedIngredientId || ''}
          onChange={handleIngredientFilterChange}
          style={{ padding: '0.5rem', minWidth: '200px' }}
        >
          <option value="">All ingredients</option>
          {ingredients.map((ingredient) => (
            <option key={ingredient.id} value={ingredient.id}>
              {ingredient.name}
            </option>
          ))}
        </select>
      </div>

      {recipes.length === 0 ? (
        <p>No recipes found{selectedIngredientId ? ' for selected ingredient' : ''}.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {recipes.map((recipe) => (
            <li
              key={recipe.id}
              style={{
                padding: '1rem',
                marginBottom: '1rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                cursor: onRecipeSelect ? 'pointer' : 'default',
              }}
              onClick={() => onRecipeSelect?.(recipe.id)}
            >
              <h3 style={{ margin: '0 0 0.5rem 0' }}>{recipe.name}</h3>
              {recipe.garnish && (
                <p style={{ margin: '0.25rem 0', color: '#666' }}>Garnish: {recipe.garnish}</p>
              )}
              <p style={{ margin: '0.25rem 0', color: '#666' }}>
                {recipe.ingredients.length} ingredient{recipe.ingredients.length !== 1 ? 's' : ''}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default RecipeList;

