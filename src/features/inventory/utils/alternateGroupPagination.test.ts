import { describe, expect, it } from 'vitest';
import {
  clampAlternateGroupPage,
  paginateAlternateGroupItems,
} from '@/features/inventory/utils/alternateGroupPagination';

describe('alternateGroupPagination', () => {
  const rows = Array.from({ length: 53 }, (_, index) => `group-${index + 1}`);

  it('paginates rows for the requested page', () => {
    expect(paginateAlternateGroupItems(rows, 1, 12)).toHaveLength(12);
    expect(paginateAlternateGroupItems(rows, 1, 12)[0]).toBe('group-1');
    expect(paginateAlternateGroupItems(rows, 5, 12)).toHaveLength(5);
    expect(paginateAlternateGroupItems(rows, 5, 12)[0]).toBe('group-49');
  });

  it('clamps out-of-range pages', () => {
    expect(clampAlternateGroupPage(99, rows.length, 12)).toBe(5);
    expect(clampAlternateGroupPage(0, rows.length, 12)).toBe(1);
  });
});
