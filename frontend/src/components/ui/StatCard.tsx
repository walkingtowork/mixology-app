import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import './StatCard.css';

type StatCardProps = {
  /** The figure itself. Falls back to an em dash while data is loading. */
  value: ReactNode;
  label: string;
  /** When set, the card becomes a link and picks up the hover lift. */
  to?: string;
  /**
   * 'number' is the large display figure; 'text' is for values that are words
   * rather than digits, like the name of the most-ordered drink.
   */
  variant?: 'number' | 'text';
};

export default function StatCard({ value, label, to, variant = 'number' }: StatCardProps) {
  const content = (
    <>
      <span className={`stat-card-value stat-card-value--${variant}`}>{value}</span>
      <span className="stat-card-label">{label}</span>
    </>
  );

  if (to) {
    return <Link to={to} className="stat-card">{content}</Link>;
  }
  return <div className="stat-card">{content}</div>;
}
