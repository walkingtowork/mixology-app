import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { DECORATIONS, selectableDecorations } from './decorationRegistry';
import { BlackCatArt } from './MenuDecorations';

describe('decorationRegistry', () => {
  it('offers the Halloween set in the picker', () => {
    expect(selectableDecorations()).toEqual(
      expect.arrayContaining(['ghost', 'black_cat', 'cobweb', 'bats']),
    );
  });

  it.each(selectableDecorations().filter(key => key !== 'none'))('%s draws an svg', key => {
    const { Art } = DECORATIONS[key];
    const { container } = render(Art ? <Art size={64} /> : null);
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('gives each moon its own mask when the same art appears twice', () => {
    // The picker shows every decoration once per slot; a shared id would cut both moons with one mask.
    const { container } = render(<><BlackCatArt /><BlackCatArt /></>);
    const ids = [...container.querySelectorAll('mask')].map(m => m.id);
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
  });
});
