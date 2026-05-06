import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useDebounced, useDebouncedSearch } from './useDebounced';

describe('useDebounced', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns the initial value immediately', () => {
    const { result } = renderHook(() => useDebounced('initial', 300));
    expect(result.current).toBe('initial');
  });

  it('does not update the value before the delay has elapsed', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounced(value, delay),
      { initialProps: { value: 'initial', delay: 300 } }
    );

    rerender({ value: 'updated', delay: 300 });

    // Before delay, value should still be the original
    vi.advanceTimersByTime(200);
    expect(result.current).toBe('initial');
  });

  it('updates the value after the delay has fully elapsed', () => {
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

  it('resets the timer when the value changes before the delay elapses', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounced(value, delay),
      { initialProps: { value: 'initial', delay: 300 } }
    );

    // Change value and advance partway
    rerender({ value: 'intermediate', delay: 300 });
    vi.advanceTimersByTime(200);

    // Change value again before timer fires
    rerender({ value: 'final', delay: 300 });

    // Advance past the first timer's remaining time — the intermediate value should NOT land
    vi.advanceTimersByTime(100);
    expect(result.current).toBe('initial');

    // Now advance enough for the second timer
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current).toBe('final');
  });

  it('works with number values', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounced(value, delay),
      { initialProps: { value: 0, delay: 500 } }
    );

    rerender({ value: 42, delay: 500 });

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current).toBe(42);
  });

  it('works with object values', () => {
    const initial = { name: 'initial' };
    const updated = { name: 'updated' };

    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounced(value, delay),
      { initialProps: { value: initial, delay: 300 } }
    );

    rerender({ value: updated, delay: 300 });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current).toEqual({ name: 'updated' });
  });

  it('handles zero delay', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounced(value, delay),
      { initialProps: { value: 'initial', delay: 0 } }
    );

    rerender({ value: 'updated', delay: 0 });

    act(() => {
      vi.advanceTimersByTime(0);
    });

    expect(result.current).toBe('updated');
  });

  it('cleans up the timer on unmount', () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');

    const { rerender, unmount } = renderHook(
      ({ value, delay }) => useDebounced(value, delay),
      { initialProps: { value: 'initial', delay: 300 } }
    );

    rerender({ value: 'updated', delay: 300 });
    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });

  it('clears old timer when delay parameter changes', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounced(value, delay),
      { initialProps: { value: 'hello', delay: 300 } }
    );

    // Change delay to 100ms
    rerender({ value: 'hello', delay: 100 });

    act(() => {
      vi.advanceTimersByTime(100);
    });

    // Value doesn't change since it's the same value
    expect(result.current).toBe('hello');
  });
});

