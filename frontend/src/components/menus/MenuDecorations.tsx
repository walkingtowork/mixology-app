import type { ComponentType } from 'react';
import type { DecorationKey } from '../../types/cocktails';

/**
 * Decoration artwork for the public menu page.
 *
 * Each `*Art` component is a plain <svg> with no positioning of its own — placement,
 * corner and opacity belong to `DecorationSlot` so the same drawing can be used in a
 * slot, a picker thumbnail, or anywhere else. Every Art component takes an optional
 * `size` so it can be scaled down for pickers.
 *
 * Note that artwork is *composed* for a corner even though placement is generic: the
 * ume branch bleeds in from off-canvas top-right, so it reads best in the top slot.
 * Art is never auto-flipped between slots — mirroring was tried and reverted (7c62399).
 */

type ArtProps = { size?: number };

const BRANCH = '#5C3A2E';
const PETAL = '#F9A8D4';
const PETAL_DARK = '#F472B6';
const CENTER = '#FDE68A';

function Blossom({ x, y, r = 11, angle = 0 }: { x: number; y: number; r?: number; angle?: number }) {
  return (
    <g transform={`translate(${x},${y}) rotate(${angle})`}>
      {[0, 72, 144, 216, 288].map(a => (
        <ellipse key={a} cx={0} cy={-r * 0.85} rx={r * 0.55} ry={r * 0.75}
          fill={PETAL} transform={`rotate(${a})`} />
      ))}
      <circle cx={0} cy={0} r={r * 0.36} fill={CENTER} />
      {[30, 90, 150, 210, 270, 330].map(a => (
        <line key={a}
          x1={0} y1={0}
          x2={Math.sin(a * Math.PI / 180) * r * 0.65}
          y2={-Math.cos(a * Math.PI / 180) * r * 0.65}
          stroke="#F59E0B" strokeWidth={0.8} />
      ))}
    </g>
  );
}

export function UmeArt({ size = 220 }: ArtProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 220 220" aria-hidden="true">
      {/* Main branch from top-right, cascading down-left */}
      <path d="M 228 -5 C 200 18 172 32 148 62 C 128 84 105 92 78 118 C 58 135 38 158 12 198"
        stroke={BRANCH} strokeWidth="3.5" fill="none" strokeLinecap="round" />
      {/* Sub-branch upper */}
      <path d="M 148 62 C 163 44 182 36 205 24"
        stroke={BRANCH} strokeWidth="2.2" fill="none" strokeLinecap="round" />
      {/* Sub-branch mid */}
      <path d="M 103 94 C 122 78 138 74 152 66"
        stroke={BRANCH} strokeWidth="1.6" fill="none" strokeLinecap="round" />
      {/* Sub-branch lower */}
      <path d="M 78 118 C 94 105 108 102 118 97"
        stroke={BRANCH} strokeWidth="1.4" fill="none" strokeLinecap="round" />

      {/* Blossoms */}
      <Blossom x={146} y={60} r={13} angle={18} />
      <Blossom x={203} y={22} r={10} angle={-12} />
      <Blossom x={100} y={96} r={11.5} angle={8} />
      <Blossom x={150} y={64} r={7} angle={35} />

      {/* Buds */}
      <ellipse cx={76} cy={120} rx={4} ry={6.5} fill={PETAL_DARK} transform="rotate(-28, 76, 120)" opacity={0.85} />
      <ellipse cx={40} cy={160} rx={3.5} ry={5.5} fill={PETAL_DARK} transform="rotate(-15, 40, 160)" opacity={0.75} />
      <ellipse cx={14} cy={196} rx={3} ry={5} fill={PETAL_DARK} transform="rotate(5, 14, 196)" opacity={0.65} />
    </svg>
  );
}

