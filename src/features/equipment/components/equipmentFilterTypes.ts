import type React from 'react';
import type { EquipmentFilterState, SortConfig } from '@/features/equipment/hooks/useEquipmentFiltering';
import type { EquipmentViewMode } from '@/features/equipment/components/EquipmentCard';
import type { EquipmentExportRow } from '@/features/equipment/components/EquipmentDownloadMenu';

/** Team scope is owned by TopBar `useSelectedTeam`, not page filters. */
export type EquipmentFilterOptions = {
  manufacturers: string[];
  locations: string[];
};

/** Typed per-key filter setter: the value type follows the key (e.g. `warrantyExpiring` is boolean). */
export type EquipmentFilterChangeHandler = <K extends keyof EquipmentFilterState>(
  key: K,
  value: EquipmentFilterState[K],
) => void;

export type EquipmentListToolbarProps = {
  filters: EquipmentFilterState;
  sortConfig: SortConfig;
  onFilterChange: EquipmentFilterChangeHandler;
  onClearFilters: () => void;
  onQuickFilter: (preset: string) => void;
  onSortChange: (field: string, direction?: 'asc' | 'desc') => void;
  filterOptions: EquipmentFilterOptions;
  hasActiveFilters: boolean;
  activeQuickFilter?: string | null;
  viewMode: EquipmentViewMode;
  onViewModeChange: (mode: EquipmentViewMode) => void;
  canImport?: boolean;
  canExport?: boolean;
  onImportCsv?: () => void;
  equipment?: EquipmentExportRow[];
  columnPicker?: React.ReactNode;
};
