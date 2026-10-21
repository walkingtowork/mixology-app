import { describe, expect, it } from 'vitest';
import { GLASS_OPTIONS } from '../../types/cocktails';
import { renderAt } from '../../test/render';
import GlassIcon from './GlassIcon';

describe('GlassIcon', () => {
  it.each(GLASS_OPTIONS)('draws the $label, named on hover', ({ value, label }) => {
    const { container } = renderAt('/', <GlassIcon glass={value} />);
    const icon = container.firstElementChild;
    expect(icon).toHaveAttribute('title', label);
    expect(icon?.firstElementChild).not.toBeNull();
  });

  it('draws nothing without a glass', () => {
    const { container } = renderAt('/', <GlassIcon glass={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
