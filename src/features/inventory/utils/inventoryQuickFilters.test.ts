import { describe, it, expect } from 'vitest';
import type { InventoryItem } from '@/features/inventory/types/inventory';
import { buildInventoryTableRowViewModel } from './inventoryListViewModel';
import {
  applyQuickFilters,
  countQuickFilterMatches,
  matchesQuickFilter,
} from './inventoryQuickFilters';

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

describe('inventoryQuickFilters', () => {
  const healthy = buildInventoryTableRowViewModel(baseItem({ id: 'healthy' }), {});
  const low = buildInventoryTableRowViewModel(
    baseItem({ id: 'low', name: 'Low', quantity_on_hand: 2, isLowStock: true }),
    {},
  );
  const out = buildInventoryTableRowViewModel(
    baseItem({ id: 'out', name: 'Out', quantity_on_hand: 0 }),
    {},
  );
  const withAlts = buildInventoryTableRowViewModel(
    baseItem({ id: 'alts', name: 'Alts' }),
    { alts: 2 },
  );
  const missingLoc = buildInventoryTableRowViewModel(
    baseItem({ id: 'noloc', name: 'No Loc', location: '' }),
    {},
  );

  it('matchesQuickFilter covers stock and missing-data keys', () => {
    expect(matchesQuickFilter(low, 'low-stock', new Set())).toBe(true);
    expect(matchesQuickFilter(healthy, 'low-stock', new Set())).toBe(false);
    expect(matchesQuickFilter(out, 'out-of-stock', new Set())).toBe(true);
    expect(matchesQuickFilter(withAlts, 'has-alternates', new Set())).toBe(true);
    expect(matchesQuickFilter(missingLoc, 'missing-location', new Set())).toBe(true);
    expect(matchesQuickFilter(missingLoc, 'missing-data', new Set())).toBe(true);
    expect(matchesQuickFilter(low, 'reorder-needed', new Set())).toBe(true);
    expect(
      matchesQuickFilter(healthy, 'recently-adjusted', new Set(['healthy'])),
    ).toBe(true);
  });

  it('applyQuickFilters ANDs active filters', () => {
    const rows = [healthy, low, out, withAlts, missingLoc];
    const filtered = applyQuickFilters(rows, ['low-stock'], new Set());
    expect(filtered.map((r) => r.item.id)).toEqual(['low']);

    const none = applyQuickFilters(rows, [], new Set());
    expect(none).toHaveLength(5);
  });

  it('countQuickFilterMatches counts without building UI', () => {
    const items = [
      baseItem({ id: 'healthy' }),
      baseItem({ id: 'low', quantity_on_hand: 2, isLowStock: true }),
      baseItem({ id: 'out', quantity_on_hand: 0 }),
    ];
    expect(countQuickFilterMatches(items, {}, 'low-stock', new Set())).toBe(1);
    expect(countQuickFilterMatches(items, {}, 'out-of-stock', new Set())).toBe(1);
  });
});
