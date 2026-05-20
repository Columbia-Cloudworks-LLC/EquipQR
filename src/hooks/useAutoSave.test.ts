import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAutoSave } from './useAutoSave';

vi.mock('@/utils/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

const DEFAULT_TEXT_DELAY = 8000;
const DEFAULT_SELECTION_DELAY = 1000;

describe('useAutoSave', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('initial state', () => {
    it('returns idle status on mount', () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() => useAutoSave({ onSave }));

      expect(result.current.status).toBe('idle');
    });

    it('returns undefined lastSaved on mount', () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() => useAutoSave({ onSave }));

      expect(result.current.lastSaved).toBeUndefined();
    });

    it('exposes triggerAutoSave and cancelAutoSave as functions', () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() => useAutoSave({ onSave }));

      expect(typeof result.current.triggerAutoSave).toBe('function');
      expect(typeof result.current.cancelAutoSave).toBe('function');
    });
  });

  describe('when disabled', () => {
    it('does not start a save timer when triggerAutoSave is called', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() => useAutoSave({ onSave, enabled: false }));

      act(() => {
        result.current.triggerAutoSave('text');
      });

      await act(async () => {
        vi.advanceTimersByTime(DEFAULT_TEXT_DELAY + 1000);
      });

      expect(onSave).not.toHaveBeenCalled();
    });

    it('keeps status as idle when disabled', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() => useAutoSave({ onSave, enabled: false }));

      act(() => {
        result.current.triggerAutoSave('text');
      });

      await act(async () => {
        vi.advanceTimersByTime(DEFAULT_TEXT_DELAY + 1000);
      });

      expect(result.current.status).toBe('idle');
    });
  });

  describe('text trigger (default delay)', () => {
    it('does not call onSave before the text delay elapses', () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() => useAutoSave({ onSave }));

      act(() => {
        result.current.triggerAutoSave('text');
      });

      act(() => {
        vi.advanceTimersByTime(DEFAULT_TEXT_DELAY - 1);
      });

      expect(onSave).not.toHaveBeenCalled();
    });

    it('calls onSave after the default text delay', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() => useAutoSave({ onSave }));

      act(() => {
        result.current.triggerAutoSave('text');
      });

      await act(async () => {
        vi.advanceTimersByTime(DEFAULT_TEXT_DELAY);
      });

      expect(onSave).toHaveBeenCalledOnce();
    });

    it('uses custom textDelay when provided', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() => useAutoSave({ onSave, textDelay: 3000 }));

      act(() => {
        result.current.triggerAutoSave('text');
      });

      act(() => {
        vi.advanceTimersByTime(2999);
      });
      expect(onSave).not.toHaveBeenCalled();

      await act(async () => {
        vi.advanceTimersByTime(1);
      });
      expect(onSave).toHaveBeenCalledOnce();
    });
  });

  describe('selection trigger', () => {
    it('calls onSave after the selection delay, not the text delay', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() => useAutoSave({ onSave }));

      act(() => {
        result.current.triggerAutoSave('selection');
      });

      // Should NOT fire at text delay - 1
      act(() => {
        vi.advanceTimersByTime(DEFAULT_SELECTION_DELAY - 1);
      });
      expect(onSave).not.toHaveBeenCalled();

      await act(async () => {
        vi.advanceTimersByTime(1);
      });
      expect(onSave).toHaveBeenCalledOnce();
    });

    it('uses custom selectionDelay when provided', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() => useAutoSave({ onSave, selectionDelay: 500 }));

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

  describe('manual trigger', () => {
    it('uses selection delay for manual trigger type', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() => useAutoSave({ onSave }));

      act(() => {
        result.current.triggerAutoSave('manual');
      });

      await act(async () => {
        vi.advanceTimersByTime(DEFAULT_SELECTION_DELAY);
      });

      expect(onSave).toHaveBeenCalledOnce();
    });

    it('uses selection delay for trigger called with no argument (defaults to text)', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() => useAutoSave({ onSave }));

      act(() => {
        result.current.triggerAutoSave();
      });

      await act(async () => {
        vi.advanceTimersByTime(DEFAULT_TEXT_DELAY);
      });

      expect(onSave).toHaveBeenCalledOnce();
    });
  });

  describe('status transitions on success', () => {
    it('transitions to saved after onSave resolves', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() => useAutoSave({ onSave }));

      act(() => {
        result.current.triggerAutoSave('selection');
      });

      await act(async () => {
        vi.advanceTimersByTime(DEFAULT_SELECTION_DELAY);
      });

      expect(result.current.status).toBe('saved');
    });

    it('sets lastSaved to a Date after a successful save', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() => useAutoSave({ onSave }));

      act(() => {
        result.current.triggerAutoSave('selection');
      });

      await act(async () => {
        vi.advanceTimersByTime(DEFAULT_SELECTION_DELAY);
      });

      expect(result.current.lastSaved).toBeInstanceOf(Date);
    });
  });

  describe('status transitions on error', () => {
    it('transitions to error when onSave rejects', async () => {
      const onSave = vi.fn().mockRejectedValue(new Error('Save failed'));
      const { result } = renderHook(() => useAutoSave({ onSave }));

      act(() => {
        result.current.triggerAutoSave('selection');
      });

      await act(async () => {
        vi.advanceTimersByTime(DEFAULT_SELECTION_DELAY);
      });

      expect(result.current.status).toBe('error');
    });

    it('does not update lastSaved when onSave rejects', async () => {
      const onSave = vi.fn().mockRejectedValue(new Error('Save failed'));
      const { result } = renderHook(() => useAutoSave({ onSave }));

      act(() => {
        result.current.triggerAutoSave('selection');
      });

      await act(async () => {
        vi.advanceTimersByTime(DEFAULT_SELECTION_DELAY);
      });

      expect(result.current.lastSaved).toBeUndefined();
    });
  });

  describe('smart change detection', () => {
    it('does not trigger a new save when the same data is passed twice', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() => useAutoSave({ onSave }));

      // First save with data "hello"
      act(() => {
        result.current.triggerAutoSave('selection', 'hello');
      });

      await act(async () => {
        vi.advanceTimersByTime(DEFAULT_SELECTION_DELAY);
      });

      expect(onSave).toHaveBeenCalledOnce();

      // Second trigger with the same data — should be skipped
      act(() => {
        result.current.triggerAutoSave('selection', 'hello');
      });

      await act(async () => {
        vi.advanceTimersByTime(DEFAULT_SELECTION_DELAY);
      });

      expect(onSave).toHaveBeenCalledOnce();
    });

    it('does trigger a save when different data is passed', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() => useAutoSave({ onSave }));

      act(() => {
        result.current.triggerAutoSave('selection', 'hello');
      });

      await act(async () => {
        vi.advanceTimersByTime(DEFAULT_SELECTION_DELAY);
      });

      expect(onSave).toHaveBeenCalledOnce();

      // Change the data
      act(() => {
        result.current.triggerAutoSave('selection', 'world');
      });

      await act(async () => {
        vi.advanceTimersByTime(DEFAULT_SELECTION_DELAY);
      });

      expect(onSave).toHaveBeenCalledTimes(2);
    });

    it('does trigger a save when no data is passed (no change-detection skipping)', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() => useAutoSave({ onSave }));

      act(() => {
        result.current.triggerAutoSave('selection');
      });
      await act(async () => {
        vi.advanceTimersByTime(DEFAULT_SELECTION_DELAY);
      });

      act(() => {
        result.current.triggerAutoSave('selection');
      });
      await act(async () => {
        vi.advanceTimersByTime(DEFAULT_SELECTION_DELAY);
      });

      expect(onSave).toHaveBeenCalledTimes(2);
    });
  });

  describe('debouncing: repeated calls reset the timer', () => {
    it('resets the timer on each call and only saves once after the last trigger', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() => useAutoSave({ onSave, textDelay: 2000 }));

      act(() => {
        result.current.triggerAutoSave('text');
      });

      act(() => {
        vi.advanceTimersByTime(1000);
        result.current.triggerAutoSave('text');
      });

      act(() => {
        vi.advanceTimersByTime(1000);
        result.current.triggerAutoSave('text');
      });

      // Still under 2000ms since the last trigger
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

  describe('cancelAutoSave', () => {
    it('prevents onSave from being called when cancelled before timer fires', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() => useAutoSave({ onSave }));

      act(() => {
        result.current.triggerAutoSave('text');
      });

      act(() => {
        result.current.cancelAutoSave();
      });

      await act(async () => {
        vi.advanceTimersByTime(DEFAULT_TEXT_DELAY + 1000);
      });

      expect(onSave).not.toHaveBeenCalled();
    });

    it('is safe to call when no timer is pending', () => {
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
    it('cancels a pending save timer on unmount so onSave is not called', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const { result, unmount } = renderHook(() => useAutoSave({ onSave, textDelay: 5000 }));

      act(() => {
        result.current.triggerAutoSave('text');
      });

      unmount();

      await act(async () => {
        vi.advanceTimersByTime(6000);
      });

      expect(onSave).not.toHaveBeenCalled();
    });
  });

  describe('simultaneous save prevention', () => {
    it('does not call onSave a second time if a first save is still in progress', async () => {
      let resolveFirstSave!: () => void;
      const firstSavePromise = new Promise<void>((resolve) => {
        resolveFirstSave = resolve;
      });
      const onSave = vi.fn()
        .mockReturnValueOnce(firstSavePromise)
        .mockResolvedValue(undefined);

      const { result } = renderHook(() => useAutoSave({ onSave, selectionDelay: 500 }));

      // Start the first save
      act(() => {
        result.current.triggerAutoSave('selection');
      });
      await act(async () => {
        vi.advanceTimersByTime(500);
      });

      // While first save is still in flight, try to trigger another
      act(() => {
        result.current.triggerAutoSave('selection');
      });
      await act(async () => {
        vi.advanceTimersByTime(500);
      });

      // Resolve the first save
      await act(async () => {
        resolveFirstSave();
        await firstSavePromise;
      });

      // onSave should only have been called once (second was skipped while first was pending)
      expect(onSave).toHaveBeenCalledOnce();
    });
  });
});
