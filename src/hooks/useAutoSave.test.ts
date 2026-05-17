/**
 * useAutoSave Hook Tests
 *
 * Covers:
 *   - Initial state: status is 'idle', lastSaved is undefined
 *   - Returns expected API surface (functions + state)
 *   - Text trigger uses textDelay
 *   - Selection trigger uses selectionDelay
 *   - Happy path: status transitions idle → saving → saved, lastSaved is set
 *   - Error path: status becomes 'error' when onSave rejects
 *   - Disabled state: triggerAutoSave is a no-op when enabled=false
 *   - Change detection: same currentData skips scheduling a new timeout
 *   - Change detection after a successful save: same data as last-saved skips
 *   - Debouncing: multiple rapid triggers cancel the previous timeout
 *   - cancelAutoSave: clears a pending timeout without calling onSave
 *   - Cleanup on unmount: pending timeout is cleared
 *   - No currentData arg: no deduplication, always schedules
 *   - Custom textDelay and selectionDelay respected
 *   - Concurrent-save guard: second overlapping save awaits the first
 *
 * Intentionally deferred:
 *   - import.meta.env.DEV logger.warn path (logger is an internal detail; the
 *     observable behaviour is that status becomes 'error', which is tested above)
 *   - Race condition where onSave resolves between two rapid triggerAutoSave
 *     calls on the exact same tick (requires brittle promise-ordering control)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAutoSave } from './useAutoSave';

// ─── helpers ─────────────────────────────────────────────────────────────────

/** Advance fake timers AND drain all pending microtasks / promise callbacks. */
const advanceAndFlush = async (ms: number) => {
  await act(async () => {
    vi.advanceTimersByTime(ms);
    // Flush the microtask queue so any resolved Promise.then() blocks run.
    await Promise.resolve();
  });
};

// ─── suite ───────────────────────────────────────────────────────────────────

