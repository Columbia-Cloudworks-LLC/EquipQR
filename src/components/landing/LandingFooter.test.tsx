import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LandingFooter from './LandingFooter';

describe('LandingFooter', () => {
  it('applies the same rest-state underline classes to every footer link', () => {
    render(
      <MemoryRouter>
        <LandingFooter />
      </MemoryRouter>,
    );

    const footer = screen.getByRole('contentinfo');
    const links = within(footer).getAllByRole('link');

    expect(links.length).toBeGreaterThan(0);

    for (const link of links) {
      expect(link).toHaveClass('no-underline');
      expect(link).not.toHaveClass('underline');
    }
  });
});
