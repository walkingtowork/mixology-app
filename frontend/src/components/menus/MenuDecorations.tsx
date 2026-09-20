
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

/** Unit maple leaf, radius 1, centred on its blade with the stem pointing down. */
const MAPLE_PATH =
  'M0,-1 L.18,-.56 L.47,-.68 L.37,-.31 L.8,-.39 L.58,-.05 L.98,.15 L.55,.29 ' +
  'L.65,.57 L.25,.45 L.19,.9 L.07,.58 L.07,1.06 L-.07,1.06 L-.07,.58 L-.19,.9 ' +
  'L-.25,.45 L-.65,.57 L-.55,.29 L-.98,.15 L-.58,-.05 L-.8,-.39 L-.37,-.31 ' +
  'L-.47,-.68 L-.18,-.56 Z';

/** Unit oak leaf, radius 1 — used for the fallen leaf in the pumpkin cluster. */
const OAK_PATH =
  'M0,-1 C.3,-.95 .28,-.75 .45,-.72 C.62,-.7 .6,-.45 .42,-.38 C.6,-.3 .66,-.05 .44,.02 ' +
  'C.64,.12 .6,.4 .38,.42 C.5,.6 .3,.8 .12,.66 L.08,1.05 L-.08,1.05 L-.12,.66 ' +
  'C-.3,.8 -.5,.6 -.38,.42 C-.6,.4 -.64,.12 -.44,.02 C-.66,-.05 -.6,-.3 -.42,-.38 ' +
  'C-.6,-.45 -.62,-.7 -.45,-.72 C-.28,-.75 -.3,-.95 0,-1 Z';

type LeafProps = {
  x: number;
  y: number;
  r: number;
  angle?: number;
  fill: string;
  opacity?: number;
};

function Leaf({ d, x, y, r, angle = 0, fill, opacity = 1 }: LeafProps & { d: string }) {
  return (
    <path
      d={d}
      transform={`translate(${x},${y}) rotate(${angle}) scale(${r})`}
      fill={fill}
      opacity={opacity}
    />
  );
}

const MapleLeaf = (props: LeafProps) => <Leaf d={MAPLE_PATH} {...props} />;
const OakLeaf = (props: LeafProps) => <Leaf d={OAK_PATH} {...props} />;

/**
 * One pumpkin, built from overlapping ellipses so the outer pair reads as ribs.
 * Drawn darkest-outward-first; `r` is roughly half the pumpkin's width.
 */
function Pumpkin({
  x, y, r, outer, mid, core, stem = '#4D7C0F',
}: {
  x: number; y: number; r: number; outer: string; mid: string; core: string; stem?: string;
}) {
  return (
    <g transform={`translate(${x},${y}) scale(${r})`}>
      <path d="M0,-.92 C.04,-1.16 .26,-1.3 .44,-1.18"
        stroke={stem} strokeWidth={0.14} fill="none" strokeLinecap="round" />
      <ellipse cx={-0.6} cy={0} rx={0.4} ry={0.86} fill={outer} />
      <ellipse cx={0.6} cy={0} rx={0.4} ry={0.86} fill={outer} />
      <ellipse cx={-0.31} cy={0} rx={0.48} ry={0.95} fill={mid} />
      <ellipse cx={0.31} cy={0} rx={0.48} ry={0.95} fill={mid} />
      <ellipse cx={0} cy={0} rx={0.53} ry={1} fill={core} />
    </g>
  );
}

export function MapleArt({ size = 220 }: ArtProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 220 220" aria-hidden="true">
      {/* Main branch entering off-canvas top-right, cascading down-left —
          deliberately echoing the ume composition it replaces. */}
      <path d="M 228 -5 C 200 20 170 34 146 64 C 126 86 104 94 76 120 C 56 137 36 160 10 200"
        stroke={BRANCH} strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <path d="M 146 64 C 162 46 181 38 204 26"
        stroke={BRANCH} strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <path d="M 101 96 C 120 80 136 76 150 68"
        stroke={BRANCH} strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <path d="M 76 120 C 92 107 106 104 116 99"
        stroke={BRANCH} strokeWidth="1.4" fill="none" strokeLinecap="round" />

      <MapleLeaf x={150} y={58} r={21} angle={24} fill="#C2410C" />
      <MapleLeaf x={201} y={24} r={15} angle={-14} fill="#EA580C" />
      <MapleLeaf x={99} y={98} r={18} angle={12} fill="#D97706" />
      <MapleLeaf x={118} y={78} r={12} angle={-38} fill="#CA8A04" />
      <MapleLeaf x={62} y={136} r={13} angle={40} fill="#C2410C" />
      <MapleLeaf x={26} y={178} r={10} angle={-20} fill="#D97706" opacity={0.8} />
      <MapleLeaf x={178} y={52} r={8} angle={52} fill="#CA8A04" opacity={0.75} />
    </svg>
  );
}

export function PumpkinArt({ size = 210 }: ArtProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 210 210" aria-hidden="true">
      <Pumpkin x={74} y={148} r={40} outer="#C2410C" mid="#EA580C" core="#F97316" />
      <Pumpkin x={140} y={170} r={26} outer="#C2410C" mid="#EA580C" core="#F97316" />
      {/* Pale gourd, lighter so it reads as a different squash */}
      <Pumpkin x={168} y={186} r={18} outer="#CA8A04" mid="#CA8A04" core="#FCD34D" />

      <OakLeaf x={30} y={178} r={22} angle={-52} fill="#A16207" />

      {/* Vine and tendril curl */}
      <path d="M 20 150 C 34 140 30 126 42 120 C 54 114 50 100 62 96"
        stroke="#4D7C0F" strokeWidth="2" fill="none" strokeLinecap="round" opacity={0.8} />
      <path d="M 110 104 C 118 96 130 98 130 108 C 130 118 116 120 112 112"
        stroke="#4D7C0F" strokeWidth="1.8" fill="none" strokeLinecap="round" opacity={0.7} />
    </svg>
  );
}
