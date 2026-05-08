import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  fetchMenu,
  removeMenuItem,
  activateMenu,
  fetchMenus,
  reorderMenuItems,
} from '../../services/cocktailsApi';
import type { Menu, MenuItem, Recipe } from '../../types/cocktails';
import Button from '../ui/Button';
import GlassIcon from '../ui/GlassIcon';
import LoadingSpinner from '../ui/LoadingSpinner';
import ConfirmModal from '../ui/ConfirmModal';
import RecipeDrawer from './RecipeDrawer';
import EditRecipeDrawer from './EditRecipeDrawer';
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

interface SortableItemProps {
  item: MenuItem;
  expanded: boolean;
  onToggle: () => void;
  onRemove: () => void;
  onEdit: () => void;
}

function SortableMenuItem({ item, expanded, onToggle, onRemove, onEdit }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const badIngredients = item.recipe.ingredients.filter(ri => ri.ingredient.stock_level <= 25);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`menu-item-card ${badIngredients.length > 0 ? 'menu-item-card--warn' : ''} ${expanded ? 'menu-item-card--expanded' : ''}`}
    >
      {/* Drag handle */}
      <button
        className="menu-item-drag-handle"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
        tabIndex={0}
      >
        <svg width="14" height="20" viewBox="0 0 10 16" fill="currentColor">
          <circle cx="3" cy="2" r="1.5"/>
          <circle cx="7" cy="2" r="1.5"/>
          <circle cx="3" cy="8" r="1.5"/>
          <circle cx="7" cy="8" r="1.5"/>
          <circle cx="3" cy="14" r="1.5"/>
          <circle cx="7" cy="14" r="1.5"/>
        </svg>
      </button>

      {/* Clickable card body */}
      <div className="menu-item-body" onClick={onToggle} role="button" tabIndex={0} onKeyDown={e => e.key === 'Enter' && onToggle()}>
        <div className="menu-item-collapsed">
          <div className="menu-item-name">{item.recipe.name}</div>
          <div className="menu-item-ingredients">
            {item.recipe.ingredients.map(ri => (
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

        {expanded && (
          <div className="menu-item-details" onClick={e => e.stopPropagation()}>
            {item.recipe.description && (
              <p className="menu-item-detail-description">{item.recipe.description}</p>
            )}
            <table className="menu-item-detail-ingredients">
              <tbody>
                {item.recipe.ingredients.map(ri => (
                  <tr key={ri.id}>
                    <td className="menu-item-detail-amount">{ri.amount} {ri.unit}</td>
                    <td className={`menu-item-detail-ing ${stockClass(ri.ingredient.stock_level)}`}>
                      {ri.ingredient.name}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {item.recipe.garnish && (
              <p className="menu-item-detail-meta"><span>Garnish:</span> {item.recipe.garnish}</p>
            )}
            {item.recipe.notes && (
              <p className="menu-item-detail-meta menu-item-detail-notes"><span>Notes:</span> {item.recipe.notes}</p>
            )}
            <div className="menu-item-detail-actions">
              <Button variant="secondary" size="sm" onClick={onEdit}>Edit Recipe</Button>
              <Button variant="ghost" size="sm" onClick={onRemove}>Remove from menu</Button>
            </div>
          </div>
        )}
      </div>

      {/* Glass icon — right side */}
      <div className="menu-item-glass">
        <GlassIcon glass={item.recipe.glass} size={40} />
      </div>
    </div>
  );
}

export default function MenuDetail() {
  const { id } = useParams<{ id: string }>();
  const menuId = Number(id);
  const [menu, setMenu] = useState<Menu | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [expandedItemId, setExpandedItemId] = useState<number | null>(null);
  const [activateTarget, setActivateTarget] = useState(false);
  const [hasOtherActive, setHasOtherActive] = useState(false);
  const [activating, setActivating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const qrContainerRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
  );

  useEffect(() => {
    Promise.all([fetchMenu(menuId), fetchMenus()])
      .then(([m, all]) => {
        setMenu(m);
        setHasOtherActive(all.some(x => x.is_active && x.id !== menuId));
      })
      .catch(() => setError('Failed to load menu.'))
      .finally(() => setLoading(false));
  }, [menuId]);

  const handleRemove = async (item: MenuItem) => {
    try {
      await removeMenuItem(item.id);
      setMenu(prev => prev ? { ...prev, items: prev.items.filter(i => i.id !== item.id) } : prev);
      if (expandedItemId === item.id) setExpandedItemId(null);
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

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !menu) return;

    const oldIndex = menu.items.findIndex(i => i.id === active.id);
    const newIndex = menu.items.findIndex(i => i.id === over.id);
    const reordered = arrayMove(menu.items, oldIndex, newIndex).map((item, idx) => ({
      ...item,
      order: idx,
    }));
    setMenu({ ...menu, items: reordered });

    try {
      await reorderMenuItems(menuId, reordered.map(i => ({ id: i.id, order: i.order })));
    } catch {
      setError('Failed to save new order.');
      const original = await fetchMenu(menuId);
      setMenu(original);
    }
  };

  const handleRecipeSaved = (updatedRecipe: Recipe) => {
    setMenu(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        items: prev.items.map(item =>
          item.recipe.id === updatedRecipe.id ? { ...item, recipe: updatedRecipe } : item
        ),
      };
    });
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

  const lowStockItems = menu.items.filter(item =>
    item.recipe.ingredients.some(ri => ri.ingredient.stock_level <= 25)
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
            <Button variant="secondary" size="sm" className="btn-icon" onClick={handleShare} title={copied ? 'Copied!' : 'Copy share link'}>
              {copied ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
              )}
            </Button>
            <Button variant="secondary" size="sm" className="btn-icon" onClick={() => setShowQR(true)} title="Show QR code">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="6" y="6" width="1" height="1" fill="currentColor"/><rect x="17" y="6" width="1" height="1" fill="currentColor"/><rect x="6" y="17" width="1" height="1" fill="currentColor"/><path d="M14 14h1v1h-1zM19 14h1v1h-1zM14 19h1v1h-1zM19 19h1v1h-1zM17 17h1v1h-1z"/></svg>
            </Button>
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
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={menu.items.map(i => i.id)} strategy={verticalListSortingStrategy}>
              {menu.items.map(item => (
                <SortableMenuItem
                  key={item.id}
                  item={item}
                  expanded={expandedItemId === item.id}
                  onToggle={() => setExpandedItemId(prev => prev === item.id ? null : item.id)}
                  onRemove={() => handleRemove(item)}
                  onEdit={() => setEditingRecipe(item.recipe)}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>

      {showDrawer && (
        <RecipeDrawer
          menuId={menuId}
          onClose={() => setShowDrawer(false)}
          onAdded={updated => setMenu(updated)}
        />
      )}

      {editingRecipe && (
        <EditRecipeDrawer
          recipe={editingRecipe}
          onClose={() => setEditingRecipe(null)}
          onSaved={handleRecipeSaved}
        />
      )}

      {showQR && menu && (
        <div className="qr-backdrop" onClick={() => setShowQR(false)}>
          <div className="qr-modal" onClick={e => e.stopPropagation()}>
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
