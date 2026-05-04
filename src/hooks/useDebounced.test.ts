import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebounced, useDebouncedSearch } from './useDebounced';

// Intentionally deferred: stress-testing rapid successive value changes with many
// intermediate values — the core debounce behavior is covered via the standard
// timer-fast-forward patterns below.

describe('useDebounced', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns the initial value immediately without waiting for the delay', () => {
    const { result } = renderHook(() => useDebounced('initial', 500));
    expect(result.current).toBe('initial');
  });

  it('does not update the debounced value before the delay elapses', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }: { value: string; delay: number }) => useDebounced(value, delay),
      { initialProps: { value: 'first', delay: 500 } }
    );

    rerender({ value: 'second', delay: 500 });

    // Advance time by less than the delay
    act(() => {
      vi.advanceTimersByTime(499);
    });

    expect(result.current).toBe('first');
  });

  it('updates the debounced value after the full delay elapses', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }: { value: string; delay: number }) => useDebounced(value, delay),
      { initialProps: { value: 'first', delay: 500 } }
    );

    rerender({ value: 'second', delay: 500 });

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current).toBe('second');
  });

  it('resets the timer when value changes before delay elapses (debounce behavior)', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }: { value: string; delay: number }) => useDebounced(value, delay),
      { initialProps: { value: 'first', delay: 300 } }
    );

    // Change value partway through
    act(() => {
      vi.advanceTimersByTime(200);
    });
    rerender({ value: 'second', delay: 300 });

    // Advance by 200 more — only 200ms elapsed since last change (400 total)
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current).toBe('first');

    // Advance the remaining 100ms so the new delay completes
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current).toBe('second');
  });

  it('works with numeric values', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }: { value: number; delay: number }) => useDebounced(value, delay),
      { initialProps: { value: 0, delay: 200 } }
    );

    rerender({ value: 42, delay: 200 });

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(result.current).toBe(42);
  });

  it('works with object values', () => {
    const obj1 = { name: 'Alice' };
    const obj2 = { name: 'Bob' };

    const { result, rerender } = renderHook(
      ({ value, delay }: { value: { name: string }; delay: number }) => useDebounced(value, delay),
      { initialProps: { value: obj1, delay: 100 } }
    );

    rerender({ value: obj2, delay: 100 });

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(result.current).toEqual({ name: 'Bob' });
  });

  it('clears the pending timer on unmount so no state update occurs after unmount', () => {
    const { result, rerender, unmount } = renderHook(
      ({ value, delay }: { value: string; delay: number }) => useDebounced(value, delay),
      { initialProps: { value: 'initial', delay: 500 } }
    );

    rerender({ value: 'pending', delay: 500 });
    unmount();

    // Advance timers — should not cause errors (no setState after unmount)
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // The hook is unmounted; we just verify no error was thrown
    expect(result.current).toBe('initial');
  });

  it('adapts immediately when the delay prop itself changes', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }: { value: string; delay: number }) => useDebounced(value, delay),
      { initialProps: { value: 'first', delay: 1000 } }
    );

    // Change both value and delay
    rerender({ value: 'second', delay: 100 });

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(result.current).toBe('second');
  });

  it('handles a zero delay — resolves on next tick', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }: { value: string; delay: number }) => useDebounced(value, delay),
      { initialProps: { value: 'a', delay: 0 } }
    );

    rerender({ value: 'b', delay: 0 });

    act(() => {
      vi.advanceTimersByTime(0);
    });

    expect(result.current).toBe('b');
  });
});

