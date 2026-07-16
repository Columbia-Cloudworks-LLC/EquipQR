import { describe, expect, it } from 'vitest';
import {
  clampListPage,
  getListPageCount,
  getListPageRange,
  paginateListItems,
} from '@/utils/listPagination';

describe('listPagination', () => {
  const rows = Array.from({ length: 308 }, (_, index) => `item-${index + 1}`);

  it('paginates rows for the requested page', () => {
    expect(paginateListItems(rows, 1, 25)).toHaveLength(25);
    expect(paginateListItems(rows, 1, 25)[0]).toBe('item-1');
    expect(paginateListItems(rows, 13, 25)).toHaveLength(8);
    expect(paginateListItems(rows, 13, 25)[0]).toBe('item-301');
  });

  it('calculates page counts and clamps out-of-range pages', () => {
    expect(getListPageCount(rows.length, 25)).toBe(13);
    expect(clampListPage(99, rows.length, 25)).toBe(13);
    expect(clampListPage(0, rows.length, 25)).toBe(1);
  });

  it('returns the visible range for the active page', () => {
    expect(getListPageRange(rows.length, 1, 25)).toEqual({ start: 1, end: 25 });
    expect(getListPageRange(rows.length, 13, 25)).toEqual({ start: 301, end: 308 });
    expect(getListPageRange(0, 1, 25)).toEqual({ start: 0, end: 0 });
  });
});
