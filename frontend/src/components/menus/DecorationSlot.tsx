import type { DecorationKey } from '../../types/cocktails';
import { DECORATIONS } from './decorationRegistry';

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
