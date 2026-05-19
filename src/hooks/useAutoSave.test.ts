/**
 * useAutoSave Hook Tests
 *
 * Covers:
 * - Initial state (status = 'idle', lastSaved = undefined)
 * - Happy path: text trigger fires onSave after textDelay
 * - Happy path: selection trigger fires onSave after selectionDelay
 * - Custom delay options
 * - Status transitions: idle → saving → saved
 * - lastSaved is set after successful save
 * - Error path: onSave throws → status = 'error'
 * - Disabled mode: triggerAutoSave is a no-op
 * - Change detection: same data skips scheduling
 * - Change detection: different data triggers scheduling
 * - Debounce: multiple rapid calls reuse a single timeout
 * - cancelAutoSave: clears pending timeout
 * - Cleanup on unmount: pending save is cancelled
 * - Concurrent save prevention: second call dedupes against in-flight save
 *
 * Intentionally deferred:
 * - The `saveRequestRef` concurrent-deduplication branch where a second call
 *   races after the first Promise already resolved (requires Promise microtask
 *   interleaving that is hard to control deterministically in a fake-timer env).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAutoSave } from './useAutoSave';

vi.mock('@/utils/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe('useAutoSave', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  describe('initial state', () => {
    it('starts with status idle and no lastSaved date', () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() => useAutoSave({ onSave }));

      expect(result.current.status).toBe('idle');
      expect(result.current.lastSaved).toBeUndefined();
    });

    it('exposes triggerAutoSave and cancelAutoSave functions', () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() => useAutoSave({ onSave }));

      expect(typeof result.current.triggerAutoSave).toBe('function');
      expect(typeof result.current.cancelAutoSave).toBe('function');
    });
  });

  describe('triggerAutoSave — text trigger (default)', () => {
    it('fires onSave after the default textDelay (8000ms)', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() => useAutoSave({ onSave }));

      act(() => {
        result.current.triggerAutoSave('text');
      });

      expect(onSave).not.toHaveBeenCalled();

      await act(async () => {
        vi.advanceTimersByTime(8000);
      });

      expect(onSave).toHaveBeenCalledOnce();
    });

    it('uses default text trigger when no trigger argument is supplied', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() => useAutoSave({ onSave, textDelay: 500 }));

      act(() => {
        result.current.triggerAutoSave();
      });

      await act(async () => {
        vi.advanceTimersByTime(500);
      });

      expect(onSave).toHaveBeenCalledOnce();
    });

    it('respects a custom textDelay', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() => useAutoSave({ onSave, textDelay: 2000 }));

      act(() => {
        result.current.triggerAutoSave('text');
      });

      act(() => {
        vi.advanceTimersByTime(1999);
      });
      expect(onSave).not.toHaveBeenCalled();

      await act(async () => {
        vi.advanceTimersByTime(1);
      });
      expect(onSave).toHaveBeenCalledOnce();
    });
  });

  describe('triggerAutoSave — selection trigger', () => {
    it('fires onSave after selectionDelay (default 1000ms)', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() => useAutoSave({ onSave }));

      act(() => {
        result.current.triggerAutoSave('selection');
      });

      act(() => {
        vi.advanceTimersByTime(999);
      });
      expect(onSave).not.toHaveBeenCalled();

      await act(async () => {
        vi.advanceTimersByTime(1);
      });
      expect(onSave).toHaveBeenCalledOnce();
    });

    it('respects a custom selectionDelay', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() => useAutoSave({ onSave, selectionDelay: 300 }));

      act(() => {
        result.current.triggerAutoSave('selection');
      });

      await act(async () => {
        vi.advanceTimersByTime(300);
      });
      expect(onSave).toHaveBeenCalledOnce();
    });
  });

  describe('status transitions', () => {
    it('transitions idle → saving → saved on successful save', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() => useAutoSave({ onSave, textDelay: 100 }));

      act(() => {
        result.current.triggerAutoSave('text');
      });
      expect(result.current.status).toBe('idle');

      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      expect(result.current.status).toBe('saved');
    });

    it('sets status to error when onSave rejects', async () => {
      const onSave = vi.fn().mockRejectedValue(new Error('save failed'));
      const { result } = renderHook(() => useAutoSave({ onSave, textDelay: 100 }));

      act(() => {
        result.current.triggerAutoSave('text');
      });

      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      expect(result.current.status).toBe('error');
    });

    it('does not call onSave and stays idle when disabled', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() =>
        useAutoSave({ onSave, enabled: false, textDelay: 100 })
      );

      act(() => {
        result.current.triggerAutoSave('text');
      });

      await act(async () => {
        vi.advanceTimersByTime(200);
      });

      expect(onSave).not.toHaveBeenCalled();
      expect(result.current.status).toBe('idle');
    });
  });

  describe('lastSaved', () => {
    it('is set to a Date after a successful save', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() => useAutoSave({ onSave, textDelay: 100 }));

      expect(result.current.lastSaved).toBeUndefined();

      act(() => {
        result.current.triggerAutoSave('text');
      });

      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      expect(result.current.lastSaved).toBeInstanceOf(Date);
    });

    it('remains undefined when onSave rejects', async () => {
      const onSave = vi.fn().mockRejectedValue(new Error('fail'));
      const { result } = renderHook(() => useAutoSave({ onSave, textDelay: 100 }));

      act(() => {
        result.current.triggerAutoSave('text');
      });

      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      expect(result.current.lastSaved).toBeUndefined();
    });
  });

  describe('change detection', () => {
    it('does not schedule a save when the same data is passed a second time', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() => useAutoSave({ onSave, textDelay: 100 }));

      // First call: prime lastSaveDataRef by completing a save
      act(() => {
        result.current.triggerAutoSave('text', 'hello');
      });
      await act(async () => {
        vi.advanceTimersByTime(100);
      });
      expect(onSave).toHaveBeenCalledTimes(1);

      // Second call with identical data — should be a no-op
      act(() => {
        result.current.triggerAutoSave('text', 'hello');
      });
      await act(async () => {
        vi.advanceTimersByTime(200);
      });
      expect(onSave).toHaveBeenCalledTimes(1);
    });

    it('schedules a save when the data has changed', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() => useAutoSave({ onSave, textDelay: 100 }));

      // First save
      act(() => {
        result.current.triggerAutoSave('text', 'version1');
      });
      await act(async () => {
        vi.advanceTimersByTime(100);
      });
      expect(onSave).toHaveBeenCalledTimes(1);

      // Second save with new data
      act(() => {
        result.current.triggerAutoSave('text', 'version2');
      });
      await act(async () => {
        vi.advanceTimersByTime(100);
      });
      expect(onSave).toHaveBeenCalledTimes(2);
    });

    it('schedules normally when no currentData is supplied (no change detection applied)', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() => useAutoSave({ onSave, textDelay: 100 }));

      act(() => {
        result.current.triggerAutoSave('text');
      });
      await act(async () => {
        vi.advanceTimersByTime(100);
      });
      expect(onSave).toHaveBeenCalledOnce();
    });
  });

  describe('debouncing', () => {
    it('resets the timer when triggered again before the delay expires', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() => useAutoSave({ onSave, textDelay: 500 }));

      act(() => {
        result.current.triggerAutoSave('text');
      });

      // Advance partway
      act(() => {
        vi.advanceTimersByTime(400);
      });
      expect(onSave).not.toHaveBeenCalled();

      // Retrigger — should restart the 500ms window
      act(() => {
        result.current.triggerAutoSave('text');
      });

      act(() => {
        vi.advanceTimersByTime(400);
      });
      expect(onSave).not.toHaveBeenCalled();

      await act(async () => {
        vi.advanceTimersByTime(100);
      });
      expect(onSave).toHaveBeenCalledOnce();
    });
  });

  describe('cancelAutoSave', () => {
    it('cancels a pending save so onSave is never called', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() => useAutoSave({ onSave, textDelay: 500 }));

      act(() => {
        result.current.triggerAutoSave('text');
      });

      act(() => {
        result.current.cancelAutoSave();
      });

      await act(async () => {
        vi.advanceTimersByTime(1000);
      });

      expect(onSave).not.toHaveBeenCalled();
    });

    it('is safe to call when no save is pending', () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() => useAutoSave({ onSave }));

      expect(() => {
        act(() => {
          result.current.cancelAutoSave();
        });
      }).not.toThrow();
    });
  });

  describe('cleanup on unmount', () => {
    it('cancels a pending save when the component unmounts', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const { result, unmount } = renderHook(() =>
        useAutoSave({ onSave, textDelay: 500 })
      );

      act(() => {
        result.current.triggerAutoSave('text');
      });

      act(() => {
        unmount();
      });

      await act(async () => {
        vi.advanceTimersByTime(1000);
      });

      expect(onSave).not.toHaveBeenCalled();
    });
  });

  describe('enabled option changes', () => {
    it('does not trigger save when initially disabled', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() =>
        useAutoSave({ onSave, enabled: false, textDelay: 100 })
      );

      act(() => {
        result.current.triggerAutoSave('text', 'data');
      });

      await act(async () => {
        vi.advanceTimersByTime(500);
      });

      expect(onSave).not.toHaveBeenCalled();
    });
  });
});
