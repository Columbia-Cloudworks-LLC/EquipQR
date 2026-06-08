import InventoryToolbar from '@/features/inventory/components/InventoryToolbar';
import MobileInventoryToolbar from '@/features/inventory/components/MobileInventoryToolbar';
import type { InventoryFilters, InventoryItem } from '@/features/inventory/types/inventory';

type InventoryListFilterToolbarProps = {
  isMobile: boolean;
  filters: InventoryFilters;
  uniqueLocations: string[];
  resultCount: number;
  lowStockOrgWide: number;
  activeFilterCount: number;
  canExport: boolean;
  items: InventoryItem[];
  onFilterChange: (patch: Partial<InventoryFilters>) => void;
  onClearFilters: () => void;
  onClearSheetFilters: () => void;
};

export function InventoryListFilterToolbar({
  isMobile,
  filters,
  uniqueLocations,
  resultCount,
  lowStockOrgWide,
  activeFilterCount,
  canExport,
  items,
  onFilterChange,
  onClearFilters,
  onClearSheetFilters,
}: InventoryListFilterToolbarProps) {
  if (isMobile) {
    return (
      <MobileInventoryToolbar
        filters={filters}
        onFilterChange={onFilterChange}
        onClearSheetFilters={onClearSheetFilters}
        uniqueLocations={uniqueLocations}
        resultCount={resultCount}
        lowStockOrgWide={lowStockOrgWide}
        activeFilterCount={activeFilterCount}
      />
    );
  }

  return (
    <InventoryToolbar
      filters={filters}
      uniqueLocations={uniqueLocations}
      resultCount={resultCount}
      onFilterChange={onFilterChange}
      onClearFilters={onClearFilters}
      canExport={canExport}
      items={items}
    />
  );
}
