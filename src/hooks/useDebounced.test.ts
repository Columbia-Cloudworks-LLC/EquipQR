/**
 * useDebounced / useDebouncedSearch Hook Tests
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
 * useDebouncedSearch:
 *   - returns all items when searchTerm is empty
 *   - returns all items for whitespace-only searchTerm (after trim check)
 *   - does NOT filter items before the debounce delay fires
 *   - filters items after the debounce delay fires
 *   - performs case-insensitive matching
 *   - searches across multiple specified fields
 *   - returns an empty array when no items match
 *   - isSearching is true while the debounce is pending
 *   - isSearching becomes false once the debounce fires
 *   - exposes the debounced searchTerm value (not the live value)
 *   - uses the default delay of 300 ms when delay is omitted
 *   - handles an empty items array gracefully
 *   - matches substrings, not only exact whole-field values
 *
 * Intentionally deferred:
 *   - Race conditions where delay changes simultaneously with value changes
 *     on the same render tick (requires advanced concurrency control).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebounced, useDebouncedSearch } from './useDebounced';

// ---------------------------------------------------------------------------
// useDebounced
// ---------------------------------------------------------------------------

describe('useDebounced', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
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
    clearTimeoutSpy.mockRestore();
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

// ---------------------------------------------------------------------------
// useDebouncedSearch
// ---------------------------------------------------------------------------

describe('useDebouncedSearch', () => {
  interface Item {
    id: number;
    name: string;
    category: string;
  }

  const sampleItems: Item[] = [
    { id: 1, name: 'Alpha Widget', category: 'tools' },
    { id: 2, name: 'Beta Gadget', category: 'electronics' },
    { id: 3, name: 'Gamma Tool', category: 'tools' },
    { id: 4, name: 'Delta Device', category: 'electronics' },
  ];

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns all items immediately when searchTerm is empty', () => {
    const { result } = renderHook(() =>
      useDebouncedSearch(sampleItems, '', ['name'], 300)
    );

    expect(result.current.filteredItems).toEqual(sampleItems);
  });

  it('returns all items when searchTerm is whitespace only (trim check)', () => {
    const { result } = renderHook(() =>
      useDebouncedSearch(sampleItems, '   ', ['name'], 300)
    );

    // After debounce fires, debouncedSearchTerm = '   ' which trims to '' → all items
    act(() => { vi.advanceTimersByTime(300); });

    expect(result.current.filteredItems).toEqual(sampleItems);
  });

  it('does not filter items before the debounce delay fires', () => {
    const { result, rerender } = renderHook(
      ({ term }) => useDebouncedSearch(sampleItems, term, ['name'], 300),
      { initialProps: { term: '' } }
    );

    rerender({ term: 'Alpha' });

    // Timer has NOT advanced — debouncedSearchTerm is still ''
    expect(result.current.filteredItems).toEqual(sampleItems);
  });

  it('filters items to matching results after the debounce delay fires', () => {
    const { result, rerender } = renderHook(
      ({ term }) => useDebouncedSearch(sampleItems, term, ['name'], 300),
      { initialProps: { term: '' } }
    );

    rerender({ term: 'Alpha' });

    act(() => { vi.advanceTimersByTime(300); });

    expect(result.current.filteredItems).toHaveLength(1);
    expect(result.current.filteredItems[0].name).toBe('Alpha Widget');
  });

  it('performs case-insensitive matching', () => {
    const { result, rerender } = renderHook(
      ({ term }) => useDebouncedSearch(sampleItems, term, ['name'], 300),
      { initialProps: { term: '' } }
    );

    rerender({ term: 'ALPHA' });

    act(() => { vi.advanceTimersByTime(300); });

    expect(result.current.filteredItems).toHaveLength(1);
    expect(result.current.filteredItems[0].name).toBe('Alpha Widget');
  });

  it('searches across all specified fields', () => {
    const { result, rerender } = renderHook(
      ({ term }) => useDebouncedSearch(sampleItems, term, ['name', 'category'], 300),
      { initialProps: { term: '' } }
    );

    // 'tools' only appears in the category field
    rerender({ term: 'tools' });

    act(() => { vi.advanceTimersByTime(300); });

    // id 1 (category: tools) and id 3 (category: tools, and name "Gamma Tool") both match
    const ids = result.current.filteredItems.map(i => i.id);
    expect(ids).toEqual(expect.arrayContaining([1, 3]));
    expect(ids).not.toContain(2);
    expect(ids).not.toContain(4);
  });

  it('returns an empty array when no items match the search term', () => {
    const { result, rerender } = renderHook(
      ({ term }) => useDebouncedSearch(sampleItems, term, ['name'], 300),
      { initialProps: { term: '' } }
    );

    rerender({ term: 'zzz-no-match' });

    act(() => { vi.advanceTimersByTime(300); });

    expect(result.current.filteredItems).toHaveLength(0);
  });

  it('isSearching is true while the debounce is pending', () => {
    const { result, rerender } = renderHook(
      ({ term }) => useDebouncedSearch(sampleItems, term, ['name'], 300),
      { initialProps: { term: '' } }
    );

    rerender({ term: 'Alpha' });

    // Before delay fires: live term !== debounced term
    expect(result.current.isSearching).toBe(true);
  });

  it('isSearching becomes false once the debounce fires and terms match', () => {
    const { result, rerender } = renderHook(
      ({ term }) => useDebouncedSearch(sampleItems, term, ['name'], 300),
      { initialProps: { term: '' } }
    );

    rerender({ term: 'Alpha' });

    act(() => { vi.advanceTimersByTime(300); });

    expect(result.current.isSearching).toBe(false);
  });

  it('exposes the debounced searchTerm (lags behind the live input term)', () => {
    const { result, rerender } = renderHook(
      ({ term }) => useDebouncedSearch(sampleItems, term, ['name'], 300),
      { initialProps: { term: '' } }
    );

    rerender({ term: 'Beta' });

    // Before delay: returned searchTerm is still ''
    expect(result.current.searchTerm).toBe('');

    act(() => { vi.advanceTimersByTime(300); });

    // After delay: returned searchTerm has caught up
    expect(result.current.searchTerm).toBe('Beta');
  });

  it('defaults to a 300 ms delay when the delay argument is omitted', () => {
    const { result, rerender } = renderHook(
      ({ term }) => useDebouncedSearch(sampleItems, term, ['name']),
      { initialProps: { term: '' } }
    );

    rerender({ term: 'Gamma' });

    // 299 ms — should NOT have fired yet
    act(() => { vi.advanceTimersByTime(299); });
    expect(result.current.isSearching).toBe(true);

    // 1 ms more — fires exactly at 300 ms
    act(() => { vi.advanceTimersByTime(1); });
    expect(result.current.isSearching).toBe(false);
    expect(result.current.filteredItems).toHaveLength(1);
    expect(result.current.filteredItems[0].name).toBe('Gamma Tool');
  });

  it('handles an empty items array gracefully', () => {
    const { result } = renderHook(() =>
      useDebouncedSearch([], 'anything', ['name' as keyof Item], 300)
    );

    act(() => { vi.advanceTimersByTime(300); });

    expect(result.current.filteredItems).toEqual([]);
  });

  it('matches items containing the search term as a substring (partial match)', () => {
    const { result, rerender } = renderHook(
      ({ term }) => useDebouncedSearch(sampleItems, term, ['name'], 300),
      { initialProps: { term: '' } }
    );

    // 'wid' is a substring of "Alpha Widget" only
    rerender({ term: 'wid' });

    act(() => { vi.advanceTimersByTime(300); });

    expect(result.current.filteredItems).toHaveLength(1);
    expect(result.current.filteredItems[0].name).toBe('Alpha Widget');
  });

  it('isSearching is false on initial render when searchTerm is empty', () => {
    const { result } = renderHook(() =>
      useDebouncedSearch(sampleItems, '', ['name'], 300)
    );

    // Initial searchTerm === initial debouncedSearchTerm → not searching
    expect(result.current.isSearching).toBe(false);
  });
});
