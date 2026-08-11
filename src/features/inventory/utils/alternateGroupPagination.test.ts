import { describe, expect, it } from 'vitest';
import {
  clampAlternateGroupPage,
  DEFAULT_ALTERNATE_GROUP_CARD_PAGE_SIZE,
  DEFAULT_ALTERNATE_GROUP_TABLE_PAGE_SIZE,
  getAlternateGroupPageCount,
  getAlternateGroupPageRange,
  paginateAlternateGroupItems,
} from '@/features/inventory/utils/alternateGroupPagination';

describe('alternateGroupPagination', () => {
  const rows = Array.from({ length: 53 }, (_, index) => `group-${index + 1}`);

  it('uses view-specific default page sizes', () => {
    expect(DEFAULT_ALTERNATE_GROUP_CARD_PAGE_SIZE).toBe(12);
    expect(DEFAULT_ALTERNATE_GROUP_TABLE_PAGE_SIZE).toBe(25);
  });

  it('paginates rows for the requested page', () => {
    expect(paginateAlternateGroupItems(rows, 1, 12)).toHaveLength(12);
    expect(paginateAlternateGroupItems(rows, 1, 12)[0]).toBe('group-1');
    expect(paginateAlternateGroupItems(rows, 5, 12)).toHaveLength(5);
    expect(paginateAlternateGroupItems(rows, 5, 12)[0]).toBe('group-49');
  });

  it('calculates page counts and clamps out-of-range pages', () => {
    expect(getAlternateGroupPageCount(rows.length, 12)).toBe(5);
    expect(clampAlternateGroupPage(99, rows.length, 12)).toBe(5);
    expect(clampAlternateGroupPage(0, rows.length, 12)).toBe(1);
  });

  it('returns the visible range for the active page', () => {
    expect(getAlternateGroupPageRange(rows.length, 1, 12)).toEqual({ start: 1, end: 12 });
    expect(getAlternateGroupPageRange(rows.length, 5, 12)).toEqual({ start: 49, end: 53 });
    expect(getAlternateGroupPageRange(0, 1, 12)).toEqual({ start: 0, end: 0 });
  });
});
