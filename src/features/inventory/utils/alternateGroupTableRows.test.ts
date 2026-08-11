import { describe, expect, it } from 'vitest';
import type { PartAlternateGroup } from '@/features/inventory/types/inventory';
import {
  filterAlternateGroupTableRows,
  flattenAlternateGroupsToTableRows,
  getAlternateGroupTableCellDisplayValue,
  groupMatchesSearch,
  isAlternateGroupMemberLowStock,
  sortAlternateGroupTableRows,
} from './alternateGroupTableRows';

const sampleGroup: PartAlternateGroup = {
  id: 'group-1',
  organization_id: 'org-1',
  name: 'Oil Filter Group',
  description: 'Interchangeable filters',
  status: 'verified',
  notes: null,
  evidence_url: null,
  created_by: 'user-1',
  verified_by: null,
  verified_at: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-02T00:00:00Z',
  member_details: [
    {
      id: 'member-1',
      is_primary: true,
      member_type: 'inventory',
      inventory_item_id: 'inv-1',
      item_name: 'Oil Filter OEM',
      item_sku: 'OIL-100',
      quantity_on_hand: 4,
      low_stock_threshold: 5,
      default_unit_cost: 12.5,
      location: 'Shelf A',
      identifier_type: null,
      identifier_value: null,
      identifier_manufacturer: null,
    },
    {
      id: 'member-2',
      is_primary: false,
      member_type: 'identifier',
      inventory_item_id: null,
      item_name: null,
      item_sku: null,
      quantity_on_hand: null,
      low_stock_threshold: null,
      default_unit_cost: null,
      location: null,
      identifier_type: 'oem',
      identifier_value: 'CAT-123',
      identifier_manufacturer: 'Caterpillar',
    },
  ],
};

describe('alternateGroupTableRows', () => {
  it('flattens group members into table rows', () => {
    const rows = flattenAlternateGroupsToTableRows([sampleGroup]);

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      group_name: 'Oil Filter Group',
      item_name: 'Oil Filter OEM',
      item_sku: 'OIL-100',
    });
    expect(rows[1]).toMatchObject({
      group_name: 'Oil Filter Group',
      identifier_value: 'CAT-123',
    });
  });

  it('matches groups by part sku in search', () => {
    expect(groupMatchesSearch(sampleGroup, 'oil-100')).toBe(true);
    expect(groupMatchesSearch(sampleGroup, 'missing')).toBe(false);
  });

  it('filters flattened rows by part fields', () => {
    const rows = flattenAlternateGroupsToTableRows([sampleGroup]);
    const filtered = filterAlternateGroupTableRows(rows, 'cat-123');

    expect(filtered).toHaveLength(1);
    expect(filtered[0].identifier_value).toBe('CAT-123');
  });

  it('computes low stock from quantity and threshold', () => {
    expect(isAlternateGroupMemberLowStock(4, 5)).toBe(true);
    expect(isAlternateGroupMemberLowStock(6, 5)).toBe(false);
    expect(isAlternateGroupMemberLowStock(null, 5)).toBeNull();
  });

  it('sorts flattened rows by part number ascending', () => {
    const rows = flattenAlternateGroupsToTableRows([sampleGroup]);
    const sorted = sortAlternateGroupTableRows(rows, 'identifier_value', 'asc');

    expect(sorted.map((row) => row.identifier_value)).toEqual(['CAT-123', null]);
  });

  it('formats display values for auto-fit measurement', () => {
    const rows = flattenAlternateGroupsToTableRows([sampleGroup]);

    expect(getAlternateGroupTableCellDisplayValue(rows[0], 'default_unit_cost')).toBe('$12.50');
    expect(getAlternateGroupTableCellDisplayValue(rows[0], 'low_stock')).toBe('Yes');
    expect(getAlternateGroupTableCellDisplayValue(rows[1], 'identifier_value')).toBe('CAT-123');
  });
});
