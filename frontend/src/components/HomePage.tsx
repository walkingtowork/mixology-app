import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchRecipes, fetchIngredients, fetchCategories } from '../services/cocktailsApi';
import './HomePage.css';

export default function HomePage() {
  const [counts, setCounts] = useState<{ recipes: number; ingredients: number; categories: number } | null>(null);

  useEffect(() => {
    Promise.all([fetchRecipes(), fetchIngredients(), fetchCategories()])
      .then(([recipes, ingredients, categories]) =>
        setCounts({ recipes: recipes.length, ingredients: ingredients.length, categories: categories.length })
      )
      .catch(() => setCounts({ recipes: 0, ingredients: 0, categories: 0 }));
  }, []);

  return (
    <div className="home-page">
      <div className="home-hero">
        <div className="home-title-row">
          <div className="rocks-glass">
            <div className="glass" />
            <div className="ice" />
          </div>
          <h1 className="home-title">Mixology App</h1>
          <div className="rocks-glass">
            <div className="glass" />
            <div className="ice" />
          </div>
        </div>
        <p className="home-subtitle">Your personal cocktail recipe book.</p>
      </div>

      <div className="home-stats">
        <Link to="/recipes" className="home-stat-card">
          <span className="home-stat-number">{counts?.recipes ?? '—'}</span>
          <span className="home-stat-label">Recipes</span>
        </Link>
        <Link to="/ingredients" className="home-stat-card">
          <span className="home-stat-number">{counts?.ingredients ?? '—'}</span>
          <span className="home-stat-label">Ingredients</span>
        </Link>
        <Link to="/categories" className="home-stat-card">
          <span className="home-stat-number">{counts?.categories ?? '—'}</span>
          <span className="home-stat-label">Categories</span>
        </Link>
      </div>

      <div className="home-glasses">
        <div className="martini-glass">
          <div className="glass" />
          <div className="glass-left-edge" />
          <div className="glass-right-edge" />
          <div className="stem" />
          <div className="base" />
        </div>
        <div className="wine-glass">
          <div className="bowl" />
          <div className="stem" />
          <div className="base" />
        </div>
        <div className="champagne-flute">
          <div className="glass" />
          <div className="stem" />
          <div className="base" />
        </div>
        <div className="collins-glass">
          <div className="glass" />
          <div className="ice ice-1" />
          <div className="ice ice-2" />
          <div className="ice ice-3" />
        </div>
      </div>
    </div>
  );
}
