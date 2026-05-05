import { Link } from 'react-router-dom';
import type { Recipe } from '../types/cocktails';
import './RecipeCard.css';

interface RecipeCardProps {
  recipe: Recipe;
}

export default function RecipeCard({ recipe }: RecipeCardProps) {
  const shown = recipe.ingredients.slice(0, 3);
  const overflow = recipe.ingredients.length - shown.length;

  return (
    <Link to={`/recipes/${recipe.id}`} className="recipe-card">
      <h3 className="recipe-card-name">{recipe.name}</h3>
      <div className="recipe-card-ingredients">
        {shown.map((ri) => (
          <span key={ri.id} className="recipe-card-chip">
            {ri.ingredient.name}
          </span>
        ))}
        {overflow > 0 && (
          <span className="recipe-card-chip-more">+{overflow} more</span>
        )}
      </div>
      {recipe.garnish && (
        <p className="recipe-card-garnish">Garnish: {recipe.garnish}</p>
      )}
    </Link>
  );
}
