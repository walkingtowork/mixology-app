import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { fetchPublicMenu } from '../../services/cocktailsApi';
import type { Menu } from '../../types/cocktails';
import GlassIcon from '../ui/GlassIcon';
import LoadingSpinner from '../ui/LoadingSpinner';
import './PublicMenu.css';

export default function PublicMenu() {
  const { shareToken } = useParams<{ shareToken: string }>();
  const [menu, setMenu] = useState<Menu | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!shareToken) return;
    fetchPublicMenu(shareToken)
      .then(setMenu)
      .catch(() => setError('Menu not found.'))
      .finally(() => setLoading(false));
  }, [shareToken]);

  if (loading) return <LoadingSpinner />;
  if (error || !menu) return <div className="public-menu-error">{error || 'Menu not found.'}</div>;

  return (
    <div className="public-menu">
      <h1 className="public-menu-title">{menu.name}</h1>
      <ul className="public-menu-list">
        {menu.items.map((item) => (
          <li key={item.id} className="public-menu-item">
            {item.recipe.glass && (
              <div className="public-menu-glass">
                <GlassIcon glass={item.recipe.glass} size={50} />
              </div>
            )}
            <div className="public-menu-content">
              <div className="public-menu-drink">{item.recipe.name}</div>
              {item.recipe.ingredients.length > 0 && (
                <ul className="public-menu-ingredients">
                  {item.recipe.ingredients.map(ri => (
                    <li key={ri.id} className="public-menu-ingredient">
                      <span className="public-menu-amount">{ri.amount} {ri.unit}</span>
                      {ri.ingredient.name}
                    </li>
                  ))}
                </ul>
              )}
              {item.recipe.description && (
                <p className="public-menu-description">{item.recipe.description}</p>
              )}
              {item.recipe.garnish && (
                <p className="public-menu-garnish">Garnish: {item.recipe.garnish}</p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
