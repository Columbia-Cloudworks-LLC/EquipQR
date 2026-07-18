import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';
import { InventoryQuantityValue } from '@/features/inventory/components/InventoryQuantityValue';
import type { InventoryItem } from '@/features/inventory/types/inventory';

function createItem(overrides: Partial<InventoryItem> = {}): InventoryItem {
  return {
    id: 'item-1',
    organization_id: 'org-1',
    name: 'Test Part',
    sku: 'SKU-1',
    external_id: null,
    description: null,
    quantity_on_hand: 10,
    low_stock_threshold: 5,
    location: null,
    default_unit_cost: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    isLowStock: false,
    ...overrides,
  };
}

function renderQuantity(item: InventoryItem) {
  return render(
    <TooltipProvider>
      <InventoryQuantityValue item={item} />
    </TooltipProvider>,
  );
}

describe('InventoryQuantityValue', () => {
  it('renders healthy quantity without a status label', () => {
    renderQuantity(createItem());

    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.queryByLabelText(/low stock/i)).not.toBeInTheDocument();
  });

  it('exposes low stock status via aria-label for colored quantities', () => {
    renderQuantity(createItem({ quantity_on_hand: 3, isLowStock: true }));

    expect(screen.getByLabelText('Low stock: 3')).toBeInTheDocument();
  });

  it('exposes out-of-stock status via aria-label for zero quantity', () => {
    renderQuantity(createItem({ quantity_on_hand: 0, isLowStock: true }));

    expect(screen.getByLabelText('Out of stock: 0')).toBeInTheDocument();
  });
});
