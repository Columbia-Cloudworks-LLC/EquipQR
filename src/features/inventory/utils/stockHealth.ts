import type { InventoryItem } from '@/features/inventory/types/inventory';
import { resolveStockHealthTier, type StockHealthTier } from '@/features/inventory/utils/stockHealthLevels';

const PRESENTATION_BY_TIER: Record<StockHealthTier, { label: string; className: string }> = {
  negative: {
    label: 'Negative stock',
    className: 'border-destructive/70 text-destructive bg-destructive/15',
  },
  out: {
    label: 'Out of stock',
    className: 'border-destructive/60 text-destructive bg-destructive/10',
  },
  low: {
    label: 'Low stock',
    className: 'border-warning text-warning bg-warning/10',
  },
  healthy: {
    label: 'Healthy',
    className: 'border-success/50 bg-success/15 text-success',
  },
};

/** Stock level for header badges, overview card, and list-style semantics. */
export function getStockHealthPresentation(item: InventoryItem): {
  label: string;
  className: string;
} {
  return PRESENTATION_BY_TIER[resolveStockHealthTier(item)];
}
