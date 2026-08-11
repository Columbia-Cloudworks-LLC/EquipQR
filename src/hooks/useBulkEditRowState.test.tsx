import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { useBulkEditRowState } from './useBulkEditRowState';

type TestRow = {
  id: string;
  name: string;
  location: string | null;
  notes: string | null;
};

type TestDelta = Partial<Pick<TestRow, 'name' | 'location' | 'notes'>>;

const mockRow = (id: string, overrides: Partial<TestRow> = {}): TestRow => ({
  id,
  name: `Row ${id}`,
  location: 'Yard A',
  notes: null,
  ...overrides,
});

describe('useBulkEditRowState', () => {
  it('starts with empty dirty map and selection set', () => {
    const rows = [mockRow('r-1'), mockRow('r-2')];
    const { result } = renderHook(() =>
      useBulkEditRowState<TestRow, TestDelta>(rows)
    );

    expect(result.current.dirtyCount).toBe(0);
    expect(result.current.selectedCount).toBe(0);
    expect(result.current.dirtyRows.size).toBe(0);
    expect(result.current.selectedRowIds.size).toBe(0);
  });

  it('setCellValue records a delta against the initial value', () => {
    const rows = [mockRow('r-1', { name: 'Alpha' })];
    const { result } = renderHook(() =>
      useBulkEditRowState<TestRow, TestDelta>(rows)
    );

    act(() => {
      result.current.setCellValue('r-1', 'name', 'Beta');
    });

    expect(result.current.dirtyCount).toBe(1);
    expect(result.current.dirtyRows.get('r-1')).toEqual({ name: 'Beta' });
  });

  it('reverting to the initial value clears the field from the delta', () => {
    const rows = [mockRow('r-1', { name: 'Alpha' })];
    const { result } = renderHook(() =>
      useBulkEditRowState<TestRow, TestDelta>(rows)
    );

    act(() => {
      result.current.setCellValue('r-1', 'name', 'Beta');
      result.current.setCellValue('r-1', 'name', 'Alpha');
    });

    expect(result.current.dirtyCount).toBe(0);
    expect(result.current.dirtyRows.has('r-1')).toBe(false);
  });

  it('treats empty string and null as equivalent when comparing to initial null', () => {
    const rows = [mockRow('r-1', { notes: null })];
    const { result } = renderHook(() =>
      useBulkEditRowState<TestRow, TestDelta>(rows)
    );

    act(() => {
      result.current.setCellValue('r-1', 'notes', '');
    });

    expect(result.current.dirtyCount).toBe(0);
    expect(result.current.dirtyRows.has('r-1')).toBe(false);
  });

  it('setCellValueOnRows applies the same change across many rows', () => {
    const rows = [mockRow('r-1'), mockRow('r-2'), mockRow('r-3')];
    const { result } = renderHook(() =>
      useBulkEditRowState<TestRow, TestDelta>(rows)
    );

    act(() => {
      result.current.setCellValueOnRows(['r-1', 'r-2', 'r-3'], 'location', 'Site B');
    });

    expect(result.current.dirtyCount).toBe(3);
    expect(result.current.dirtyRows.get('r-1')).toEqual({ location: 'Site B' });
    expect(result.current.dirtyRows.get('r-2')).toEqual({ location: 'Site B' });
    expect(result.current.dirtyRows.get('r-3')).toEqual({ location: 'Site B' });
  });

  it('clearDirty removes every dirty edit', () => {
    const rows = [mockRow('r-1'), mockRow('r-2')];
    const { result } = renderHook(() =>
      useBulkEditRowState<TestRow, TestDelta>(rows)
    );

    act(() => {
      result.current.setCellValue('r-1', 'location', 'Site B');
      result.current.setCellValue('r-2', 'name', 'Changed');
    });
    expect(result.current.dirtyCount).toBe(2);

    act(() => {
      result.current.clearDirty();
    });
    expect(result.current.dirtyCount).toBe(0);
  });

  describe('selection', () => {
    it('toggleSelected adds and removes a row from the selection', () => {
      const rows = [mockRow('r-1'), mockRow('r-2')];
      const { result } = renderHook(() =>
        useBulkEditRowState<TestRow, TestDelta>(rows)
      );

      act(() => {
        result.current.toggleSelected('r-1');
      });
      expect(result.current.selectedCount).toBe(1);
      expect(result.current.selectedRowIds.has('r-1')).toBe(true);

      act(() => {
        result.current.toggleSelected('r-1');
      });
      expect(result.current.selectedCount).toBe(0);
    });

    it('selectAll replaces the selection with the supplied ids', () => {
      const rows = [mockRow('r-1'), mockRow('r-2'), mockRow('r-3')];
      const { result } = renderHook(() =>
        useBulkEditRowState<TestRow, TestDelta>(rows)
      );

      act(() => {
        result.current.selectAll(['r-1', 'r-3']);
      });
      expect(result.current.selectedCount).toBe(2);
      expect(result.current.selectedRowIds.has('r-1')).toBe(true);
      expect(result.current.selectedRowIds.has('r-3')).toBe(true);
      expect(result.current.selectedRowIds.has('r-2')).toBe(false);
    });

    it('clearSelection empties the selection without affecting dirty state', () => {
      const rows = [mockRow('r-1')];
      const { result } = renderHook(() =>
        useBulkEditRowState<TestRow, TestDelta>(rows)
      );

      act(() => {
        result.current.toggleSelected('r-1');
        result.current.setCellValue('r-1', 'location', 'Site B');
      });
      act(() => {
        result.current.clearSelection();
      });
      expect(result.current.selectedCount).toBe(0);
      expect(result.current.dirtyCount).toBe(1);
    });
  });

  describe('clearSucceededDirtyFields', () => {
    it('strips only submitted fields that still match the dirty value', () => {
      const rows = [mockRow('r-1', { location: 'A', name: 'Alpha' })];
      const { result } = renderHook(() =>
        useBulkEditRowState<TestRow, TestDelta>(rows)
      );

      act(() => {
        result.current.setCellValue('r-1', 'location', 'B');
        result.current.setCellValue('r-1', 'name', 'Beta');
      });

      const submittedById = new Map<string, Record<string, unknown>>([
        ['r-1', { location: 'B' }],
      ]);

      act(() => {
        result.current.clearSucceededDirtyFields(['r-1'], submittedById);
      });

      expect(result.current.dirtyRows.get('r-1')).toEqual({ name: 'Beta' });
      expect(result.current.dirtyCount).toBe(1);
    });

    it('preserves concurrent edits on other rows when clearing succeeded rows', () => {
      const rows = [mockRow('r-1'), mockRow('r-2')];
      const { result } = renderHook(() =>
        useBulkEditRowState<TestRow, TestDelta>(rows)
      );

      act(() => {
        result.current.setCellValue('r-1', 'location', 'B');
        result.current.setCellValue('r-2', 'name', 'Concurrent');
      });

      const submittedById = new Map<string, Record<string, unknown>>([
        ['r-1', { location: 'B' }],
      ]);

      act(() => {
        result.current.clearSucceededDirtyFields(['r-1'], submittedById);
      });

      expect(result.current.dirtyRows.has('r-1')).toBe(false);
      expect(result.current.dirtyRows.get('r-2')).toEqual({ name: 'Concurrent' });
    });
  });
});
