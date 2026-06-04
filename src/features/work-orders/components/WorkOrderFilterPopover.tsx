import React from 'react';
import { X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FilterPopoverClearAllFooter } from '@/components/filters/FilterPopoverClearAllFooter';
import { FilterPopoverShell } from '@/components/filters/FilterPopoverShell';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { WorkOrderFilters } from '@/features/work-orders/types/workOrder';
import type { QuickFilterPreset } from '@/features/work-orders/hooks/useWorkOrderFilters';

const quickFilters: { label: string; value: QuickFilterPreset; tooltip: string }[] = [
  { label: 'My Work', value: 'my-work', tooltip: 'Filter to work orders assigned to you' },
  { label: 'Urgent', value: 'urgent', tooltip: 'Filter to high-priority work orders' },
  { label: 'Overdue', value: 'overdue', tooltip: 'Filter to work orders past their due date' },
  { label: 'Unassigned', value: 'unassigned', tooltip: 'Filter to unassigned work orders' },
];

interface WorkOrderFilterPopoverProps {
  filters: WorkOrderFilters;
  activeFilterCount: number;
  activePresets: Set<QuickFilterPreset>;
  onFilterChange: (key: keyof WorkOrderFilters, value: string) => void;
  onClearFilters: () => void;
  onQuickFilter: (preset: QuickFilterPreset) => void;
}

const WorkOrderFilterPopover: React.FC<WorkOrderFilterPopoverProps> = ({
  filters,
  activeFilterCount,
  activePresets,
  onFilterChange,
  onClearFilters,
  onQuickFilter,
}) => {
  return (
    <FilterPopoverShell ariaSubject="work orders" activeFilterCount={activeFilterCount}>
      {({ close }) => (
        <>
          {/* Status */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">Status</label>
            <Select
              value={filters.statusFilter}
              onValueChange={(v) => onFilterChange('statusFilter', v)}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
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

          {/* Assignee */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">Assignee</label>
            <Select
              value={filters.assigneeFilter}
              onValueChange={(v) => onFilterChange('assigneeFilter', v)}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="All assignees" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Assignees</SelectItem>
                <SelectItem value="mine">My Work Orders</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Priority */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">Priority</label>
            <Select
              value={filters.priorityFilter}
              onValueChange={(v) => onFilterChange('priorityFilter', v)}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="All priorities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Due Date */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">Due Date</label>
            <Select
              value={filters.dueDateFilter}
              onValueChange={(v) => onFilterChange('dueDateFilter', v)}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="All dates" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Dates</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="today">Due Today</SelectItem>
                <SelectItem value="this_week">This Week</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Invoice */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">Invoice</label>
            <Select
              value={filters.invoiceFilter}
              onValueChange={(v) => onFilterChange('invoiceFilter', v)}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="All invoices" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Invoices</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="unpaid">Unpaid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="not_exported">Not Exported</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Quick filters */}
          <div className="flex flex-col gap-1.5">
            <p className="text-xs text-muted-foreground">Quick filters</p>
            <div className="flex flex-wrap gap-1.5">
              {quickFilters.map((preset) => {
                const isActive = activePresets.has(preset.value);
                return (
                  <Tooltip key={preset.value}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => onQuickFilter(preset.value)}
                        className={cn(
                          'inline-flex h-6 items-center gap-1 rounded-full border px-2.5 text-[11px] font-medium transition-colors',
                          isActive
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground',
                        )}
                      >
                        {isActive && <Check className="h-3 w-3" />}
                        {preset.label}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>{preset.tooltip}</TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </div>

          <FilterPopoverClearAllFooter
            activeFilterCount={activeFilterCount}
            onClearFilters={onClearFilters}
            onClose={close}
          />
        </>
      )}
    </FilterPopoverShell>
  );
};

export default WorkOrderFilterPopover;
