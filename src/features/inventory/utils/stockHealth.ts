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

/**
 * Compact list-row badge: out-of-stock is solid destructive; low stock is filled warning
 * so both read clearly on dark surfaces while keeping severity (solid red > solid amber).
 */
const LIST_BADGE_BY_TIER: Record<StockHealthTier, { label: string; className: string }> = {
  negative: {
    label: 'Negative stock',
    className:
      'border-0 bg-destructive text-destructive-foreground shadow-none hover:bg-destructive/90',
  },
  out: {
    label: 'Out of stock',
    className:
      'border-0 bg-destructive text-destructive-foreground shadow-none hover:bg-destructive/90',
  },
  low: {
    label: 'Low stock',
    className: 'border-0 bg-warning text-warning-foreground shadow-none hover:bg-warning/90',
  },
  healthy: {
    label: 'Healthy',
    className: 'border-success/50 bg-success/15 text-success',
  },
};

export function getStockHealthListBadgeClassName(item: InventoryItem): {
  label: string;
  className: string;
} {
  return LIST_BADGE_BY_TIER[resolveStockHealthTier(item)];
}
