import type { WorkOrderFilters as FiltersType } from '@/features/work-orders/types/workOrder';
import type { QuickFilterPreset, SortField, SortDirection } from '@/features/work-orders/hooks/useWorkOrderFilters';

export type WorkOrderFiltersToolbarProps = {
  filters: FiltersType;
  activeFilterCount: number;
  activePresets: Set<QuickFilterPreset>;
  showMobileFilters: boolean;
  onShowMobileFiltersChange: (show: boolean) => void;
  onFilterChange: (key: keyof FiltersType, value: string) => void;
  onClearFilters: () => void;
  onQuickFilter: (preset: QuickFilterPreset) => void;
  sortField: SortField;
  sortDirection: SortDirection;
  onSortChange: (field: SortField, direction: SortDirection) => void;
  resultCount: number;
  totalCount: number;
};
