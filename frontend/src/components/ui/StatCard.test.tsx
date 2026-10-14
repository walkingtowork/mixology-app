import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderAt } from '../../test/render';
import StatCard from './StatCard';

describe('StatCard', () => {
  it('shows the value and its label', () => {
    renderAt('/', <StatCard value={49} label="Recipes" />);
    expect(screen.getByText('49')).toBeInTheDocument();
    expect(screen.getByText('Recipes')).toBeInTheDocument();
  });

  it('is a link when given somewhere to go', () => {
    renderAt('/', <StatCard value={49} label="Recipes" to="/recipes" />);
    expect(screen.getByRole('link', { name: /49\s*Recipes/ })).toHaveAttribute('href', '/recipes');
  });

  it('is not a link otherwise', () => {
    renderAt('/', <StatCard value="Negroni" label="Most ordered" variant="text" />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
