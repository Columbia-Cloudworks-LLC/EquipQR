import type { InventoryItem } from '@/features/inventory/types/inventory';

const isLowStockQuantity = (quantityOnHand: number, threshold: number) => quantityOnHand <= threshold;

/** Stock level for header badges, overview card, and list-style semantics. */
export function getStockHealthPresentation(item: InventoryItem): {
  label: string;
  className: string;
} {
  const q = item.quantity_on_hand;
  const threshold = item.low_stock_threshold;
  const isLow = item.isLowStock ?? isLowStockQuantity(q, threshold);
  if (q < 0) {
    return {
      label: 'Negative stock',
      className: 'border-destructive/70 text-destructive bg-destructive/15',
    };
  }
  if (q === 0) {
    return {
      label: 'Out of stock',
      className: 'border-destructive/60 text-destructive bg-destructive/10',
    };
  }
  if (isLow) {
    return {
      label: 'Low stock',
      className: 'border-warning text-warning bg-warning/10',
    };
  }
  return {
    label: 'Healthy',
    className: 'border-success/50 bg-success/15 text-success',
  };
}

/**
 * Compact list-row badge: out-of-stock is solid destructive; low stock is filled warning
 * so both read clearly on dark surfaces while keeping severity (solid red > solid amber).
 */
export function getStockHealthListBadgeClassName(item: InventoryItem): {
  label: string;
  className: string;
} {
  const q = item.quantity_on_hand;
  const threshold = item.low_stock_threshold;
  const isLow = item.isLowStock ?? isLowStockQuantity(q, threshold);
  if (q < 0) {
    return {
      label: 'Negative stock',
      className:
        'border-0 bg-destructive text-destructive-foreground shadow-none hover:bg-destructive/90',
    };
  }
  if (q === 0) {
    return {
      label: 'Out of stock',
      className:
        'border-0 bg-destructive text-destructive-foreground shadow-none hover:bg-destructive/90',
    };
  }
  if (isLow) {
    return {
      label: 'Low stock',
      className:
        'border-0 bg-warning text-warning-foreground shadow-none hover:bg-warning/90',
    };
  }
  return {
    label: 'Healthy',
    className: 'border-success/50 bg-success/15 text-success',
  };
}
