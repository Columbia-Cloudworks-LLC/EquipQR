import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import {
  resetEquipmentCardTransitionStoreForTests,
  setEquipmentCardTransitionState,
} from '@/features/equipment/transitions/equipmentCardTransitionStore';
import { MAIN_CONTENT_SCROLLPORT_ID } from '@/features/equipment/transitions/scrollMainContentToTop';
import { useScrollMainContentToTopOnMount } from '@/features/equipment/transitions/useScrollMainContentToTopOnMount';

describe('EquipmentDetails scroll-on-mount', () => {
  beforeEach(() => {
    resetEquipmentCardTransitionStoreForTests();
    document.getElementById(MAIN_CONTENT_SCROLLPORT_ID)?.remove();
  });

  afterEach(() => {
    resetEquipmentCardTransitionStoreForTests();
    document.getElementById(MAIN_CONTENT_SCROLLPORT_ID)?.remove();
  });

  it('scrolls #main-content and the document to the top when the equipment id is set', () => {
    const main = document.createElement('div');
    main.id = MAIN_CONTENT_SCROLLPORT_ID;
    Object.defineProperty(main, 'scrollTop', { value: 320, writable: true, configurable: true });
    Object.defineProperty(main, 'scrollLeft', { value: 0, writable: true, configurable: true });
    document.body.appendChild(main);

    const scrolling = document.scrollingElement as HTMLElement | null;
    if (scrolling) {
      Object.defineProperty(scrolling, 'scrollTop', {
        value: 640,
        writable: true,
        configurable: true,
      });
    }

    renderHook(() => useScrollMainContentToTopOnMount('eq-scroll-1'));

    expect(main.scrollTop).toBe(0);
    if (scrolling) {
      expect(scrolling.scrollTop).toBe(0);
    }
  });

  it('re-scrolls when the equipment id changes', () => {
    const main = document.createElement('div');
    main.id = MAIN_CONTENT_SCROLLPORT_ID;
    Object.defineProperty(main, 'scrollTop', { value: 200, writable: true, configurable: true });
    Object.defineProperty(main, 'scrollLeft', { value: 0, writable: true, configurable: true });
    document.body.appendChild(main);

    const { rerender } = renderHook(
      ({ id }: { id: string }) => useScrollMainContentToTopOnMount(id),
      { initialProps: { id: 'eq-a' } },
    );

    expect(main.scrollTop).toBe(0);

    main.scrollTop = 180;
    rerender({ id: 'eq-b' });

    expect(main.scrollTop).toBe(0);
  });

  it('does not jump scroll while a card→details morph is in progress', () => {
    const main = document.createElement('div');
    main.id = MAIN_CONTENT_SCROLLPORT_ID;
    Object.defineProperty(main, 'scrollTop', { value: 420, writable: true, configurable: true });
    Object.defineProperty(main, 'scrollLeft', { value: 0, writable: true, configurable: true });
    document.body.appendChild(main);

    setEquipmentCardTransitionState({
      activeEquipmentId: 'eq-morphing',
      isListTransitioning: true,
    });

    renderHook(() => useScrollMainContentToTopOnMount('eq-morphing'));

    expect(main.scrollTop).toBe(420);
  });
});
