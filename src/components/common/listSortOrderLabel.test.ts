import { describe, expect, it } from 'vitest';
import { getListSortOrderLabel } from '@/components/common/listSortOrderLabel';

describe('getListSortOrderLabel', () => {
  it('uses A–Z wording for text fields', () => {
    expect(getListSortOrderLabel('text', 'asc')).toBe('A to Z, tap for Z to A');
    expect(getListSortOrderLabel('text', 'desc')).toBe('Z to A, tap for A to Z');
  });

  it('uses numeric wording for numeric fields', () => {
    expect(getListSortOrderLabel('numeric', 'asc')).toBe('Low to high, tap for high to low');
    expect(getListSortOrderLabel('numeric', 'desc')).toBe('High to low, tap for low to high');
  });

  it('falls back to generic sort wording for default fields', () => {
    expect(getListSortOrderLabel('default', 'asc')).toBe(
      'Ascending order, tap for descending',
    );
  });
});
