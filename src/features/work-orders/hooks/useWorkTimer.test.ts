/**
 * useWorkTimer Hook Tests
 *
 * Covers:
 * - Initial state (no workOrderId, fresh workOrderId, loaded from localStorage)
 * - displayTime / formatTime formatting via preloaded accumulated seconds
 * - start(): sets running, no-op when already running or no workOrderId
 * - pause(): accumulates elapsed seconds, no-op when not running or no workOrderId
 * - start/pause cycles: time accumulates correctly, not counted while paused
 * - elapsedSeconds: increments on tick, does not increment while paused
 * - stopAndGetHours(): calculates hours, resets state, clears localStorage
 * - reset(): clears all state and localStorage
 * - workOrderId changes: resets state, loads new saved state
 * - localStorage persistence: running and paused states are saved
 * - Resume from localStorage: running timers add elapsed wall-clock seconds
 *
 * Intentionally deferred:
 * - Exact save-state timing under simultaneous state transitions
 * - Concurrent hook instances for different workOrderIds (race on a single key)
 * - Quota-exceeded localStorage errors (WrappedError path in saveState/clearState)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWorkTimer } from './useWorkTimer';

const STORAGE_KEY_PREFIX = 'eqr_work_timer_';
const storageKey = (id: string) => `${STORAGE_KEY_PREFIX}${id}`;

interface SavedTimerState {
  workOrderId: string;
  startTime: number;
  originalStartTime: number;
  accumulatedSeconds: number;
  isRunning: boolean;
}

function seedStorage(id: string, overrides: Partial<SavedTimerState> = {}) {
  const state: SavedTimerState = {
    workOrderId: id,
    startTime: 0,
    originalStartTime: 0,
    accumulatedSeconds: 0,
    isRunning: false,
    ...overrides,
  };
  localStorage.setItem(storageKey(id), JSON.stringify(state));
}

describe('useWorkTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  // ---------------------------------------------------------------------------
  // Initial state
  // ---------------------------------------------------------------------------

  describe('initial state', () => {
    it('starts with isRunning false, 0 elapsed seconds, and 00:00:00 display', () => {
      const { result } = renderHook(() => useWorkTimer('wo-1'));

      expect(result.current.isRunning).toBe(false);
      expect(result.current.elapsedSeconds).toBe(0);
      expect(result.current.displayTime).toBe('00:00:00');
    });

    it('returns zero state when workOrderId is undefined', () => {
      const { result } = renderHook(() => useWorkTimer(undefined));

      expect(result.current.isRunning).toBe(false);
      expect(result.current.elapsedSeconds).toBe(0);
      expect(result.current.displayTime).toBe('00:00:00');
    });

    it('loads accumulated seconds from a saved paused timer', () => {
      seedStorage('wo-paused', { accumulatedSeconds: 120, isRunning: false });

      const { result } = renderHook(() => useWorkTimer('wo-paused'));

      expect(result.current.isRunning).toBe(false);
      expect(result.current.elapsedSeconds).toBe(120);
    });

    it('resumes a running timer from localStorage and adds elapsed wall-clock seconds', () => {
      const baseTime = 2_000_000;
      vi.setSystemTime(baseTime);

      seedStorage('wo-resume', {
        startTime: baseTime - 10_000,
        originalStartTime: baseTime - 10_000,
        accumulatedSeconds: 30,
        isRunning: true,
      });

      const { result } = renderHook(() => useWorkTimer('wo-resume'));

      expect(result.current.isRunning).toBe(true);
      // 30 accumulated + 10 elapsed since saved startTime
      expect(result.current.elapsedSeconds).toBe(40);
    });

    it('starts fresh when localStorage contains corrupted data', () => {
      localStorage.setItem(storageKey('wo-corrupt'), 'not-valid-json{{{{');

      const { result } = renderHook(() => useWorkTimer('wo-corrupt'));

      expect(result.current.isRunning).toBe(false);
      expect(result.current.elapsedSeconds).toBe(0);
    });

    it('starts fresh when no saved state exists for the workOrderId', () => {
      seedStorage('other-wo', { accumulatedSeconds: 999 });

      const { result } = renderHook(() => useWorkTimer('wo-fresh'));

      expect(result.current.elapsedSeconds).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // displayTime / formatTime
  // ---------------------------------------------------------------------------

  describe('displayTime formatting', () => {
    it('formats 0 seconds as 00:00:00', () => {
      const { result } = renderHook(() => useWorkTimer('wo-fmt'));
      expect(result.current.displayTime).toBe('00:00:00');
    });

    it('formats 61 seconds as 00:01:01', () => {
      seedStorage('wo-fmt61', { accumulatedSeconds: 61 });
      const { result } = renderHook(() => useWorkTimer('wo-fmt61'));
      expect(result.current.displayTime).toBe('00:01:01');
    });

    it('formats 3661 seconds as 01:01:01', () => {
      seedStorage('wo-fmt3661', { accumulatedSeconds: 3661 });
      const { result } = renderHook(() => useWorkTimer('wo-fmt3661'));
      expect(result.current.displayTime).toBe('01:01:01');
    });

    it('formats 7322 seconds as 02:02:02', () => {
      seedStorage('wo-fmt7322', { accumulatedSeconds: 7322 });
      const { result } = renderHook(() => useWorkTimer('wo-fmt7322'));
      expect(result.current.displayTime).toBe('02:02:02');
    });

    it('pads single-digit values with leading zeros', () => {
      seedStorage('wo-fmt-pad', { accumulatedSeconds: 3600 }); // 01:00:00
      const { result } = renderHook(() => useWorkTimer('wo-fmt-pad'));
      expect(result.current.displayTime).toBe('01:00:00');
    });
  });

  // ---------------------------------------------------------------------------
  // start()
  // ---------------------------------------------------------------------------

  describe('start()', () => {
    it('sets isRunning to true', () => {
      const { result } = renderHook(() => useWorkTimer('wo-start'));

      act(() => { result.current.start(); });

      expect(result.current.isRunning).toBe(true);
    });

    it('is a no-op when workOrderId is undefined', () => {
      const { result } = renderHook(() => useWorkTimer(undefined));

      act(() => { result.current.start(); });

      expect(result.current.isRunning).toBe(false);
    });

    it('is a no-op when already running', () => {
      const { result } = renderHook(() => useWorkTimer('wo-start-noop'));

      act(() => { result.current.start(); });
      act(() => { vi.advanceTimersByTime(2000); });
      // Starting again while already running should not reset elapsed
      act(() => { result.current.start(); });

      expect(result.current.isRunning).toBe(true);
      expect(result.current.elapsedSeconds).toBeGreaterThanOrEqual(2);
    });
  });

  // ---------------------------------------------------------------------------
  // pause()
  // ---------------------------------------------------------------------------

  describe('pause()', () => {
    it('sets isRunning to false', () => {
      const { result } = renderHook(() => useWorkTimer('wo-pause'));

      act(() => { result.current.start(); });
      act(() => { result.current.pause(); });

      expect(result.current.isRunning).toBe(false);
    });

    it('accumulates elapsed seconds when paused', () => {
      const { result } = renderHook(() => useWorkTimer('wo-pause-accum'));

      act(() => { result.current.start(); });
      act(() => { vi.advanceTimersByTime(5000); });
      act(() => { result.current.pause(); });

      expect(result.current.elapsedSeconds).toBe(5);
    });

    it('is a no-op when not running', () => {
      const { result } = renderHook(() => useWorkTimer('wo-pause-noop'));

      act(() => { result.current.pause(); });

      expect(result.current.isRunning).toBe(false);
      expect(result.current.elapsedSeconds).toBe(0);
    });

    it('is a no-op when workOrderId is undefined', () => {
      const { result } = renderHook(() => useWorkTimer(undefined));

      act(() => { result.current.pause(); });

      expect(result.current.isRunning).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // start / pause cycles
  // ---------------------------------------------------------------------------

  describe('start/pause cycles', () => {
    it('accumulates total time correctly across multiple sessions', () => {
      const { result } = renderHook(() => useWorkTimer('wo-cycle'));

      // Session 1: 5 seconds
      act(() => { result.current.start(); });
      act(() => { vi.advanceTimersByTime(5000); });
      act(() => { result.current.pause(); });

      expect(result.current.elapsedSeconds).toBe(5);

      // Session 2: 3 more seconds
      act(() => { result.current.start(); });
      act(() => { vi.advanceTimersByTime(3000); });
      act(() => { result.current.pause(); });

      expect(result.current.elapsedSeconds).toBe(8);
    });

    it('does not count time that passes while paused', () => {
      const { result } = renderHook(() => useWorkTimer('wo-paused-no-tick'));

      act(() => { result.current.start(); });
      act(() => { vi.advanceTimersByTime(4000); });
      act(() => { result.current.pause(); });

      const elapsedWhenPaused = result.current.elapsedSeconds;

      // Advance time while paused — should not change elapsedSeconds
      act(() => { vi.advanceTimersByTime(10_000); });

      expect(result.current.elapsedSeconds).toBe(elapsedWhenPaused);
    });
  });

  // ---------------------------------------------------------------------------
  // elapsedSeconds tick
  // ---------------------------------------------------------------------------

  describe('elapsedSeconds', () => {
    it('increments as the interval fires while running', () => {
      const { result } = renderHook(() => useWorkTimer('wo-tick'));

      act(() => { result.current.start(); });
      act(() => { vi.advanceTimersByTime(3000); });

      expect(result.current.elapsedSeconds).toBe(3);
    });

    it('updates displayTime as time passes', () => {
      const { result } = renderHook(() => useWorkTimer('wo-tick-display'));

      act(() => { result.current.start(); });
      act(() => { vi.advanceTimersByTime(61_000); }); // 1 minute 1 second

      expect(result.current.displayTime).toBe('00:01:01');
    });
  });

  // ---------------------------------------------------------------------------
  // stopAndGetHours()
  // ---------------------------------------------------------------------------

  describe('stopAndGetHours()', () => {
    it('returns 0 when workOrderId is undefined', () => {
      const { result } = renderHook(() => useWorkTimer(undefined));

      let hours = -1;
      act(() => { hours = result.current.stopAndGetHours(); });

      expect(hours).toBe(0);
    });

    it('converts 5400 accumulated seconds to 1.5 hours', () => {
      seedStorage('wo-hours', { accumulatedSeconds: 5400 });

      const { result } = renderHook(() => useWorkTimer('wo-hours'));

      let hours = -1;
      act(() => { hours = result.current.stopAndGetHours(); });

      expect(hours).toBe(1.5);
    });

    it('includes current running session seconds in the total', () => {
      const baseTime = 5_000_000;
      vi.setSystemTime(baseTime);

      // Pre-saved: accumulated 3600s, running since 1800s ago
      seedStorage('wo-running-stop', {
        startTime: baseTime - 1_800_000,
        originalStartTime: baseTime - 1_800_000,
        accumulatedSeconds: 3600,
        isRunning: true,
      });

      const { result } = renderHook(() => useWorkTimer('wo-running-stop'));

      let hours = -1;
      act(() => { hours = result.current.stopAndGetHours(); });

      // 3600 + 1800 = 5400 seconds = 1.5 hours
      expect(hours).toBe(1.5);
    });

    it('resets isRunning and elapsedSeconds to zero after stopping', () => {
      seedStorage('wo-stop-reset', { accumulatedSeconds: 3600 });

      const { result } = renderHook(() => useWorkTimer('wo-stop-reset'));

      act(() => { result.current.stopAndGetHours(); });

      expect(result.current.isRunning).toBe(false);
      expect(result.current.elapsedSeconds).toBe(0);
      expect(result.current.displayTime).toBe('00:00:00');
    });

    it('clears the localStorage entry after stopping', () => {
      seedStorage('wo-stop-clear', { accumulatedSeconds: 100 });

      const { result } = renderHook(() => useWorkTimer('wo-stop-clear'));

      act(() => { result.current.stopAndGetHours(); });

      expect(localStorage.getItem(storageKey('wo-stop-clear'))).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // reset()
  // ---------------------------------------------------------------------------

  describe('reset()', () => {
    it('resets isRunning, elapsedSeconds, and displayTime to initial values', () => {
      const { result } = renderHook(() => useWorkTimer('wo-reset'));

      act(() => { result.current.start(); });
      act(() => { vi.advanceTimersByTime(5000); });
      act(() => { result.current.pause(); });

      expect(result.current.elapsedSeconds).toBe(5);

      act(() => { result.current.reset(); });

      expect(result.current.isRunning).toBe(false);
      expect(result.current.elapsedSeconds).toBe(0);
      expect(result.current.displayTime).toBe('00:00:00');
    });

    it('clears the localStorage entry after reset', () => {
      const { result } = renderHook(() => useWorkTimer('wo-reset-clear'));

      act(() => { result.current.start(); });
      act(() => { vi.advanceTimersByTime(1000); });
      act(() => { result.current.reset(); });

      expect(localStorage.getItem(storageKey('wo-reset-clear'))).toBeNull();
    });

    it('is a no-op when workOrderId is undefined', () => {
      const { result } = renderHook(() => useWorkTimer(undefined));

      // Should not throw
      act(() => { result.current.reset(); });

      expect(result.current.isRunning).toBe(false);
      expect(result.current.elapsedSeconds).toBe(0);
    });

    it('also stops the running interval when called while running', () => {
      const { result } = renderHook(() => useWorkTimer('wo-reset-running'));

      act(() => { result.current.start(); });
      act(() => { vi.advanceTimersByTime(3000); });
      act(() => { result.current.reset(); });

      // After reset, advancing time should NOT update elapsedSeconds
      act(() => { vi.advanceTimersByTime(5000); });

      expect(result.current.elapsedSeconds).toBe(0);
      expect(result.current.isRunning).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // workOrderId changes
  // ---------------------------------------------------------------------------

  describe('workOrderId changes', () => {
    it('resets state when switching to a new workOrderId with no saved state', () => {
      const { result, rerender } = renderHook(
        ({ id }: { id: string | undefined }) => useWorkTimer(id),
        { initialProps: { id: 'wo-a' as string | undefined } },
      );

      act(() => { result.current.start(); });
      act(() => { vi.advanceTimersByTime(5000); });

      expect(result.current.elapsedSeconds).toBeGreaterThan(0);

      rerender({ id: 'wo-b' });

      expect(result.current.isRunning).toBe(false);
      expect(result.current.elapsedSeconds).toBe(0);
    });

    it('resets state when workOrderId changes to undefined', () => {
      const { result, rerender } = renderHook(
        ({ id }: { id: string | undefined }) => useWorkTimer(id),
        { initialProps: { id: 'wo-c' as string | undefined } },
      );

      act(() => { result.current.start(); });
      act(() => { vi.advanceTimersByTime(3000); });

      rerender({ id: undefined });

      expect(result.current.isRunning).toBe(false);
      expect(result.current.elapsedSeconds).toBe(0);
    });

    it('loads saved state for the new workOrderId when switching', () => {
      seedStorage('wo-d', { accumulatedSeconds: 77 });

      const { result, rerender } = renderHook(
        ({ id }: { id: string | undefined }) => useWorkTimer(id),
        { initialProps: { id: 'wo-c' as string | undefined } },
      );

      rerender({ id: 'wo-d' });

      expect(result.current.elapsedSeconds).toBe(77);
    });
  });

  // ---------------------------------------------------------------------------
  // localStorage persistence
  // ---------------------------------------------------------------------------

  describe('localStorage persistence', () => {
    it('saves running state to localStorage after start', () => {
      const { result } = renderHook(() => useWorkTimer('wo-save-run'));

      act(() => { result.current.start(); });

      const stored = localStorage.getItem(storageKey('wo-save-run'));
      expect(stored).not.toBeNull();

      const parsed = JSON.parse(stored!);
      expect(parsed.isRunning).toBe(true);
      expect(parsed.workOrderId).toBe('wo-save-run');
    });

    it('saves paused state to localStorage after pause', () => {
      const { result } = renderHook(() => useWorkTimer('wo-save-pause'));

      act(() => { result.current.start(); });
      act(() => { vi.advanceTimersByTime(4000); });
      act(() => { result.current.pause(); });

      const stored = localStorage.getItem(storageKey('wo-save-pause'));
      expect(stored).not.toBeNull();

      const parsed = JSON.parse(stored!);
      expect(parsed.isRunning).toBe(false);
      expect(parsed.accumulatedSeconds).toBe(4);
    });

    it('does not write to localStorage when workOrderId is undefined', () => {
      const { result } = renderHook(() => useWorkTimer(undefined));

      act(() => { result.current.start(); });

      // localStorage should still be empty (no key was written)
      expect(localStorage.length).toBe(0);
    });
  });
});
