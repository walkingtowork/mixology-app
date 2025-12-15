import { useState, useEffect } from 'react';
import { fetchRecipes, fetchIngredients, fetchCategories } from '../services/cocktailsApi';
import type { Recipe, Ingredient, IngredientCategory } from '../types/cocktails';

interface RecipeListProps {
  onRecipeSelect?: (recipeId: number) => void;
}

const RecipeList = ({ onRecipeSelect }: RecipeListProps) => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [categories, setCategories] = useState<IngredientCategory[]>([]);
  const [selectedIngredientId, setSelectedIngredientId] = useState<number | undefined>(undefined);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [ingredientsData, categoriesData] = await Promise.all([
          fetchIngredients(),
          fetchCategories(),
        ]);
        setIngredients(ingredientsData);
        setCategories(categoriesData);
      } catch (err) {
        console.error('Failed to load filter data:', err);
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    const loadRecipes = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchRecipes(selectedIngredientId, selectedCategoryId);
        setRecipes(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load recipes');
      } finally {
        setLoading(false);
      }
    };

    loadRecipes();
  }, [selectedIngredientId, selectedCategoryId]);

  const handleIngredientFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedIngredientId(value === '' ? undefined : parseInt(value, 10));
    // Clear category filter when ingredient is selected
    if (value !== '') {
      setSelectedCategoryId(undefined);
    }
  };

  const handleCategoryFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedCategoryId(value === '' ? undefined : parseInt(value, 10));
    // Clear ingredient filter when category is selected
    if (value !== '') {
      setSelectedIngredientId(undefined);
    }
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
      
      <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
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
        
        <div>
          <label htmlFor="category-filter" style={{ marginRight: '0.5rem' }}>
            Filter by category:
          </label>
          <select
            id="category-filter"
            value={selectedCategoryId || ''}
            onChange={handleCategoryFilterChange}
            style={{ padding: '0.5rem', minWidth: '200px' }}
          >
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {recipes.length === 0 ? (
        <p>
          No recipes found
          {selectedIngredientId ? ' for selected ingredient' : ''}
          {selectedCategoryId ? ' for selected category' : ''}.
        </p>
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

