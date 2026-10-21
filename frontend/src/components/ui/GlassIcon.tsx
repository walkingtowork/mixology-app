import { useId } from 'react';
import type { GlassType } from '../../types/cocktails';

// Curved glasses (the Glencairn, Hurricane and tiki mug) can't be drawn with boxes like the
// others, so they are SVGs styled to match them: 1.5px black outline, the same amber tint,
// highlight and drop shadow, on the same 50px grid.
const OUTLINE = {
  fill: 'none', stroke: '#000', strokeWidth: 1.5, strokeLinejoin: 'round', strokeLinecap: 'round',
} as const;

interface Paints {
  /** Clear glass. */
  tint: string;
  /** Solid glass: stems, feet. */
  solid: string;
  /** Glazed ceramic, for the tiki mug. */
  clay: string;
  shine: string;
  shadow: string;
}

function SvgGlass({ className, children }: { className: string; children: (paint: Paints) => React.ReactNode }) {
  // Ids are per instance: several of the same glass can be on one page.
  const id = useId();
  const url = (name: string) => `url(#${id}-${name})`;
  const amber = (stops: number[]) => stops.map((opacity, i) => (
    <stop key={i} offset={i / (stops.length - 1)} stopColor="rgb(180, 83, 9)" stopOpacity={opacity} />
  ));
  return (
    <svg className={className} width="50" height="50" viewBox="0 0 50 50" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-tint`}>{amber([0.14, 0.07, 0.14])}</linearGradient>
        <linearGradient id={`${id}-solid`}>{amber([0.32, 0.16, 0.32])}</linearGradient>
        <linearGradient id={`${id}-clay`}>{amber([0.55, 0.36, 0.55])}</linearGradient>
        <linearGradient id={`${id}-shine`}>
          <stop offset="0" stopColor="#fff" stopOpacity="0.5" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <filter id={`${id}-shadow`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="1.4" floodOpacity="0.28" />
        </filter>
      </defs>
      {children({ tint: url('tint'), solid: url('solid'), clay: url('clay'), shine: url('shine'), shadow: url('shadow') })}
    </svg>
  );
}

// A tulip bowl narrowing to a short chimney, 33px tall: between the shot and the Collins.
const GLENCAIRN_BOWL =
  'M19.5 13.76C19.5 16.04 19 17.34 17.5 18.96C14 22.65 12 26.34 12 30.03C12 34.13 17.5 37 25 37' +
  'C32.5 37 38 34.13 38 30.03C38 26.34 36 22.65 32.5 18.96C31 17.34 30.5 16.04 30.5 13.76';

function GlencairnGlass() {
  return (
    <SvgGlass className="glencairn-glass">
      {paint => (
        <>
          <g filter={paint.shadow}>
            <path d={`${GLENCAIRN_BOWL}Z`} fill={paint.tint} />
            <path d="M22.5 36.6H27.5L27.8 42.5H22.2Z" fill={paint.solid} />
            <ellipse cx="25" cy="44" rx="10.5" ry="2.4" fill={paint.solid} />
          </g>
          <path d="M14.8 27.98C14.8 24.7 16.5 22.24 19 20.19L20.5 21.01C18.6 23.06 17.5 25.52 17.5 28.39Z" fill={paint.shine} />
          <g {...OUTLINE}>
            <path d={GLENCAIRN_BOWL} />
            <path d="M18.6 13.76H31.4" />
            <path d="M22.5 37L22.2 42M27.5 37L27.8 42" />
            <ellipse cx="25" cy="44" rx="10.5" ry="2.4" />
          </g>
        </>
      )}
    </SvgGlass>
  );
}

// Flared lip, pinched waist, round bulb, then a short stem and foot.
const HURRICANE_BOWL =
  'M15.5 5C16.5 9 19.5 12 20 16C20.5 20.5 14 24.5 14 31C14 36.5 18.5 40 25 40' +
  'C31.5 40 36 36.5 36 31C36 24.5 29.5 20.5 30 16C30.5 12 33.5 9 34.5 5';

function HurricaneGlass() {
  return (
    <SvgGlass className="hurricane-glass">
      {paint => (
        <>
          <g filter={paint.shadow}>
            <path d={`${HURRICANE_BOWL}Z`} fill={paint.tint} />
            <path d="M23.3 39.7H26.7L27 44.5H23Z" fill={paint.solid} />
            <ellipse cx="25" cy="45.6" rx="9" ry="2.1" fill={paint.solid} />
          </g>
          <path d="M16.8 31C16.8 27.5 18.5 25 21 23L22.3 24C20.4 26 19.4 28.3 19.4 31.5Z" fill={paint.shine} />
          <path d="M17.6 6.5C18.4 9.5 20 11.5 20.8 14L21.8 13.6C21.2 11 20.2 8.8 19.4 6.5Z" fill={paint.shine} />
          <g {...OUTLINE}>
            <path d={HURRICANE_BOWL} />
            <path d="M14.6 5H35.4" />
            <path d="M23.3 40L23 43.6M26.7 40L27 43.6" />
            <ellipse cx="25" cy="45.6" rx="9" ry="2.1" />
          </g>
        </>
      )}
    </SvgGlass>
  );
}

// A ceramic barrel with a carved face. Opaque, so it takes the deeper clay tint.
const TIKI_MUG_BODY = 'M16 8C14.4 18 14.4 36 16 46H34C35.6 36 35.6 18 34 8Z';

function TikiMug() {
  return (
    <SvgGlass className="tiki-mug">
      {paint => (
        <>
          <path d={TIKI_MUG_BODY} fill={paint.clay} filter={paint.shadow} />
          <path d="M17.2 11C16.4 19 16.4 33 17.2 42H19.2C18.6 33 18.6 19 19.2 11Z" fill={paint.shine} />
          <g {...OUTLINE}>
            <path d={TIKI_MUG_BODY} />
            {/* Brows, eyes, nose, teeth, and a groove above the base. */}
            <path d="M18.5 16.5Q21.5 14 24.3 16.5M25.7 16.5Q28.5 14 31.5 16.5" strokeWidth="1.2" />
            <path
              d="M19 20.5Q21.3 18.6 23.6 20.5Q21.3 22.4 19 20.5ZM26.4 20.5Q28.7 18.6 31 20.5Q28.7 22.4 26.4 20.5Z"
              strokeWidth="1" fill="#000" fillOpacity="0.45"
            />
            <path d="M25 18.5V26.5M22.3 28Q25 25.5 27.7 28" strokeWidth="1.1" />
            <path d="M18.5 32H31.5V37.5H18.5ZM21.75 32V37.5M25 32V37.5M28.25 32V37.5" strokeWidth="1" />
            <path d="M15.3 41.5H34.7" strokeWidth="0.8" opacity="0.5" />
          </g>
        </>
      )}
    </SvgGlass>
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
    case 'hurricane':
      return <HurricaneGlass />;
    case 'tiki_mug':
      return <TikiMug />;
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
  hurricane: 'Hurricane',
  tiki_mug: 'Tiki Mug',
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
