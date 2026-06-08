import type { InventoryItem, InventoryQuickFilterKey } from '@/features/inventory/types/inventory';
import type { InventoryTableRowViewModel } from '@/features/inventory/utils/inventoryListViewModel';
import { resolveStockHealthTier } from '@/features/inventory/utils/stockHealthLevels';

export const QUICK_FILTER_LABELS: Record<InventoryQuickFilterKey, string> = {
  'low-stock': 'Low stock',
  'out-of-stock': 'Out of stock',
  'negative-stock': 'Negative stock',
  'has-alternates': 'Has alternates',
  'missing-location': 'Missing location',
  'missing-unit-cost': 'Missing unit cost',
  'missing-sku': 'Missing SKU',
  'missing-data': 'Missing data',
  'recently-adjusted': 'Recently adjusted',
  'reorder-needed': 'Reorder needed',
};

export function matchesQuickFilter(
  row: InventoryTableRowViewModel,
  filter: InventoryQuickFilterKey,
  recentlyAdjustedIds: Set<string>,
): boolean {
  const { item } = row;
  const tier = resolveStockHealthTier(item);

  switch (filter) {
    case 'low-stock':
      return tier === 'low';
    case 'out-of-stock':
      return tier === 'out';
    case 'negative-stock':
      return tier === 'negative';
    case 'has-alternates':
      return row.alternateGroupCount > 0;
    case 'missing-location':
      return row.missingLocation;
    case 'missing-unit-cost':
      return row.missingUnitCost;
    case 'missing-sku':
      return row.missingSku;
    case 'missing-data':
      return row.missingData;
    case 'recently-adjusted':
      return recentlyAdjustedIds.has(item.id);
    case 'reorder-needed':
      return row.reorderPriority >= 2;
    default:
      return true;
  }
}

export function applyQuickFilters(
  rows: InventoryTableRowViewModel[],
  activeQuickFilters: InventoryQuickFilterKey[],
  recentlyAdjustedIds: Set<string>,
): InventoryTableRowViewModel[] {
  if (activeQuickFilters.length === 0) return rows;
  return rows.filter((row) =>
    activeQuickFilters.every((filter) =>
      matchesQuickFilter(row, filter, recentlyAdjustedIds),
    ),
  );
}

export function countQuickFilterMatches(
  items: InventoryItem[],
  groupMembershipCounts: Record<string, number>,
  filter: InventoryQuickFilterKey,
  recentlyAdjustedIds: Set<string>,
): number {
  return items.filter((item) => {
    const tier = resolveStockHealthTier(item);
    const alternateGroupCount = groupMembershipCounts[item.id] ?? 0;
    const missingLocation = !item.location?.trim();
    const missingUnitCost =
      item.default_unit_cost == null || item.default_unit_cost === '';
    const missingSku = !item.sku?.trim();
    const missingData = missingLocation || missingUnitCost || missingSku;
    const reorderPriority =
      item.quantity_on_hand < 0
        ? 4
        : item.quantity_on_hand === 0
          ? 3
          : item.isLowStock ?? item.quantity_on_hand <= item.low_stock_threshold
            ? 2
            : item.quantity_on_hand <= item.low_stock_threshold * 1.5
              ? 1
              : 0;

    const row: InventoryTableRowViewModel = {
      item,
      stockTier: tier,
      stockBarPercent: 0,
      reorderPriority,
      inventoryValue: 0,
      alternateGroupCount,
      lastAdjustedAt: null,
      missingLocation,
      missingUnitCost,
      missingSku,
      missingData,
    };
    return matchesQuickFilter(row, filter, recentlyAdjustedIds);
  }).length;
}
