import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';

const HOVER_CAPABLE_QUERY = '(hover: hover) and (pointer: fine)';

describe('useHoverCapable', () => {
  const originalMatchMedia = window.matchMedia;

  afterEach(() => {
    vi.resetModules();
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: originalMatchMedia,
    });
  });

  it('returns false when matchMedia is unavailable', async () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: undefined,
    });
    vi.resetModules();
    const { useHoverCapable } = await import('@/hooks/use-hover-capable');

    const { result } = renderHook(() => useHoverCapable());
    expect(result.current).toBe(false);
  });

  it('returns true on hover-capable desktop pointers', async () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query === HOVER_CAPABLE_QUERY,
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
    const { useHoverCapable } = await import('@/hooks/use-hover-capable');

    const { result } = renderHook(() => useHoverCapable());
    expect(result.current).toBe(true);
  });

  it('returns false on touch-first devices', async () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query !== HOVER_CAPABLE_QUERY,
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
    const { useHoverCapable } = await import('@/hooks/use-hover-capable');

    const { result } = renderHook(() => useHoverCapable());
    expect(result.current).toBe(false);
  });
});