export function TacoArt({ size = 210 }: ArtProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 210 210" aria-hidden="true">
      {/* Taco — centered around (80, 125), tilted slightly */}
      <g transform="translate(80, 125) rotate(-18)">
        {/* Lettuce (back layer) */}
        <path d="M -52 -12 C -40 -32 -22 -24 -5 -30 C 12 -36 32 -24 52 -12"
          fill="#86EFAC" />
        {/* Avocado accent */}
        <ellipse cx="-18" cy="-20" rx="7" ry="9" fill="#4ADE80" opacity={0.7} />
        <ellipse cx="-18" cy="-20" rx="3" ry="4" fill="#4A1800" opacity={0.5} />
        {/* Meat */}
        <path d="M -44 -6 C -30 -18 -14 -12 0 -16 C 14 -12 30 -18 44 -6 L 40 12 C 26 6 12 10 0 7 C -12 10 -26 6 -40 12 Z"
          fill="#4A1800" />
        {/* Cheese drizzle */}
        <path d="M -28 -4 C -18 -10 -6 -7 6 -9 C 18 -7 27 -11 36 -6"
          stroke="#FCD34D" strokeWidth="3" fill="none" strokeLinecap="round" />
        {/* Taco shell back */}
        <path d="M -58 -18 C -55 28 -32 60 0 60 C 32 60 55 28 58 -18 Z"
          fill="#D97706" />
        {/* Taco shell front fold */}
        <path d="M -58 -18 C -40 -12 -22 -8 0 -6 C 22 -8 40 -12 58 -18"
          fill="#F59E0B" />
        {/* Shell highlight */}
        <path d="M -50 -15 C -36 -10 -20 -7 -6 -5"
          stroke="#FEF3C7" strokeWidth="1.8" fill="none" opacity={0.65} strokeLinecap="round" />
      </g>

      {/* Lime wedge */}
      <g transform="translate(158, 62) rotate(28)">
        <path d="M 0 0 L 0 -24 A 24 24 0 0 0 -24 0 Z" fill="#86EFAC" />
        <path d="M 0 0 L 0 -24 A 24 24 0 0 0 -24 0 Z" fill="none" stroke="#4D7C0F" strokeWidth="1.2" />
        {/* Lime segments */}
        <line x1={0} y1={0} x2={-12} y2={-12} stroke="#4D7C0F" strokeWidth={0.9} />
        <line x1={0} y1={0} x2={-17} y2={-5} stroke="#4D7C0F" strokeWidth={0.9} />
        <line x1={0} y1={0} x2={-5} y2={-17} stroke="#4D7C0F" strokeWidth={0.9} />
        {/* Rind */}
        <path d="M 0 0 L 0 -24 A 24 24 0 0 0 -24 0 Z" fill="none" stroke="#A3E635" strokeWidth="3"
          strokeDasharray="0 22 100" />
      </g>

      {/* Scattered spice dots */}
      {[
        [32, 168, 2.2, '#F59E0B', 0.5],
        [50, 178, 1.8, '#D97706', 0.45],
        [18, 182, 1.6, '#4A1800', 0.4],
        [62, 162, 1.5, '#F59E0B', 0.4],
        [130, 155, 1.8, '#FCD34D', 0.35],
      ].map(([x, y, r, fill, opacity], i) => (
        <circle key={i} cx={x as number} cy={y as number} r={r as number}
          fill={fill as string} opacity={opacity as number} />
      ))}
    </svg>
  );
}

type DecorationEntry = {
  label: string;
  /** null means "draw nothing" — used by `none`. */
  Art: ComponentType<ArtProps> | null;
  /** Which slot the artwork was composed for. Advisory only; either slot is allowed. */
  composedFor?: 'top' | 'bottom';
};

/**
 * Every selectable decoration. Keys must stay in sync with DECORATION_CHOICES in
 * backend/cocktails/models.py — a menu row can hold any key this map once had.
 */
export const DECORATIONS: Record<DecorationKey, DecorationEntry> = {
  none: { label: 'None', Art: null },
  ume: { label: 'Ume Blossom Branch', Art: UmeArt, composedFor: 'top' },
  taco: { label: 'Taco', Art: TacoArt, composedFor: 'bottom' },
  // Fall set — artwork still to be drawn (task 3.0).
  maple: { label: 'Maple Branch', Art: null, composedFor: 'top' },
  acorn: { label: 'Acorns & Oak', Art: null, composedFor: 'bottom' },
  pumpkin: { label: 'Pumpkins', Art: null, composedFor: 'bottom' },
  wheat: { label: 'Wheat & Dried Grass', Art: null, composedFor: 'bottom' },
};

/** Decoration keys in the order they should appear in a picker. */
export const DECORATION_KEYS = Object.keys(DECORATIONS) as DecorationKey[];

/**
 * Renders one decoration pinned to a corner of the public menu.
 *
 * Top slot sits top-left, bottom slot sits bottom-right — matching the layout the
 * hardcoded ume/taco pair established. Unknown or artless keys render nothing: a key
 * dropped from this map later will still be sitting in the database.
 */
export function DecorationSlot({ position, name }: { position: 'top' | 'bottom'; name: DecorationKey }) {
  const Art = DECORATIONS[name]?.Art;
  if (!Art) return null;

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        ...(position === 'top' ? { top: 0, left: 0 } : { bottom: 0, right: 0 }),
        lineHeight: 0,
        pointerEvents: 'none',
        zIndex: 0,
        opacity: 0.3,
      }}
    >
      <Art />
    </div>
  );
}
