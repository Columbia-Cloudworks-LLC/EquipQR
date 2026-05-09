import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useIdleTimeout } from './useIdleTimeout';

// Intentionally deferred: testing exact countdown second-by-second accuracy
// via repeated interval ticks — this would require many timer advances and
// adds test fragility without meaningful branch coverage gain.

const DEFAULT_WARNING_MS = 2 * 60 * 1000;  // 2 minutes

describe('useIdleTimeout', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('initial state', () => {
    it('returns isWarningOpen=false on mount', () => {
      const onTimeout = vi.fn();
      const { result } = renderHook(() =>
        useIdleTimeout({ enabled: true, onTimeout })
      );

      expect(result.current.isWarningOpen).toBe(false);
    });

    it('initializes secondsRemaining to warningMs / 1000', () => {
      const onTimeout = vi.fn();
      const { result } = renderHook(() =>
        useIdleTimeout({ enabled: true, timeoutMs: 60_000, warningMs: 30_000, onTimeout })
      );

      expect(result.current.secondsRemaining).toBe(30);
    });

    it('uses default secondsRemaining when warningMs is not provided', () => {
      const onTimeout = vi.fn();
      const { result } = renderHook(() =>
        useIdleTimeout({ enabled: true, onTimeout })
      );

      expect(result.current.secondsRemaining).toBe(Math.floor(DEFAULT_WARNING_MS / 1000));
    });

    it('exposes staySignedIn and signOutNow as functions', () => {
      const onTimeout = vi.fn();
      const { result } = renderHook(() =>
        useIdleTimeout({ enabled: true, onTimeout })
      );

      expect(typeof result.current.staySignedIn).toBe('function');
      expect(typeof result.current.signOutNow).toBe('function');
    });
  });

  describe('when disabled', () => {
    it('does not open the warning dialog when disabled', () => {
      const onTimeout = vi.fn();
      const { result } = renderHook(() =>
        useIdleTimeout({ enabled: false, timeoutMs: 10_000, warningMs: 5_000, onTimeout })
      );

      act(() => {
        vi.advanceTimersByTime(10_000);
      });

      expect(result.current.isWarningOpen).toBe(false);
    });

    it('does not call onTimeout when disabled and time elapses', () => {
      const onTimeout = vi.fn();
      renderHook(() =>
        useIdleTimeout({ enabled: false, timeoutMs: 10_000, warningMs: 5_000, onTimeout })
      );

      act(() => {
        vi.advanceTimersByTime(15_000);
      });

      expect(onTimeout).not.toHaveBeenCalled();
    });

    it('staySignedIn does nothing when disabled', () => {
      const onTimeout = vi.fn();
      const { result } = renderHook(() =>
        useIdleTimeout({ enabled: false, timeoutMs: 10_000, warningMs: 5_000, onTimeout })
      );

      act(() => {
        result.current.staySignedIn();
      });

      // No warning should open
      expect(result.current.isWarningOpen).toBe(false);
    });
  });

  describe('warning phase', () => {
    it('opens warning dialog after timeoutMs - warningMs elapses', () => {
      const onTimeout = vi.fn();
      const timeoutMs = 30_000;
      const warningMs = 10_000;
      const { result } = renderHook(() =>
        useIdleTimeout({ enabled: true, timeoutMs, warningMs, onTimeout })
      );

      // Advance to just before the warning threshold
      act(() => {
        vi.advanceTimersByTime(timeoutMs - warningMs - 1);
      });
      expect(result.current.isWarningOpen).toBe(false);

      // Advance past the warning threshold
      act(() => {
        vi.advanceTimersByTime(2);
      });
      expect(result.current.isWarningOpen).toBe(true);
    });

    it('calls onTimeout after the full timeoutMs period', async () => {
      const onTimeout = vi.fn().mockResolvedValue(undefined);
      const timeoutMs = 30_000;
      const warningMs = 10_000;
      renderHook(() =>
        useIdleTimeout({ enabled: true, timeoutMs, warningMs, onTimeout })
      );

      await act(async () => {
        vi.advanceTimersByTime(timeoutMs + 100);
      });

      expect(onTimeout).toHaveBeenCalledOnce();
    });

    it('closes warning dialog after timeout fires', async () => {
      const onTimeout = vi.fn().mockResolvedValue(undefined);
      const timeoutMs = 20_000;
      const warningMs = 5_000;
      const { result } = renderHook(() =>
        useIdleTimeout({ enabled: true, timeoutMs, warningMs, onTimeout })
      );

      // Advance to warning phase
      act(() => {
        vi.advanceTimersByTime(timeoutMs - warningMs + 100);
      });
      expect(result.current.isWarningOpen).toBe(true);

      // Advance past full timeout
      await act(async () => {
        vi.advanceTimersByTime(warningMs + 100);
      });
      expect(result.current.isWarningOpen).toBe(false);
    });
  });

  describe('staySignedIn', () => {
    it('resets the warning dialog when called during warning phase', () => {
      const onTimeout = vi.fn();
      const timeoutMs = 30_000;
      const warningMs = 10_000;
      const { result } = renderHook(() =>
        useIdleTimeout({ enabled: true, timeoutMs, warningMs, onTimeout })
      );

      // Advance to warning phase
      act(() => {
        vi.advanceTimersByTime(timeoutMs - warningMs + 100);
      });
      expect(result.current.isWarningOpen).toBe(true);

      // User clicks "stay signed in"
      act(() => {
        result.current.staySignedIn();
      });
      expect(result.current.isWarningOpen).toBe(false);
    });

    it('resets secondsRemaining to warningMs / 1000 when called', () => {
      const onTimeout = vi.fn();
      const timeoutMs = 30_000;
      const warningMs = 10_000;
      const { result } = renderHook(() =>
        useIdleTimeout({ enabled: true, timeoutMs, warningMs, onTimeout })
      );

      // Advance to warning phase so countdown is ticking
      act(() => {
        vi.advanceTimersByTime(timeoutMs - warningMs + 100);
      });

      act(() => {
        result.current.staySignedIn();
      });

      expect(result.current.secondsRemaining).toBe(Math.floor(warningMs / 1000));
    });

    it('prevents onTimeout from being called after staySignedIn', async () => {
      const onTimeout = vi.fn().mockResolvedValue(undefined);
      const timeoutMs = 30_000;
      const warningMs = 10_000;
      const { result } = renderHook(() =>
        useIdleTimeout({ enabled: true, timeoutMs, warningMs, onTimeout })
      );

      // Advance to just before timeout
      act(() => {
        vi.advanceTimersByTime(timeoutMs - warningMs + 100);
      });

      // User clicks "stay signed in"
      act(() => {
        result.current.staySignedIn();
      });

      // Advance past original timeout
      await act(async () => {
        vi.advanceTimersByTime(warningMs + 500);
      });

      expect(onTimeout).not.toHaveBeenCalled();
    });
  });

  describe('signOutNow', () => {
    it('calls onTimeout immediately', async () => {
      const onTimeout = vi.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() =>
        useIdleTimeout({ enabled: true, timeoutMs: 60_000, warningMs: 10_000, onTimeout })
      );

      await act(async () => {
        await result.current.signOutNow();
      });

      expect(onTimeout).toHaveBeenCalledOnce();
    });

    it('closes the warning dialog when called', async () => {
      const onTimeout = vi.fn().mockResolvedValue(undefined);
      const timeoutMs = 30_000;
      const warningMs = 10_000;
      const { result } = renderHook(() =>
        useIdleTimeout({ enabled: true, timeoutMs, warningMs, onTimeout })
      );

      // Advance to warning phase
      act(() => {
        vi.advanceTimersByTime(timeoutMs - warningMs + 100);
      });
      expect(result.current.isWarningOpen).toBe(true);

      await act(async () => {
        await result.current.signOutNow();
      });

      expect(result.current.isWarningOpen).toBe(false);
    });

    it('does not call onTimeout more than once even if signOutNow is called twice', async () => {
      const onTimeout = vi.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() =>
        useIdleTimeout({ enabled: true, timeoutMs: 60_000, warningMs: 10_000, onTimeout })
      );

      await act(async () => {
        await result.current.signOutNow();
      });
      await act(async () => {
        await result.current.signOutNow();
      });

      expect(onTimeout).toHaveBeenCalledOnce();
    });
  });

  describe('activity throttling', () => {
    it('resets timers on user activity (mousemove)', () => {
      const onTimeout = vi.fn();
      const timeoutMs = 20_000;
      const warningMs = 5_000;
      const { result } = renderHook(() =>
        useIdleTimeout({ enabled: true, timeoutMs, warningMs, onTimeout })
      );

      // Advance most of the way through the timeout (warning would open at 15_000ms)
      act(() => {
        vi.advanceTimersByTime(timeoutMs - warningMs - 500);
      });

      // Simulate user activity — should reset the timer (new warning at 14_500 + 15_000 = 29_500ms)
      act(() => {
        window.dispatchEvent(new Event('mousemove'));
      });

      // Just before the new warning threshold
      act(() => {
        vi.advanceTimersByTime(timeoutMs - warningMs - 1);
      });
      expect(result.current.isWarningOpen).toBe(false);

      // Past the new warning threshold — warning should open (proves schedule reset from activity)
      act(() => {
        vi.advanceTimersByTime(2);
      });
      expect(result.current.isWarningOpen).toBe(true);
      expect(onTimeout).not.toHaveBeenCalled();
    });

    it('throttles activity to at most once per ACTIVITY_THROTTLE_MS (1000ms)', () => {
      const onTimeout = vi.fn();
      const timeoutMs = 10_000;
      const warningMs = 3_000;
      const { result } = renderHook(() =>
        useIdleTimeout({ enabled: true, timeoutMs, warningMs, onTimeout })
      );

      // Past mount; first activity schedules warning at t + (timeoutMs - warningMs) = 1100 + 7000 = 8100
      act(() => {
        vi.advanceTimersByTime(1100);
        window.dispatchEvent(new Event('mousemove'));
      });

      // Second activity inside throttle window would reschedule warning to 8600 if not throttled
      act(() => {
        vi.advanceTimersByTime(500);
        window.dispatchEvent(new Event('mousemove'));
      });

      // Past first scheduled warning (8100), before false reschedule (8600)
      act(() => {
        vi.advanceTimersByTime(6600);
      });
      expect(result.current.isWarningOpen).toBe(true);
      expect(onTimeout).not.toHaveBeenCalled();
    });

    it('resets timers on keydown event', () => {
      const onTimeout = vi.fn().mockResolvedValue(undefined);
      const timeoutMs = 15_000;
      const warningMs = 5_000;
      renderHook(() =>
        useIdleTimeout({ enabled: true, timeoutMs, warningMs, onTimeout })
      );

      // Advance to near warning
      act(() => {
        vi.advanceTimersByTime(timeoutMs - warningMs - 100);
      });

      // Fire activity after throttle window
      act(() => {
        vi.advanceTimersByTime(1100); // advance past 1s throttle
        window.dispatchEvent(new Event('keydown'));
      });

      // After activity, advance the same amount - should not have timed out
      act(() => {
        vi.advanceTimersByTime(timeoutMs - warningMs - 100);
      });

      expect(onTimeout).not.toHaveBeenCalled();
    });
  });

  describe('cleanup on unmount', () => {
    it('removes event listeners on unmount', () => {
      const onTimeout = vi.fn();
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      const { unmount } = renderHook(() =>
        useIdleTimeout({ enabled: true, timeoutMs: 60_000, warningMs: 10_000, onTimeout })
      );

      unmount();

      // At least one removeEventListener call should have happened
      expect(removeEventListenerSpy).toHaveBeenCalled();
    });

    it('clears timers on unmount so onTimeout is not called after unmount', async () => {
      const onTimeout = vi.fn().mockResolvedValue(undefined);
      const timeoutMs = 10_000;
      const warningMs = 3_000;

      const { unmount } = renderHook(() =>
        useIdleTimeout({ enabled: true, timeoutMs, warningMs, onTimeout })
      );

      // Unmount before the timeout fires
      unmount();

      // Advance past the full timeout
      await act(async () => {
        vi.advanceTimersByTime(timeoutMs + 1000);
      });

      expect(onTimeout).not.toHaveBeenCalled();
    });
  });

  describe('visibilitychange event', () => {
    it('resets activity timer when tab becomes visible', () => {
      const onTimeout = vi.fn();
      const timeoutMs = 30_000;
      const warningMs = 5_000;
      const originalDescriptor =
        Object.getOwnPropertyDescriptor(document, 'visibilityState') ??
        Object.getOwnPropertyDescriptor(Object.getPrototypeOf(document), 'visibilityState');

      try {
        const { result } = renderHook(() =>
          useIdleTimeout({ enabled: true, timeoutMs, warningMs, onTimeout })
        );

        // Near original warning threshold (25_000ms) without crossing it
        act(() => {
          vi.advanceTimersByTime(timeoutMs - warningMs - 1000);
        });
        expect(result.current.isWarningOpen).toBe(false);

        // Visible tab triggers registerActivity → full reschedule
        act(() => {
          Object.defineProperty(document, 'visibilityState', {
            value: 'visible',
            configurable: true,
          });
          document.dispatchEvent(new Event('visibilitychange'));
        });

        // Past the *pre-reset* warning time — would be open if visibility had not reset schedules
        act(() => {
          vi.advanceTimersByTime(1500);
        });
        expect(result.current.isWarningOpen).toBe(false);
        expect(onTimeout).not.toHaveBeenCalled();
      } finally {
        if (originalDescriptor) {
          Object.defineProperty(document, 'visibilityState', originalDescriptor);
        } else {
          delete (document as unknown as { visibilityState?: string }).visibilityState;
        }
      }
    });
  });

  describe('enabled toggling', () => {
    it('clears timers when enabled changes from true to false', async () => {
      const onTimeout = vi.fn().mockResolvedValue(undefined);
      const timeoutMs = 20_000;
      const warningMs = 5_000;

      const { rerender } = renderHook(
        ({ enabled }: { enabled: boolean }) =>
          useIdleTimeout({ enabled, timeoutMs, warningMs, onTimeout }),
        { initialProps: { enabled: true } }
      );

      // Advance to warning phase
      act(() => {
        vi.advanceTimersByTime(timeoutMs - warningMs + 100);
      });

      // Disable the hook
      rerender({ enabled: false });

      // Advance past original timeout
      await act(async () => {
        vi.advanceTimersByTime(warningMs + 500);
      });

      // onTimeout should NOT fire because we disabled the hook
      expect(onTimeout).not.toHaveBeenCalled();
    });

    it('starts timers when enabled changes from false to true', () => {
      const onTimeout = vi.fn();
      const timeoutMs = 20_000;
      const warningMs = 5_000;

      const { result, rerender } = renderHook(
        ({ enabled }: { enabled: boolean }) =>
          useIdleTimeout({ enabled, timeoutMs, warningMs, onTimeout }),
        { initialProps: { enabled: false } }
      );

      expect(result.current.isWarningOpen).toBe(false);

      // Enable the hook
      rerender({ enabled: true });

      // Advance to warning phase
      act(() => {
        vi.advanceTimersByTime(timeoutMs - warningMs + 100);
      });

      expect(result.current.isWarningOpen).toBe(true);
    });
  });

  describe('onTimeout idempotency', () => {
    it('does not call onTimeout twice if signOutNow runs while timer-fired onTimeout is pending', async () => {
      const deferred: { resolve?: () => void } = {};
      const onTimeout = vi.fn().mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            deferred.resolve = resolve;
          })
      );

      const { result } = renderHook(() =>
        useIdleTimeout({ enabled: true, timeoutMs: 10_000, warningMs: 3_000, onTimeout })
      );

      await act(async () => {
        vi.advanceTimersByTime(10_000);
        await Promise.resolve();
      });

      expect(onTimeout).toHaveBeenCalledOnce();
      expect(deferred.resolve).toBeDefined();

      await act(async () => {
        await result.current.signOutNow();
      });

      expect(onTimeout).toHaveBeenCalledOnce();

      const finish = deferred.resolve;
      expect(finish).toBeDefined();
      await act(async () => {
        finish?.();
        await Promise.resolve();
      });

      expect(onTimeout).toHaveBeenCalledOnce();
    });
  });
});
