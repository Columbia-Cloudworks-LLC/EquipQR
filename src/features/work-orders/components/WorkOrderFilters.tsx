import React from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Search, Filter, X, Check } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { HorizontalChipRow } from '@/components/layout/HorizontalChipRow';
import { WorkOrderFilters as FiltersType } from '@/features/work-orders/types/workOrder';
import type { QuickFilterPreset, SortField, SortDirection } from '@/features/work-orders/hooks/useWorkOrderFilters';
import WorkOrderToolbar from './WorkOrderToolbar';

interface WorkOrderFiltersProps {
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
}

export const WorkOrderFilters: React.FC<WorkOrderFiltersProps> = ({
  filters,
  activeFilterCount,
  activePresets,
  showMobileFilters,
  onShowMobileFiltersChange,
  onFilterChange,
  onClearFilters,
  onQuickFilter,
  sortField,
  sortDirection,
  onSortChange,
  resultCount,
  totalCount,
}) => {
  const isMobile = useIsMobile();
  const mobileSearchInputId = 'work-order-search-mobile';
  const mobileStatusFilterId = 'work-order-status-filter-mobile';
  const mobileAssigneeFilterId = 'work-order-assignee-filter-mobile';
  const mobilePriorityFilterId = 'work-order-priority-filter-mobile';
  const mobileDueDateFilterId = 'work-order-due-date-filter-mobile';

  if (isMobile) {
    return (
      <div className="space-y-3">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
          <Input
            id={mobileSearchInputId}
            placeholder="Search work orders..."
            value={filters.searchQuery}
            onChange={(e) => onFilterChange('searchQuery', e.target.value)}
            className="pl-10 h-12 text-base"
          />
        </div>

        {/* Quick Filters with scroll hint */}
        <HorizontalChipRow ariaLabel="Quick filter options" className="-mx-1 px-1" gap="gap-1.5">
          {([
            { label: 'My Work', value: 'my-work' as QuickFilterPreset },
            { label: 'Urgent', value: 'urgent' as QuickFilterPreset },
            { label: 'Overdue', value: 'overdue' as QuickFilterPreset },
            { label: 'Unassigned', value: 'unassigned' as QuickFilterPreset }
          ]).map((preset) => {
            const isActive = activePresets.has(preset.value);
            return (
              <Button
                key={preset.value}
                size="sm"
                variant={isActive ? 'default' : 'outline'}
                className="whitespace-nowrap flex-shrink-0 min-h-10 px-3 text-xs"
                onClick={() => {
                  onQuickFilter(preset.value);
                  onShowMobileFiltersChange(false);
                }}
              >
                {isActive && <Check className="mr-1 h-3 w-3" />}
                {preset.label}
              </Button>
            );
          })}
        </HorizontalChipRow>

        {/* Filter Button with Active Count */}
        <Sheet open={showMobileFilters} onOpenChange={onShowMobileFiltersChange}>
          <SheetTrigger asChild>
            <Button variant="outline" className="w-full h-11 justify-between">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <span>Filters</span>
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 min-w-5 text-xs">
                    {activeFilterCount}
                  </Badge>
                )}
              </div>
            </Button>
          </SheetTrigger>
            <SheetContent side="bottom" className="max-h-[calc(100dvh-2rem)] overflow-y-auto pb-safe-bottom">
              <SheetHeader className="pb-4">
                <SheetTitle>Filter Work Orders</SheetTitle>
                <SheetDescription>
                  Filter work orders by status, assignee, priority, or due date. Team
                  scope is set from the breadcrumb at the top of the screen.
                </SheetDescription>
              </SheetHeader>
              
              {/* Filters */}
              <div className="space-y-4">
                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Filters</h3>
                  
                  <div className="space-y-3">
                    <div>
                      <label htmlFor={mobileStatusFilterId} className="text-sm font-medium mb-2 block">Status</label>
                      <Select value={filters.statusFilter} onValueChange={(value) => onFilterChange('statusFilter', value)}>
                        <SelectTrigger id={mobileStatusFilterId} className="h-12">
                          <SelectValue placeholder="All Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Status</SelectItem>
                          <SelectItem value="submitted">Submitted</SelectItem>
                          <SelectItem value="accepted">Accepted</SelectItem>
                          <SelectItem value="assigned">Assigned</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="on_hold">On Hold</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label htmlFor={mobileAssigneeFilterId} className="text-sm font-medium mb-2 block">Assignee</label>
                      <Select value={filters.assigneeFilter} onValueChange={(value) => onFilterChange('assigneeFilter', value)}>
                        <SelectTrigger id={mobileAssigneeFilterId} className="h-12">
                          <SelectValue placeholder="All Assignees" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Assignees</SelectItem>
                          <SelectItem value="mine">My Work Orders</SelectItem>
                          <SelectItem value="unassigned">Unassigned</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label htmlFor={mobilePriorityFilterId} className="text-sm font-medium mb-2 block">Priority</label>
                      <Select value={filters.priorityFilter} onValueChange={(value) => onFilterChange('priorityFilter', value)}>
                        <SelectTrigger id={mobilePriorityFilterId} className="h-12">
                          <SelectValue placeholder="All Priorities" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Priorities</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="low">Low</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label htmlFor={mobileDueDateFilterId} className="text-sm font-medium mb-2 block">Due Date</label>
                      <Select value={filters.dueDateFilter} onValueChange={(value) => onFilterChange('dueDateFilter', value)}>
                        <SelectTrigger id={mobileDueDateFilterId} className="h-12">
                          <SelectValue placeholder="All Dates" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Dates</SelectItem>
                          <SelectItem value="overdue">Overdue</SelectItem>
                          <SelectItem value="today">Due Today</SelectItem>
                          <SelectItem value="this_week">This Week</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Clear All Button */}
                  <Button
                    variant="outline"
                    onClick={onClearFilters}
                    className="w-full h-12"
                  >
                    Clear All Filters
                  </Button>
                </div>
              </div>
            </SheetContent>
        </Sheet>

        {/* Active Filter Summary with Clear All */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">Active:</span>
            {filters.statusFilter !== 'all' && (
              <Badge variant="secondary" className="flex max-w-full items-center gap-1">
                <span className="truncate" title={`Status: ${filters.statusFilter}`}>
                  Status: {filters.statusFilter}
                </span>
                <button
                  type="button"
                  className="inline-flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                  onClick={() => onFilterChange('statusFilter', 'all')}
                  aria-label="Clear status filter"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {filters.assigneeFilter !== 'all' && (
              <Badge variant="secondary" className="flex max-w-full items-center gap-1">
                <span className="truncate" title={`Assignee: ${filters.assigneeFilter === 'mine' ? 'Mine' : filters.assigneeFilter}`}>
                  Assignee: {filters.assigneeFilter === 'mine' ? 'Mine' : filters.assigneeFilter}
                </span>
                <button
                  type="button"
                  className="inline-flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                  onClick={() => onFilterChange('assigneeFilter', 'all')}
                  aria-label="Clear assignee filter"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {filters.priorityFilter !== 'all' && (
              <Badge variant="secondary" className="flex max-w-full items-center gap-1">
                <span className="truncate" title={`Priority: ${filters.priorityFilter}`}>
                  Priority: {filters.priorityFilter}
                </span>
                <button
                  type="button"
                  className="inline-flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                  onClick={() => onFilterChange('priorityFilter', 'all')}
                  aria-label="Clear priority filter"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {filters.dueDateFilter !== 'all' && (
              <Badge variant="secondary" className="flex max-w-full items-center gap-1">
                <span className="truncate" title={`Due: ${filters.dueDateFilter}`}>
                  Due: {filters.dueDateFilter}
                </span>
                <button
                  type="button"
                  className="inline-flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                  onClick={() => onFilterChange('dueDateFilter', 'all')}
                  aria-label="Clear due date filter"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="min-h-11 px-3 text-sm"
              onClick={onClearFilters}
            >
              Clear all
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <WorkOrderToolbar
      filters={filters}
      activeFilterCount={activeFilterCount}
      activePresets={activePresets}
      onFilterChange={onFilterChange}
      onClearFilters={onClearFilters}
      onQuickFilter={onQuickFilter}
      sortField={sortField}
      sortDirection={sortDirection}
      onSortChange={onSortChange}
      resultCount={resultCount}
      totalCount={totalCount}
    />
  );
};


