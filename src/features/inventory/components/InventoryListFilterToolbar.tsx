import InventoryToolbar from '@/features/inventory/components/InventoryToolbar';
import MobileInventoryToolbar from '@/features/inventory/components/MobileInventoryToolbar';
import type { InventoryTableColumnKey } from '@/features/inventory/components/inventoryTableColumns';
import type { InventoryFilters, InventoryItem } from '@/features/inventory/types/inventory';

type InventoryListFilterToolbarProps = {
  isMobile: boolean;
  filters: InventoryFilters;
  uniqueLocations: string[];
  lowStockOrgWide: number;
  activeFilterCount: number;
  canExport: boolean;
  items: InventoryItem[];
  visibleColumnKeys?: InventoryTableColumnKey[];
  selectedItems?: InventoryItem[];
  toolbarControls?: React.ReactNode;
  healthSummary?: React.ReactNode;
  quickFilterChips?: React.ReactNode;
  onFilterChange: (patch: Partial<InventoryFilters>) => void;
  onClearFilters: () => void;
};

export function InventoryListFilterToolbar({
  isMobile,
  filters,
  uniqueLocations,
  lowStockOrgWide,
  activeFilterCount,
  canExport,
  items,
  visibleColumnKeys,
  selectedItems,
  toolbarControls,
  healthSummary,
  quickFilterChips,
  onFilterChange,
  onClearFilters,
}: InventoryListFilterToolbarProps) {
  if (isMobile) {
    return (
      <MobileInventoryToolbar
        filters={filters}
        onFilterChange={onFilterChange}
        onClearFilters={onClearFilters}
        uniqueLocations={uniqueLocations}
      />
    );
  }

  return (
    <InventoryToolbar
      filters={filters}
      uniqueLocations={uniqueLocations}
      onFilterChange={onFilterChange}
      onClearFilters={onClearFilters}
      canExport={canExport}
      items={items}
      visibleColumnKeys={visibleColumnKeys}
      selectedItems={selectedItems}
      toolbarControls={toolbarControls}
      healthSummary={healthSummary}
      quickFilterChips={quickFilterChips}
    />
  );
}
