import { useState, useEffect } from 'react';
import { fetchOrders, fulfillOrder, cancelOrder } from '../../services/cocktailsApi';
import type { Order } from '../../types/cocktails';
import GlassIcon from '../ui/GlassIcon';
import LoadingSpinner from '../ui/LoadingSpinner';
import './OrdersPage.css';

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  return hrs === 1 ? '1 hr ago' : `${hrs} hrs ago`;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchOrders({
        today: true,
        ...(showHistory ? {} : { fulfilled: false }),
      });
      setOrders(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [showHistory]);

  const handleServed = async (id: number) => {
    await fulfillOrder(id);
    if (showHistory) {
      setOrders(prev => prev.map(o => o.id === id ? { ...o, is_fulfilled: true } : o));
    } else {
      setOrders(prev => prev.filter(o => o.id !== id));
    }
  };

  const handleCancel = async (id: number) => {
    await cancelOrder(id);
    setOrders(prev => prev.filter(o => o.id !== id));
  };

  const pending = orders.filter(o => !o.is_fulfilled);
  const fulfilled = orders.filter(o => o.is_fulfilled);

  return (
    <div className="orders-page">
      <div className="orders-header">
        <h1 className="orders-title">Orders</h1>
        <div className="orders-header-actions">
          <button
            className={`orders-history-toggle${showHistory ? ' active' : ''}`}
            onClick={() => setShowHistory(h => !h)}
          >
            {showHistory ? 'Hide history' : 'Show history'}
          </button>
          <button className="orders-refresh-btn" onClick={load} disabled={loading}>
            ↻ Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : orders.length === 0 ? (
        <p className="orders-empty">No orders today.</p>
      ) : (
        <>
          {pending.length > 0 && (
            <section className="orders-section">
              <ul className="orders-list">
                {pending.map(order => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    expanded={expandedId === order.id}
                    onToggle={() => setExpandedId(id => id === order.id ? null : order.id)}
                    onServed={() => handleServed(order.id)}
                    onCancel={() => handleCancel(order.id)}
                  />
                ))}
              </ul>
            </section>
          )}

          {showHistory && fulfilled.length > 0 && (
            <section className="orders-section">
              <h2 className="orders-section-title">Served</h2>
              <ul className="orders-list">
                {fulfilled.map(order => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    expanded={expandedId === order.id}
                    onToggle={() => setExpandedId(id => id === order.id ? null : order.id)}
                  />
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}

interface OrderCardProps {
  order: Order;
  expanded: boolean;
  onToggle: () => void;
  onServed?: () => void;
  onCancel?: () => void;
}

function OrderCard({ order, expanded, onToggle, onServed, onCancel }: OrderCardProps) {
  return (
    <li className={`order-card${order.is_fulfilled ? ' fulfilled' : ''}`}>
      <div className="order-card-main">
        <div className="order-card-info" onClick={onToggle} role="button" tabIndex={0} onKeyDown={e => e.key === 'Enter' && onToggle()}>
          <div className="order-card-guest">{order.guest_name}</div>
          <div className="order-card-meta">
            <span className="order-card-drink">{order.recipe.name}</span>
            <span className="order-card-time">{timeAgo(order.created_at)}</span>
          </div>
          <div className="order-card-expand-hint">{expanded ? '▲ hide recipe' : '▼ view recipe'}</div>
        </div>
        <div className="order-card-actions">
          {order.is_fulfilled ? (
            <span className="order-card-served-badge">✓ Served</span>
          ) : (
            <>
              <button className="order-card-serve-btn" onClick={onServed}>Served</button>
              <button className="order-card-cancel-btn" onClick={onCancel}>Cancel</button>
            </>
          )}
        </div>
      </div>

      {expanded && (
        <div className="order-card-recipe">
          <div className="order-card-recipe-header">
            {order.recipe.glass && <GlassIcon glass={order.recipe.glass} size={40} />}
            <span className="order-card-recipe-name">{order.recipe.name}</span>
          </div>
          {order.recipe.description && (
            <p className="order-card-recipe-desc">{order.recipe.description}</p>
          )}
          <table className="order-card-ingredients">
            <tbody>
              {order.recipe.ingredients.map(ri => (
                <tr key={ri.id}>
                  <td className="order-card-ing-amount">{ri.amount} {ri.unit}</td>
                  <td className="order-card-ing-name">{ri.ingredient.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {order.recipe.garnish && (
            <p className="order-card-recipe-meta"><strong>Garnish:</strong> {order.recipe.garnish}</p>
          )}
          {order.recipe.notes && (
            <p className="order-card-recipe-meta"><strong>Notes:</strong> {order.recipe.notes}</p>
          )}
        </div>
      )}
    </li>
  );
}
