import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { CardContent } from '../card';

describe('CardContent', () => {
  describe('default mode', () => {
    it('sets data-slot for CSS-layer base padding and flush stacking', () => {
      const { container } = render(<CardContent>Body</CardContent>);
      const el = container.firstElementChild!;
      expect(el).toHaveAttribute('data-slot', 'card-content');
    });

    it('does not set data-standalone', () => {
      const { container } = render(<CardContent>Body</CardContent>);
      const el = container.firstElementChild!;
      expect(el).not.toHaveAttribute('data-standalone');
    });

    it('does not inline pt-0 in className', () => {
      const { container } = render(<CardContent>Body</CardContent>);
      const el = container.firstElementChild!;
      expect(el.className).not.toContain('pt-0');
    });
  });

  describe('standalone mode', () => {
    it('sets data-standalone to opt out of flush stacking', () => {
      const { container } = render(
        <CardContent standalone>Standalone body</CardContent>,
      );
      const el = container.firstElementChild!;
      expect(el).toHaveAttribute('data-slot', 'card-content');
      expect(el).toHaveAttribute('data-standalone');
    });

    it('allows className overrides alongside standalone', () => {
      const { container } = render(
        <CardContent standalone className="p-3">
          Compact
        </CardContent>,
      );
      const el = container.firstElementChild!;
      expect(el.className).toContain('p-3');
      expect(el).toHaveAttribute('data-standalone');
    });
  });
});