describe('useDebouncedSearch', () => {
  interface TestItem {
    id: string;
    name: string;
    description: string;
  }

  const sampleItems: TestItem[] = [
    { id: '1', name: 'Alpha Widget', description: 'First item' },
    { id: '2', name: 'Beta Tool', description: 'Second item' },
    { id: '3', name: 'Gamma Device', description: 'Third item' },
    { id: '4', name: 'Delta Sensor', description: 'Alpha related' },
  ];

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns all items when search term is empty', () => {
    const { result } = renderHook(() =>
      useDebouncedSearch(sampleItems, '', ['name', 'description'])
    );

    expect(result.current.filteredItems).toHaveLength(4);
  });

  it('returns all items when search term is whitespace only', () => {
    const { result, rerender } = renderHook(
      ({ term }) => useDebouncedSearch(sampleItems, term, ['name', 'description']),
      { initialProps: { term: '   ' } }
    );

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current.filteredItems).toHaveLength(4);
  });

  it('filters items by name field after debounce delay', () => {
    const { result, rerender } = renderHook(
      ({ term }) => useDebouncedSearch(sampleItems, term, ['name'], 300),
      { initialProps: { term: '' } }
    );

    rerender({ term: 'Alpha' });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current.filteredItems).toHaveLength(1);
    expect(result.current.filteredItems[0].name).toBe('Alpha Widget');
  });

  it('performs case-insensitive matching', () => {
    const { result, rerender } = renderHook(
      ({ term }) => useDebouncedSearch(sampleItems, term, ['name'], 300),
      { initialProps: { term: '' } }
    );

    rerender({ term: 'alpha' });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current.filteredItems).toHaveLength(1);
    expect(result.current.filteredItems[0].id).toBe('1');
  });

  it('searches across multiple fields', () => {
    const { result, rerender } = renderHook(
      ({ term }) => useDebouncedSearch(sampleItems, term, ['name', 'description'], 300),
      { initialProps: { term: '' } }
    );

    // 'Alpha' appears in name of item 1 AND description of item 4
    rerender({ term: 'Alpha' });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current.filteredItems).toHaveLength(2);
    const ids = result.current.filteredItems.map(i => i.id);
    expect(ids).toContain('1');
    expect(ids).toContain('4');
  });

  it('returns empty array when no items match', () => {
    const { result, rerender } = renderHook(
      ({ term }) => useDebouncedSearch(sampleItems, term, ['name', 'description'], 300),
      { initialProps: { term: '' } }
    );

    rerender({ term: 'zzznonexistent' });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current.filteredItems).toHaveLength(0);
  });

  it('uses default delay of 300ms when not specified', () => {
    const { result, rerender } = renderHook(
      ({ term }) => useDebouncedSearch(sampleItems, term, ['name']),
      { initialProps: { term: '' } }
    );

    rerender({ term: 'Beta' });

    // Should not have filtered yet at 200ms
    vi.advanceTimersByTime(200);
    expect(result.current.filteredItems).toHaveLength(4);

    // Should filter at 300ms
    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(result.current.filteredItems).toHaveLength(1);
    expect(result.current.filteredItems[0].name).toBe('Beta Tool');
  });

  it('reports isSearching as true while debounce is pending', () => {
    const { result, rerender } = renderHook(
      ({ term }) => useDebouncedSearch(sampleItems, term, ['name'], 300),
      { initialProps: { term: '' } }
    );

    rerender({ term: 'Beta' });

    // Before delay elapses, the input term differs from debounced term
    vi.advanceTimersByTime(100);
    expect(result.current.isSearching).toBe(true);
  });

  it('reports isSearching as false once the debounce settles', () => {
    const { result, rerender } = renderHook(
      ({ term }) => useDebouncedSearch(sampleItems, term, ['name'], 300),
      { initialProps: { term: '' } }
    );

    rerender({ term: 'Beta' });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current.isSearching).toBe(false);
  });

  it('exposes the debounced searchTerm value', () => {
    const { result, rerender } = renderHook(
      ({ term }) => useDebouncedSearch(sampleItems, term, ['name'], 300),
      { initialProps: { term: '' } }
    );

    rerender({ term: 'Gamma' });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current.searchTerm).toBe('Gamma');
  });

  it('handles an empty items array gracefully', () => {
    const { result, rerender } = renderHook(
      ({ term }) => useDebouncedSearch([] as TestItem[], term, ['name'], 300),
      { initialProps: { term: '' } }
    );

    rerender({ term: 'anything' });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current.filteredItems).toHaveLength(0);
  });

  it('handles field values that are falsy (null-like)', () => {
    interface NullableItem {
      id: string;
      name: string | null;
    }

    const items: NullableItem[] = [
      { id: '1', name: null },
      { id: '2', name: 'Real Name' },
    ];

    const { result, rerender } = renderHook(
      ({ term }) => useDebouncedSearch(items, term, ['name'] as (keyof NullableItem)[], 300),
      { initialProps: { term: '' } }
    );

    rerender({ term: 'Real' });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    // The null item should be skipped; only the real name item should match
    expect(result.current.filteredItems).toHaveLength(1);
    expect(result.current.filteredItems[0].id).toBe('2');
  });

  it('debounces rapidly changing search terms and only fires the last one', () => {
    const { result, rerender } = renderHook(
      ({ term }) => useDebouncedSearch(sampleItems, term, ['name'], 300),
      { initialProps: { term: '' } }
    );

    // Simulate fast typing
    rerender({ term: 'B' });
    vi.advanceTimersByTime(50);
    rerender({ term: 'Be' });
    vi.advanceTimersByTime(50);
    rerender({ term: 'Bet' });
    vi.advanceTimersByTime(50);
    rerender({ term: 'Beta' });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current.filteredItems).toHaveLength(1);
    expect(result.current.filteredItems[0].name).toBe('Beta Tool');
  });
});
