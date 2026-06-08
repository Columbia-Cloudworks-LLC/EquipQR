import type { InventoryItem } from '@/features/inventory/types/inventory';

export type StockHealthTier = 'negative' | 'out' | 'low' | 'healthy';

const isLowStockQuantity = (quantityOnHand: number, threshold: number) =>
  quantityOnHand <= threshold;

export function resolveStockHealthTier(item: InventoryItem): StockHealthTier {
  const q = item.quantity_on_hand;
  const threshold = item.low_stock_threshold;
  const isLow = item.isLowStock ?? isLowStockQuantity(q, threshold);
  if (q < 0) return 'negative';
  if (q === 0) return 'out';
  if (isLow) return 'low';
  return 'healthy';
}
