import React from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import WorkOrderFilterPopover from './WorkOrderFilterPopover';
import WorkOrderSortPopover from './WorkOrderSortPopover';
import { WorkOrderFilters } from '@/features/work-orders/types/workOrder';
import type { QuickFilterPreset, SortField, SortDirection } from '@/features/work-orders/hooks/useWorkOrderFilters';

interface WorkOrderToolbarProps {
  filters: WorkOrderFilters;
  activeFilterCount: number;
  activePresets: Set<QuickFilterPreset>;
  onFilterChange: (key: keyof WorkOrderFilters, value: string) => void;
  onClearFilters: () => void;
  onQuickFilter: (preset: QuickFilterPreset) => void;
  sortField: SortField;
  sortDirection: SortDirection;
  onSortChange: (field: SortField, direction: SortDirection) => void;
  resultCount: number;
  totalCount: number;
}

const WorkOrderToolbar: React.FC<WorkOrderToolbarProps> = ({
  filters,
  activeFilterCount,
  activePresets,
  onFilterChange,
  onClearFilters,
  onQuickFilter,
  sortField,
  sortDirection,
  onSortChange,
  resultCount,
  totalCount,
}) => {
  const hasActiveFilters = activeFilterCount > 0 || filters.searchQuery.length > 0;

  return (
    <div className="flex flex-col gap-2">
      {/* Single toolbar row */}
      <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
        {/* Search */}
        <div className="relative flex-1 max-w-[260px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search work orders..."
            value={filters.searchQuery}
            onChange={(e) => onFilterChange('searchQuery', e.target.value)}
            className="h-8 pl-8 text-sm bg-transparent"
            aria-label="Search work orders"
          />
          {filters.searchQuery && (
            <button
              onClick={() => onFilterChange('searchQuery', '')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <Separator orientation="vertical" className="h-5" />

        {/* Filter popover */}
        <WorkOrderFilterPopover
          filters={filters}
          activeFilterCount={activeFilterCount}
          activePresets={activePresets}
          onFilterChange={onFilterChange}
          onClearFilters={onClearFilters}
          onQuickFilter={onQuickFilter}
        />

        {/* Sort popover */}
        <WorkOrderSortPopover
          sortField={sortField}
          sortDirection={sortDirection}
          onSortChange={onSortChange}
        />

        {/* Spacer */}
        <div className="flex-1" />

        {/* Result count */}
        <span
          className="text-xs text-muted-foreground whitespace-nowrap hidden lg:block"
          aria-live="polite"
          aria-atomic="true"
        >
          <span className="font-medium text-foreground">{resultCount}</span>
          {' / '}
          <span className="font-medium text-foreground">{totalCount}</span>
        </span>
      </div>

      {/* Active filter badges row */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-1.5 px-1">
          <span className="text-xs text-muted-foreground">Active:</span>

          {filters.statusFilter !== 'all' && (
            <Badge variant="secondary" className="flex items-center gap-1 text-xs h-5 px-2">
              Status: {filters.statusFilter.replace('_', ' ')}
              <button
                onClick={() => onFilterChange('statusFilter', 'all')}
                className="ml-0.5 hover:text-foreground"
                aria-label="Clear status filter"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          {filters.assigneeFilter !== 'all' && (
            <Badge variant="secondary" className="flex items-center gap-1 text-xs h-5 px-2">
              Assignee: {filters.assigneeFilter === 'mine' ? 'Mine' : filters.assigneeFilter}
              <button
                onClick={() => onFilterChange('assigneeFilter', 'all')}
                className="ml-0.5 hover:text-foreground"
                aria-label="Clear assignee filter"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          {filters.priorityFilter !== 'all' && (
            <Badge variant="secondary" className="flex items-center gap-1 text-xs h-5 px-2">
              Priority: {filters.priorityFilter}
              <button
                onClick={() => onFilterChange('priorityFilter', 'all')}
                className="ml-0.5 hover:text-foreground"
                aria-label="Clear priority filter"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          {filters.dueDateFilter !== 'all' && (
            <Badge variant="secondary" className="flex items-center gap-1 text-xs h-5 px-2">
              Due: {filters.dueDateFilter.replace('_', ' ')}
              <button
                onClick={() => onFilterChange('dueDateFilter', 'all')}
                className="ml-0.5 hover:text-foreground"
                aria-label="Clear due date filter"
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

export default WorkOrderToolbar;
