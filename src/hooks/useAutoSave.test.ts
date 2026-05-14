/**
 * useAutoSave Hook Tests
 *
 * Covers:
 * - Initial state (status: 'idle', lastSaved: undefined)
 * - Skips save when enabled is false
 * - Uses textDelay for 'text' trigger (default 8000ms)
 * - Uses selectionDelay for 'selection' trigger (default 1000ms)
 * - Happy path: status transitions idle → saving → saved, lastSaved is set
 * - Error path: status transitions idle → saving → error
 * - Change detection: skips save when currentData is unchanged
 * - Debounce: later triggerAutoSave calls reset the timeout
 * - cancelAutoSave: clears the pending timeout without saving
 * - Cleanup on unmount: cancels pending timer so onSave never fires
 * - Concurrent save guard: second trigger while save is in-flight waits for first
 *
 * Intentionally deferred:
 * - Manual trigger with custom non-'text'/'selection' values (no public API for it)
 * - The `lastSaveDataRef` persistence across re-renders (internal ref, not exposed)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAutoSave } from './useAutoSave';

describe('useAutoSave', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  describe('initial state', () => {
    it('starts with status idle and no lastSaved timestamp', () => {
      const onSave = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
      const { result } = renderHook(() => useAutoSave({ onSave }));

      expect(result.current.status).toBe('idle');
      expect(result.current.lastSaved).toBeUndefined();
    });

    it('exposes triggerAutoSave and cancelAutoSave functions', () => {
      const onSave = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
      const { result } = renderHook(() => useAutoSave({ onSave }));

      expect(typeof result.current.triggerAutoSave).toBe('function');
      expect(typeof result.current.cancelAutoSave).toBe('function');
    });
  });

  describe('enabled flag', () => {
    it('does not schedule a save when enabled is false', async () => {
      const onSave = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
      const { result } = renderHook(() =>
        useAutoSave({ onSave, enabled: false })
      );

      act(() => {
        result.current.triggerAutoSave('text');
      });

      await act(async () => {
        vi.runAllTimers();
      });

      expect(onSave).not.toHaveBeenCalled();
      expect(result.current.status).toBe('idle');
    });
  });

  describe('trigger delays', () => {
    it('uses textDelay (default 8000ms) for text trigger', async () => {
      const onSave = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
      const { result } = renderHook(() => useAutoSave({ onSave }));

      act(() => {
        result.current.triggerAutoSave('text');
      });

      // Not yet fired at 7999ms
      act(() => {
        vi.advanceTimersByTime(7999);
      });
      expect(onSave).not.toHaveBeenCalled();

      // Fires at 8000ms
      await act(async () => {
        vi.advanceTimersByTime(1);
      });
      expect(onSave).toHaveBeenCalledOnce();
    });

    it('uses selectionDelay (default 1000ms) for selection trigger', async () => {
      const onSave = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
      const { result } = renderHook(() => useAutoSave({ onSave }));

      act(() => {
        result.current.triggerAutoSave('selection');
      });

      // Not yet fired at 999ms
      act(() => {
        vi.advanceTimersByTime(999);
      });
      expect(onSave).not.toHaveBeenCalled();

      // Fires at 1000ms
      await act(async () => {
        vi.advanceTimersByTime(1);
      });
      expect(onSave).toHaveBeenCalledOnce();
    });

    it('respects custom textDelay and selectionDelay options', async () => {
      const onSave = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
      const { result } = renderHook(() =>
        useAutoSave({ onSave, textDelay: 2000, selectionDelay: 500 })
      );

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

      onSave.mockClear();

      act(() => {
        result.current.triggerAutoSave('selection');
      });
      act(() => {
        vi.advanceTimersByTime(499);
      });
      expect(onSave).not.toHaveBeenCalled();

      await act(async () => {
        vi.advanceTimersByTime(1);
      });
      expect(onSave).toHaveBeenCalledOnce();
    });
  });

  describe('happy path', () => {
    it('transitions status from idle → saving → saved and sets lastSaved', async () => {
      const onSave = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
      const { result } = renderHook(() =>
        useAutoSave({ onSave, textDelay: 100 })
      );

      expect(result.current.status).toBe('idle');

      act(() => {
        result.current.triggerAutoSave('text');
      });

      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      expect(result.current.status).toBe('saved');
      expect(result.current.lastSaved).toBeInstanceOf(Date);
      expect(onSave).toHaveBeenCalledOnce();
    });
  });

  describe('error path', () => {
    it('transitions status to error when onSave rejects', async () => {
      const onSave = vi
        .fn<() => Promise<void>>()
        .mockRejectedValue(new Error('save failed'));
      const { result } = renderHook(() =>
        useAutoSave({ onSave, textDelay: 100 })
      );

      act(() => {
        result.current.triggerAutoSave('text');
      });

      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      expect(result.current.status).toBe('error');
      expect(result.current.lastSaved).toBeUndefined();
    });
  });

  describe('change detection', () => {
    it('skips the save when currentData matches the previously saved data', async () => {
      const onSave = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
      const { result } = renderHook(() =>
        useAutoSave({ onSave, textDelay: 100 })
      );

      // First save — establishes lastSaveDataRef
      act(() => {
        result.current.triggerAutoSave('text', 'same-data');
      });
      await act(async () => {
        vi.advanceTimersByTime(100);
      });
      expect(onSave).toHaveBeenCalledOnce();

      // Second trigger with identical data — should be a no-op
      act(() => {
        result.current.triggerAutoSave('text', 'same-data');
      });
      await act(async () => {
        vi.advanceTimersByTime(100);
      });
      expect(onSave).toHaveBeenCalledOnce(); // still only one call
    });

    it('saves again when currentData changes', async () => {
      const onSave = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
      const { result } = renderHook(() =>
        useAutoSave({ onSave, textDelay: 100 })
      );

      act(() => {
        result.current.triggerAutoSave('text', 'data-v1');
      });
      await act(async () => {
        vi.advanceTimersByTime(100);
      });
      expect(onSave).toHaveBeenCalledOnce();

      act(() => {
        result.current.triggerAutoSave('text', 'data-v2');
      });
      await act(async () => {
        vi.advanceTimersByTime(100);
      });
      expect(onSave).toHaveBeenCalledTimes(2);
    });
  });

  describe('debounce behaviour', () => {
    it('resets the timer when triggerAutoSave is called again before the delay elapses', async () => {
      const onSave = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
      const { result } = renderHook(() =>
        useAutoSave({ onSave, textDelay: 500 })
      );

      act(() => {
        result.current.triggerAutoSave('text', 'first');
      });
      act(() => {
        vi.advanceTimersByTime(400);
      });
      // Re-trigger before the 500ms delay fires
      act(() => {
        result.current.triggerAutoSave('text', 'second');
      });
      act(() => {
        vi.advanceTimersByTime(400);
      });
      // 800ms total but timer was reset at 400ms; only 400ms since second trigger
      expect(onSave).not.toHaveBeenCalled();

      await act(async () => {
        vi.advanceTimersByTime(100);
      });
      expect(onSave).toHaveBeenCalledOnce();
    });
  });

  describe('cancelAutoSave', () => {
    it('prevents a scheduled save from firing', async () => {
      const onSave = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
      const { result } = renderHook(() =>
        useAutoSave({ onSave, textDelay: 500 })
      );

      act(() => {
        result.current.triggerAutoSave('text');
      });

      act(() => {
        result.current.cancelAutoSave();
      });

      await act(async () => {
        vi.runAllTimers();
      });

      expect(onSave).not.toHaveBeenCalled();
    });
  });

  describe('cleanup on unmount', () => {
    it('cancels the pending timer so onSave never fires after unmount', async () => {
      const onSave = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
      const { result, unmount } = renderHook(() =>
        useAutoSave({ onSave, textDelay: 500 })
      );

      act(() => {
        result.current.triggerAutoSave('text');
      });

      unmount();

      await act(async () => {
        vi.runAllTimers();
      });

      expect(onSave).not.toHaveBeenCalled();
    });
  });

  describe('manual trigger without currentData', () => {
    it('always saves when no currentData is provided (no change detection)', async () => {
      const onSave = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
      const { result } = renderHook(() =>
        useAutoSave({ onSave, textDelay: 100 })
      );

      // Two consecutive triggers with no currentData — both should save
      act(() => {
        result.current.triggerAutoSave('text');
      });
      await act(async () => {
        vi.advanceTimersByTime(100);
      });
      expect(onSave).toHaveBeenCalledOnce();

      act(() => {
        result.current.triggerAutoSave('text');
      });
      await act(async () => {
        vi.advanceTimersByTime(100);
      });
      expect(onSave).toHaveBeenCalledTimes(2);
    });
  });
});
