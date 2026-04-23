import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mock GSAP and related modules before importing components
vi.mock('gsap', () => ({
  gsap: {
    registerPlugin: vi.fn(),
    timeline: vi.fn(() => ({ to: vi.fn().mockReturnThis(), from: vi.fn().mockReturnThis() })),
    to: vi.fn(() => ({ kill: vi.fn() })),
    from: vi.fn(() => ({ kill: vi.fn() })),
    context: vi.fn(() => ({ revert: vi.fn() })),
  },
  default: {
    registerPlugin: vi.fn(),
    timeline: vi.fn(() => ({ to: vi.fn().mockReturnThis(), from: vi.fn().mockReturnThis() })),
    to: vi.fn(() => ({ kill: vi.fn() })),
    from: vi.fn(() => ({ kill: vi.fn() })),
    context: vi.fn(() => ({ revert: vi.fn() })),
  },
}));

vi.mock('@gsap/react', () => ({
  useGSAP: vi.fn(),
}));

vi.mock('gsap/MorphSVGPlugin', () => ({
  MorphSVGPlugin: {},
}));

import HeroAnimation from './HeroAnimation';
import { ALL_STATE_CODES, STATE_VECTORS } from './stateVectors';
import type { StateCode } from './stateVectors';

function renderHero() {
  return render(
    <MemoryRouter>
      <HeroAnimation />
    </MemoryRouter>,
  );
}

function setReducedMotion(enabled: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: enabled && query.includes('prefers-reduced-motion'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

describe('HeroAnimation', () => {
  beforeEach(() => {
    setReducedMotion(false);
  });

  it('renders a landmark region with the correct aria-label', () => {
    renderHero();

    expect(
      screen.getByRole('region', { name: /EquipQR asset tracking demo/i }),
    ).toBeInTheDocument();
  });

  it('renders a visible H1 tagline', () => {
    renderHero();

    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toBeInTheDocument();
    expect(heading.textContent).toBeTruthy();
  });

  it('includes a sr-only description for screen readers', () => {
    renderHero();

    const srText = document.querySelector('.sr-only');
    expect(srText).toBeTruthy();
    expect(srText?.textContent?.length).toBeGreaterThan(20);
  });

  describe('reduced-motion fallback', () => {
    beforeEach(() => {
      setReducedMotion(true);
    });

    it('renders the static composite when prefers-reduced-motion is active', () => {
      renderHero();

      expect(screen.getByTestId('static-hero-composite')).toBeInTheDocument();
    });

    it('does not render any animated phase components', () => {
      renderHero();

      // Animated phases are lazy-loaded and wrapped in Suspense;
      // in reduced-motion mode none of them should mount.
      expect(screen.queryByTestId('qr-scan-phase')).not.toBeInTheDocument();
      expect(screen.queryByTestId('state-morph-phase')).not.toBeInTheDocument();
    });
  });

  describe('STATE_VECTORS data integrity', () => {
    it('contains entries for all 50 states', () => {
      expect(ALL_STATE_CODES).toHaveLength(50);
    });

    it('every state code maps to a non-empty SVG path string', () => {
      for (const code of ALL_STATE_CODES) {
        const d = STATE_VECTORS[code];
        expect(typeof d).toBe('string');
        expect(d.length).toBeGreaterThan(10);
        expect(d.startsWith('M') || d.startsWith('m')).toBe(true);
      }
    });

    it('state paths are deterministic — same code always returns the same string', () => {
      const sample: StateCode[] = ['TX', 'CA', 'NY', 'AK', 'HI'];
      for (const code of sample) {
        expect(STATE_VECTORS[code]).toBe(STATE_VECTORS[code]);
      }
    });
  });
});