describe('useAutoSave', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  // ── initial state ──────────────────────────────────────────────────────────

  describe('initial state', () => {
    it('starts with status "idle"', () => {
      const { result } = renderHook(() =>
        useAutoSave({ onSave: vi.fn().mockResolvedValue(undefined) })
      );
      expect(result.current.status).toBe('idle');
    });

    it('starts with lastSaved undefined', () => {
      const { result } = renderHook(() =>
        useAutoSave({ onSave: vi.fn().mockResolvedValue(undefined) })
      );
      expect(result.current.lastSaved).toBeUndefined();
    });

    it('exposes triggerAutoSave and cancelAutoSave as functions', () => {
      const { result } = renderHook(() =>
        useAutoSave({ onSave: vi.fn().mockResolvedValue(undefined) })
      );
      expect(typeof result.current.triggerAutoSave).toBe('function');
      expect(typeof result.current.cancelAutoSave).toBe('function');
    });
  });

  // ── happy path ─────────────────────────────────────────────────────────────

  describe('happy path — text trigger', () => {
    it('does not call onSave before the textDelay elapses', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() =>
        useAutoSave({ onSave, textDelay: 200, selectionDelay: 50 })
      );

      act(() => {
        result.current.triggerAutoSave('text');
      });

      // Advance less than the delay — onSave must not be called yet
      await advanceAndFlush(100);

      expect(onSave).not.toHaveBeenCalled();
      expect(result.current.status).toBe('idle');
    });

    it('calls onSave after textDelay and transitions status to saved', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() =>
        useAutoSave({ onSave, textDelay: 200, selectionDelay: 50 })
      );

      act(() => {
        result.current.triggerAutoSave('text');
      });

      await advanceAndFlush(200);

      expect(onSave).toHaveBeenCalledTimes(1);
      expect(result.current.status).toBe('saved');
    });

    it('sets lastSaved to a Date after a successful save', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() =>
        useAutoSave({ onSave, textDelay: 100, selectionDelay: 50 })
      );

      act(() => {
        result.current.triggerAutoSave('text');
      });

      await advanceAndFlush(100);

      expect(result.current.lastSaved).toBeInstanceOf(Date);
    });
  });

  describe('happy path — selection trigger', () => {
    it('uses selectionDelay (shorter) rather than textDelay', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() =>
        useAutoSave({ onSave, textDelay: 500, selectionDelay: 100 })
      );

      act(() => {
        result.current.triggerAutoSave('selection');
      });

      // Still before selectionDelay
      await advanceAndFlush(50);
      expect(onSave).not.toHaveBeenCalled();

      // Now past selectionDelay but well before textDelay
      await advanceAndFlush(60);
      expect(onSave).toHaveBeenCalledTimes(1);
    });
  });

  describe('default trigger type', () => {
    it('uses textDelay when trigger argument is omitted', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() =>
        useAutoSave({ onSave, textDelay: 200, selectionDelay: 50 })
      );

      act(() => {
        // No trigger argument — defaults to 'text'
        result.current.triggerAutoSave();
      });

      // Before textDelay: still not called
      await advanceAndFlush(100);
      expect(onSave).not.toHaveBeenCalled();

      // After textDelay: called
      await advanceAndFlush(110);
      expect(onSave).toHaveBeenCalledTimes(1);
    });
  });

  // ── error path ─────────────────────────────────────────────────────────────

  describe('error path', () => {
    it('sets status to "error" when onSave rejects', async () => {
      const onSave = vi.fn().mockRejectedValue(new Error('save failed'));
      const { result } = renderHook(() =>
        useAutoSave({ onSave, textDelay: 100, selectionDelay: 50 })
      );

      act(() => {
        result.current.triggerAutoSave('text');
      });

      await advanceAndFlush(100);

      expect(result.current.status).toBe('error');
    });

    it('does not update lastSaved when onSave rejects', async () => {
      const onSave = vi.fn().mockRejectedValue(new Error('save failed'));
      const { result } = renderHook(() =>
        useAutoSave({ onSave, textDelay: 100, selectionDelay: 50 })
      );

      act(() => {
        result.current.triggerAutoSave('text');
      });

      await advanceAndFlush(100);

      expect(result.current.lastSaved).toBeUndefined();
    });

    it('allows subsequent saves after an error', async () => {
      const onSave = vi.fn()
        .mockRejectedValueOnce(new Error('first fails'))
        .mockResolvedValue(undefined);

      const { result } = renderHook(() =>
        useAutoSave({ onSave, textDelay: 100, selectionDelay: 50 })
      );

      // First save → error
      act(() => { result.current.triggerAutoSave('text', 'data-a'); });
      await advanceAndFlush(100);
      expect(result.current.status).toBe('error');

      // Second save → success (different data so change detection allows it)
      act(() => { result.current.triggerAutoSave('text', 'data-b'); });
      await advanceAndFlush(100);
      expect(result.current.status).toBe('saved');
    });
  });

  // ── disabled state ─────────────────────────────────────────────────────────

  describe('disabled state', () => {
    it('does not schedule a timeout when enabled=false', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() =>
        useAutoSave({ onSave, textDelay: 100, selectionDelay: 50, enabled: false })
      );

      act(() => {
        result.current.triggerAutoSave('text');
      });

      await advanceAndFlush(200);

      expect(onSave).not.toHaveBeenCalled();
      expect(result.current.status).toBe('idle');
    });
  });

  // ── change detection ───────────────────────────────────────────────────────

  describe('change detection (currentData)', () => {
    it('skips scheduling when currentData is the same as before triggering', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() =>
        useAutoSave({ onSave, textDelay: 100, selectionDelay: 50 })
      );

      // First trigger with 'same-data'
      act(() => { result.current.triggerAutoSave('text', 'same-data'); });
      await advanceAndFlush(100);
      expect(onSave).toHaveBeenCalledTimes(1);

      // Second trigger with identical data — should skip
      act(() => { result.current.triggerAutoSave('text', 'same-data'); });
      await advanceAndFlush(100);

      // Still only called once
      expect(onSave).toHaveBeenCalledTimes(1);
    });

    it('does schedule when currentData differs from last saved data', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() =>
        useAutoSave({ onSave, textDelay: 100, selectionDelay: 50 })
      );

      act(() => { result.current.triggerAutoSave('text', 'data-v1'); });
      await advanceAndFlush(100);
      expect(onSave).toHaveBeenCalledTimes(1);

      // Different data → must trigger again
      act(() => { result.current.triggerAutoSave('text', 'data-v2'); });
      await advanceAndFlush(100);
      expect(onSave).toHaveBeenCalledTimes(2);
    });

    it('always schedules when no currentData is supplied', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() =>
        useAutoSave({ onSave, textDelay: 100, selectionDelay: 50 })
      );

      act(() => { result.current.triggerAutoSave('text'); });
      await advanceAndFlush(100);
      expect(onSave).toHaveBeenCalledTimes(1);

      // No data argument again — deduplication is skipped, schedules again
      act(() => { result.current.triggerAutoSave('text'); });
      await advanceAndFlush(100);
      expect(onSave).toHaveBeenCalledTimes(2);
    });
  });

  // ── debouncing ─────────────────────────────────────────────────────────────

  describe('debouncing', () => {
    it('cancels the previous timeout when triggered again before it fires', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() =>
        useAutoSave({ onSave, textDelay: 200, selectionDelay: 50 })
      );

      // First trigger
      act(() => { result.current.triggerAutoSave('text', 'v1'); });

      // Second trigger before the first fires — resets the clock
      await advanceAndFlush(150);
      act(() => { result.current.triggerAutoSave('text', 'v2'); });

      // Advance past the first timeout but not the second
      await advanceAndFlush(100);
      expect(onSave).not.toHaveBeenCalled();

      // Now past the second timeout
      await advanceAndFlush(120);
      expect(onSave).toHaveBeenCalledTimes(1);
    });
  });

  // ── cancelAutoSave ─────────────────────────────────────────────────────────

  describe('cancelAutoSave', () => {
    it('prevents onSave from being called when cancelled before the delay', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() =>
        useAutoSave({ onSave, textDelay: 200, selectionDelay: 50 })
      );

      act(() => { result.current.triggerAutoSave('text'); });

      // Cancel before the timeout fires
      act(() => { result.current.cancelAutoSave(); });

      await advanceAndFlush(300);

      expect(onSave).not.toHaveBeenCalled();
    });

    it('is safe to call when there is no pending timeout', () => {
      const { result } = renderHook(() =>
        useAutoSave({ onSave: vi.fn().mockResolvedValue(undefined), textDelay: 200 })
      );

      // No pending timeout yet — must not throw
      expect(() => {
        act(() => { result.current.cancelAutoSave(); });
      }).not.toThrow();
    });
  });

  // ── cleanup on unmount ─────────────────────────────────────────────────────

  describe('cleanup on unmount', () => {
    it('does not call onSave after the hook is unmounted', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const { result, unmount } = renderHook(() =>
        useAutoSave({ onSave, textDelay: 200, selectionDelay: 50 })
      );

      act(() => { result.current.triggerAutoSave('text'); });

      // Unmount before the timeout fires
      unmount();

      await advanceAndFlush(300);

      expect(onSave).not.toHaveBeenCalled();
    });
  });

  // ── custom delays ──────────────────────────────────────────────────────────

  describe('custom delays', () => {
    it('honours a custom textDelay', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() =>
        useAutoSave({ onSave, textDelay: 300 })
      );

      act(() => { result.current.triggerAutoSave('text'); });

      await advanceAndFlush(250);
      expect(onSave).not.toHaveBeenCalled();

      await advanceAndFlush(60);
      expect(onSave).toHaveBeenCalledTimes(1);
    });

    it('honours a custom selectionDelay', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() =>
        useAutoSave({ onSave, textDelay: 5000, selectionDelay: 80 })
      );

      act(() => { result.current.triggerAutoSave('selection'); });

      await advanceAndFlush(60);
      expect(onSave).not.toHaveBeenCalled();

      await advanceAndFlush(30);
      expect(onSave).toHaveBeenCalledTimes(1);
    });
  });

  // ── concurrent-save guard ──────────────────────────────────────────────────

  describe('concurrent-save guard', () => {
    it('does not call onSave a second time if a previous save is still in flight', async () => {
      // Slow save that resolves after we manually advance
      let resolveSave!: () => void;
      const slowSave = vi.fn().mockImplementation(
        () => new Promise<void>((res) => { resolveSave = res; })
      );

      const { result } = renderHook(() =>
        useAutoSave({ onSave: slowSave, textDelay: 100, selectionDelay: 50 })
      );

      // First trigger — fires after 100 ms, starts the slow save
      act(() => { result.current.triggerAutoSave('text', 'data-a'); });
      await advanceAndFlush(100);
      expect(slowSave).toHaveBeenCalledTimes(1);
      expect(result.current.status).toBe('saving');

      // Second trigger before the first save completes
      // (different data so change detection doesn't skip)
      act(() => { result.current.triggerAutoSave('text', 'data-b'); });
      await advanceAndFlush(100);

      // The guard should prevent a second onSave call while the first is pending
      expect(slowSave).toHaveBeenCalledTimes(1);

      // Resolve the first save
      await act(async () => {
        resolveSave();
        await Promise.resolve();
      });

      expect(result.current.status).toBe('saved');
    });
  });
});
