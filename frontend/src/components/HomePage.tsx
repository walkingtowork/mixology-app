import { useState, useEffect } from 'react';
import { fetchRecipes, fetchIngredients, fetchCategories } from '../services/cocktailsApi';
import StatCard from './ui/StatCard';
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
          <div className="home-divider-glass-inner">
            <div className="martini-glass">
              <div className="glass" />
              <div className="glass-left-edge" />
              <div className="glass-right-edge" />
              <div className="stem" />
              <div className="base" />
            </div>
          </div>
          <h1 className="home-title">What are we making tonight?</h1>
          <div className="home-divider-glass-inner">
            <div className="martini-glass">
              <div className="glass" />
              <div className="glass-left-edge" />
              <div className="glass-right-edge" />
              <div className="stem" />
              <div className="base" />
            </div>
          </div>
        </div>
      </div>

      <div className="home-divider-glass">
        <div className="home-divider-glass-inner">
          <div className="martini-glass">
            <div className="glass" />
            <div className="glass-left-edge" />
            <div className="glass-right-edge" />
            <div className="stem" />
            <div className="base" />
          </div>
        </div>
      </div>

      <div className="home-stats">
        <StatCard to="/recipes" value={counts?.recipes ?? '—'} label="Recipes" />
        <StatCard to="/ingredients" value={counts?.ingredients ?? '—'} label="Ingredients" />
        <StatCard to="/categories" value={counts?.categories ?? '—'} label="Categories" />
      </div>

      <div className="home-glasses">
        <div className="rocks-glass">
          <div className="glass" />
          <div className="ice" />
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
