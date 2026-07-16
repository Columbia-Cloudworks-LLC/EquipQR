import type { InventoryTableColumnKey } from '@/features/inventory/components/inventoryTableColumns';
import type { InventoryItem } from '@/features/inventory/types/inventory';

type FormatDateFn = (date: Date | string) => string;

const ALL_EXPORT_COLUMNS: { key: InventoryTableColumnKey | 'id'; title: string }[] = [
  { key: 'id', title: 'ID' },
  { key: 'name', title: 'Name' },
  { key: 'sku', title: 'SKU' },
  { key: 'external_id', title: 'External ID' },
  { key: 'quantity_on_hand', title: 'Quantity' },
  { key: 'low_stock_threshold', title: 'Low Stock Threshold' },
  { key: 'location', title: 'Location Name' },
  { key: 'default_unit_cost', title: 'Unit Cost' },
  { key: 'status', title: 'Status' },
  { key: 'description', title: 'Description' },
  { key: 'created_at', title: 'Created At' },
  { key: 'updated_at', title: 'Updated At' },
];

function getExportCellValue(
  item: InventoryItem,
  key: InventoryTableColumnKey | 'id',
  formatDate: FormatDateFn,
): string {
  switch (key) {
    case 'id':
      return item.id;
    case 'name':
      return item.name ?? '';
    case 'sku':
      return item.sku ?? '';
    case 'external_id':
      return item.external_id ?? '';
    case 'quantity_on_hand':
      return item.quantity_on_hand != null ? String(item.quantity_on_hand) : '';
    case 'low_stock_threshold':
      return item.low_stock_threshold != null ? String(item.low_stock_threshold) : '';
    case 'location':
      return item.location ?? '';
    case 'default_unit_cost':
      return item.default_unit_cost != null ? String(item.default_unit_cost) : '';
    case 'status':
      return item.isLowStock ? 'Low Stock' : 'OK';
    case 'description':
      return item.description ?? '';
    case 'created_at':
      return item.created_at ? formatDate(item.created_at) : '';
    case 'updated_at':
      return item.updated_at ? formatDate(item.updated_at) : '';
    default:
      return '';
  }
}

export function getAllExportHeaders(): string[] {
  return ALL_EXPORT_COLUMNS.map((c) => c.title);
}

export function itemsToAllExportRows(
  items: InventoryItem[],
  formatDate: FormatDateFn,
): string[][] {
  return items.map((item) =>
    ALL_EXPORT_COLUMNS.map((col) => getExportCellValue(item, col.key, formatDate)),
  );
}

export function itemsToJsonExport(items: InventoryItem[]) {
  return items.map((item) => ({
    id: item.id,
    name: item.name,
    sku: item.sku,
    external_id: item.external_id,
    quantity_on_hand: item.quantity_on_hand,
    low_stock_threshold: item.low_stock_threshold,
    location: item.location,
    default_unit_cost: item.default_unit_cost,
    description: item.description,
    is_low_stock: item.isLowStock ?? false,
    created_at: item.created_at,
    updated_at: item.updated_at,
  }));
}