describe('useDebouncedSearch', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  interface Item {
    id: number;
    name: string;
    category: string;
  }

  const items: Item[] = [
    { id: 1, name: 'Alpha Widget', category: 'tools' },
    { id: 2, name: 'Beta Gadget', category: 'electronics' },
    { id: 3, name: 'Gamma Tool', category: 'tools' },
    { id: 4, name: 'Delta Device', category: 'electronics' },
  ];

  it('returns all items when search term is empty', () => {
    const { result } = renderHook(() =>
      useDebouncedSearch(items, '', ['name'], 300)
    );

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current.filteredItems).toHaveLength(4);
    expect(result.current.filteredItems).toEqual(items);
  });

  it('returns all items when search term is only whitespace', () => {
    const { result } = renderHook(() =>
      useDebouncedSearch(items, '   ', ['name'], 300)
    );

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current.filteredItems).toHaveLength(4);
  });

  it('filters items by a single search field after delay', () => {
    const { result } = renderHook(() =>
      useDebouncedSearch(items, 'alpha', ['name'], 300)
    );

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current.filteredItems).toHaveLength(1);
    expect(result.current.filteredItems[0].name).toBe('Alpha Widget');
  });

  it('performs case-insensitive matching', () => {
    const { result } = renderHook(() =>
      useDebouncedSearch(items, 'GADGET', ['name'], 300)
    );

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current.filteredItems).toHaveLength(1);
    expect(result.current.filteredItems[0].name).toBe('Beta Gadget');
  });

  it('searches across multiple fields and returns a match from any field', () => {
    const { result } = renderHook(() =>
      useDebouncedSearch(items, 'tools', ['name', 'category'], 300)
    );

    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Items 1 and 3 have category 'tools'; item 3 name contains 'Tool'
    expect(result.current.filteredItems.length).toBeGreaterThanOrEqual(2);
    const ids = result.current.filteredItems.map((i) => i.id);
    expect(ids).toContain(1);
    expect(ids).toContain(3);
  });

  it('returns an empty array when no items match the search term', () => {
    const { result } = renderHook(() =>
      useDebouncedSearch(items, 'zzz-nomatch', ['name'], 300)
    );

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current.filteredItems).toHaveLength(0);
  });

  it('returns all items when the items array is empty regardless of search term', () => {
    const { result } = renderHook(() =>
      useDebouncedSearch([] as Item[], 'alpha', ['name'], 300)
    );

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current.filteredItems).toHaveLength(0);
  });

  it('indicates isSearching is true when the search term has not yet debounced', () => {
    const { result, rerender } = renderHook(
      ({ term }: { term: string }) =>
        useDebouncedSearch(items, term, ['name'], 300),
      { initialProps: { term: '' } }
    );

    // Trigger a new search term before the debounce settles
    rerender({ term: 'alpha' });

    // Before delay elapses the raw searchTerm and the debounced value differ
    expect(result.current.isSearching).toBe(true);
  });

  it('indicates isSearching is false after delay elapses', () => {
    const { result, rerender } = renderHook(
      ({ term }: { term: string }) =>
        useDebouncedSearch(items, term, ['name'], 300),
      { initialProps: { term: '' } }
    );

    rerender({ term: 'alpha' });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current.isSearching).toBe(false);
  });

  it('exposes the debounced searchTerm after the delay', () => {
    const { result, rerender } = renderHook(
      ({ term }: { term: string }) =>
        useDebouncedSearch(items, term, ['name'], 300),
      { initialProps: { term: '' } }
    );

    rerender({ term: 'beta' });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current.searchTerm).toBe('beta');
  });

  it('uses the default delay of 300ms when no delay is specified', () => {
    const { result, rerender } = renderHook(
      ({ term }: { term: string }) =>
        useDebouncedSearch(items, term, ['name']),
      { initialProps: { term: '' } }
    );

    rerender({ term: 'alpha' });

    // Less than 300ms — should still be unfiltered
    act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(result.current.filteredItems).toHaveLength(4);

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current.filteredItems).toHaveLength(1);
  });

  it('skips field values that are null or undefined without throwing', () => {
    interface PartialItem {
      id: number;
      name: string | null | undefined;
    }

    const sparseItems: PartialItem[] = [
      { id: 1, name: 'Present' },
      { id: 2, name: null },
      { id: 3, name: undefined },
    ];

    const { result } = renderHook(() =>
      useDebouncedSearch(sparseItems, 'pres', ['name'], 300)
    );

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current.filteredItems).toHaveLength(1);
    expect(result.current.filteredItems[0].id).toBe(1);
  });
});
