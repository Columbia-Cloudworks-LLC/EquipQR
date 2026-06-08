import type { InventoryItem } from '@/features/inventory/types/inventory';

export function isLowStockItem(item: InventoryItem): boolean {
  return item.isLowStock ?? item.quantity_on_hand <= item.low_stock_threshold;
}

/** Quantity display: out of stock or negative stock vs low-but-available use distinct semantic colors. */
export function getQuantityClassName(item: InventoryItem): string {
  if (item.quantity_on_hand <= 0) {
    return 'font-semibold text-destructive';
  }
  if (isLowStockItem(item)) {
    return 'font-semibold text-warning';
  }
  return 'font-medium text-foreground';
}
