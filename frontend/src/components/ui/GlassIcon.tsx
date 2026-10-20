import { useId } from 'react';
import type { GlassType } from '../../types/cocktails';

// The Glencairn's tulip shape (a round bowl narrowing to a chimney) can't be drawn with
// boxes like the other glasses, so it is an SVG styled to match them: 1.5px black outline,
// the same amber tint, highlight and drop shadow, on the same 50px grid.
const GLENCAIRN_BOWL =
  'M19.5 7C19.5 10.5 19 12.5 17.5 15C14 19.5 12 24 12 28.5C12 33.5 17.5 37 25 37' +
  'C32.5 37 38 33.5 38 28.5C38 24 36 19.5 32.5 15C31 12.5 30.5 10.5 30.5 7';

function GlencairnGlass() {
  // Ids are per instance: several Glencairns can be on one page.
  const id = useId();
  const tint = `${id}-tint`, solid = `${id}-solid`, shine = `${id}-shine`, shadow = `${id}-shadow`;
  const amber = (stops: number[]) => stops.map((opacity, i) => (
    <stop key={i} offset={i / (stops.length - 1)} stopColor="rgb(180, 83, 9)" stopOpacity={opacity} />
  ));
  return (
    <svg className="glencairn-glass" width="50" height="50" viewBox="0 0 50 50" aria-hidden="true">
      <defs>
        <linearGradient id={tint}>{amber([0.14, 0.07, 0.14])}</linearGradient>
        <linearGradient id={solid}>{amber([0.32, 0.16, 0.32])}</linearGradient>
        <linearGradient id={shine}>
          <stop offset="0" stopColor="#fff" stopOpacity="0.5" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <filter id={shadow} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="1.4" floodOpacity="0.28" />
        </filter>
      </defs>
      <g filter={`url(#${shadow})`}>
        <path d={`${GLENCAIRN_BOWL}Z`} fill={`url(#${tint})`} />
        <path d="M22.5 36.6H27.5L27.8 42.5H22.2Z" fill={`url(#${solid})`} />
        <ellipse cx="25" cy="44" rx="10.5" ry="2.4" fill={`url(#${solid})`} />
      </g>
      <path d="M14.8 26C14.8 22 16.5 19 19 16.5L20.5 17.5C18.6 20 17.5 23 17.5 26.5Z" fill={`url(#${shine})`} />
      <g fill="none" stroke="#000" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round">
        <path d={GLENCAIRN_BOWL} />
        <path d="M18.6 7H31.4" />
        <path d="M22.5 37L22.2 42M27.5 37L27.8 42" />
        <ellipse cx="25" cy="44" rx="10.5" ry="2.4" />
      </g>
    </svg>
  );
}

function renderGlass(glass: GlassType) {
  switch (glass) {
    case 'rocks':
      return <div className="rocks-glass"><div className="glass"/><div className="ice"/></div>;
    case 'old_fashioned':
      return <div className="old-fashioned-glass"><div className="glass"/></div>;
    case 'martini':
      return <div className="martini-glass"><div className="glass"/><div className="glass-left-edge"/><div className="glass-right-edge"/><div className="stem"/><div className="base"/></div>;
    case 'coupe':
      return <div className="coupe-glass"><div className="bowl"/><div className="stem"/><div className="base"/></div>;
    case 'champagne_flute':
      return <div className="champagne-flute"><div className="glass"/><div className="stem"/><div className="base"/></div>;
    case 'collins':
      return <div className="collins-glass"><div className="glass"/><div className="ice ice-1"/><div className="ice ice-2"/><div className="ice ice-3"/></div>;
    case 'shot':
      return <div className="shot-glass"><div className="glass"><div className="heel"/></div></div>;
    case 'glencairn':
      return <GlencairnGlass />;
    default:
      return null;
  }
}

const GLASS_LABELS: Record<GlassType, string> = {
  rocks: 'Rocks',
  old_fashioned: 'Old Fashioned',
  martini: 'Martini',
  coupe: 'Coupe',
  champagne_flute: 'Champagne Flute',
  collins: 'Collins',
  shot: 'Shot',
  glencairn: 'Glencairn',
};

interface GlassIconProps {
  glass: GlassType | null | undefined;
  size?: number;
  /** Show the glass's name on hover. Off where the name would be noise, as in an avatar. */
  tooltip?: boolean;
}

export default function GlassIcon({ glass, size = 50, tooltip = true }: GlassIconProps) {
  if (!glass) return null;
  const icon = renderGlass(glass);
  if (!icon) return null;
  const title = tooltip ? GLASS_LABELS[glass] : undefined;

  if (size === 50) {
    return <div title={title}>{icon}</div>;
  }

  const scale = size / 50;
  return (
    <div
      title={title}
      style={{ width: size, height: size, flexShrink: 0, overflow: 'visible', position: 'relative' }}
    >
      <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left', position: 'absolute' }}>
        {icon}
      </div>
    </div>
  );
}
