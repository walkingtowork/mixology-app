import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createMenu } from '../../services/cocktailsApi';
import Button from '../ui/Button';
import FormField from '../ui/FormField';
import './MenuForm.css';

export default function MenuForm() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const menu = await createMenu(name.trim());
      navigate(`/menus/${menu.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create menu.');
      setSaving(false);
    }
  };

  return (
    <div className="menu-form">
      <Link to="/menus" className="recipe-form-back">← Back to menus</Link>
      <h1>New Menu</h1>
      <form onSubmit={handleSubmit}>
        <div className="recipe-form-fields">
          <FormField label="Menu name" htmlFor="menu-name" error={!name.trim() && error ? 'Name is required' : undefined}>
            <input
              id="menu-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Summer Cocktail Party"
              className="form-input"
              autoFocus
            />
          </FormField>
        </div>
        {error && <p className="recipe-form-error">{error}</p>}
        <div className="recipe-form-actions">
          <Button type="submit" variant="primary" disabled={saving || !name.trim()}>
            {saving ? 'Creating…' : 'Create Menu'}
          </Button>
          <Link to="/menus" className="btn btn-secondary">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
