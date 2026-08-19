import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';

const mockUsePrefersReducedMotion = vi.fn<() => boolean>();
vi.mock('@/hooks/use-prefers-reduced-motion', () => ({
  usePrefersReducedMotion: () => mockUsePrefersReducedMotion(),
}));

import PricingCollageBackground from './PricingCollageBackground';

const SUPABASE_URL = 'https://custom-supabase.example.test';

describe('PricingCollageBackground', () => {
  beforeEach(() => {
    cleanup();
    vi.stubEnv('VITE_SUPABASE_URL', SUPABASE_URL);
    mockUsePrefersReducedMotion.mockReset();
    mockUsePrefersReducedMotion.mockReturnValue(false);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('renders four duplicate-strip columns as eight decorative images', () => {
    const { container } = render(<PricingCollageBackground />);

    const root = container.firstElementChild;
    expect(root).toHaveAttribute('aria-hidden', 'true');
    expect(root).toHaveClass('absolute', 'inset-0', 'overflow-hidden', 'pointer-events-none');

    const images = container.querySelectorAll('img');
    expect(images).toHaveLength(8);
    for (const image of images) {
      expect(image).toHaveAttribute('alt', '');
      expect(image).toHaveAttribute('decoding', 'async');
      expect(image).toHaveAttribute('loading', 'lazy');
      expect(image.className).not.toMatch(/cv-auto/);
    }
  });

  it('animates tracks when reduced motion is off', () => {
    const { container } = render(<PricingCollageBackground />);

    expect(container.querySelectorAll('.pricing-collage-track-animated')).toHaveLength(4);
  });

  it('omits the animation class when reduced motion is on', () => {
    mockUsePrefersReducedMotion.mockReturnValue(true);

    const { container } = render(<PricingCollageBackground />);

    expect(container.querySelectorAll('.pricing-collage-track-animated')).toHaveLength(0);
  });
});
