import { describe, it, expect } from 'vitest';
import type { InventoryItem } from '@/features/inventory/types/inventory';
import {
  buildInventoryTableRowViewModel,
  isClientSideSortField,
  sortInventoryViewModels,
} from './inventoryListViewModel';

const baseItem = (overrides: Partial<InventoryItem> = {}): InventoryItem => ({
  id: 'item-1',
  organization_id: 'org-1',
  name: 'Part A',
  description: null,
  sku: 'SKU-A',
  external_id: null,
  quantity_on_hand: 10,
  low_stock_threshold: 5,
  location: 'Warehouse',
  default_unit_cost: '2.00',
  image_url: null,
  isLowStock: false,
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
  created_by: 'user-1',
  ...overrides,
});

describe('inventoryListViewModel', () => {
  it('buildInventoryTableRowViewModel computes value, missing flags, and reorder priority', () => {
    const healthy = buildInventoryTableRowViewModel(baseItem(), {});
    expect(healthy.inventoryValue).toBe(20);
    expect(healthy.reorderPriority).toBe(0);
    expect(healthy.missingData).toBe(false);
    expect(healthy.alternateGroupCount).toBe(0);

    const low = buildInventoryTableRowViewModel(
      baseItem({ id: 'low', quantity_on_hand: 3, isLowStock: true }),
      { low: 2 },
      { low: '2024-06-01T00:00:00.000Z' },
    );
    expect(low.reorderPriority).toBe(2);
    expect(low.alternateGroupCount).toBe(2);
    expect(low.lastAdjustedAt).toBe('2024-06-01T00:00:00.000Z');

    const out = buildInventoryTableRowViewModel(
      baseItem({ quantity_on_hand: 0, sku: '', location: '', default_unit_cost: null }),
      {},
    );
    expect(out.reorderPriority).toBe(3);
    expect(out.missingSku).toBe(true);
    expect(out.missingLocation).toBe(true);
    expect(out.missingUnitCost).toBe(true);
    expect(out.missingData).toBe(true);

    const negative = buildInventoryTableRowViewModel(
      baseItem({ quantity_on_hand: -1 }),
      {},
    );
    expect(negative.reorderPriority).toBe(4);
  });

  it('isClientSideSortField recognizes client-only sort keys', () => {
    expect(isClientSideSortField('status')).toBe(true);
    expect(isClientSideSortField('inventory_value')).toBe(true);
    expect(isClientSideSortField('name')).toBe(false);
    expect(isClientSideSortField(undefined)).toBe(false);
  });

  it('sortInventoryViewModels sorts by reorder_priority then name', () => {
    const rows = [
      buildInventoryTableRowViewModel(baseItem({ id: 'a', name: 'Alpha', quantity_on_hand: 10 }), {}),
      buildInventoryTableRowViewModel(
        baseItem({ id: 'b', name: 'Beta', quantity_on_hand: 0, isLowStock: true }),
        {},
      ),
      buildInventoryTableRowViewModel(
        baseItem({ id: 'c', name: 'Charlie', quantity_on_hand: 2, isLowStock: true }),
        {},
      ),
    ];

    const asc = sortInventoryViewModels(rows, 'reorder_priority', 'asc');
    expect(asc.map((r) => r.item.name)).toEqual(['Alpha', 'Charlie', 'Beta']);

    const desc = sortInventoryViewModels(rows, 'reorder_priority', 'desc');
    expect(desc.map((r) => r.item.name)).toEqual(['Beta', 'Charlie', 'Alpha']);
  });

  it('sortInventoryViewModels sorts by inventory_value', () => {
    const rows = [
      buildInventoryTableRowViewModel(
        baseItem({ id: 'cheap', name: 'Cheap', quantity_on_hand: 1, default_unit_cost: '1' }),
        {},
      ),
      buildInventoryTableRowViewModel(
        baseItem({ id: 'pricey', name: 'Pricey', quantity_on_hand: 10, default_unit_cost: '5' }),
        {},
      ),
    ];

    const desc = sortInventoryViewModels(rows, 'inventory_value', 'desc');
    expect(desc[0]?.item.name).toBe('Pricey');
    expect(desc[1]?.item.name).toBe('Cheap');
  });
});
