import InventoryToolbar from '@/features/inventory/components/InventoryToolbar';
import MobileInventoryToolbar from '@/features/inventory/components/MobileInventoryToolbar';
import type { InventoryFilters, InventoryItem, InventoryTableDensity } from '@/features/inventory/types/inventory';

type InventoryListFilterToolbarProps = {
  isMobile: boolean;
  filters: InventoryFilters;
  uniqueLocations: string[];
  lowStockOrgWide: number;
  activeFilterCount: number;
  canExport: boolean;
  items: InventoryItem[];
  selectedItems?: InventoryItem[];
  toolbarControls?: React.ReactNode;
  density?: InventoryTableDensity;
  onDensityChange?: (density: InventoryTableDensity) => void;
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
  selectedItems,
  toolbarControls,
  density,
  onDensityChange,
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
      selectedItems={selectedItems}
      toolbarControls={toolbarControls}
      density={density}
      onDensityChange={onDensityChange}
      healthSummary={healthSummary}
      quickFilterChips={quickFilterChips}
    />
  );
}
