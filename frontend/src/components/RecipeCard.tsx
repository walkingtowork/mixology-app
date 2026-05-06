import { Link } from 'react-router-dom';
import type { Recipe } from '../types/cocktails';
import './RecipeCard.css';

interface RecipeCardProps {
  recipe: Recipe;
}

function chipStockClass(stockLevel: number) {
  if (stockLevel === 0) return 'recipe-card-chip--out';
  if (stockLevel <= 25) return 'recipe-card-chip--low';
  return '';
}

export default function RecipeCard({ recipe }: RecipeCardProps) {
  const shown = recipe.ingredients.slice(0, 3);
  const overflow = recipe.ingredients.length - shown.length;

  const worstStock = recipe.ingredients.reduce(
    (min, ri) => Math.min(min, ri.ingredient.stock_level),
    100
  );
  const cardStockClass = worstStock === 0
    ? 'recipe-card--stock-out'
    : worstStock <= 25
    ? 'recipe-card--stock-low'
    : '';

  return (
    <Link to={`/recipes/${recipe.id}`} className={`recipe-card ${cardStockClass}`}>
      <h3 className="recipe-card-name">{recipe.name}</h3>
      <div className="recipe-card-ingredients">
        {shown.map((ri) => (
          <span key={ri.id} className={`recipe-card-chip ${chipStockClass(ri.ingredient.stock_level)}`}>
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
