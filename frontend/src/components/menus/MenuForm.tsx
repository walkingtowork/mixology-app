import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { createMenu, updateMenu, fetchMenu } from '../../services/cocktailsApi';
import type { DecorationKey } from '../../types/cocktails';
import { DECORATIONS, selectableDecorations } from './decorationRegistry';
import Button from '../ui/Button';
import FormField from '../ui/FormField';
import LoadingSpinner from '../ui/LoadingSpinner';
import './MenuForm.css';

const DECORATION_OPTIONS = selectableDecorations();

function DecorationPicker({
  slot,
  value,
  onChange,
}: {
  slot: 'top' | 'bottom';
  value: DecorationKey;
  onChange: (key: DecorationKey) => void;
}) {
  const groupName = `decoration-${slot}`;

  return (
    <div className="decoration-picker" role="radiogroup" aria-label={`${slot} decoration`}>
      {DECORATION_OPTIONS.map(key => {
        const { label, Art, composedFor } = DECORATIONS[key];
        const selected = value === key;
        const offSlot = composedFor !== undefined && composedFor !== slot;

        return (
          <label
            key={key}
            className={`decoration-tile${selected ? ' selected' : ''}`}
            title={offSlot ? `${label} — drawn for the ${composedFor} corner` : label}
          >
            <input
              type="radio"
              id={`${groupName}-${key}`}
              name={groupName}
              value={key}
              checked={selected}
              onChange={() => onChange(key)}
            />
            <span className="decoration-tile-art">
              {Art ? <Art size={64} /> : <span className="decoration-tile-none">None</span>}
            </span>
            <span className="decoration-tile-label">{label}</span>
            {offSlot && <span className="decoration-tile-hint">for {composedFor}</span>}
          </label>
        );
      })}
    </div>
  );
}

export default function MenuForm() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [name, setName] = useState('');
  const [topDecoration, setTopDecoration] = useState<DecorationKey>('none');
  const [bottomDecoration, setBottomDecoration] = useState<DecorationKey>('none');
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetchMenu(Number(id))
      .then(menu => {
        setName(menu.name);
        setTopDecoration(menu.top_decoration);
        setBottomDecoration(menu.bottom_decoration);
      })
      .catch(() => setError('Failed to load menu.'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      if (isEdit) {
        await updateMenu(Number(id), {
          name: name.trim(),
          top_decoration: topDecoration,
          bottom_decoration: bottomDecoration,
        });
        navigate(`/menus/${id}`);
      } else {
        const menu = await createMenu(name.trim(), {
          top_decoration: topDecoration,
          bottom_decoration: bottomDecoration,
        });
        navigate(`/menus/${menu.id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save menu.');
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  const backTo = isEdit ? `/menus/${id}` : '/menus';

  return (
    <div className="menu-form">
      <Link to={backTo} className="recipe-form-back">
        {isEdit ? '← Back to menu' : '← Back to menus'}
      </Link>
      <h1>{isEdit ? 'Edit Menu' : 'New Menu'}</h1>
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

          <fieldset className="decoration-fieldset">
            <legend>Decorations</legend>
            <p className="decoration-help">
              Artwork for the corners of your shared menu page. Guests see it behind the
              drink list.
            </p>

            <span className="decoration-slot-label">Top left</span>
            <DecorationPicker slot="top" value={topDecoration} onChange={setTopDecoration} />

            <span className="decoration-slot-label">Bottom right</span>
            <DecorationPicker slot="bottom" value={bottomDecoration} onChange={setBottomDecoration} />
          </fieldset>
        </div>

        {error && <p className="recipe-form-error">{error}</p>}

        <div className="recipe-form-actions">
          <Button type="submit" variant="primary" disabled={saving || !name.trim()}>
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Menu'}
          </Button>
          <Link to={backTo} className="btn btn-secondary">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
