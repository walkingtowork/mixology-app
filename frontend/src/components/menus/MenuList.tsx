import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchMenus, deleteMenu } from '../../services/cocktailsApi';
import type { Menu } from '../../types/cocktails';
import ConfirmModal from '../ui/ConfirmModal';
import LoadingSpinner from '../ui/LoadingSpinner';
import Button from '../ui/Button';
import './MenuList.css';

export default function MenuList() {
  const [menus, setMenus] = useState<Menu[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Menu | null>(null);

  useEffect(() => {
    fetchMenus()
      .then(setMenus)
      .catch(() => setError('Failed to load menus.'))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMenu(deleteTarget.id);
      setMenus((prev) => prev.filter((m) => m.id !== deleteTarget.id));
    } catch {
      setError('Failed to delete menu.');
    } finally {
      setDeleteTarget(null);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="menu-list">
      <div className="menu-list-header">
        <h2>Menus</h2>
        <Link to="/menus/new" className="btn btn-primary menu-list-header-new">+ New Menu</Link>
      </div>

      {error && <p className="menu-list-error">{error}</p>}

      {menus.length === 0 ? (
        <div className="menu-list-empty">
          <p>No menus yet.</p>
          <Link to="/menus/new" className="btn btn-primary">Create your first menu</Link>
        </div>
      ) : (
        <div className="menu-cards">
          {menus.map((menu) => (
            <div key={menu.id} className={`menu-card ${menu.is_active ? 'menu-card--active' : ''}`}>
              <div className="menu-card-body">
                <div className="menu-card-name">
                  {menu.name}
                  {menu.is_active && <span className="menu-badge-active">Active</span>}
                  {menu.is_published && !menu.is_active && <span className="menu-badge-published">Published</span>}
                </div>
                <div className="menu-card-meta">
                  <span>{menu.item_count} drink{menu.item_count !== 1 ? 's' : ''}</span>
                  <span>{new Date(menu.created_at).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="menu-card-actions">
                <Link to={`/menus/${menu.id}`} className="btn btn-secondary btn-sm">Plan</Link>
                <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(menu)}>Delete</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Link to="/menus/new" className="menu-fab" aria-label="New menu">+</Link>

      {deleteTarget && (
        <ConfirmModal
          title="Delete menu?"
          message={`"${deleteTarget.name}" will be permanently deleted.`}
          confirmLabel="Delete"
          danger
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
