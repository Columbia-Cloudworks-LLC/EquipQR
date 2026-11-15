/**
 * useDebounced Hook Tests
 *
 * Covers:
 * useDebounced:
 *   - returns initial value immediately (no delay on mount)
 *   - does NOT update before the delay elapses
 *   - updates the value after the delay elapses
 *   - debounces rapid changes — only the last value is applied
 *   - works with numeric values
 *   - works with object values
 *   - cleans up the timeout when the component unmounts
 *   - resets the timer when delay changes
 *
 * Intentionally deferred:
 *   - Race conditions where delay changes simultaneously with value changes
 *     on the same render tick (requires advanced concurrency control).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebounced } from './useDebounced';

// ---------------------------------------------------------------------------
// useDebounced
// ---------------------------------------------------------------------------

describe('useDebounced', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('returns the initial value immediately without waiting for the delay', () => {
    const { result } = renderHook(() => useDebounced('initial', 300));
    expect(result.current).toBe('initial');
  });

  it('does not update the value before the delay elapses', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounced(value, delay),
      { initialProps: { value: 'initial', delay: 300 } }
    );

    rerender({ value: 'updated', delay: 300 });

    // Advance by less than the configured delay
    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(result.current).toBe('initial');
  });

  it('updates the value after the full delay has elapsed', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounced(value, delay),
      { initialProps: { value: 'initial', delay: 300 } }
    );

    rerender({ value: 'updated', delay: 300 });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current).toBe('updated');
  });

  it('debounces rapid changes — only the final value is applied', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounced(value, delay),
      { initialProps: { value: 'a', delay: 300 } }
    );

    rerender({ value: 'b', delay: 300 });
    act(() => { vi.advanceTimersByTime(100); });

    rerender({ value: 'c', delay: 300 });
    act(() => { vi.advanceTimersByTime(100); });

    rerender({ value: 'd', delay: 300 });

    // No debounce has fired yet; initial value should still be held
    expect(result.current).toBe('a');

    // Fire the final debounce
    act(() => { vi.advanceTimersByTime(300); });

    expect(result.current).toBe('d');
  });

  it('works with numeric values', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounced(value, delay),
      { initialProps: { value: 0, delay: 200 } }
    );

    rerender({ value: 42, delay: 200 });

    act(() => { vi.advanceTimersByTime(200); });

    expect(result.current).toBe(42);
  });

  it('works with object values', () => {
    const initial = { id: 1, name: 'Alice' };
    const updated = { id: 2, name: 'Bob' };

    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounced(value, delay),
      { initialProps: { value: initial, delay: 500 } }
    );

    rerender({ value: updated, delay: 500 });

    act(() => { vi.advanceTimersByTime(500); });

    expect(result.current).toEqual({ id: 2, name: 'Bob' });
  });

  it('calls clearTimeout to cancel the pending timer when the component unmounts', () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');

    const { rerender, unmount } = renderHook(
      ({ value, delay }) => useDebounced(value, delay),
      { initialProps: { value: 'a', delay: 300 } }
    );

    // Trigger a pending timeout before unmounting
    rerender({ value: 'b', delay: 300 });
    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();
  });

  it('restarts the timer when the delay value changes', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounced(value, delay),
      { initialProps: { value: 'initial', delay: 300 } }
    );

    // Changing both value and delay at the same time
    rerender({ value: 'updated', delay: 600 });

    // The old 300 ms window passes — update must NOT fire yet
    act(() => { vi.advanceTimersByTime(300); });
    expect(result.current).toBe('initial');

    // The new 600 ms window completes — update fires
    act(() => { vi.advanceTimersByTime(300); });
    expect(result.current).toBe('updated');
  });
});
