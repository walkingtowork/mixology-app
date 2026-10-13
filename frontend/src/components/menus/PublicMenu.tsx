import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { fetchPublicMenu, createGuestOrder, fetchGuestOrders, cancelGuestOrder } from '../../services/cocktailsApi';
import type { Menu, Order } from '../../types/cocktails';
import GlassIcon from '../ui/GlassIcon';
import LoadingSpinner from '../ui/LoadingSpinner';
import { DecorationSlot } from './DecorationSlot';
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
  const [orderError, setOrderError] = useState<string | null>(null);

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
    if (!shareToken) return;
    setOrderError(null);
    try {
      await createGuestOrder(shareToken, recipeId, name);
    } catch (err) {
      setOrderError(err instanceof Error ? err.message : 'Failed to place order');
      return;
    }
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
    // A changed name has its own order list; earlier orders stay under the old one.
    if (showMyOrders) await loadMyOrders(name);
  };

  const handleChangeNameClick = () => {
    setPendingRecipeId(null);
    setNameInput(guestName);
    setShowNameModal(true);
  };

  const loadMyOrders = async (name = guestName) => {
    if (!shareToken) return;
    setMyOrdersLoading(true);
    try {
      setMyOrders(name ? await fetchGuestOrders(shareToken, name) : []);
    } catch {
      setMyOrders([]);
    } finally {
      setMyOrdersLoading(false);
    }
  };

  const openMyOrders = () => {
    setShowMyOrders(true);
    loadMyOrders();
  };

  const handleCancelMyOrder = async (orderId: number) => {
    if (!shareToken) return;
    try {
      await cancelGuestOrder(shareToken, orderId, guestName);
      setMyOrders(prev => prev.filter(o => o.id !== orderId));
    } catch {
      // Most likely served in the meantime; show what the bar has now.
      await loadMyOrders();
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error || !menu) return <div className="public-menu-error">{error || 'Menu not found.'}</div>;

  return (
    <div className="public-menu">
      <DecorationSlot position="top" name={menu.top_decoration} />
      <DecorationSlot position="bottom" name={menu.bottom_decoration} />
      <div className="public-menu-header">
        <h1 className="public-menu-title">{menu.name}</h1>
        <button className="public-menu-my-orders-btn" onClick={openMyOrders}>
          My Orders
        </button>
      </div>

      {orderError && <p className="public-menu-order-error" role="alert">{orderError}</p>}

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
              {menu.is_active && (
                <button
                  className={`public-menu-order-btn${lockedRecipes.has(item.recipe.id) ? ' ordered' : ''}`}
                  onClick={() => handleOrderClick(item.recipe.id)}
                  disabled={lockedRecipes.has(item.recipe.id)}
                >
                  {lockedRecipes.has(item.recipe.id) ? 'Ordered!' : 'Order'}
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      {/* Name modal */}
      {showNameModal && (
        <div className="pm-modal-backdrop" onClick={() => setShowNameModal(false)}>
          <div className="pm-modal" onClick={e => e.stopPropagation()}>
            <h2 className="pm-modal-title">{guestName ? 'Change your name' : "What's your name?"}</h2>
            <p className="pm-modal-hint">
              {guestName
                ? `Drinks you've already ordered stay under ${guestName}.`
                : 'So the bartender knows who to hand it to.'}
            </p>
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
                {guestName ? 'Save' : "Let's go"}
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
            {guestName && (
              <p className="pm-drawer-guest">
                Ordering as <strong>{guestName}</strong>
                <button
                  className="pm-drawer-edit-name"
                  onClick={handleChangeNameClick}
                  aria-label="Change your name"
                  title="Change your name"
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                  </svg>
                </button>
              </p>
            )}
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
