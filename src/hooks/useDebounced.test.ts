/**
 * useDebounced and useDebouncedSearch Hook Tests
 *
 * Covers:
 * - useDebounced: initial value, debounced update after delay, cleanup on unmount,
 *   rapid value changes (only last value commits), delay change behaviour, zero-delay
 * - useDebouncedSearch: empty search term returns all items, single-field search (match / no match),
 *   multi-field search, case-insensitive matching, isSearching flag, custom delay, null/undefined
 *   field values are skipped safely, filteredItems update after debounce resolves
 *
 * Intentionally deferred: concurrent renderHook re-renders racing against timer advancement —
 * these would require advanced concurrency control beyond the scope of unit tests here.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebounced, useDebouncedSearch } from './useDebounced';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface Product {
  name: string;
  sku: string;
  category?: string | null;
}

const PRODUCTS: Product[] = [
  { name: 'Hydraulic Pump', sku: 'HP-001', category: 'Pumps' },
  { name: 'Electric Motor', sku: 'EM-042', category: 'Motors' },
  { name: 'Bearing Assembly', sku: 'BA-100', category: null },
];

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

  it('returns the initial value synchronously', () => {
    const { result } = renderHook(() => useDebounced('hello', 300));
    expect(result.current).toBe('hello');
  });

  it('does not update the debounced value before the delay elapses', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }: { value: string; delay: number }) => useDebounced(value, delay),
      { initialProps: { value: 'initial', delay: 300 } }
    );

    rerender({ value: 'updated', delay: 300 });

    // Still the old value — timer has not fired
    act(() => {
      vi.advanceTimersByTime(299);
    });

    expect(result.current).toBe('initial');
  });

  it('commits the value once the full delay has elapsed', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }: { value: string; delay: number }) => useDebounced(value, delay),
      { initialProps: { value: 'initial', delay: 300 } }
    );

    rerender({ value: 'updated', delay: 300 });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current).toBe('updated');
  });

  it('debounces rapid changes — only the last value commits', () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: string }) => useDebounced(value, 200),
      { initialProps: { value: 'a' } }
    );

    rerender({ value: 'b' });
    act(() => { vi.advanceTimersByTime(100); });

    rerender({ value: 'c' });
    act(() => { vi.advanceTimersByTime(100); });

    rerender({ value: 'd' });
    // Timers not yet fired — still 'a'
    expect(result.current).toBe('a');

    act(() => { vi.advanceTimersByTime(200); });

    expect(result.current).toBe('d');
  });

  it('works with a zero delay (commits on next tick)', () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: string }) => useDebounced(value, 0),
      { initialProps: { value: 'first' } }
    );

    rerender({ value: 'second' });

    act(() => {
      vi.advanceTimersByTime(0);
    });

    expect(result.current).toBe('second');
  });

  it('clears the pending timer on unmount without committing the new value', () => {
    const { result, rerender, unmount } = renderHook(
      ({ value }: { value: string }) => useDebounced(value, 500),
      { initialProps: { value: 'original' } }
    );

    rerender({ value: 'changed' });
    unmount();

    // Advancing timers after unmount should not throw or update state
    act(() => {
      vi.advanceTimersByTime(500);
    });

    // The hook is unmounted; result still holds the last rendered value
    expect(result.current).toBe('original');
  });

  it('works with numeric values', () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: number }) => useDebounced(value, 100),
      { initialProps: { value: 0 } }
    );

    rerender({ value: 42 });

    act(() => { vi.advanceTimersByTime(100); });

    expect(result.current).toBe(42);
  });

  it('works with object values', () => {
    const initial = { id: 1 };
    const updated = { id: 2 };

    const { result, rerender } = renderHook(
      ({ value }: { value: { id: number } }) => useDebounced(value, 100),
      { initialProps: { value: initial } }
    );

    rerender({ value: updated });

    act(() => { vi.advanceTimersByTime(100); });

    expect(result.current).toEqual({ id: 2 });
  });

  it('respects a changed delay on re-render', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }: { value: string; delay: number }) => useDebounced(value, delay),
      { initialProps: { value: 'v1', delay: 500 } }
    );

    // Change both the value and reduce the delay
    rerender({ value: 'v2', delay: 100 });

    // Advance less than old delay but more than new delay
    act(() => { vi.advanceTimersByTime(100); });

    expect(result.current).toBe('v2');
  });
});

// ---------------------------------------------------------------------------
// useDebouncedSearch
// ---------------------------------------------------------------------------

describe('useDebouncedSearch', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns all items when the search term is empty', () => {
    const { result } = renderHook(() =>
      useDebouncedSearch(PRODUCTS, '', ['name', 'sku'])
    );

    expect(result.current.filteredItems).toEqual(PRODUCTS);
  });

  it('returns all items when the search term is whitespace only', () => {
    const { result } = renderHook(() =>
      useDebouncedSearch(PRODUCTS, '   ', ['name', 'sku'])
    );

    // Need to advance timer to commit the whitespace term
    act(() => { vi.advanceTimersByTime(300); });

    expect(result.current.filteredItems).toEqual(PRODUCTS);
  });

  it('filters by a single field match after debounce delay', () => {
    // Start with empty search so the debounce transition is observable
    const { result, rerender } = renderHook(
      ({ term }: { term: string }) =>
        useDebouncedSearch(PRODUCTS, term, ['name'], 300),
      { initialProps: { term: '' } }
    );

    // All items visible initially
    expect(result.current.filteredItems).toEqual(PRODUCTS);

    rerender({ term: 'Hydraulic' });

    // Before the debounce delay, filteredItems still shows all items
    expect(result.current.filteredItems).toEqual(PRODUCTS);

    act(() => { vi.advanceTimersByTime(300); });

    expect(result.current.filteredItems).toHaveLength(1);
    expect(result.current.filteredItems[0].name).toBe('Hydraulic Pump');
  });

  it('returns empty array when no items match', () => {
    const { result } = renderHook(() =>
      useDebouncedSearch(PRODUCTS, 'zzz-no-match', ['name', 'sku'])
    );

    act(() => { vi.advanceTimersByTime(300); });

    expect(result.current.filteredItems).toHaveLength(0);
  });

  it('searches multiple fields — matches when any field contains the term', () => {
    const { result } = renderHook(() =>
      useDebouncedSearch(PRODUCTS, 'EM-042', ['name', 'sku'])
    );

    act(() => { vi.advanceTimersByTime(300); });

    expect(result.current.filteredItems).toHaveLength(1);
    expect(result.current.filteredItems[0].sku).toBe('EM-042');
  });

  it('is case-insensitive', () => {
    const { result } = renderHook(() =>
      useDebouncedSearch(PRODUCTS, 'hydraulic', ['name'])
    );

    act(() => { vi.advanceTimersByTime(300); });

    expect(result.current.filteredItems).toHaveLength(1);
    expect(result.current.filteredItems[0].name).toBe('Hydraulic Pump');
  });

  it('safely skips null or undefined field values without throwing', () => {
    // PRODUCTS[2] has category: null — searching on category should not throw
    const { result } = renderHook(() =>
      useDebouncedSearch(PRODUCTS, 'Pumps', ['category'])
    );

    act(() => { vi.advanceTimersByTime(300); });

    expect(result.current.filteredItems).toHaveLength(1);
    expect(result.current.filteredItems[0].name).toBe('Hydraulic Pump');
  });

  it('isSearching is true while the debounce is pending and false once resolved', () => {
    const { result, rerender } = renderHook(
      ({ term }: { term: string }) =>
        useDebouncedSearch(PRODUCTS, term, ['name'], 300),
      { initialProps: { term: '' } }
    );

    // Initial state: term and debounced term are both '' — not searching
    expect(result.current.isSearching).toBe(false);

    rerender({ term: 'Motor' });

    // Timer has not fired yet — isSearching should be true
    expect(result.current.isSearching).toBe(true);

    act(() => { vi.advanceTimersByTime(300); });

    expect(result.current.isSearching).toBe(false);
  });

  it('uses the custom delay parameter', () => {
    // Start with empty search and then change it so the 1000ms delay is observable
    const { result, rerender } = renderHook(
      ({ term }: { term: string }) =>
        useDebouncedSearch(PRODUCTS, term, ['name'], 1000),
      { initialProps: { term: '' } }
    );

    expect(result.current.filteredItems).toEqual(PRODUCTS);

    rerender({ term: 'Motor' });

    // After only 300ms the filter should NOT have applied yet
    act(() => { vi.advanceTimersByTime(300); });
    expect(result.current.filteredItems).toEqual(PRODUCTS);

    // After the full 1000ms it should be filtered
    act(() => { vi.advanceTimersByTime(700); });
    expect(result.current.filteredItems).toHaveLength(1);
    expect(result.current.filteredItems[0].name).toBe('Electric Motor');
  });

  it('exposes the debounced search term, not the raw term', () => {
    const { result, rerender } = renderHook(
      ({ term }: { term: string }) =>
        useDebouncedSearch(PRODUCTS, term, ['name'], 300),
      { initialProps: { term: '' } }
    );

    rerender({ term: 'Bearing' });

    // Debounced term is still '' until the timer fires
    expect(result.current.searchTerm).toBe('');

    act(() => { vi.advanceTimersByTime(300); });

    expect(result.current.searchTerm).toBe('Bearing');
  });

  it('returns all items when the items array is empty', () => {
    const { result } = renderHook(() =>
      useDebouncedSearch([], 'anything', ['name'])
    );

    act(() => { vi.advanceTimersByTime(300); });

    expect(result.current.filteredItems).toHaveLength(0);
  });

  it('debounces rapid search term changes — filters on the final value only', () => {
    const { result, rerender } = renderHook(
      ({ term }: { term: string }) =>
        useDebouncedSearch(PRODUCTS, term, ['name'], 200),
      { initialProps: { term: '' } }
    );

    rerender({ term: 'H' });
    act(() => { vi.advanceTimersByTime(100); });

    rerender({ term: 'Hy' });
    act(() => { vi.advanceTimersByTime(100); });

    rerender({ term: 'Hyd' });
    // No timer has fully elapsed — still unfiltered
    expect(result.current.filteredItems).toEqual(PRODUCTS);

    act(() => { vi.advanceTimersByTime(200); });

    // Filtered to 'Hydraulic Pump' only
    expect(result.current.filteredItems).toHaveLength(1);
    expect(result.current.filteredItems[0].name).toBe('Hydraulic Pump');
  });

  it('partial match returns correct subset', () => {
    const items = [
      { name: 'Alpha', code: 'A1' },
      { name: 'Alpha Beta', code: 'AB' },
      { name: 'Gamma', code: 'G1' },
    ];

    const { result } = renderHook(() =>
      useDebouncedSearch(items, 'Alpha', ['name', 'code'], 100)
    );

    act(() => { vi.advanceTimersByTime(100); });

    expect(result.current.filteredItems).toHaveLength(2);
    expect(result.current.filteredItems.map(i => i.name)).toEqual(['Alpha', 'Alpha Beta']);
  });
});
