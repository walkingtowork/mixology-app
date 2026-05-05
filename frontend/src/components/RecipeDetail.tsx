import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { fetchRecipe, deleteRecipe } from '../services/cocktailsApi';
import type { Recipe } from '../types/cocktails';
import Button from './ui/Button';
import LoadingSpinner from './ui/LoadingSpinner';
import './RecipeDetail.css';

export default function RecipeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const recipeId = parseInt(id || '0', 10);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchRecipe(recipeId)
      .then(setRecipe)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load recipe'))
      .finally(() => setLoading(false));
  }, [recipeId]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteRecipe(recipeId);
      navigate('/recipes');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete recipe');
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  if (loading) return <LoadingSpinner label="Loading recipe…" />;

  if (error || !recipe) {
    return (
      <div className="recipe-detail">
        <p style={{ color: 'var(--color-danger)', marginBottom: 'var(--space-4)' }}>
          {error ?? 'Recipe not found.'}
        </p>
        <Button variant="secondary" onClick={() => navigate('/recipes')}>← Back to Recipes</Button>
      </div>
    );
  }

  return (
    <div className="recipe-detail">
      <Link to="/recipes" className="recipe-detail-back">← Recipes</Link>

      <h1 className="recipe-detail-title">{recipe.name}</h1>

      <div className="recipe-detail-section">
        <h2>Ingredients</h2>
        <ul className="recipe-detail-ingredient-list">
          {recipe.ingredients.map((ri) => (
            <li key={ri.id} className="recipe-detail-ingredient">
              <span className="recipe-detail-ingredient-measure">{ri.amount} {ri.unit}</span>
              <span className="recipe-detail-ingredient-name">{ri.ingredient.name}</span>
            </li>
          ))}
        </ul>
      </div>

      {recipe.garnish && (
        <div className="recipe-detail-section">
          <h2>Garnish</h2>
          <p>{recipe.garnish}</p>
        </div>
      )}

      {recipe.notes && (
        <div className="recipe-detail-section">
          <h2>Notes</h2>
          <div className="recipe-detail-notes">{recipe.notes}</div>
        </div>
      )}

      {recipe.source_url && (
        <div className="recipe-detail-section recipe-detail-source">
          <h2>Source</h2>
          <a href={recipe.source_url} target="_blank" rel="noopener noreferrer">
            View source →
          </a>
        </div>
      )}

      <div className="recipe-detail-actions">
        <Button variant="primary" onClick={() => navigate(`/recipes/${recipeId}/edit`)}>
          Edit Recipe
        </Button>
        <div className="recipe-detail-actions-divider" />
        {confirmDelete ? (
          <>
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
              Are you sure?
            </span>
            <Button variant="danger" size="sm" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting…' : 'Yes, delete'}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)} disabled={deleting}>
              Cancel
            </Button>
          </>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(true)}>
            Delete
          </Button>
        )}
      </div>
    </div>
  );
}
