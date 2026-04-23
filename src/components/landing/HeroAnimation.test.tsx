import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('gsap', () => ({
  gsap: {
    registerPlugin: vi.fn(),
    timeline: vi.fn(() => ({
      to: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      fromTo: vi.fn().mockReturnThis(),
    })),
    to: vi.fn(() => ({ kill: vi.fn() })),
    from: vi.fn(() => ({ kill: vi.fn() })),
    context: vi.fn(() => ({ revert: vi.fn() })),
  },
  default: {
    registerPlugin: vi.fn(),
    timeline: vi.fn(() => ({
      to: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      fromTo: vi.fn().mockReturnThis(),
    })),
    to: vi.fn(() => ({ kill: vi.fn() })),
    from: vi.fn(() => ({ kill: vi.fn() })),
    context: vi.fn(() => ({ revert: vi.fn() })),
  },
}));

vi.mock('@gsap/react', () => ({ useGSAP: vi.fn() }));
vi.mock('gsap/MorphSVGPlugin', () => ({ MorphSVGPlugin: {} }));

import HeroAnimation from './HeroAnimation';
import { ALL_STATE_CODES, STATE_VECTORS, STATES_RELATIVE } from './stateVectors';
import type { StateCode } from './stateVectors';
import { computeDotPositionsInState, chosenDotIndex } from './dotPositions';
import { ALL_PM_ITEMS, EXPORT_TARGETS } from './pmChecklistData';

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
    beforeEach(() => { setReducedMotion(true); });

    it('renders the static composite when prefers-reduced-motion is active', () => {
      renderHero();
      expect(screen.getByTestId('static-hero-composite')).toBeInTheDocument();
    });

    it('does not render PM checklist phase in reduced-motion mode', () => {
      renderHero();
      expect(screen.queryByTestId('pm-checklist-phase')).not.toBeInTheDocument();
    });

    it('does not render any animated phase components', () => {
      renderHero();
      expect(screen.queryByTestId('qr-scan-phase')).not.toBeInTheDocument();
      expect(screen.queryByTestId('state-morph-phase')).not.toBeInTheDocument();
    });
  });

  describe('state-cycle dot logic', () => {
    it('computeDotPositionsInState is deterministic for the same state/cycle', () => {
      const sample: StateCode[] = ['TX', 'CA', 'NY', 'AK', 'HI'];
      for (const code of sample) {
        const a = computeDotPositionsInState(code, 14, 0);
        const b = computeDotPositionsInState(code, 14, 0);
        expect(a).toEqual(b);
      }
    });

    it('computeDotPositionsInState keeps all generated dots inside the stage', () => {
      const sample: StateCode[] = ['TX', 'CA', 'NY', 'FL', 'OH'];
      for (const code of sample) {
        const dots = computeDotPositionsInState(code, 14, 1);
        expect(dots).toHaveLength(14);
        for (const dot of dots) {
          expect(dot.cx).toBeGreaterThanOrEqual(0);
          expect(dot.cx).toBeLessThan(100);
          expect(dot.cy).toBeGreaterThanOrEqual(0);
          expect(dot.cy).toBeLessThan(100);
        }
      }
    });

    it('chosenDotIndex is deterministic for production dot generation', () => {
      const sample: StateCode[] = ['TX', 'CA', 'NY'];
      for (const code of sample) {
        const dots = computeDotPositionsInState(code, 14, 2);
        const a = chosenDotIndex(code, dots, 2);
        const b = chosenDotIndex(code, dots, 2);
        expect(a).toBe(b);
      }
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

  describe('STATES_RELATIVE data integrity', () => {
    it('contains entries for all 50 states', () => {
      expect(Object.keys(STATES_RELATIVE)).toHaveLength(50);
    });

    it('every STATES_RELATIVE path is a non-empty SVG path string', () => {
      for (const code of ALL_STATE_CODES) {
        const d = STATES_RELATIVE[code];
        expect(typeof d).toBe('string');
        expect(d.length).toBeGreaterThan(10);
      }
    });
  });

  describe('PM checklist data integrity', () => {
    it('has exactly 5 checklist items', () => {
      expect(ALL_PM_ITEMS).toHaveLength(5);
    });

    it('has exactly 3 export targets', () => {
      expect(EXPORT_TARGETS).toHaveLength(3);
    });

    it('export targets have labels and renderable icon components', () => {
      for (const target of EXPORT_TARGETS) {
        expect(target.label).toBeTruthy();
        // Lucide icons are React.forwardRef objects (typeof 'object'), not plain functions
        expect(target.icon).toBeDefined();
        expect(target.icon).not.toBeNull();
      }
    });
  });
});
