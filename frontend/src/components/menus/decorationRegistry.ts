import type { ComponentType } from 'react';
import type { DecorationKey } from '../../types/cocktails';
import { UmeArt, TacoArt, MapleArt, PumpkinArt } from './MenuDecorations';

export type ArtProps = { size?: number };

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
  maple: { label: 'Maple Branch', Art: MapleArt, composedFor: 'top' },
  pumpkin: { label: 'Pumpkins', Art: PumpkinArt, composedFor: 'bottom' },
  // Sketched but not drawn — they stay in DECORATION_CHOICES so the keys are
  // reserved, and `selectableDecorations()` keeps them out of the picker until
  // they have artwork.
  acorn: { label: 'Acorns & Oak', Art: null, composedFor: 'bottom' },
  wheat: { label: 'Wheat & Dried Grass', Art: null, composedFor: 'bottom' },
};

/**
 * Keys a picker should offer: 'none' plus every decoration that actually has
 * artwork. Registered-but-undrawn entries are hidden rather than shown as blanks.
 */
export function selectableDecorations(): DecorationKey[] {
  return (Object.keys(DECORATIONS) as DecorationKey[])
    .filter(key => key === 'none' || DECORATIONS[key].Art !== null);
}
