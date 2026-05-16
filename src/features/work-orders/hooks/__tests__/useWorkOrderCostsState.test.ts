import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWorkOrderCostsState } from '../useWorkOrderCostsState';

describe('useWorkOrderCostsState', () => {
  it('uses crypto.randomUUID when available', () => {
    const original = globalThis.crypto;
    const deterministicUuid = '11111111-1111-4111-8111-111111111111';
    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      value: {
        randomUUID: () => deterministicUuid,
      },
    });
    try {
      const { result } = renderHook(() => useWorkOrderCostsState([]));
      act(() => {
        result.current.resetCostsWithMinimum([]);
      });
      expect(result.current.costs).toHaveLength(1);
      expect(result.current.costs[0].id).toBe(deterministicUuid);
    } finally {
      Object.defineProperty(globalThis, 'crypto', {
        configurable: true,
        value: original,
      });
    }
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
