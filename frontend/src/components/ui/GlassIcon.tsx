import type { GlassType } from '../../types/cocktails';

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
      return <div className="shot-glass"><div className="glass"/></div>;
    case 'glencairn':
      return <div className="glencairn-glass"><div className="bowl"/><div className="neck"/><div className="base"/></div>;
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
}

export default function GlassIcon({ glass, size = 50 }: GlassIconProps) {
  if (!glass) return null;
  const icon = renderGlass(glass);
  if (!icon) return null;

  if (size === 50) {
    return <div title={GLASS_LABELS[glass]}>{icon}</div>;
  }

  const scale = size / 50;
  return (
    <div
      title={GLASS_LABELS[glass]}
      style={{ width: size, height: size, flexShrink: 0, overflow: 'visible', position: 'relative' }}
    >
      <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left', position: 'absolute' }}>
        {icon}
      </div>
    </div>
  );
}
