import { describe, expect, it } from 'vitest';
import type { InventoryItem } from '@/features/inventory/types/inventory';
import { filterInventoryOffline } from './useInventory';

const item = (overrides: Partial<InventoryItem> & { id: string; name: string }): InventoryItem =>
  ({
    sku: null,
    external_id: null,
    location: null,
    quantity_on_hand: 0,
    low_stock_threshold: 0,
    default_unit_cost: null,
    isLowStock: false,
    ...overrides,
  }) as InventoryItem;

const items = [
  item({ id: 'a', name: 'Oil filter', sku: 'OF-10', quantity_on_hand: 2, location: 'Shelf B', isLowStock: true }),
  item({ id: 'b', name: 'Air filter', sku: 'AF-2', quantity_on_hand: 30, location: 'Shelf A' }),
  item({ id: 'c', name: 'Belt', external_id: 'EXT-9', quantity_on_hand: 11 }),
];

const names = (result: InventoryItem[]) => result.map((entry) => entry.name);

describe('filterInventoryOffline', () => {
  it('sorts by name ascending by default, like the server', () => {
    expect(names(filterInventoryOffline(items, {}))).toEqual(['Air filter', 'Belt', 'Oil filter']);
  });

  it('applies the chosen column and direction, sorting numbers as numbers', () => {
    expect(names(filterInventoryOffline(items, { sortBy: 'quantity_on_hand', sortOrder: 'desc' }))).toEqual([
      'Air filter',
      'Belt',
      'Oil filter',
    ]);
    expect(names(filterInventoryOffline(items, { sortBy: 'quantity_on_hand', sortOrder: 'asc' }))).toEqual([
      'Oil filter',
      'Belt',
      'Air filter',
    ]);
    expect(names(filterInventoryOffline(items, { sortBy: 'name', sortOrder: 'desc' }))).toEqual([
      'Oil filter',
      'Belt',
      'Air filter',
    ]);
  });

  it('searches name, SKU and external id, and filters by location and low stock', () => {
    expect(names(filterInventoryOffline(items, { search: 'ext-9' }))).toEqual(['Belt']);
    expect(names(filterInventoryOffline(items, { search: 'filter' }))).toEqual(['Air filter', 'Oil filter']);
    expect(names(filterInventoryOffline(items, { location: 'shelf a' }))).toEqual(['Air filter']);
    expect(names(filterInventoryOffline(items, { lowStockOnly: true }))).toEqual(['Oil filter']);
  });

  it('does not change the saved copy', () => {
    const before = names(items);
    filterInventoryOffline(items, { sortBy: 'name', sortOrder: 'desc' });
    expect(names(items)).toEqual(before);
  });
});
