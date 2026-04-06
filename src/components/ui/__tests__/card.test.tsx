import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { CardContent } from '../card';

describe('CardContent', () => {
  describe('default (header + body) mode', () => {
    it('renders with pt-0 for flush stacking under CardHeader', () => {
      const { container } = render(<CardContent>Body</CardContent>);
      const el = container.firstElementChild!;
      expect(el.className).toContain('pt-0');
    });
  });

  describe('standalone mode', () => {
    it('renders symmetric padding without pt-0', () => {
      const { container } = render(
        <CardContent standalone>Standalone body</CardContent>,
      );
      const el = container.firstElementChild!;
      expect(el.className).not.toContain('pt-0');
      expect(el.className).toMatch(/p-4/);
    });

    it('allows className overrides alongside standalone', () => {
      const { container } = render(
        <CardContent standalone className="p-3">
          Compact
        </CardContent>,
      );
      const el = container.firstElementChild!;
      expect(el.className).toContain('p-3');
      expect(el.className).not.toContain('pt-0');
    });
  });
});
