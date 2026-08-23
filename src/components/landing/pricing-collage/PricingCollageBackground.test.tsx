import { beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { PricingCollageBackground } from '@/components/landing/pricing-collage/PricingCollageBackground';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

function stubMatchMedia(reduced: boolean): void {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string) => ({
      matches: reduced && query === REDUCED_MOTION_QUERY,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }),
  });
}

describe('PricingCollageBackground', () => {
  beforeEach(() => {
    cleanup();
    stubMatchMedia(false);
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
      expect(image).toHaveClass('h-1/2', 'w-full', 'object-cover');
      expect(image.className).not.toMatch(/cv-auto/);
    }
  });

  it('animates tracks when reduced motion is off', () => {
    const { container } = render(<PricingCollageBackground />);

    expect(container.querySelectorAll('.pricing-collage-track-animated')).toHaveLength(4);
    expect(container.querySelectorAll('.pricing-collage-duration-48000')).toHaveLength(1);
    expect(container.querySelectorAll('.pricing-collage-duration-56000')).toHaveLength(1);
    expect(container.querySelectorAll('.pricing-collage-duration-52000')).toHaveLength(1);
    expect(container.querySelectorAll('.pricing-collage-duration-64000')).toHaveLength(1);
  });

  it('omits the animation class when reduced motion is on', () => {
    stubMatchMedia(true);

    const { container } = render(<PricingCollageBackground />);

    expect(container.querySelectorAll('.pricing-collage-track-animated')).toHaveLength(0);
  });
});
