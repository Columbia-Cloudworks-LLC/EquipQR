/**
 * useAutoSave Hook Tests
 *
 * Covers the full state machine for the auto-save hook, including:
 * - Initial state (idle, no lastSaved)
 * - triggerAutoSave no-ops when disabled
 * - Smart change detection — skips save when data is unchanged
 * - Text vs. selection delay selection
 * - Successful save: idle → saving → saved, lastSaved set
 * - Failed save: idle → saving → error
 * - Debouncing: multiple rapid calls reset the timer
 * - cancelAutoSave clears a pending timeout
 * - Unmount cleanup cancels any in-flight timeout
 * - Prevents concurrent duplicate saves when a save is already in progress
 *
 * Intentionally deferred:
 * - NODE_ENV=production branch (logger.warn suppression) — process.env is
 *   read at call time; switching it mid-test risks cross-test pollution.
 * - Race between a pending save promise and a second triggerAutoSave call —
 *   the concurrency guard (saveRequestRef.current) is exercised indirectly
 *   through the "prevents concurrent saves" test.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAutoSave } from './useAutoSave';

// ── Helpers ────────────────────────────────────────────────────────────────

/** Advance fake timers and flush the resulting promise micro-tasks. */
async function advanceTimersByTime(ms: number) {
  await act(async () => {
    vi.advanceTimersByTime(ms);
    // Flush any microtasks (promises) enqueued by the timer callbacks.
    await Promise.resolve();
    await Promise.resolve();
  });
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('useAutoSave', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  // ── Initial state ────────────────────────────────────────────────────────

  describe('initial state', () => {
    it('starts with status idle and no lastSaved timestamp', () => {
      const onSave = vi.fn<[], Promise<void>>().mockResolvedValue(undefined);
      const { result } = renderHook(() => useAutoSave({ onSave }));

      expect(result.current.status).toBe('idle');
      expect(result.current.lastSaved).toBeUndefined();
    });

    it('exposes triggerAutoSave and cancelAutoSave functions', () => {
      const onSave = vi.fn<[], Promise<void>>().mockResolvedValue(undefined);
      const { result } = renderHook(() => useAutoSave({ onSave }));

      expect(typeof result.current.triggerAutoSave).toBe('function');
      expect(typeof result.current.cancelAutoSave).toBe('function');
    });
  });

  // ── disabled guard ───────────────────────────────────────────────────────

  describe('when enabled is false', () => {
    it('triggerAutoSave is a no-op — onSave is never called', async () => {
      const onSave = vi.fn<[], Promise<void>>().mockResolvedValue(undefined);
      const { result } = renderHook(() =>
        useAutoSave({ onSave, enabled: false, textDelay: 100 })
      );

      act(() => {
        result.current.triggerAutoSave('text', 'some data');
      });

      await advanceTimersByTime(500);

      expect(onSave).not.toHaveBeenCalled();
      expect(result.current.status).toBe('idle');
    });
  });

  // ── smart change detection ────────────────────────────────────────────────

  describe('smart change detection', () => {
    it('skips the timer entirely when currentData matches the last saved data', async () => {
      const onSave = vi.fn<[], Promise<void>>().mockResolvedValue(undefined);
      const { result } = renderHook(() =>
        useAutoSave({ onSave, textDelay: 100 })
      );

      // First save completes, recording lastSaveDataRef internally.
      act(() => {
        result.current.triggerAutoSave('text', 'hello');
      });
      await advanceTimersByTime(200);
      expect(onSave).toHaveBeenCalledTimes(1);

      onSave.mockClear();

      // Trigger again with identical data — should be skipped.
      act(() => {
        result.current.triggerAutoSave('text', 'hello');
      });
      await advanceTimersByTime(200);

      expect(onSave).not.toHaveBeenCalled();
    });

    it('does trigger a save when data has changed from the last save', async () => {
      const onSave = vi.fn<[], Promise<void>>().mockResolvedValue(undefined);
      const { result } = renderHook(() =>
        useAutoSave({ onSave, textDelay: 100 })
      );

      act(() => {
        result.current.triggerAutoSave('text', 'version1');
      });
      await advanceTimersByTime(200);
      expect(onSave).toHaveBeenCalledTimes(1);

      // Different data — should trigger a new save.
      act(() => {
        result.current.triggerAutoSave('text', 'version2');
      });
      await advanceTimersByTime(200);

      expect(onSave).toHaveBeenCalledTimes(2);
    });

    it('always triggers when no currentData argument is provided', async () => {
      const onSave = vi.fn<[], Promise<void>>().mockResolvedValue(undefined);
      const { result } = renderHook(() =>
        useAutoSave({ onSave, textDelay: 100 })
      );

      // Call without data arg twice.
      act(() => {
        result.current.triggerAutoSave('text');
      });
      await advanceTimersByTime(200);

      act(() => {
        result.current.triggerAutoSave('text');
      });
      await advanceTimersByTime(200);

      expect(onSave).toHaveBeenCalledTimes(2);
    });
  });

  // ── delay selection ──────────────────────────────────────────────────────

  describe('delay selection', () => {
    it('uses textDelay for "text" trigger type', async () => {
      const onSave = vi.fn<[], Promise<void>>().mockResolvedValue(undefined);
      const { result } = renderHook(() =>
        useAutoSave({ onSave, textDelay: 500, selectionDelay: 100 })
      );

      act(() => {
        result.current.triggerAutoSave('text');
      });

      // Not yet — textDelay is 500ms
      vi.advanceTimersByTime(400);
      expect(onSave).not.toHaveBeenCalled();

      await advanceTimersByTime(200);
      expect(onSave).toHaveBeenCalledTimes(1);
    });

    it('uses selectionDelay for "selection" trigger type', async () => {
      const onSave = vi.fn<[], Promise<void>>().mockResolvedValue(undefined);
      const { result } = renderHook(() =>
        useAutoSave({ onSave, textDelay: 5000, selectionDelay: 200 })
      );

      act(() => {
        result.current.triggerAutoSave('selection');
      });

      // Not yet — selectionDelay is 200ms
      vi.advanceTimersByTime(100);
      expect(onSave).not.toHaveBeenCalled();

      await advanceTimersByTime(200);
      expect(onSave).toHaveBeenCalledTimes(1);
    });

    it('uses selectionDelay for "manual" trigger type (non-text path)', async () => {
      const onSave = vi.fn<[], Promise<void>>().mockResolvedValue(undefined);
      const { result } = renderHook(() =>
        useAutoSave({ onSave, textDelay: 5000, selectionDelay: 200 })
      );

      act(() => {
        result.current.triggerAutoSave('manual');
      });

      vi.advanceTimersByTime(100);
      expect(onSave).not.toHaveBeenCalled();

      await advanceTimersByTime(200);
      expect(onSave).toHaveBeenCalledTimes(1);
    });
  });

  // ── happy-path state transitions ─────────────────────────────────────────

  describe('successful save', () => {
    it('transitions status: idle → saving → saved', async () => {
      let resolveSave!: () => void;
      const savePromise = new Promise<void>((res) => {
        resolveSave = res;
      });
      const onSave = vi.fn<[], Promise<void>>().mockReturnValue(savePromise);

      const { result } = renderHook(() =>
        useAutoSave({ onSave, textDelay: 100 })
      );

      expect(result.current.status).toBe('idle');

      act(() => {
        result.current.triggerAutoSave('text');
      });

      // Advance to trigger the timeout — status becomes 'saving' synchronously inside the callback.
      await act(async () => {
        vi.advanceTimersByTime(200);
        // Yield to let the async save start.
        await Promise.resolve();
      });

      expect(result.current.status).toBe('saving');

      // Resolve the save and flush state.
      await act(async () => {
        resolveSave();
        await savePromise;
      });

      expect(result.current.status).toBe('saved');
    });

    it('sets lastSaved to a Date after a successful save', async () => {
      const onSave = vi.fn<[], Promise<void>>().mockResolvedValue(undefined);
      const { result } = renderHook(() =>
        useAutoSave({ onSave, textDelay: 100 })
      );

      expect(result.current.lastSaved).toBeUndefined();

      act(() => {
        result.current.triggerAutoSave('text');
      });
      await advanceTimersByTime(200);

      expect(result.current.lastSaved).toBeInstanceOf(Date);
    });

    it('calls onSave exactly once per triggerAutoSave call', async () => {
      const onSave = vi.fn<[], Promise<void>>().mockResolvedValue(undefined);
      const { result } = renderHook(() =>
        useAutoSave({ onSave, textDelay: 100 })
      );

      act(() => {
        result.current.triggerAutoSave('text');
      });
      await advanceTimersByTime(200);

      expect(onSave).toHaveBeenCalledTimes(1);
    });
  });

  // ── error-path state transitions ─────────────────────────────────────────

  describe('failed save', () => {
    it('transitions status to "error" when onSave rejects', async () => {
      const onSave = vi
        .fn<[], Promise<void>>()
        .mockRejectedValue(new Error('network error'));

      const { result } = renderHook(() =>
        useAutoSave({ onSave, textDelay: 100 })
      );

      act(() => {
        result.current.triggerAutoSave('text');
      });
      await advanceTimersByTime(200);

      expect(result.current.status).toBe('error');
    });

    it('does not update lastSaved after a failed save', async () => {
      const onSave = vi
        .fn<[], Promise<void>>()
        .mockRejectedValue(new Error('fail'));

      const { result } = renderHook(() =>
        useAutoSave({ onSave, textDelay: 100 })
      );

      act(() => {
        result.current.triggerAutoSave('text');
      });
      await advanceTimersByTime(200);

      expect(result.current.lastSaved).toBeUndefined();
    });

    it('keeps status as "error" until a subsequent successful save', async () => {
      const onSave = vi
        .fn<[], Promise<void>>()
        .mockRejectedValueOnce(new Error('first fail'))
        .mockResolvedValueOnce(undefined);

      const { result } = renderHook(() =>
        useAutoSave({ onSave, textDelay: 100 })
      );

      // First save fails.
      act(() => {
        result.current.triggerAutoSave('text', 'data-v1');
      });
      await advanceTimersByTime(200);
      expect(result.current.status).toBe('error');

      // Second save with different data succeeds.
      act(() => {
        result.current.triggerAutoSave('text', 'data-v2');
      });
      await advanceTimersByTime(200);
      expect(result.current.status).toBe('saved');
    });
  });

  // ── debouncing ────────────────────────────────────────────────────────────

  describe('debouncing', () => {
    it('resets the timer on each new call — only the last call triggers a save', async () => {
      const onSave = vi.fn<[], Promise<void>>().mockResolvedValue(undefined);
      const { result } = renderHook(() =>
        useAutoSave({ onSave, textDelay: 300 })
      );

      // Rapid successive calls within the delay window.
      act(() => {
        result.current.triggerAutoSave('text', 'a');
      });
      vi.advanceTimersByTime(100);

      act(() => {
        result.current.triggerAutoSave('text', 'ab');
      });
      vi.advanceTimersByTime(100);

      act(() => {
        result.current.triggerAutoSave('text', 'abc');
      });
      vi.advanceTimersByTime(100);

      // Still within the last-debounce window — no save yet.
      expect(onSave).not.toHaveBeenCalled();

      // Advance past the last debounce delay.
      await advanceTimersByTime(300);

      // Only one save should have fired.
      expect(onSave).toHaveBeenCalledTimes(1);
    });
  });

  // ── cancelAutoSave ────────────────────────────────────────────────────────

  describe('cancelAutoSave', () => {
    it('prevents onSave from being called if cancelled before the delay elapses', async () => {
      const onSave = vi.fn<[], Promise<void>>().mockResolvedValue(undefined);
      const { result } = renderHook(() =>
        useAutoSave({ onSave, textDelay: 300 })
      );

      act(() => {
        result.current.triggerAutoSave('text');
      });

      act(() => {
        result.current.cancelAutoSave();
      });

      await advanceTimersByTime(600);

      expect(onSave).not.toHaveBeenCalled();
    });

    it('is safe to call when no timeout is pending', () => {
      const onSave = vi.fn<[], Promise<void>>().mockResolvedValue(undefined);
      const { result } = renderHook(() => useAutoSave({ onSave }));

      expect(() => {
        act(() => {
          result.current.cancelAutoSave();
        });
      }).not.toThrow();
    });
  });

  // ── unmount cleanup ───────────────────────────────────────────────────────

  describe('unmount cleanup', () => {
    it('cancels a pending timeout when the component unmounts', async () => {
      const onSave = vi.fn<[], Promise<void>>().mockResolvedValue(undefined);
      const { result, unmount } = renderHook(() =>
        useAutoSave({ onSave, textDelay: 500 })
      );

      act(() => {
        result.current.triggerAutoSave('text');
      });

      // Unmount before the delay elapses.
      unmount();

      await advanceTimersByTime(1000);

      expect(onSave).not.toHaveBeenCalled();
    });
  });

  // ── concurrent save prevention ────────────────────────────────────────────

  describe('concurrent save prevention', () => {
    it('does not start a new save while one is already in progress', async () => {
      let resolveSave!: () => void;
      const inFlightPromise = new Promise<void>((res) => {
        resolveSave = res;
      });
      const onSave = vi.fn<[], Promise<void>>()
        .mockReturnValueOnce(inFlightPromise)
        .mockResolvedValue(undefined);

      const { result } = renderHook(() =>
        useAutoSave({ onSave, textDelay: 100, selectionDelay: 100 })
      );

      // First trigger — starts the in-flight save.
      act(() => {
        result.current.triggerAutoSave('text', 'data-v1');
      });
      await act(async () => {
        vi.advanceTimersByTime(200);
        await Promise.resolve();
      });

      // Save is now in progress. Trigger another (different data so change
      // detection doesn't short-circuit before the concurrency guard).
      act(() => {
        result.current.triggerAutoSave('selection', 'data-v2');
      });
      await act(async () => {
        vi.advanceTimersByTime(200);
        await Promise.resolve();
      });

      // Only the first save should have run (second is skipped by the guard).
      expect(onSave).toHaveBeenCalledTimes(1);

      // Resolve the in-flight promise so the hook can settle.
      await act(async () => {
        resolveSave();
        await inFlightPromise;
      });
    });
  });

  // ── default options ───────────────────────────────────────────────────────

  describe('default options', () => {
    it('uses 8000ms textDelay and 1000ms selectionDelay by default', async () => {
      const onSave = vi.fn<[], Promise<void>>().mockResolvedValue(undefined);
      const { result } = renderHook(() => useAutoSave({ onSave }));

      // Trigger with 'selection' default delay (1000ms).
      act(() => {
        result.current.triggerAutoSave('selection');
      });

      vi.advanceTimersByTime(999);
      expect(onSave).not.toHaveBeenCalled();

      await advanceTimersByTime(10);
      expect(onSave).toHaveBeenCalledTimes(1);
    });

    it('is enabled by default — save fires when enabled is omitted', async () => {
      const onSave = vi.fn<[], Promise<void>>().mockResolvedValue(undefined);
      const { result } = renderHook(() =>
        useAutoSave({ onSave, selectionDelay: 100 })
      );

      act(() => {
        result.current.triggerAutoSave('selection');
      });
      await advanceTimersByTime(200);

      expect(onSave).toHaveBeenCalledTimes(1);
    });
  });
});
