import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { fetchPublicMenu, createOrder, fetchOrders, cancelOrder } from '../../services/cocktailsApi';
import type { Menu, Order } from '../../types/cocktails';
import GlassIcon from '../ui/GlassIcon';
import LoadingSpinner from '../ui/LoadingSpinner';
import './PublicMenu.css';

const GUEST_NAME_KEY = 'barCart_guestName';

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

export default function PublicMenu() {
  const { shareToken } = useParams<{ shareToken: string }>();
  const [menu, setMenu] = useState<Menu | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [guestName, setGuestName] = useState(() => localStorage.getItem(GUEST_NAME_KEY) || '');
  const [showNameModal, setShowNameModal] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [pendingRecipeId, setPendingRecipeId] = useState<number | null>(null);

  const [lockedRecipes, setLockedRecipes] = useState<Set<number>>(new Set());

  const [showMyOrders, setShowMyOrders] = useState(false);
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [myOrdersLoading, setMyOrdersLoading] = useState(false);

  useEffect(() => {
    if (!shareToken) return;
    fetchPublicMenu(shareToken)
      .then(setMenu)
      .catch(() => setError('Menu not found.'))
      .finally(() => setLoading(false));
  }, [shareToken]);

  const placeOrder = async (recipeId: number, name: string) => {
    if (!menu) return;
    await createOrder(menu.id, recipeId, name);
    setLockedRecipes(prev => new Set(prev).add(recipeId));
    setTimeout(() => {
      setLockedRecipes(prev => {
        const next = new Set(prev);
        next.delete(recipeId);
        return next;
      });
    }, 5000);
  };

  const handleOrderClick = (recipeId: number) => {
    if (!guestName) {
      setPendingRecipeId(recipeId);
      setNameInput('');
      setShowNameModal(true);
    } else {
      placeOrder(recipeId, guestName);
    }
  };

  const handleNameSubmit = async () => {
    const name = nameInput.trim();
    if (!name) return;
    localStorage.setItem(GUEST_NAME_KEY, name);
    setGuestName(name);
    setShowNameModal(false);
    if (pendingRecipeId !== null) {
      await placeOrder(pendingRecipeId, name);
      setPendingRecipeId(null);
    }
  };

  const openMyOrders = async () => {
    setShowMyOrders(true);
    if (!menu) return;
    setMyOrdersLoading(true);
    try {
      const name = localStorage.getItem(GUEST_NAME_KEY) || '';
      const orders = name
        ? await fetchOrders({ menu_id: menu.id, guest_name: name })
        : [];
      setMyOrders(orders);
    } finally {
      setMyOrdersLoading(false);
    }
  };

  const handleCancelMyOrder = async (orderId: number) => {
    await cancelOrder(orderId);
    setMyOrders(prev => prev.filter(o => o.id !== orderId));
  };

  if (loading) return <LoadingSpinner />;
  if (error || !menu) return <div className="public-menu-error">{error || 'Menu not found.'}</div>;

  return (
    <div className="public-menu">
      <div className="public-menu-header">
        <h1 className="public-menu-title">{menu.name}</h1>
        <button className="public-menu-my-orders-btn" onClick={openMyOrders}>
          My Orders
        </button>
      </div>

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
                <p className="public-menu-ingredients">
                  {item.recipe.ingredients.map(ri => ri.ingredient.name).join(', ')}
                </p>
              )}
              {item.recipe.description && (
                <p className="public-menu-description">{item.recipe.description}</p>
              )}
              {item.recipe.garnish && (
                <p className="public-menu-garnish">Garnish: {item.recipe.garnish}</p>
              )}
              <button
                className={`public-menu-order-btn${lockedRecipes.has(item.recipe.id) ? ' ordered' : ''}`}
                onClick={() => handleOrderClick(item.recipe.id)}
                disabled={lockedRecipes.has(item.recipe.id)}
              >
                {lockedRecipes.has(item.recipe.id) ? 'Ordered!' : 'Order'}
              </button>
            </div>
          </li>
        ))}
      </ul>

      {/* Name modal */}
      {showNameModal && (
        <div className="pm-modal-backdrop" onClick={() => setShowNameModal(false)}>
          <div className="pm-modal" onClick={e => e.stopPropagation()}>
            <h2 className="pm-modal-title">What's your name?</h2>
            <p className="pm-modal-hint">So the bartender knows who to hand it to.</p>
            <input
              className="pm-modal-input"
              type="text"
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleNameSubmit(); }}
              placeholder="Your name…"
              autoFocus
            />
            <div className="pm-modal-actions">
              <button
                className="pm-modal-submit"
                onClick={handleNameSubmit}
                disabled={!nameInput.trim()}
              >
                Let's go
              </button>
              <button className="pm-modal-cancel" onClick={() => setShowNameModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* My Orders drawer */}
      {showMyOrders && (
        <>
          <div className="pm-drawer-overlay" onClick={() => setShowMyOrders(false)} />
          <div className="pm-drawer">
            <div className="pm-drawer-header">
              <h2 className="pm-drawer-title">My Orders</h2>
              <button className="pm-drawer-close" onClick={() => setShowMyOrders(false)}>✕</button>
            </div>
            {myOrdersLoading ? (
              <LoadingSpinner />
            ) : myOrders.length === 0 ? (
              <p className="pm-drawer-empty">No orders yet.</p>
            ) : (
              <ul className="pm-drawer-list">
                {myOrders.map(order => (
                  <li key={order.id} className={`pm-drawer-item${order.is_fulfilled ? ' fulfilled' : ''}`}>
                    <div className="pm-drawer-item-info">
                      <span className="pm-drawer-item-name">{order.recipe.name}</span>
                      <span className="pm-drawer-item-time">{formatTime(order.created_at)}</span>
                    </div>
                    {order.is_fulfilled ? (
                      <span className="pm-drawer-served">✓ Served</span>
                    ) : (
                      <button
                        className="pm-drawer-cancel-btn"
                        onClick={() => handleCancelMyOrder(order.id)}
                      >
                        Cancel
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
