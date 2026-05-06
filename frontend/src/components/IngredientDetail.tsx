import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  fetchIngredient, updateIngredient, deleteIngredient,
  fetchCategories, fetchIngredientRecipes,
  addToBuyList, removeBuyListItem, fetchBuyList,
} from '../services/cocktailsApi';
import type { Ingredient, IngredientCategory, Recipe, BuyListItem, StockLevel } from '../types/cocktails';
import Button from './ui/Button';
import LoadingSpinner from './ui/LoadingSpinner';
import StockBottle from './ui/StockBottle';
import './IngredientDetail.css';

export default function IngredientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const ingredientId = parseInt(id || '0', 10);

  const [ingredient, setIngredient] = useState<Ingredient | null>(null);
  const [categories, setCategories] = useState<IngredientCategory[]>([]);
  const [usedIn, setUsedIn] = useState<Recipe[]>([]);
  const [buyListItem, setBuyListItem] = useState<BuyListItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editCategoryId, setEditCategoryId] = useState<number | null>(null);
  const [editStock, setEditStock] = useState<StockLevel>(100);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [buyListLoading, setBuyListLoading] = useState(false);

  useEffect(() => {
    Promise.all([fetchIngredient(ingredientId), fetchCategories(), fetchIngredientRecipes(ingredientId), fetchBuyList()])
      .then(([ing, cats, recipes, buyList]) => {
        setIngredient(ing);
        setCategories(cats);
        setUsedIn(recipes);
        setEditName(ing.name);
        setEditCategoryId(ing.category?.id ?? null);
        setEditStock(ing.stock_level);
        setBuyListItem(buyList.find((b) => b.ingredient.id === ingredientId) ?? null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [ingredientId]);

  const startEdit = () => {
    if (!ingredient) return;
    setEditName(ingredient.name);
    setEditCategoryId(ingredient.category?.id ?? null);
    setEditStock(ingredient.stock_level);
    setSaveError(null);
    setIsEditing(true);
  };

  const cancelEdit = () => { setIsEditing(false); setSaveError(null); };

  const handleSave = async () => {
    if (!editName.trim()) { setSaveError('Name is required'); return; }
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await updateIngredient(ingredientId, {
        name: editName.trim(),
        category_id: editCategoryId,
        stock_level: editStock,
      });
      setIngredient(updated);
      setIsEditing(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const handleStockChange = async (level: StockLevel) => {
    if (!ingredient) return;
    const updated = await updateIngredient(ingredientId, { stock_level: level });
    setIngredient(updated);
  };

  const handleAddToBuyList = async () => {
    setBuyListLoading(true);
    try {
      const item = await addToBuyList(ingredientId);
      setBuyListItem(item);
    } finally {
      setBuyListLoading(false);
    }
  };

  const handlePurchased = async () => {
    if (!buyListItem) return;
    setBuyListLoading(true);
    try {
      await Promise.all([
        removeBuyListItem(buyListItem.id),
        updateIngredient(ingredientId, { stock_level: 100 }),
      ]);
      const updated = await fetchIngredient(ingredientId);
      setIngredient(updated);
      setBuyListItem(null);
    } finally {
      setBuyListLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      if (usedIn.length > 0) {
        const ok = window.confirm(
          `This ingredient is used in ${usedIn.length} recipe(s). Deleting it will remove it from those recipes. Continue?`
        );
        if (!ok) { setDeleting(false); setConfirmDelete(false); return; }
      }
      await deleteIngredient(ingredientId);
      navigate('/ingredients');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  if (loading) return <LoadingSpinner label="Loading ingredient…" />;

  if (error || !ingredient) {
    return (
      <div className="ingredient-detail">
        <p style={{ color: 'var(--color-danger)', marginBottom: 'var(--space-4)' }}>
          {error ?? 'Ingredient not found.'}
        </p>
        <Button variant="secondary" onClick={() => navigate('/ingredients')}>← Back</Button>
      </div>
    );
  }

  const isLowStock = ingredient.stock_level <= 25;

  return (
    <div className="ingredient-detail">
      <Link to="/ingredients" className="ingredient-detail-back">← Ingredients</Link>

      <h1 className="ingredient-detail-title">
        {isEditing ? (
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') cancelEdit(); }}
          />
        ) : (
          ingredient.name
        )}
      </h1>

      {saveError && <div className="ingredient-detail-save-error">{saveError}</div>}

      <div className="ingredient-detail-section">
        <h2>Category</h2>
        {isEditing ? (
          <select
            value={editCategoryId ?? ''}
            onChange={(e) => setEditCategoryId(e.target.value === '' ? null : parseInt(e.target.value, 10))}
          >
            <option value="">Uncategorized</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        ) : (
          <p className="ingredient-detail-category-value">{ingredient.category?.name ?? 'Uncategorized'}</p>
        )}
      </div>

      <div className="ingredient-detail-section">
        <h2>Stock Level</h2>
        {isEditing ? (
          <StockBottle value={editStock} onChange={setEditStock} />
        ) : (
          <div className="ingredient-stock-row">
            <StockBottle value={ingredient.stock_level} onChange={handleStockChange} />
            {isLowStock && (
              buyListItem ? (
                <Button
                  variant="primary"
                  size="sm"
                  disabled={buyListLoading}
                  onClick={handlePurchased}
                >
                  {buyListLoading ? '…' : 'Mark Purchased'}
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={buyListLoading}
                  onClick={handleAddToBuyList}
                >
                  {buyListLoading ? '…' : 'Add to Buy List'}
                </Button>
              )
            )}
            {buyListItem && !isLowStock && (
              <span className="ingredient-on-buylist">On buy list</span>
            )}
          </div>
        )}
      </div>

      {ingredient.is_generic && (
        <div className="ingredient-detail-section">
          <span className="ingredient-badge" style={{ fontSize: 'var(--text-sm)', padding: 'var(--space-1) var(--space-3)' }}>
            Generic ingredient
          </span>
        </div>
      )}

      {usedIn.length > 0 && (
        <div className="ingredient-detail-section">
          <h2>Used in</h2>
          <ul className="ingredient-used-in">
            {usedIn.map((recipe) => (
              <li key={recipe.id}>
                <Link to={`/recipes/${recipe.id}`}>{recipe.name}</Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="ingredient-detail-actions">
        {isEditing ? (
          <>
            <Button variant="primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
            <Button variant="secondary" onClick={cancelEdit} disabled={saving}>Cancel</Button>
          </>
        ) : (
          <>
            <Button variant="primary" onClick={startEdit}>Edit</Button>
            <div className="ingredient-detail-actions-divider" />
            {confirmDelete ? (
              <>
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>Are you sure?</span>
                <Button variant="danger" size="sm" onClick={handleDelete} disabled={deleting}>
                  {deleting ? 'Deleting…' : 'Yes, delete'}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)} disabled={deleting}>Cancel</Button>
              </>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(true)}
                style={{ color: 'var(--color-danger)' }}>
                Delete
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
