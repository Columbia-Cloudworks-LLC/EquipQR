import React from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { GridTableViewModeToggle } from '@/components/common/GridTableViewModeToggle';
import { ToolbarSearchInput } from '@/components/common/ToolbarSearchInput';
import AlternateGroupsFilterPopover from './AlternateGroupsFilterPopover';
import AlternateGroupsSortPopover from './AlternateGroupsSortPopover';
import AlternateGroupsDownloadMenu from './AlternateGroupsDownloadMenu';
import type { PartAlternateGroup } from '@/features/inventory/types/inventory';

type GroupStatusFilter = 'all' | 'verified' | 'unverified' | 'deprecated';
type GroupSortOption = 'name-asc' | 'name-desc' | 'updated-desc' | 'updated-asc';
export type AlternateGroupsViewMode = 'cards' | 'table';

interface AlternateGroupsToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: GroupStatusFilter;
  onStatusChange: (status: GroupStatusFilter) => void;
  sortBy: GroupSortOption;
  onSortChange: (sort: GroupSortOption) => void;
  filteredGroups: PartAlternateGroup[];
  canEdit: boolean;
  viewMode?: AlternateGroupsViewMode;
  onViewModeChange?: (mode: AlternateGroupsViewMode) => void;
}

const AlternateGroupsToolbar: React.FC<AlternateGroupsToolbarProps> = ({
  search,
  onSearchChange,
  statusFilter,
  onStatusChange,
  sortBy,
  onSortChange,
  filteredGroups,
  canEdit,
  viewMode = 'cards',
  onViewModeChange,
}) => {
  const activeFilterCount = statusFilter !== 'all' ? 1 : 0;
  const hasActiveFilters = activeFilterCount > 0;

  return (
    <div className="flex flex-col gap-2">
      {/* Single toolbar row */}
      <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {/* Search */}
          <ToolbarSearchInput
            value={search}
            onChange={onSearchChange}
            placeholder={
              viewMode === 'table'
                ? 'Search groups or parts...'
                : 'Search by name or description...'
            }
            ariaLabel={
              viewMode === 'table'
                ? 'Search alternate groups or parts'
                : 'Search alternate groups'
            }
            className="max-w-[280px]"
          />

          <Separator orientation="vertical" className="h-5" />

          {/* Filter popover */}
          <AlternateGroupsFilterPopover
            statusFilter={statusFilter}
            onStatusChange={onStatusChange}
            activeFilterCount={activeFilterCount}
          />

          {/* Sort popover — card view only; table view sorts via column headers */}
          {viewMode !== 'table' && (
            <AlternateGroupsSortPopover sortBy={sortBy} onSortChange={onSortChange} />
          )}
        </div>

        {(canEdit || onViewModeChange) && (
          <div className="flex shrink-0 items-center gap-2">
            {canEdit && <AlternateGroupsDownloadMenu groups={filteredGroups} />}

            {canEdit && onViewModeChange && (
              <Separator orientation="vertical" className="hidden md:block h-5" />
            )}

            {onViewModeChange && (
              <GridTableViewModeToggle
                viewMode={viewMode}
                onViewModeChange={onViewModeChange}
                gridValue="cards"
                tableValue="table"
              />
            )}
          </div>
        )}
      </div>

      {/* Active filter badges row */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-1.5 px-1">
          <span className="text-xs text-muted-foreground">Active:</span>
          <Badge variant="secondary" className="flex items-center gap-1 text-xs h-5 px-2 capitalize">
            Status: {statusFilter}
            <button
              onClick={() => onStatusChange('all')}
              className="ml-0.5 hover:text-foreground"
              aria-label="Clear status filter"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            className="h-5 px-2 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => onStatusChange('all')}
          >
            Clear all
          </Button>
        </div>
      )}
    </div>
  );
};

export default AlternateGroupsToolbar;
