/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearEquipmentCardTransitionState,
  getEquipmentCardTransitionState,
  resetEquipmentCardTransitionStoreForTests,
  setEquipmentCardTransitionState,
} from '@/features/equipment/transitions/equipmentCardTransitionStore';
import {
  EQUIPMENT_VIEW_TRANSITION,
  getEquipmentViewTransitionStyle,
} from '@/features/equipment/transitions/equipmentViewTransitionNames';
import { runEquipmentCardTransition } from '@/features/equipment/transitions/runEquipmentCardTransition';
import {
  MAIN_CONTENT_SCROLLPORT_ID,
  scrollMainContentToTop,
} from '@/features/equipment/transitions/scrollMainContentToTop';
import { shouldEnableEquipmentViewTransition } from '@/features/equipment/transitions/supportsViewTransitions';

describe('equipment card transition helpers', () => {
  beforeEach(() => {
    resetEquipmentCardTransitionStoreForTests();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    resetEquipmentCardTransitionStoreForTests();
    document.getElementById(MAIN_CONTENT_SCROLLPORT_ID)?.remove();
  });

  describe('getEquipmentViewTransitionStyle', () => {
    it('returns viewTransitionName only when active', () => {
      expect(getEquipmentViewTransitionStyle('name', false)).toBeUndefined();
      expect(getEquipmentViewTransitionStyle('shell', true)).toEqual({
        viewTransitionName: EQUIPMENT_VIEW_TRANSITION.shell,
      });
      expect(getEquipmentViewTransitionStyle('name', true)).toEqual({
        viewTransitionName: EQUIPMENT_VIEW_TRANSITION.name,
      });
      expect(getEquipmentViewTransitionStyle('image', true)).toEqual({
        viewTransitionName: EQUIPMENT_VIEW_TRANSITION.image,
      });
    });
  });

  describe('shouldEnableEquipmentViewTransition', () => {
    it('skips view transitions when reduced motion is preferred', () => {
      expect(shouldEnableEquipmentViewTransition(true, true)).toBe(false);
    });

    it('skips view transitions when the API is unsupported', () => {
      expect(shouldEnableEquipmentViewTransition(false, false)).toBe(false);
    });

    it('enables view transitions when motion is allowed and API exists', () => {
      expect(shouldEnableEquipmentViewTransition(false, true)).toBe(true);
    });
  });

  describe('scrollMainContentToTop', () => {
    it('sets #main-content and document scrollingElement to 0', () => {
      const main = document.createElement('div');
      main.id = MAIN_CONTENT_SCROLLPORT_ID;
      Object.defineProperty(main, 'scrollTop', { value: 480, writable: true, configurable: true });
      Object.defineProperty(main, 'scrollLeft', { value: 12, writable: true, configurable: true });
      document.body.appendChild(main);

      const scrolling = document.scrollingElement as HTMLElement | null;
      if (scrolling) {
        Object.defineProperty(scrolling, 'scrollTop', {
          value: 900,
          writable: true,
          configurable: true,
        });
      }

      scrollMainContentToTop();

      expect(main.scrollTop).toBe(0);
      expect(main.scrollLeft).toBe(0);
      if (scrolling) {
        expect(scrolling.scrollTop).toBe(0);
      }
    });

    it('uses element.scrollTo with smooth behavior when requested', () => {
      const main = document.createElement('div');
      main.id = MAIN_CONTENT_SCROLLPORT_ID;
      const scrollTo = vi.fn();
      main.scrollTo = scrollTo as unknown as typeof main.scrollTo;
      document.body.appendChild(main);

      scrollMainContentToTop({ behavior: 'smooth' });

      expect(scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'smooth' });
    });

    it('no-ops when #main-content is missing', () => {
      expect(() => scrollMainContentToTop()).not.toThrow();
    });
  });

  describe('runEquipmentCardTransition', () => {
    it('navigates and smooth-scrolls together, then clears after morph', async () => {
      const prefetch = vi.fn().mockResolvedValue(undefined);
      const navigate = vi.fn();
      const scrollToTop = vi.fn();
      let resolveMorph: (() => void) | undefined;
      const waitForViewTransition = vi.fn(
        () =>
          new Promise<void>((resolve) => {
            resolveMorph = resolve;
          }),
      );

      const runPromise = runEquipmentCardTransition(
        { equipmentId: 'eq-1', to: '/dashboard/equipment/eq-1' },
        {
          prefetch,
          navigate,
          scrollToTop,
          reducedMotion: false,
          supportsViewTransition: true,
          waitForPaint: async () => undefined,
          waitForViewTransition,
        },
      );

      expect(getEquipmentCardTransitionState()).toEqual({
        activeEquipmentId: 'eq-1',
        isListTransitioning: true,
      });

      // Flush microtasks through prefetch → navigate → parallel scroll.
      await vi.waitFor(() => {
        expect(navigate).toHaveBeenCalled();
        expect(scrollToTop).toHaveBeenCalled();
      });

      expect(prefetch).toHaveBeenCalledWith('eq-1');
      expect(navigate).toHaveBeenCalledWith('/dashboard/equipment/eq-1', {
        viewTransition: true,
      });
      expect(scrollToTop).toHaveBeenCalledTimes(1);
      expect(scrollToTop).toHaveBeenCalledWith({ behavior: 'smooth' });
      expect(navigate.mock.invocationCallOrder[0]).toBeLessThan(
        scrollToTop.mock.invocationCallOrder[0],
      );
      expect(getEquipmentCardTransitionState().isListTransitioning).toBe(true);

      resolveMorph?.();
      await runPromise;

      expect(waitForViewTransition).toHaveBeenCalledTimes(1);
      expect(getEquipmentCardTransitionState()).toEqual({
        activeEquipmentId: null,
        isListTransitioning: false,
      });
    });

    it('scrolls instantly after navigate when reduced motion skips the morph', async () => {
      const navigate = vi.fn();
      const scrollToTop = vi.fn();
      const waitForViewTransition = vi.fn();

      await runEquipmentCardTransition(
        { equipmentId: 'eq-2', to: '/dashboard/equipment/eq-2' },
        {
          prefetch: vi.fn().mockResolvedValue(undefined),
          navigate,
          scrollToTop,
          reducedMotion: true,
          supportsViewTransition: true,
          waitForPaint: async () => undefined,
          waitForViewTransition,
        },
      );

      expect(navigate).toHaveBeenCalledWith('/dashboard/equipment/eq-2', {
        viewTransition: false,
      });
      expect(waitForViewTransition).not.toHaveBeenCalled();
      expect(scrollToTop).toHaveBeenCalledWith({ behavior: 'auto' });
    });

    it('navigates after prefetch timeout even when prefetch hangs', async () => {
      const navigate = vi.fn();
      const scrollToTop = vi.fn();
      let resolvePrefetch: (() => void) | undefined;
      const hangingPrefetch = () =>
        new Promise<void>((resolve) => {
          resolvePrefetch = resolve;
        });

      const runPromise = runEquipmentCardTransition(
        { equipmentId: 'eq-3', to: '/dashboard/equipment/eq-3' },
        {
          prefetch: hangingPrefetch,
          navigate,
          scrollToTop,
          reducedMotion: false,
          supportsViewTransition: true,
          waitForPaint: async () => undefined,
          waitForViewTransition: async () => undefined,
          prefetchTimeoutMs: 50,
        },
      );

      await vi.advanceTimersByTimeAsync(50);
      await runPromise;

      expect(navigate).toHaveBeenCalledWith('/dashboard/equipment/eq-3', {
        viewTransition: true,
      });
      expect(scrollToTop).toHaveBeenCalledWith({ behavior: 'smooth' });

      resolvePrefetch?.();
    });
  });

  describe('store', () => {
    it('set and clear update active equipment id', () => {
      setEquipmentCardTransitionState({
        activeEquipmentId: 'eq-9',
        isListTransitioning: true,
      });
      expect(getEquipmentCardTransitionState().activeEquipmentId).toBe('eq-9');
      clearEquipmentCardTransitionState();
      expect(getEquipmentCardTransitionState().activeEquipmentId).toBeNull();
    });
  });
});
