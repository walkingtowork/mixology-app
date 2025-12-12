import { useState, useEffect } from 'react';
import { fetchRecipe } from '../services/cocktailsApi';
import type { Recipe } from '../types/cocktails';

interface RecipeDetailProps {
  recipeId: number;
  onEdit?: () => void;
  onBack?: () => void;
}

const RecipeDetail = ({ recipeId, onEdit, onBack }: RecipeDetailProps) => {
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadRecipe = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchRecipe(recipeId);
        setRecipe(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load recipe');
      } finally {
        setLoading(false);
      }
    };

    loadRecipe();
  }, [recipeId]);

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Loading recipe...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'red' }}>
        <p>Error: {error}</p>
        {onBack && (
          <button onClick={onBack} style={{ marginTop: '1rem', padding: '0.5rem 1rem' }}>
            Back to Recipes
          </button>
        )}
      </div>
    );
  }

  if (!recipe) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Recipe not found.</p>
        {onBack && (
          <button onClick={onBack} style={{ marginTop: '1rem', padding: '0.5rem 1rem' }}>
            Back to Recipes
          </button>
        )}
      </div>
    );
  }

  const formatIngredient = (amount: number, unit: string, ingredientName: string): string => {
    return `${amount} ${unit} ${ingredientName}`;
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      {onBack && (
        <button onClick={onBack} style={{ marginBottom: '1rem', padding: '0.5rem 1rem' }}>
          ← Back to Recipes
        </button>
      )}
      
      <h1 style={{ marginBottom: '1rem' }}>{recipe.name}</h1>

      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ marginBottom: '0.5rem' }}>Ingredients</h2>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {recipe.ingredients.map((recipeIngredient) => (
            <li
              key={recipeIngredient.id}
              style={{
                padding: '0.5rem 0',
                borderBottom: '1px solid #eee',
              }}
            >
              {formatIngredient(
                recipeIngredient.amount,
                recipeIngredient.unit,
                recipeIngredient.ingredient.name
              )}
            </li>
          ))}
        </ul>
      </div>

      {recipe.garnish && (
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ marginBottom: '0.5rem' }}>Garnish</h2>
          <p>{recipe.garnish}</p>
        </div>
      )}

      {recipe.notes && (
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ marginBottom: '0.5rem' }}>Notes</h2>
          <p style={{ whiteSpace: 'pre-wrap' }}>{recipe.notes}</p>
        </div>
      )}

      {recipe.source_url && (
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ marginBottom: '0.5rem' }}>Source</h2>
          <p>
            <a 
              href={recipe.source_url} 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ color: '#007bff', textDecoration: 'underline' }}
            >
              {recipe.source_url}
            </a>
          </p>
        </div>
      )}

      {onEdit && (
        <button
          onClick={onEdit}
          style={{
            marginTop: '1rem',
            padding: '0.75rem 1.5rem',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Edit Recipe
        </button>
      )}
    </div>
  );
};

export default RecipeDetail;

