import { describe, it, expect, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWorkOrderCostsState } from './useWorkOrderCostsState';

describe('useWorkOrderCostsState', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses crypto.randomUUID when available', () => {
    const deterministicUuid = '11111111-1111-4111-8111-111111111111';
    vi.stubGlobal('crypto', {
      randomUUID: () => deterministicUuid,
    });
    const { result } = renderHook(() => useWorkOrderCostsState([]));
    act(() => {
      result.current.resetCostsWithMinimum([]);
    });
    expect(result.current.costs).toHaveLength(1);
    expect(result.current.costs[0].id).toBe(deterministicUuid);
  });

  it('uses fallback id when crypto.randomUUID is unavailable', () => {
    vi.stubGlobal('crypto', {});
    const { result } = renderHook(() => useWorkOrderCostsState([]));
    act(() => {
      result.current.resetCostsWithMinimum([]);
    });
    expect(result.current.costs[0].id).toMatch(/^new-cost-\d+-[a-z0-9]+$/);
  });
});
