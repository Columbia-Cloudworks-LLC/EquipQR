// fallow-ignore-file code-duplication
// Duplication rationale: Filter selects share historical field wiring
import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type WorkOrderFilterSelectFieldProps = {
  value: string;
  onValueChange: (value: string) => void;
  triggerId?: string;
  ariaLabel: string;
  placeholder: string;
  allLabel: string;
  children: React.ReactNode;
  triggerClassName?: string;
};

function WorkOrderFilterSelectField({
  value,
  onValueChange,
  triggerId,
  ariaLabel,
  placeholder,
  allLabel,
  children,
  triggerClassName,
}: WorkOrderFilterSelectFieldProps) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger id={triggerId} className={triggerClassName} aria-label={ariaLabel}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{allLabel}</SelectItem>
        {children}
      </SelectContent>
    </Select>
  );
}

export function WorkOrderStatusFilterSelect({
  value,
  onValueChange,
  triggerId,
  ariaLabel = 'Filter by status',
  placeholder = 'All statuses',
  allLabel = 'All Statuses',
}: {
  value: string;
  onValueChange: (value: string) => void;
  triggerId?: string;
  ariaLabel?: string;
  placeholder?: string;
  allLabel?: string;
}) {
  return (
    <WorkOrderFilterSelectField
      value={value}
      onValueChange={onValueChange}
      triggerId={triggerId}
      ariaLabel={ariaLabel}
      placeholder={placeholder}
      allLabel={allLabel}
    >
      <SelectItem value="submitted">Submitted</SelectItem>
      <SelectItem value="accepted">Accepted</SelectItem>
      <SelectItem value="assigned">Assigned</SelectItem>
      <SelectItem value="in_progress">In Progress</SelectItem>
      <SelectItem value="on_hold">On Hold</SelectItem>
      <SelectItem value="completed">Completed</SelectItem>
      <SelectItem value="cancelled">Cancelled</SelectItem>
    </WorkOrderFilterSelectField>
  );
}

export function WorkOrderPriorityFilterSelect({
  value,
  onValueChange,
  triggerId,
  ariaLabel = 'Filter by priority',
  placeholder = 'All priorities',
  allLabel = 'All Priorities',
}: {
  value: string;
  onValueChange: (value: string) => void;
  triggerId?: string;
  ariaLabel?: string;
  placeholder?: string;
  allLabel?: string;
}) {
  return (
    <WorkOrderFilterSelectField
      value={value}
      onValueChange={onValueChange}
      triggerId={triggerId}
      ariaLabel={ariaLabel}
      placeholder={placeholder}
      allLabel={allLabel}
    >
      <SelectItem value="high">High</SelectItem>
      <SelectItem value="medium">Medium</SelectItem>
      <SelectItem value="low">Low</SelectItem>
    </WorkOrderFilterSelectField>
  );
}

export function WorkOrderDueDateFilterSelect({
  value,
  onValueChange,
  triggerId,
  ariaLabel = 'Filter by due date',
  placeholder = 'All dates',
  allLabel = 'All Dates',
}: {
  value: string;
  onValueChange: (value: string) => void;
  triggerId?: string;
  ariaLabel?: string;
  placeholder?: string;
  allLabel?: string;
}) {
  return (
    <WorkOrderFilterSelectField
      value={value}
      onValueChange={onValueChange}
      triggerId={triggerId}
      ariaLabel={ariaLabel}
      placeholder={placeholder}
      allLabel={allLabel}
    >
      <SelectItem value="overdue">Overdue</SelectItem>
      <SelectItem value="today">Due Today</SelectItem>
      <SelectItem value="this_week">This Week</SelectItem>
    </WorkOrderFilterSelectField>
  );
}

export function WorkOrderInvoiceFilterSelect({
  value,
  onValueChange,
  triggerId,
  ariaLabel = 'Filter by invoice status',
  placeholder = 'All invoices',
  allLabel = 'All Invoices',
}: {
  value: string;
  onValueChange: (value: string) => void;
  triggerId?: string;
  ariaLabel?: string;
  placeholder?: string;
  allLabel?: string;
}) {
  return (
    <WorkOrderFilterSelectField
      value={value}
      onValueChange={onValueChange}
      triggerId={triggerId}
      ariaLabel={ariaLabel}
      placeholder={placeholder}
      allLabel={allLabel}
    >
      <SelectItem value="paid">Paid</SelectItem>
      <SelectItem value="unpaid">Unpaid</SelectItem>
      <SelectItem value="overdue">Overdue</SelectItem>
      <SelectItem value="not_exported">Not Exported</SelectItem>
    </WorkOrderFilterSelectField>
  );
}
