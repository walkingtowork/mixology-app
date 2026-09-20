import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchMenuStats, fetchRecipe } from '../../services/cocktailsApi';
import type { MenuStats as MenuStatsData, GuestStat, DrinkStat, Recipe } from '../../types/cocktails';
import StatCard from '../ui/StatCard';
import LoadingSpinner from '../ui/LoadingSpinner';
import './MenuStats.css';

const GUESTS_SHOWN = 15;

function formatSpan(first: string | null, last: string | null): string | null {
  if (!first || !last) return null;
  const start = new Date(first);
  const end = new Date(last);
  const day = start.toLocaleDateString(undefined, { month: 'long', day: 'numeric' });
  const time = (d: Date) => d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  const sameDay = start.toDateString() === end.toDateString();
  return sameDay
    ? `${day} · ${time(start)} – ${time(end)}`
    : `${day} – ${end.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}`;
}

function DrinkRow({
  drink,
  rank,
  maxCount,
  expanded,
  recipe,
  loading,
  failed,
  onToggle,
}: {
  drink: DrinkStat;
  rank: number;
  maxCount: number;
  expanded: boolean;
  recipe?: Recipe;
  loading: boolean;
  failed: boolean;
  onToggle: () => void;
}) {
  return (
    <li className="drink-bar-item">
      <button type="button" className="drink-bar" onClick={onToggle} aria-expanded={expanded}>
        <span className="drink-bar-rank">{rank}</span>
        <span className="drink-bar-name">
          {drink.name}
          {!drink.on_menu && <span className="drink-bar-off"> · removed</span>}
        </span>
        <span className="drink-bar-track">
          <span
            className="drink-bar-fill"
            style={{ width: `${(drink.count / maxCount) * 100}%` }}
          />
        </span>
        <span className="drink-bar-count">{drink.count}</span>
      </button>

      {expanded && (
        <div className="menu-item-details drink-bar-details">
          {loading && <p className="menu-item-detail-meta">Loading recipe…</p>}
          {failed && <p className="menu-item-detail-meta">Couldn't load this recipe.</p>}
          {recipe && (
            <>
              {recipe.description && (
                <p className="menu-item-detail-description">{recipe.description}</p>
              )}
              <table className="menu-item-detail-ingredients">
                <tbody>
                  {recipe.ingredients.map(ri => (
                    <tr key={ri.id}>
                      <td className="menu-item-detail-amount">{ri.amount} {ri.unit}</td>
                      <td className="menu-item-detail-ing">{ri.ingredient.name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {recipe.garnish && (
                <p className="menu-item-detail-meta"><span>Garnish:</span> {recipe.garnish}</p>
              )}
              {recipe.notes && (
                <p className="menu-item-detail-meta menu-item-detail-notes"><span>Notes:</span> {recipe.notes}</p>
              )}
            </>
          )}
        </div>
      )}
    </li>
  );
}

function GuestRow({ guest }: { guest: GuestStat }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <li className="guest-row">
      <button
        type="button"
        className="guest-row-header"
        onClick={() => setExpanded(v => !v)}
        aria-expanded={expanded}
      >
        <span className="guest-row-caret" aria-hidden="true">{expanded ? '▾' : '▸'}</span>
        <span className="guest-row-name">{guest.name}</span>
        <span className="guest-row-count">{guest.count}</span>
      </button>
      {expanded && (
        <ul className="guest-row-drinks">
          {guest.drinks.map(drink => (
            <li key={drink.name}>
              <span>{drink.name}</span>
              <span className="guest-row-drink-count">{drink.count}</span>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

export default function MenuStats() {
  const { id } = useParams<{ id: string }>();
  const menuId = Number(id);

  const [stats, setStats] = useState<MenuStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAllGuests, setShowAllGuests] = useState(false);
  const [expandedDrink, setExpandedDrink] = useState<number | null>(null);
  // Recipes are fetched on first expand rather than bundled into the stats
  // response, which would mean shipping every ingredient of every drink to
  // render a page that is mostly counts. Cached so reopening is instant.
  const [recipes, setRecipes] = useState<Record<number, Recipe>>({});
  const [loadingRecipe, setLoadingRecipe] = useState<number | null>(null);
  const [failedRecipes, setFailedRecipes] = useState<Set<number>>(new Set());

  const toggleDrink = async (recipeId: number) => {
    if (expandedDrink === recipeId) {
      setExpandedDrink(null);
      return;
    }
    setExpandedDrink(recipeId);
    if (recipes[recipeId]) return;

    setLoadingRecipe(recipeId);
    setFailedRecipes(prev => {
      const next = new Set(prev);
      next.delete(recipeId);
      return next;
    });
    try {
      const recipe = await fetchRecipe(recipeId);
      setRecipes(prev => ({ ...prev, [recipeId]: recipe }));
    } catch {
      setFailedRecipes(prev => new Set(prev).add(recipeId));
    } finally {
      setLoadingRecipe(null);
    }
  };

  // Refreshing swaps the data in place rather than dropping back to the
  // spinner, so a mid-party refresh doesn't lose your scroll position.
  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      setStats(await fetchMenuStats(menuId));
      setError(null);
    } catch {
      setError('Failed to load stats.');
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, [menuId]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingSpinner />;
  if (error || !stats) {
    return <div className="menu-stats-error">{error || 'Stats not found.'}</div>;
  }

  const ordered = stats.drinks.filter(d => d.count > 0);
  const unordered = stats.drinks.filter(d => d.count === 0);
  const offMenu = ordered.filter(d => !d.on_menu);
  const maxCount = ordered.length ? ordered[0].count : 0;
  const topDrink = ordered[0];
  const span = formatSpan(stats.first_order_at, stats.last_order_at);

  const visibleGuests = showAllGuests ? stats.guests : stats.guests.slice(0, GUESTS_SHOWN);

  return (
    <div className="menu-stats">
      <div className="menu-stats-header">
        <Link to={`/menus/${menuId}`} className="recipe-form-back">← {stats.menu_name}</Link>
        <div className="menu-stats-title-row">
          <h1 className="menu-stats-title">Stats</h1>
          <button type="button" className="orders-refresh-btn" onClick={load} disabled={refreshing}>
            ↻ Refresh
          </button>
        </div>
      </div>

      {stats.total_orders === 0 ? (
        <div className="menu-stats-empty">
          {stats.drinks.length === 0 ? (
            <>
              <p className="menu-stats-empty-title">This menu has no drinks yet.</p>
              <Link to={`/menus/${menuId}`} className="btn btn-primary">Plan the menu</Link>
            </>
          ) : (
            <>
              <p className="menu-stats-empty-title">No orders yet.</p>
              <p className="menu-stats-empty-hint">
                Stats appear here once guests start ordering from the share link.
              </p>
              <Link to={`/menus/${menuId}`} className="btn btn-secondary">Back to menu</Link>
            </>
          )}
        </div>
      ) : (
        <>
          <div className="menu-stats-tiles">
            <StatCard value={stats.total_orders} label="Drinks served" />
            <StatCard value={stats.unique_guests} label="Guests" />
            <StatCard
              variant="text"
              value={topDrink.name}
              label={`Top drink · ${topDrink.count}`}
            />
          </div>
          {span && <p className="menu-stats-span">{span}</p>}

          <section className="menu-stats-section">
            <h2 className="menu-stats-section-title">By drink</h2>
            <ol className="drink-bars">
              {ordered.map((drink, i) => (
                <DrinkRow
                  key={drink.recipe_id}
                  drink={drink}
                  rank={i + 1}
                  maxCount={maxCount}
                  expanded={expandedDrink === drink.recipe_id}
                  recipe={recipes[drink.recipe_id]}
                  loading={loadingRecipe === drink.recipe_id}
                  failed={failedRecipes.has(drink.recipe_id)}
                  onToggle={() => toggleDrink(drink.recipe_id)}
                />
              ))}
            </ol>
            {offMenu.length > 0 && (
              <p className="menu-stats-footnote">
                {offMenu.length === 1 ? 'One drink was' : `${offMenu.length} drinks were`} removed
                from the menu after being ordered. Those orders still count toward the total.
              </p>
            )}
          </section>

          {unordered.length > 0 && (
            <section className="menu-stats-section">
              <h2 className="menu-stats-section-title">
                Nobody ordered · {unordered.length}
              </h2>
              <ul className="unordered-list">
                {unordered.map(drink => (
                  <li key={drink.recipe_id}>{drink.name}</li>
                ))}
              </ul>
            </section>
          )}

          <section className="menu-stats-section">
            <h2 className="menu-stats-section-title">By guest</h2>
            <ul className="guest-list">
              {visibleGuests.map(guest => (
                <GuestRow key={guest.name} guest={guest} />
              ))}
            </ul>
            {stats.guests.length > GUESTS_SHOWN && (
              <button
                type="button"
                className="menu-stats-more"
                onClick={() => setShowAllGuests(v => !v)}
              >
                {showAllGuests
                  ? 'Show fewer'
                  : `Show all ${stats.guests.length} guests`}
              </button>
            )}
            <p className="menu-stats-footnote">
              Guests type their own name, so two people who enter the same name are
              counted as one.
            </p>
          </section>
        </>
      )}
    </div>
  );
}
