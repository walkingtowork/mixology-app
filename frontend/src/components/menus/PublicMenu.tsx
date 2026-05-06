import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { fetchPublicMenu } from '../../services/cocktailsApi';
import type { Menu } from '../../types/cocktails';
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
            <div className="public-menu-drink">{item.recipe.name}</div>
            {item.recipe.notes && (
              <p className="public-menu-notes">{item.recipe.notes}</p>
            )}
            {item.recipe.garnish && (
              <p className="public-menu-garnish">Garnish: {item.recipe.garnish}</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
