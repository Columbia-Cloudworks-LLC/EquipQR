import React from 'react';
import { Search, LayoutGrid, List, Rows3, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import EquipmentFilterPopover from './EquipmentFilterPopover';
import EquipmentSortPopover from './EquipmentSortPopover';
import EquipmentActionsMenu from './EquipmentActionsMenu';
import type { EquipmentFilters, SortConfig } from '@/features/equipment/hooks/useEquipmentFiltering';
import type { EquipmentViewMode } from './EquipmentCard';
import type { EquipmentRecord } from '@/features/equipment/types/equipment';

// Team is intentionally not part of FilterOptions here — the team scope is
// owned by the global TopBar `useSelectedTeam`.
interface FilterOptions {
  manufacturers: string[];
  locations: string[];
}

interface EquipmentToolbarProps {
  filters: EquipmentFilters;
  sortConfig: SortConfig;
  onFilterChange: (key: keyof EquipmentFilters, value: string) => void;
  onClearFilters: () => void;
  onQuickFilter: (preset: string) => void;
  onSortChange: (field: string, direction?: 'asc' | 'desc') => void;
  filterOptions: FilterOptions;
  hasActiveFilters: boolean;
  activeQuickFilter?: string | null;
  resultCount: number;
  totalCount: number;
  viewMode: EquipmentViewMode;
  onViewModeChange: (mode: EquipmentViewMode) => void;
  canImport?: boolean;
  canExport?: boolean;
  onImportCsv?: () => void;
  equipment?: EquipmentRecord[];
}

const EquipmentToolbar: React.FC<EquipmentToolbarProps> = ({
  filters,
  sortConfig,
  onFilterChange,
  onClearFilters,
  onQuickFilter,
  onSortChange,
  filterOptions,
  hasActiveFilters,
  activeQuickFilter,
  resultCount,
  totalCount,
  viewMode,
  onViewModeChange,
  canImport = false,
  canExport = false,
  onImportCsv,
  equipment = [],
}) => {
  // `filters.team` is driven by the global TopBar selection and is intentionally
  // excluded from the page-local active-filter count / chip row.
  const activeFilterCount = [
    filters.status !== 'all',
    filters.manufacturer !== 'all',
    filters.location !== 'all',
    !!(filters.maintenanceDateFrom || filters.maintenanceDateTo),
    !!(filters.installationDateFrom || filters.installationDateTo),
    filters.warrantyExpiring,
  ].filter(Boolean).length;

  return (
    <div className="flex flex-col gap-2">
      {/* Single toolbar row */}
      <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
        {/* Search */}
        <div className="relative flex-1 max-w-[260px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search equipment..."
            value={filters.search}
            onChange={(e) => onFilterChange('search', e.target.value)}
            className="h-8 pl-8 text-sm bg-transparent"
            aria-label="Search equipment"
          />
          {filters.search && (
            <button
              onClick={() => onFilterChange('search', '')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <Separator orientation="vertical" className="h-5" />

        {/* Filter popover */}
        <EquipmentFilterPopover
          filters={filters}
          onFilterChange={onFilterChange}
          onClearFilters={onClearFilters}
          onQuickFilter={onQuickFilter}
          filterOptions={filterOptions}
          activeFilterCount={activeFilterCount}
          activeQuickFilter={activeQuickFilter}
        />

        {/* Sort popover */}
        <EquipmentSortPopover
          sortConfig={sortConfig}
          onSortChange={onSortChange}
        />

        {/* Actions menu (import/export) */}
        {(canImport || canExport) && (
          <>
            <Separator orientation="vertical" className="h-5" />
            <EquipmentActionsMenu
              canImport={canImport}
              canExport={canExport}
              onImportCsv={onImportCsv ?? (() => {})}
              equipment={equipment}
            />
          </>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Result count */}
        <span className="text-xs text-muted-foreground whitespace-nowrap hidden lg:block" aria-live="polite" aria-atomic="true">
          <span className="font-medium text-foreground">{resultCount}</span>
          {' / '}
          <span className="font-medium text-foreground">{totalCount}</span>
        </span>

        <Separator orientation="vertical" className="h-5 hidden lg:block" />

        {/* View mode toggle */}
        <ToggleGroup
          type="single"
          value={viewMode}
          onValueChange={(value) => {
            if (value) onViewModeChange(value as EquipmentViewMode);
          }}
          className="gap-0 rounded-md border"
          aria-label="View mode"
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <ToggleGroupItem
                value="grid"
                aria-label="Grid view"
                className="h-8 w-8 rounded-r-none data-[state=on]:bg-muted"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </ToggleGroupItem>
            </TooltipTrigger>
            <TooltipContent side="bottom">Grid view</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <ToggleGroupItem
                value="list"
                aria-label="List view"
                className="h-8 w-8 rounded-none data-[state=on]:bg-muted"
              >
                <List className="h-3.5 w-3.5" />
              </ToggleGroupItem>
            </TooltipTrigger>
            <TooltipContent side="bottom">List view</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <ToggleGroupItem
                value="table"
                aria-label="Table view"
                className="h-8 w-8 rounded-l-none data-[state=on]:bg-muted"
              >
                <Rows3 className="h-3.5 w-3.5" />
              </ToggleGroupItem>
            </TooltipTrigger>
            <TooltipContent side="bottom">Table view</TooltipContent>
          </Tooltip>
        </ToggleGroup>
      </div>

      {/* Active filter badges row -- only when filters are active */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-1.5 px-1">
          <span className="text-xs text-muted-foreground">Active:</span>

          {filters.status !== 'all' && (
            <Badge variant="secondary" className="flex items-center gap-1 text-xs h-5 px-2">
              Status: {filters.status.replace('_', ' ')}
              <button
                onClick={() => onFilterChange('status', 'all')}
                className="ml-0.5 hover:text-foreground"
                aria-label="Clear status filter"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          {filters.manufacturer !== 'all' && (
            <Badge variant="secondary" className="flex items-center gap-1 text-xs h-5 px-2">
              {filters.manufacturer}
              <button
                onClick={() => onFilterChange('manufacturer', 'all')}
                className="ml-0.5 hover:text-foreground"
                aria-label="Clear manufacturer filter"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          {filters.location !== 'all' && (
            <Badge variant="secondary" className="flex items-center gap-1 text-xs h-5 px-2">
              {filters.location}
              <button
                onClick={() => onFilterChange('location', 'all')}
                className="ml-0.5 hover:text-foreground"
                aria-label="Clear location filter"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          {filters.warrantyExpiring && (
            <Badge variant="secondary" className="flex items-center gap-1 text-xs h-5 px-2">
              Warranty Expiring
              <button
                onClick={() => onFilterChange('warrantyExpiring' as keyof EquipmentFilters, 'false')}
                className="ml-0.5 hover:text-foreground"
                aria-label="Clear warranty expiring filter"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          <Button
            variant="ghost"
            size="sm"
            className="h-5 px-2 text-xs text-muted-foreground hover:text-foreground"
            onClick={onClearFilters}
          >
            Clear all
          </Button>
        </div>
      )}
    </div>
  );
};

export default EquipmentToolbar;
