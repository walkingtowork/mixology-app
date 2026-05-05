import { useState, useEffect } from 'react';
import { fetchRecipes, fetchIngredients, fetchCategories } from '../services/cocktailsApi';
import type { Recipe, Ingredient, IngredientCategory } from '../types/cocktails';
import RecipeCard from './RecipeCard';
import LoadingSpinner from './ui/LoadingSpinner';
import './RecipeList.css';

export default function RecipeList() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [categories, setCategories] = useState<IngredientCategory[]>([]);
  const [selectedIngredientId, setSelectedIngredientId] = useState<number | undefined>();
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchIngredients(), fetchCategories()])
      .then(([ing, cat]) => { setIngredients(ing); setCategories(cat); })
      .catch(console.error);
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchRecipes(selectedIngredientId, selectedCategoryId)
      .then(setRecipes)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load recipes'))
      .finally(() => setLoading(false));
  }, [selectedIngredientId, selectedCategoryId]);

  const handleIngredientChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedIngredientId(val === '' ? undefined : parseInt(val, 10));
    if (val !== '') setSelectedCategoryId(undefined);
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedCategoryId(val === '' ? undefined : parseInt(val, 10));
    if (val !== '') setSelectedIngredientId(undefined);
  };

  if (error) {
    return (
      <div className="recipe-list">
        <p style={{ color: 'var(--color-danger)' }}>Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="recipe-list">
      <div className="recipe-list-header">
        <h2>Recipes</h2>
        {!loading && (
          <span className="recipe-list-count">
            {recipes.length} {recipes.length === 1 ? 'recipe' : 'recipes'}
          </span>
        )}
      </div>

      <div className="recipe-list-filters">
        <div className="recipe-list-filter">
          <label htmlFor="filter-ingredient">Ingredient</label>
          <select id="filter-ingredient" value={selectedIngredientId ?? ''} onChange={handleIngredientChange}>
            <option value="">All ingredients</option>
            {ingredients.map((i) => (
              <option key={i.id} value={i.id}>{i.name}</option>
            ))}
          </select>
        </div>
        <div className="recipe-list-filter">
          <label htmlFor="filter-category">Category</label>
          <select id="filter-category" value={selectedCategoryId ?? ''} onChange={handleCategoryChange}>
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner label="Loading recipes…" />
      ) : recipes.length === 0 ? (
        <div className="recipe-list-empty">
          <p>No recipes found{selectedIngredientId || selectedCategoryId ? ' for the selected filter' : ''}.</p>
        </div>
      ) : (
        <div className="recipe-grid">
          {recipes.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
      )}
    </div>
  );
}
