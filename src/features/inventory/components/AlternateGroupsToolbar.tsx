import React from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import AlternateGroupsFilterPopover from './AlternateGroupsFilterPopover';
import AlternateGroupsSortPopover from './AlternateGroupsSortPopover';
import AlternateGroupsDownloadMenu from './AlternateGroupsDownloadMenu';
import type { PartAlternateGroup } from '@/features/inventory/types/inventory';

type GroupStatusFilter = 'all' | 'verified' | 'unverified' | 'deprecated';
type GroupSortOption = 'name-asc' | 'name-desc' | 'updated-desc' | 'updated-asc';

interface AlternateGroupsToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: GroupStatusFilter;
  onStatusChange: (status: GroupStatusFilter) => void;
  sortBy: GroupSortOption;
  onSortChange: (sort: GroupSortOption) => void;
  filteredGroups: PartAlternateGroup[];
  totalCount: number;
  canEdit: boolean;
}

const AlternateGroupsToolbar: React.FC<AlternateGroupsToolbarProps> = ({
  search,
  onSearchChange,
  statusFilter,
  onStatusChange,
  sortBy,
  onSortChange,
  filteredGroups,
  totalCount,
  canEdit,
}) => {
  const activeFilterCount = statusFilter !== 'all' ? 1 : 0;
  const hasActiveFilters = activeFilterCount > 0;

  return (
    <div className="flex flex-col gap-2">
      {/* Single toolbar row */}
      <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
        {/* Search */}
        <div className="relative flex-1 max-w-[280px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search by name or description..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-8 pl-8 text-sm bg-transparent"
            aria-label="Search alternate groups"
          />
          {search && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <Separator orientation="vertical" className="h-5" />

        {/* Filter popover */}
        <AlternateGroupsFilterPopover
          statusFilter={statusFilter}
          onStatusChange={onStatusChange}
          activeFilterCount={activeFilterCount}
        />

        {/* Sort popover */}
        <AlternateGroupsSortPopover sortBy={sortBy} onSortChange={onSortChange} />

        {canEdit && (
          <>
            <Separator orientation="vertical" className="h-5" />
            {/* Download menu */}
            <AlternateGroupsDownloadMenu groups={filteredGroups} />
          </>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Result count */}
        <span
          className="text-xs text-muted-foreground whitespace-nowrap hidden lg:block"
          aria-live="polite"
          aria-atomic="true"
        >
          <span className="font-medium text-foreground">{filteredGroups.length}</span>
          {filteredGroups.length !== totalCount && (
            <>
              {' / '}
              <span className="font-medium text-foreground">{totalCount}</span>
            </>
          )}
          {' group'}{filteredGroups.length !== 1 ? 's' : ''}
        </span>
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
