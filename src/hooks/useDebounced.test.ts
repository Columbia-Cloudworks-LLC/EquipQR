/**
 * useDebounced & useDebouncedSearch Hook Tests
 *
 * Covers:
 * - useDebounced: initial value, delay update, rapid value changes (only last fires),
 *   delay change resets the timer, cleanup on unmount
 * - useDebouncedSearch: returns all items when search term is empty/whitespace,
 *   filters by a single field, filters by multiple fields, case-insensitive match,
 *   no match returns empty array, isSearching flag transitions, handles items with
 *   null/undefined field values, respects custom delay
 *
 * Intentionally deferred: concurrent delay-change + value-change edge cases that
 * require sub-millisecond precision and add little real-world value.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebounced, useDebouncedSearch } from './useDebounced';

describe('useDebounced', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns the initial value immediately without waiting for the delay', () => {
    const { result } = renderHook(() => useDebounced('hello', 300));
    expect(result.current).toBe('hello');
  });

  it('does not update the value before the delay has elapsed', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }: { value: string; delay: number }) => useDebounced(value, delay),
      { initialProps: { value: 'initial', delay: 300 } }
    );

    rerender({ value: 'updated', delay: 300 });

    // Advance only 200 ms — timer hasn't fired yet
    act(() => { vi.advanceTimersByTime(200); });
    expect(result.current).toBe('initial');
  });

  it('updates the value after the full delay has elapsed', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }: { value: string; delay: number }) => useDebounced(value, delay),
      { initialProps: { value: 'initial', delay: 300 } }
    );

    rerender({ value: 'updated', delay: 300 });

    act(() => { vi.advanceTimersByTime(300); });
    expect(result.current).toBe('updated');
  });

  it('debounces rapid successive changes — only the last value is applied', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }: { value: string; delay: number }) => useDebounced(value, delay),
      { initialProps: { value: 'a', delay: 300 } }
    );

    rerender({ value: 'b', delay: 300 });
    act(() => { vi.advanceTimersByTime(100); });
    rerender({ value: 'c', delay: 300 });
    act(() => { vi.advanceTimersByTime(100); });
    rerender({ value: 'd', delay: 300 });

    // 'b' and 'c' timers were cancelled; only 'd' should fire
    act(() => { vi.advanceTimersByTime(300); });
    expect(result.current).toBe('d');
  });

  it('works with numeric values', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }: { value: number; delay: number }) => useDebounced(value, delay),
      { initialProps: { value: 0, delay: 100 } }
    );

    rerender({ value: 42, delay: 100 });
    act(() => { vi.advanceTimersByTime(100); });
    expect(result.current).toBe(42);
  });

  it('works with object values', () => {
    const obj1 = { name: 'a' };
    const obj2 = { name: 'b' };

    const { result, rerender } = renderHook(
      ({ value, delay }: { value: { name: string }; delay: number }) => useDebounced(value, delay),
      { initialProps: { value: obj1, delay: 200 } }
    );

    rerender({ value: obj2, delay: 200 });
    act(() => { vi.advanceTimersByTime(200); });
    expect(result.current).toBe(obj2);
  });

  it('resets the timer when the delay prop changes', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }: { value: string; delay: number }) => useDebounced(value, delay),
      { initialProps: { value: 'initial', delay: 300 } }
    );

    rerender({ value: 'updated', delay: 300 });
    act(() => { vi.advanceTimersByTime(150); }); // halfway through

    // Changing delay restarts the timer with the new value
    rerender({ value: 'updated', delay: 500 });
    act(() => { vi.advanceTimersByTime(300); }); // not yet 500 ms since last rerender
    expect(result.current).toBe('initial'); // should still be stale

    act(() => { vi.advanceTimersByTime(200); }); // total 500 ms since delay change
    expect(result.current).toBe('updated');
  });

  it('clears the pending timeout on unmount to prevent state updates', () => {
    const { result, rerender, unmount } = renderHook(
      ({ value, delay }: { value: string; delay: number }) => useDebounced(value, delay),
      { initialProps: { value: 'initial', delay: 300 } }
    );

    rerender({ value: 'updated', delay: 300 });
    unmount();

    // Running timers after unmount must NOT throw
    expect(() => { act(() => { vi.advanceTimersByTime(300); }); }).not.toThrow();
    // Value is irrelevant after unmount; the important thing is no warning/error
  });
});

// ---------------------------------------------------------------------------

interface Item {
  id: number;
  name: string;
  category: string;
  description?: string | null;
}

const ITEMS: Item[] = [
  { id: 1, name: 'Hydraulic Pump', category: 'pump', description: 'A-grade pump' },
  { id: 2, name: 'Air Compressor', category: 'compressor', description: 'Industrial grade' },
  { id: 3, name: 'Hydraulic Filter', category: 'filter', description: null },
  { id: 4, name: 'Diesel Engine', category: 'engine', description: undefined },
];

describe('useDebouncedSearch', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns all items when search term is empty string', () => {
    const { result } = renderHook(() =>
      useDebouncedSearch(ITEMS, '', ['name'], 300)
    );

    act(() => { vi.advanceTimersByTime(300); });
    expect(result.current.filteredItems).toHaveLength(ITEMS.length);
  });

  it('returns all items when search term is only whitespace', () => {
    const { result } = renderHook(() =>
      useDebouncedSearch(ITEMS, '   ', ['name'], 300)
    );

    act(() => { vi.advanceTimersByTime(300); });
    expect(result.current.filteredItems).toHaveLength(ITEMS.length);
  });

  it('filters items by a single field', () => {
    const { result } = renderHook(() =>
      useDebouncedSearch(ITEMS, 'Hydraulic', ['name'], 300)
    );

    act(() => { vi.advanceTimersByTime(300); });
    expect(result.current.filteredItems).toHaveLength(2);
    expect(result.current.filteredItems.map(i => i.id)).toEqual([1, 3]);
  });

  it('filters items across multiple fields', () => {
    // 'pump' appears in name of item 1 and category of item 1;
    // also in description of item 1 — testing multi-field coverage
    const { result } = renderHook(() =>
      useDebouncedSearch(ITEMS, 'pump', ['name', 'category'], 300)
    );

    act(() => { vi.advanceTimersByTime(300); });
    // item 1 matches name ('Hydraulic Pump') and category ('pump')
    // item 2 category is 'compressor' — no match on name or category for 'pump'
    expect(result.current.filteredItems.map(i => i.id)).toEqual([1]);
  });

  it('performs case-insensitive matching', () => {
    const { result } = renderHook(() =>
      useDebouncedSearch(ITEMS, 'DIESEL', ['name'], 300)
    );

    act(() => { vi.advanceTimersByTime(300); });
    expect(result.current.filteredItems).toHaveLength(1);
    expect(result.current.filteredItems[0].id).toBe(4);
  });

  it('returns an empty array when no items match the search term', () => {
    const { result } = renderHook(() =>
      useDebouncedSearch(ITEMS, 'xyzzy', ['name'], 300)
    );

    act(() => { vi.advanceTimersByTime(300); });
    expect(result.current.filteredItems).toHaveLength(0);
  });

  it('skips items whose search field value is falsy (null/undefined)', () => {
    // Item 3 has description: null, item 4 has description: undefined
    // Searching in description for 'industrial' should only match item 2
    const { result } = renderHook(() =>
      useDebouncedSearch(ITEMS, 'industrial', ['description' as keyof Item], 300)
    );

    act(() => { vi.advanceTimersByTime(300); });
    expect(result.current.filteredItems).toHaveLength(1);
    expect(result.current.filteredItems[0].id).toBe(2);
  });

  it('exposes isSearching: true while the debounce timer is pending', () => {
    const { result, rerender } = renderHook(
      ({ term }: { term: string }) => useDebouncedSearch(ITEMS, term, ['name'], 300),
      { initialProps: { term: '' } }
    );

    rerender({ term: 'Hydr' });
    // Timer hasn't fired — search term !== debounced term
    expect(result.current.isSearching).toBe(true);
  });

  it('exposes isSearching: false once the debounce timer fires', () => {
    const { result, rerender } = renderHook(
      ({ term }: { term: string }) => useDebouncedSearch(ITEMS, term, ['name'], 300),
      { initialProps: { term: '' } }
    );

    rerender({ term: 'Hydr' });
    act(() => { vi.advanceTimersByTime(300); });
    expect(result.current.isSearching).toBe(false);
  });

  it('exposes the debounced searchTerm value', () => {
    const { result, rerender } = renderHook(
      ({ term }: { term: string }) => useDebouncedSearch(ITEMS, term, ['name'], 300),
      { initialProps: { term: '' } }
    );

    rerender({ term: 'Diesel' });
    act(() => { vi.advanceTimersByTime(300); });
    expect(result.current.searchTerm).toBe('Diesel');
  });

  it('uses the default delay of 300 ms when none is provided', () => {
    const { result, rerender } = renderHook(
      ({ term }: { term: string }) => useDebouncedSearch(ITEMS, term, ['name']),
      { initialProps: { term: '' } }
    );

    rerender({ term: 'Air' });
    // Should not have updated yet at 299 ms
    act(() => { vi.advanceTimersByTime(299); });
    expect(result.current.isSearching).toBe(true);

    act(() => { vi.advanceTimersByTime(1); });
    expect(result.current.isSearching).toBe(false);
    expect(result.current.filteredItems).toHaveLength(1);
    expect(result.current.filteredItems[0].id).toBe(2);
  });

  it('handles an empty items array without throwing', () => {
    const { result } = renderHook(() =>
      useDebouncedSearch([], 'anything', ['name' as keyof never], 300)
    );

    act(() => { vi.advanceTimersByTime(300); });
    expect(result.current.filteredItems).toHaveLength(0);
  });

  it('returns updated results when the items list changes', () => {
    const items1 = [{ id: 1, name: 'Alpha' }];
    const items2 = [{ id: 1, name: 'Alpha' }, { id: 2, name: 'Alpha Two' }];

    const { result, rerender } = renderHook(
      ({ items, term }: { items: { id: number; name: string }[]; term: string }) =>
        useDebouncedSearch(items, term, ['name'], 300),
      { initialProps: { items: items1, term: 'Alpha' } }
    );

    act(() => { vi.advanceTimersByTime(300); });
    expect(result.current.filteredItems).toHaveLength(1);

    rerender({ items: items2, term: 'Alpha' });
    // No additional debounce needed since term didn't change — memo recalculates
    expect(result.current.filteredItems).toHaveLength(2);
  });
});
