import { describe, expect, it } from 'vitest';
import type { InventoryItem } from '@/features/inventory/types/inventory';
import {
  getAllExportHeaders,
  itemsToAllExportRows,
} from '@/features/inventory/utils/inventoryExportUtils';

const mockItem: InventoryItem = {
  id: 'item-1',
  organization_id: 'org-1',
  name: 'Bolt',
  description: 'Hex bolt',
  sku: 'B-1',
  external_id: 'EXT-1',
  quantity_on_hand: 5,
  low_stock_threshold: 1,
  location: 'Shelf A',
  default_unit_cost: 1.5,
  image_url: null,
  created_by: 'user-1',
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-06-01T00:00:00.000Z',
  isLowStock: false,
};

const formatDate = (date: Date | string) => `formatted:${String(date)}`;

describe('inventoryExportUtils — all-fields export', () => {
  it('includes ID and Updated At in all-fields headers', () => {
    const headers = getAllExportHeaders();

    expect(headers).toContain('ID');
    expect(headers).toContain('Location Name');
    expect(headers).not.toContain('Location');
    expect(headers).toContain('Created At');
    expect(headers).toContain('Updated At');
    expect(headers.indexOf('ID')).toBeLessThan(headers.indexOf('Name'));
    expect(headers.indexOf('Updated At')).toBeGreaterThan(headers.indexOf('Created At'));
  });

  it('exports ID and timestamp columns in all-fields rows', () => {
    const [row] = itemsToAllExportRows([mockItem], formatDate);

    expect(row).toContain('item-1');
    expect(row).toContain('formatted:2024-01-01T00:00:00.000Z');
    expect(row).toContain('formatted:2024-06-01T00:00:00.000Z');
  });
});
