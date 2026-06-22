// fallow-ignore-file code-duplication
// Duplication rationale: Mobile toolbar mirrors desktop filter field wiring
import React from 'react';
import { Search, Filter, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { MobileListPersonalizationSheet } from '@/components/common/MobileListPersonalizationSheet';
import { MobileToolbarSheetContent } from '@/components/common/MobileToolbarSheetContent';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ListSortFieldControls } from '@/components/common/ListSortFieldControls';
import type { WorkOrderFilters as FiltersType } from '@/features/work-orders/types/workOrder';
import type { QuickFilterPreset, SortField, SortDirection } from '@/features/work-orders/hooks/useWorkOrderFilters';
import type { WorkOrderFiltersToolbarProps } from '@/features/work-orders/types/workOrderFiltersToolbarTypes';
import {
  WORK_ORDER_QUICK_FILTER_PRESETS,
  WORK_ORDER_SORT_FIELD_OPTIONS,
  getWorkOrderSortFieldDefaultOrder,
} from '@/features/work-orders/constants/workOrderSortOptions';
import {
  WorkOrderStatusFilterSelect,
  WorkOrderPriorityFilterSelect,
  WorkOrderDueDateFilterSelect,
  WorkOrderInvoiceFilterSelect,
} from '@/features/work-orders/components/WorkOrderFilterSelectFields';
import { formatInvoiceFilterLabel } from '@/features/work-orders/utils/invoiceFilterLabels';

export type MobileWorkOrderToolbarProps = Omit<
  WorkOrderFiltersToolbarProps,
  'resultCount' | 'totalCount'
>;

const DEFAULT_SORT_FIELD: SortField = 'created';
const DEFAULT_SORT_DIRECTION: SortDirection = 'desc';

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
}) => {
  const mobileSearchInputId = 'work-order-search-mobile';
  const mobileStatusFilterId = 'work-order-status-filter-mobile';
  const mobileAssigneeFilterId = 'work-order-assignee-filter-mobile';
  const mobilePriorityFilterId = 'work-order-priority-filter-mobile';
  const mobileDueDateFilterId = 'work-order-due-date-filter-mobile';
  const mobileInvoiceFilterId = 'work-order-invoice-filter-mobile';

  const [isPersonalizationOpen, setIsPersonalizationOpen] = React.useState(false);

  const hasNonDefaultSort =
    sortField !== DEFAULT_SORT_FIELD || sortDirection !== DEFAULT_SORT_DIRECTION;

  const handleFilterSheetOpenChange = (open: boolean) => {
    onShowMobileFiltersChange(open);
  };

  const handleSortFieldChange = (field: string) => {
    if (sortField === field) {
      onSortChange(field as SortField, sortDirection === 'asc' ? 'desc' : 'asc');
      return;
    }
    onSortChange(field as SortField, getWorkOrderSortFieldDefaultOrder(field));
  };

  const toggleSortOrder = () => {
    onSortChange(sortField, sortDirection === 'asc' ? 'desc' : 'asc');
  };

  return (
    <div className="space-y-2.5">
      {/* Search + Personalization + Filters */}
      <div className="flex items-center gap-2">
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

        <MobileListPersonalizationSheet
          open={isPersonalizationOpen}
          onOpenChange={setIsPersonalizationOpen}
          hasNonDefaultSort={hasNonDefaultSort}
          description="Change how work orders are sorted on this device."
        >
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Sort by
            </p>
            <ListSortFieldControls
              sortField={sortField}
              sortOrder={sortDirection}
              options={WORK_ORDER_SORT_FIELD_OPTIONS}
              onFieldChange={handleSortFieldChange}
              onOrderToggle={toggleSortOrder}
              fieldSelectAriaLabel="Sort work orders by field"
            />
          </div>
        </MobileListPersonalizationSheet>

        <Sheet open={showMobileFilters} onOpenChange={handleFilterSheetOpenChange}>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="relative h-11 w-11 shrink-0"
              aria-label={
                activeFilterCount > 0
                  ? `Open filters, ${activeFilterCount} active`
                  : 'Open filters'
              }
            >
              <Filter className="h-4 w-4" aria-hidden />
              {activeFilterCount > 0 && (
                <Badge
                  variant="secondary"
                  className="absolute -right-1 -top-1 h-5 min-w-5 px-1 text-[10px]"
                >
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <MobileToolbarSheetContent>
            <SheetHeader className="pb-2 text-left">
              <SheetTitle>Filter work orders</SheetTitle>
              <SheetDescription>
                Narrow the list by status, assignee, priority, due date, or invoice. Team scope is
                set from the breadcrumb at the top of the screen.
              </SheetDescription>
            </SheetHeader>
            <div className="space-y-6 pb-8 pt-2">
              <div className="space-y-3">
                <h3 className="text-sm font-medium">Quick filters</h3>
                <div className="flex flex-wrap gap-2">
                  {WORK_ORDER_QUICK_FILTER_PRESETS.map((preset) => {
                    const isActive = activePresets.has(preset.value);
                    return (
                      <Button
                        key={preset.value}
                        size="sm"
                        variant={isActive ? 'default' : 'outline'}
                        className="min-h-11 whitespace-nowrap"
                        onClick={() => onQuickFilter(preset.value)}
                      >
                        {isActive && <Check className="mr-1 h-3 w-3" aria-hidden />}
                        {preset.label}
                      </Button>
                    );
                  })}
                </div>
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
                disabled={activeFilterCount === 0}
                onClick={onClearFilters}
              >
                Clear all filters
              </Button>
            </div>
          </MobileToolbarSheetContent>
        </Sheet>
      </div>

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
