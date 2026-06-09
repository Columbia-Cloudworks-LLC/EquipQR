import { describe, expect, it } from 'vitest';
import { getInventorySortOrderLabel } from '@/features/inventory/utils/inventorySortOrderLabel';

describe('getInventorySortOrderLabel', () => {
  it('uses A–Z wording for text sort fields', () => {
    expect(getInventorySortOrderLabel('name', 'asc')).toBe('A to Z, tap for Z to A');
    expect(getInventorySortOrderLabel('sku', 'desc')).toBe('Z to A, tap for A to Z');
  });

  it('uses numeric wording for quantity sort', () => {
    expect(getInventorySortOrderLabel('quantity_on_hand', 'asc')).toBe(
      'Low to high, tap for high to low',
    );
    expect(getInventorySortOrderLabel('quantity_on_hand', 'desc')).toBe(
      'High to low, tap for low to high',
    );
  });

  it('falls back to generic sort wording for other fields', () => {
    expect(getInventorySortOrderLabel('status', 'asc')).toBe(
      'Ascending order, tap for descending',
    );
  });
});
