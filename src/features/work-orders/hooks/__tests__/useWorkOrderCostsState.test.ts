import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWorkOrderCostsState } from '../useWorkOrderCostsState';

describe('useWorkOrderCostsState', () => {
  it('uses crypto.randomUUID when available', () => {
    const { result } = renderHook(() => useWorkOrderCostsState([]));
    act(() => {
      result.current.resetCostsWithMinimum([]);
    });
    expect(result.current.costs).toHaveLength(1);
    expect(result.current.costs[0].id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it('uses fallback id when crypto.randomUUID is unavailable', () => {
    const original = globalThis.crypto;
    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      value: {},
    });
    try {
      const { result } = renderHook(() => useWorkOrderCostsState([]));
      act(() => {
        result.current.resetCostsWithMinimum([]);
      });
      expect(result.current.costs[0].id).toMatch(/^new-cost-\d+-[a-z0-9]+$/);
    } finally {
      Object.defineProperty(globalThis, 'crypto', {
        configurable: true,
        value: original,
      });
    }
  });
});
