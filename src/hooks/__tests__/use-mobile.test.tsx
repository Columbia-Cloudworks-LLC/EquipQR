import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';

const MOBILE_QUERY = '(max-width: 767px)';

describe('useIsMobile', () => {
  const originalMatchMedia = window.matchMedia;

  afterEach(() => {
    vi.resetModules();
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: originalMatchMedia,
    });
  });

  it('imports without throwing when window.matchMedia is unavailable', async () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: undefined,
    });
    vi.resetModules();

    await expect(import('@/hooks/use-mobile')).resolves.toBeDefined();
  });

  it('returns false when matchMedia is unavailable', async () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: undefined,
    });
    vi.resetModules();
    const { useIsMobile } = await import('@/hooks/use-mobile');

    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  it('returns true when matchMedia reports a mobile viewport', async () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query === MOBILE_QUERY,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
    vi.resetModules();
    const { useIsMobile } = await import('@/hooks/use-mobile');

    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });
});
