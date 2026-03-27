import { describe, expect, it } from 'vitest';
import type { InventoryItem } from '@/features/inventory/types/inventory';
import {
  getStockHealthListBadgeClassName,
  getStockHealthPresentation,
} from '../stockHealth';

const createItem = (overrides: Partial<InventoryItem> = {}): InventoryItem =>
  ({
    id: 'item-1',
    organization_id: 'org-1',
    name: 'Test item',
    description: null,
    sku: null,
    external_id: null,
    quantity_on_hand: 10,
    low_stock_threshold: 5,
    location: null,
    default_unit_cost: null,
    image_url: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    created_by: 'user-1',
    ...overrides,
  }) as InventoryItem;

describe('stockHealth', () => {
  it('returns a negative stock state for quantities below zero', () => {
    const item = createItem({ quantity_on_hand: -1, low_stock_threshold: 5 });

    expect(getStockHealthPresentation(item).label).toBe('Negative stock');
    expect(getStockHealthListBadgeClassName(item).label).toBe('Negative stock');
  });

  it('treats quantities equal to the threshold as low stock', () => {
    const item = createItem({ quantity_on_hand: 5, low_stock_threshold: 5 });

    expect(getStockHealthPresentation(item).label).toBe('Low stock');
    expect(getStockHealthListBadgeClassName(item).label).toBe('Low stock');
  });

  it('keeps zero quantity in the out of stock state', () => {
    const item = createItem({ quantity_on_hand: 0, low_stock_threshold: 5 });

    expect(getStockHealthPresentation(item).label).toBe('Out of stock');
    expect(getStockHealthListBadgeClassName(item).label).toBe('Out of stock');
  });
});
