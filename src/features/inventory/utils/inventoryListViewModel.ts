import type { InventoryItem, InventorySortField } from '@/features/inventory/types/inventory';
import { resolveStockHealthTier } from '@/features/inventory/utils/stockHealthLevels';

export interface InventoryTableRowViewModel {
  item: InventoryItem;
  stockTier: ReturnType<typeof resolveStockHealthTier>;
  reorderPriority: number;
  inventoryValue: number;
  alternateGroupCount: number;
  lastAdjustedAt: string | null;
  missingLocation: boolean;
  missingUnitCost: boolean;
  missingSku: boolean;
  missingData: boolean;
}

export function buildInventoryTableRowViewModel(
  item: InventoryItem,
  groupMembershipCounts: Record<string, number>,
  lastAdjustedAtByItemId: Record<string, string> = {},
): InventoryTableRowViewModel {
  const unitCost = item.default_unit_cost != null ? Number(item.default_unit_cost) : 0;
  const inventoryValue = unitCost * item.quantity_on_hand;
  const alternateGroupCount = groupMembershipCounts[item.id] ?? 0;
  const missingLocation = !item.location?.trim();
  const missingUnitCost = item.default_unit_cost == null || item.default_unit_cost === '';
  const missingSku = !item.sku?.trim();

  let reorderPriority = 0;
  if (item.quantity_on_hand < 0) reorderPriority = 4;
  else if (item.quantity_on_hand === 0) reorderPriority = 3;
  else if (item.isLowStock ?? item.quantity_on_hand <= item.low_stock_threshold) {
    reorderPriority = 2;
  } else if (item.quantity_on_hand <= item.low_stock_threshold * 1.5) {
    reorderPriority = 1;
  }

  return {
    item,
    stockTier: resolveStockHealthTier(item),
    reorderPriority,
    inventoryValue,
    alternateGroupCount,
    lastAdjustedAt: lastAdjustedAtByItemId[item.id] ?? null,
    missingLocation,
    missingUnitCost,
    missingSku,
    missingData: missingLocation || missingUnitCost || missingSku,
  };
}

const CLIENT_SORT_FIELDS: InventorySortField[] = [
  'status',
  'alternate_groups',
  'inventory_value',
  'reorder_priority',
  'missing_data',
  'last_adjusted_at',
];

export function isClientSideSortField(sortBy: InventorySortField | undefined): boolean {
  return !!sortBy && CLIENT_SORT_FIELDS.includes(sortBy);
}

export function sortInventoryViewModels(
  rows: InventoryTableRowViewModel[],
  sortBy: InventorySortField,
  sortOrder: 'asc' | 'desc',
): InventoryTableRowViewModel[] {
  const ascending = sortOrder === 'asc';
  const sorted = [...rows];

  const compare = (a: InventoryTableRowViewModel, b: InventoryTableRowViewModel): number => {
    let result: number;
    switch (sortBy) {
      case 'status': {
        const tierOrder = { negative: 0, out: 1, low: 2, healthy: 3 };
        result = tierOrder[a.stockTier] - tierOrder[b.stockTier];
        break;
      }
      case 'alternate_groups':
        result = a.alternateGroupCount - b.alternateGroupCount;
        break;
      case 'inventory_value':
        result = a.inventoryValue - b.inventoryValue;
        break;
      case 'reorder_priority':
        result = a.reorderPriority - b.reorderPriority;
        break;
      case 'missing_data':
        result = Number(a.missingData) - Number(b.missingData);
        break;
      case 'last_adjusted_at': {
        const aTime = a.lastAdjustedAt ? Date.parse(a.lastAdjustedAt) : 0;
        const bTime = b.lastAdjustedAt ? Date.parse(b.lastAdjustedAt) : 0;
        result = aTime - bTime;
        break;
      }
      default:
        result = a.item.name.localeCompare(b.item.name);
        return ascending ? result : -result;
    }
    if (result === 0) {
      result = a.item.name.localeCompare(b.item.name);
    }
    return ascending ? result : -result;
  };

  sorted.sort(compare);
  return sorted;
}
