// fallow-ignore-file code-duplication
// Duplication rationale: Mobile toolbar mirrors desktop filter field wiring
import React from 'react';
import { Search, SlidersHorizontal, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { HorizontalChipRow } from '@/components/layout/HorizontalChipRow';
import type { WorkOrderFilters as FiltersType } from '@/features/work-orders/types/workOrder';
import type { QuickFilterPreset, SortField, SortDirection } from '@/features/work-orders/hooks/useWorkOrderFilters';
import type { WorkOrderFiltersToolbarProps } from '@/features/work-orders/types/workOrderFiltersToolbarTypes';
import {
  WORK_ORDER_SORT_OPTIONS,
  WORK_ORDER_QUICK_FILTER_PRESETS,
} from '@/features/work-orders/constants/workOrderSortOptions';
import {
  WorkOrderStatusFilterSelect,
  WorkOrderPriorityFilterSelect,
  WorkOrderDueDateFilterSelect,
  WorkOrderInvoiceFilterSelect,
} from '@/features/work-orders/components/WorkOrderFilterSelectFields';
import { formatInvoiceFilterLabel } from '@/features/work-orders/utils/invoiceFilterLabels';

export type MobileWorkOrderToolbarProps = WorkOrderFiltersToolbarProps;

const MobileWorkOrderToolbar: React.FC<MobileWorkOrderToolbarProps> = ({
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
  const mobileSearchInputId = 'work-order-search-mobile';
  const mobileStatusFilterId = 'work-order-status-filter-mobile';
  const mobileAssigneeFilterId = 'work-order-assignee-filter-mobile';
  const mobilePriorityFilterId = 'work-order-priority-filter-mobile';
  const mobileDueDateFilterId = 'work-order-due-date-filter-mobile';
  const mobileInvoiceFilterId = 'work-order-invoice-filter-mobile';

  const hasSearch = filters.searchQuery.length > 0;
  const hasActiveFilters = activeFilterCount > 0 || hasSearch;
  const sheetFilterCount = activeFilterCount + (hasSearch ? 1 : 0);

  const handleSheetOpenChange = (open: boolean) => {
    onShowMobileFiltersChange(open);
  };

  return (
    <div className="space-y-2.5">
      {/* Glanceable count */}
      <div className="flex flex-wrap items-center gap-2" aria-live="polite" aria-atomic="false">
        <div className="inline-flex items-baseline gap-1.5 rounded-md border border-border/80 bg-muted/30 px-3 py-1.5">
          <span className="text-lg font-semibold tabular-nums text-foreground">{resultCount}</span>
          <span className="text-sm font-medium text-muted-foreground">
            {resultCount === 1 ? 'work order' : 'work orders'}
          </span>
          {hasActiveFilters && resultCount !== totalCount && (
            <span className="text-xs text-muted-foreground">of {totalCount}</span>
          )}
          {hasActiveFilters && (
            <Badge variant="secondary" className="ml-0.5 text-[10px] font-semibold uppercase tracking-wide">
              Filtered
            </Badge>
          )}
        </div>
      </div>

      {/* Search + Sort & Filter */}
      <div className="flex items-stretch gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id={mobileSearchInputId}
            placeholder="Search work orders..."
            value={filters.searchQuery}
            onChange={(e) => onFilterChange('searchQuery', e.target.value)}
            className="h-11 pl-9"
            aria-label="Search work orders"
          />
        </div>
        <Sheet open={showMobileFilters} onOpenChange={handleSheetOpenChange}>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              className="h-11 shrink-0 gap-2 px-3"
              aria-label={
                sheetFilterCount > 0
                  ? `Sort and filter, ${sheetFilterCount} active`
                  : 'Sort and filter'
              }
            >
              <SlidersHorizontal className="h-4 w-4 shrink-0" aria-hidden />
              <span className="text-xs font-medium sm:text-sm">Sort & Filter</span>
              {sheetFilterCount > 0 && (
                <Badge variant="secondary" className="h-5 min-w-5 px-1.5 text-[10px] leading-none">
                  {sheetFilterCount}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[min(85vh,560px)] overflow-y-auto pb-safe-bottom">
            <SheetHeader className="pb-2 text-left">
              <SheetTitle>Sort & filter</SheetTitle>
              <SheetDescription>
                Change sort order or narrow the list. Team scope is set from the breadcrumb at the top of the screen.
              </SheetDescription>
            </SheetHeader>
            <div className="space-y-6 pb-8 pt-2">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Sort by
                </p>
                <Select
                  value={`${sortField}:${sortDirection}`}
                  onValueChange={(v) => {
                    const [field, dir] = v.split(':') as [SortField, SortDirection];
                    onSortChange(field, dir);
                  }}
                >
                  <SelectTrigger className="h-11" aria-label="Sort work orders">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WORK_ORDER_SORT_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Filters
                </p>

                <div>
                  <label htmlFor={mobileStatusFilterId} className="mb-2 block text-sm font-medium">
                    Status
                  </label>
                  <WorkOrderStatusFilterSelect
                    value={filters.statusFilter}
                    onValueChange={(value) => onFilterChange('statusFilter', value)}
                    triggerId={mobileStatusFilterId}
                    placeholder="All Status"
                    allLabel="All Status"
                  />
                </div>

                <div>
                  <label htmlFor={mobileAssigneeFilterId} className="mb-2 block text-sm font-medium">
                    Assignee
                  </label>
                  <Select
                    value={filters.assigneeFilter}
                    onValueChange={(value) => onFilterChange('assigneeFilter', value)}
                  >
                    <SelectTrigger id={mobileAssigneeFilterId} className="h-11">
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
                  <label htmlFor={mobilePriorityFilterId} className="mb-2 block text-sm font-medium">
                    Priority
                  </label>
                  <WorkOrderPriorityFilterSelect
                    value={filters.priorityFilter}
                    onValueChange={(value) => onFilterChange('priorityFilter', value)}
                    triggerId={mobilePriorityFilterId}
                  />
                </div>

                <div>
                  <label htmlFor={mobileDueDateFilterId} className="mb-2 block text-sm font-medium">
                    Due Date
                  </label>
                  <WorkOrderDueDateFilterSelect
                    value={filters.dueDateFilter}
                    onValueChange={(value) => onFilterChange('dueDateFilter', value)}
                    triggerId={mobileDueDateFilterId}
                  />
                </div>

                <div>
                  <label htmlFor={mobileInvoiceFilterId} className="mb-2 block text-sm font-medium">
                    Invoice
                  </label>
                  <WorkOrderInvoiceFilterSelect
                    value={filters.invoiceFilter}
                    onValueChange={(value) => onFilterChange('invoiceFilter', value)}
                    triggerId={mobileInvoiceFilterId}
                  />
                </div>
              </div>

              <Button
                variant="outline"
                className="h-12 w-full touch-manipulation"
                onClick={onClearFilters}
              >
                Reset sort & filters
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Quick filter chips */}
      <HorizontalChipRow ariaLabel="Quick filter options" className="-mx-1 px-1" gap="gap-1.5">
        {WORK_ORDER_QUICK_FILTER_PRESETS.map((preset) => {
          const isActive = activePresets.has(preset.value);
          return (
            <Button
              key={preset.value}
              size="sm"
              variant={isActive ? 'default' : 'outline'}
              className="min-h-9 flex-shrink-0 whitespace-nowrap px-3 text-xs"
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

      {/* Active sheet-filter chips */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Active:</span>
          {filters.statusFilter !== 'all' && (
            <Badge variant="secondary" className="flex max-w-full items-center gap-1">
              <span className="truncate" title={`Status: ${filters.statusFilter}`}>
                Status: {filters.statusFilter}
              </span>
              <button
                type="button"
                className="inline-flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => onFilterChange('statusFilter', 'all')}
                aria-label="Clear status filter"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.assigneeFilter !== 'all' && (
            <Badge variant="secondary" className="flex max-w-full items-center gap-1">
              <span className="truncate" title={`Assignee: ${filters.assigneeFilter}`}>
                Assignee: {filters.assigneeFilter === 'mine' ? 'Mine' : filters.assigneeFilter}
              </span>
              <button
                type="button"
                className="inline-flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                className="inline-flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                className="inline-flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => onFilterChange('dueDateFilter', 'all')}
                aria-label="Clear due date filter"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.invoiceFilter !== 'all' && (
            <Badge variant="secondary" className="flex max-w-full items-center gap-1">
              <span
                className="truncate"
                title={`Invoice: ${formatInvoiceFilterLabel(filters.invoiceFilter)}`}
              >
                Invoice: {formatInvoiceFilterLabel(filters.invoiceFilter)}
              </span>
              <button
                type="button"
                className="inline-flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => onFilterChange('invoiceFilter', 'all')}
                aria-label="Clear invoice filter"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={onClearFilters}>
            Clear all
          </Button>
        </div>
      )}
    </div>
  );
};

export default MobileWorkOrderToolbar;
