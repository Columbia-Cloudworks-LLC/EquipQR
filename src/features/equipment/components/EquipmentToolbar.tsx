import React from 'react';
import { Search, LayoutGrid, Rows3, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import EquipmentFilterPopover from './EquipmentFilterPopover';
import EquipmentSortPopover from './EquipmentSortPopover';
import EquipmentImportMenu from './EquipmentImportMenu';
import EquipmentDownloadMenu from './EquipmentDownloadMenu';
import type { EquipmentListToolbarProps } from '@/features/equipment/components/equipmentFilterTypes';
import type { EquipmentFilters } from '@/features/equipment/hooks/useEquipmentFiltering';

type EquipmentToolbarProps = EquipmentListToolbarProps;

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
  viewMode,
  onViewModeChange,
  canImport = false,
  canExport = false,
  onImportCsv,
  equipment = [],
  columnPicker,
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

  const showRightControls = canImport || canExport;

  return (
    <div className="flex flex-col gap-2">
      {/* Single toolbar row */}
      <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {/* Search */}
          <div className="relative max-w-[260px] flex-1">
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

          {/* Sort popover — card view only; table view sorts via column headers */}
          {viewMode !== 'table' && (
            <EquipmentSortPopover
              sortConfig={sortConfig}
              onSortChange={onSortChange}
            />
          )}

          {/* View-mode-specific control (e.g. column picker for the table view) */}
          {columnPicker}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {showRightControls && (
            <>
              {canImport && (
                <EquipmentImportMenu onImportCsv={onImportCsv ?? (() => {})} />
              )}
              {canExport && <EquipmentDownloadMenu equipment={equipment} />}
            </>
          )}

          {showRightControls && (
            <Separator orientation="vertical" className="hidden md:block h-5" />
          )}

          {/* View mode toggle */}
          <div
            className="hidden md:flex items-center rounded-md border"
            role="radiogroup"
            aria-label="View mode"
          >
            <Button
              variant="ghost"
              size="icon"
              className={cn('h-8 w-8 rounded-r-none', viewMode === 'grid' && 'bg-muted')}
              onClick={() => onViewModeChange('grid')}
              aria-label="Card view"
              aria-checked={viewMode === 'grid'}
              role="radio"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn('h-8 w-8 rounded-l-none', viewMode === 'table' && 'bg-muted')}
              onClick={() => onViewModeChange('table')}
              aria-label="Table view"
              aria-checked={viewMode === 'table'}
              role="radio"
            >
              <Rows3 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
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
