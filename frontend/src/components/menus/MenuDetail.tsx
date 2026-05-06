import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import { fetchMenu, removeMenuItem, activateMenu, fetchMenus } from '../../services/cocktailsApi';
import type { Menu, MenuItem } from '../../types/cocktails';
import Button from '../ui/Button';
import LoadingSpinner from '../ui/LoadingSpinner';
import ConfirmModal from '../ui/ConfirmModal';
import RecipeDrawer from './RecipeDrawer';
import './MenuDetail.css';

function stockClass(level: number) {
  if (level === 0) return 'stock-out';
  if (level <= 25) return 'stock-low';
  return '';
}

function stockLabel(level: number) {
  if (level === 0) return 'Out of stock';
  if (level <= 25) return 'Low stock';
  return '';
}

export default function MenuDetail() {
  const { id } = useParams<{ id: string }>();
  const menuId = Number(id);
  const [menu, setMenu] = useState<Menu | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [activateTarget, setActivateTarget] = useState(false);
  const [hasOtherActive, setHasOtherActive] = useState(false);
  const [activating, setActivating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const qrContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([fetchMenu(menuId), fetchMenus()])
      .then(([m, all]) => {
        setMenu(m);
        setHasOtherActive(all.some((x) => x.is_active && x.id !== menuId));
      })
      .catch(() => setError('Failed to load menu.'))
      .finally(() => setLoading(false));
  }, [menuId]);

  const handleRemove = async (item: MenuItem) => {
    try {
      await removeMenuItem(item.id);
      setMenu((prev) => prev ? { ...prev, items: prev.items.filter((i) => i.id !== item.id) } : prev);
    } catch {
      setError('Failed to remove drink.');
    }
  };

  const handleActivate = async () => {
    setActivating(true);
    try {
      const updated = await activateMenu(menuId);
      setMenu(updated);
      setHasOtherActive(false);
    } catch {
      setError('Failed to activate menu.');
    } finally {
      setActivating(false);
      setActivateTarget(false);
    }
  };

  const handlePrintQR = () => {
    if (!menu) return;
    const canvas = qrContainerRef.current?.querySelector('canvas');
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>${menu.name} — QR Code</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&display=swap" rel="stylesheet">
      <style>
        body { margin: 0; display: flex; flex-direction: column; align-items: center;
               justify-content: center; min-height: 100vh; font-family: 'Playfair Display', Georgia, serif; }
        h1 { font-size: 1.5rem; margin-bottom: 1rem; font-weight: 700; }
        p { color: #666; margin-top: 0.75rem; font-size: 0.875rem; font-family: Georgia, serif; }
      </style></head>
      <body onload="document.fonts.ready.then(() => window.print())">
        <h1>${menu.name}</h1>
        <img src="${dataUrl}" width="220" height="220" />
        <p>Scan to view the menu</p>
      </body></html>`);
    win.document.close();
  };

  const handleShare = () => {
    if (!menu) return;
    const url = `${window.location.origin}/share/${menu.share_token}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (loading) return <LoadingSpinner />;
  if (error && !menu) return <p className="menu-detail-error">{error}</p>;
  if (!menu) return null;

  const lowStockItems = menu.items.filter((item) =>
    item.recipe.ingredients.some((ri) => ri.ingredient.stock_level <= 25)
  );

  return (
    <div className="menu-detail">
      <div className="menu-detail-header">
        <Link to="/menus" className="recipe-form-back">← Menus</Link>
        <div className="menu-detail-title-row">
          <h1 className="menu-detail-title">
            {menu.name}
            {menu.is_active && <span className="menu-badge-active">Active</span>}
          </h1>
          <div className="menu-detail-actions">
            <Button variant="secondary" size="sm" onClick={handleShare}>
              {copied ? 'Copied!' : 'Share Link'}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setShowQR(true)}>
              QR Code
            </Button>
            <Button variant="primary" size="sm" onClick={() => setShowDrawer(true)}>
              + Add Drink
            </Button>
            {!menu.is_active && (
              <Button
                variant="primary"
                size="sm"
                disabled={activating}
                onClick={() => hasOtherActive ? setActivateTarget(true) : handleActivate()}
              >
                Publish & Activate
              </Button>
            )}
          </div>
        </div>
      </div>

      {error && <p className="menu-detail-error">{error}</p>}

      {lowStockItems.length > 0 && (
        <div className="menu-stock-warning">
          <strong>Heads up:</strong> {lowStockItems.length} drink{lowStockItems.length !== 1 ? 's' : ''} {lowStockItems.length !== 1 ? 'have' : 'has'} low or out-of-stock ingredients.
        </div>
      )}

      <div className="menu-items">
        {menu.items.length === 0 ? (
          <div className="menu-items-empty">
            <p>No drinks yet. Add some to get started!</p>
          </div>
        ) : (
          menu.items.map((item) => {
            const badIngredients = item.recipe.ingredients.filter((ri) => ri.ingredient.stock_level <= 25);
            return (
              <div key={item.id} className={`menu-item-card ${badIngredients.length > 0 ? 'menu-item-card--warn' : ''}`}>
                <div className="menu-item-body">
                  <div className="menu-item-name">{item.recipe.name}</div>
                  <div className="menu-item-ingredients">
                    {item.recipe.ingredients.map((ri) => (
                      <span
                        key={ri.id}
                        className={`menu-item-chip ${stockClass(ri.ingredient.stock_level)}`}
                        title={stockLabel(ri.ingredient.stock_level) || undefined}
                      >
                        {ri.ingredient.name}
                        {stockClass(ri.ingredient.stock_level) && (
                          <span className="menu-item-chip-warn">
                            {ri.ingredient.stock_level === 0 ? '✕' : '!'}
                          </span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => handleRemove(item)}>Remove</Button>
              </div>
            );
          })
        )}
      </div>

      {showDrawer && (
        <RecipeDrawer
          menuId={menuId}
          onClose={() => setShowDrawer(false)}
          onAdded={(updated) => setMenu(updated)}
        />
      )}

      {showQR && menu && (
        <div className="qr-backdrop" onClick={() => setShowQR(false)}>
          <div className="qr-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="qr-modal-title">{menu.name}</h2>
            <div ref={qrContainerRef}>
              <QRCodeCanvas
                value={`${window.location.origin}/share/${menu.share_token}`}
                size={220}
                className="qr-code"
              />
            </div>
            <p className="qr-modal-hint">Scan to view the menu</p>
            <div className="qr-modal-actions">
              <Button variant="primary" size="sm" onClick={handlePrintQR}>Print</Button>
              <Button variant="ghost" size="sm" onClick={() => setShowQR(false)}>Close</Button>
            </div>
          </div>
        </div>
      )}

      {activateTarget && (
        <ConfirmModal
          title="Replace active menu?"
          message={`Another menu is currently active. Activating "${menu.name}" will deactivate it. Continue?`}
          confirmLabel="Activate"
          onConfirm={handleActivate}
          onCancel={() => setActivateTarget(false)}
        />
      )}
    </div>
  );
}
