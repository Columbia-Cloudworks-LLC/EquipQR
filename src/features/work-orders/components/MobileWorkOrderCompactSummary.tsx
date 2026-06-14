import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, AlertTriangle, ChevronRight, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  formatPriority,
  formatStatus,
  getPriorityTextColor,
  getWorkOrderStatusTextColor,
  isOverdue as checkIsOverdue,
} from '@/features/work-orders/utils/workOrderHelpers';
import { useFormatTimestamp } from '@/hooks/useFormatTimestamp';
import InlineEditField from '@/features/equipment/components/InlineEditField';
import {
  mobileInlineEditRowClassName,
  mobileInlineEditValueClassName,
} from '@/features/equipment/components/inlineEditStyles';
import { InlineEditWorkOrderAssignee } from '@/features/work-orders/components/InlineEditWorkOrderAssignee';
import { useWorkOrderInlineFieldSave } from '@/features/work-orders/hooks/useWorkOrderInlineFieldSave';
import type { WorkOrderStatus } from '@/features/work-orders/types/workOrder';

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

export interface MobileWorkOrderCompactSummaryProps {
  workOrder: {
    id: string;
    status: WorkOrderStatus;
    priority: 'low' | 'medium' | 'high';
    due_date?: string;
    assignee_id?: string | null;
    updated_at?: string | null;
    equipment_id?: string;
    organization_id?: string;
    equipmentTeamId?: string | null;
  };
  assignee?: { name: string } | null;
  organizationId: string;
  canEditFields?: boolean;
  canEditAssignment?: boolean;
  canChangeStatus?: boolean;
  onStatusPress?: () => void;
}

export const MobileWorkOrderCompactSummary: React.FC<MobileWorkOrderCompactSummaryProps> = ({
  workOrder,
  assignee,
  organizationId,
  canEditFields = false,
  canEditAssignment = false,
  canChangeStatus = false,
  onStatusPress,
}) => {
  const { formatDate } = useFormatTimestamp();
  const { saveField } = useWorkOrderInlineFieldSave(workOrder.id, workOrder.updated_at);
  const dueDate = workOrder.due_date;
  const overdue = !!(dueDate && checkIsOverdue(dueDate, workOrder.status));
  const dueSoon =
    !!(dueDate && !overdue && (() => {
      const due = new Date(dueDate);
      const hoursUntilDue = (due.getTime() - Date.now()) / (1000 * 60 * 60);
      return hoursUntilDue > 0 && hoursUntilDue < 24;
    })());
  const statusPressEnabled = Boolean(canChangeStatus && onStatusPress);

  const priorityDisplayNode = (
    <span className="inline-flex min-w-0 flex-wrap items-center gap-2 text-base">
      <span className="font-medium text-foreground">Priority</span>
      <span className={cn('font-semibold capitalize', getPriorityTextColor(workOrder.priority))}>
        {formatPriority(workOrder.priority)}
      </span>
    </span>
  );

  const dueDateDisplayNode = dueDate ? (
    <span
      className={cn(
        'inline-flex min-w-0 flex-wrap items-center gap-2 text-base',
        overdue && 'text-destructive',
        dueSoon && !overdue && 'text-warning',
      )}
      aria-live="polite"
    >
      {overdue ? (
        <AlertCircle className="h-5 w-5 shrink-0" aria-hidden />
      ) : dueSoon ? (
        <AlertTriangle className="h-5 w-5 shrink-0 text-warning" aria-hidden />
      ) : (
        <Clock className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
      )}
      <span className="font-medium text-foreground">Due date</span>
      <span className="truncate font-semibold">{formatDate(dueDate)}</span>
      {overdue ? <span className="text-sm font-semibold">(Overdue)</span> : null}
      {dueSoon && !overdue ? <span className="text-sm font-semibold">(Due soon)</span> : null}
    </span>
  ) : (
    <span className="inline-flex min-w-0 items-center gap-2 text-base text-muted-foreground">
      <Clock className="h-5 w-5 shrink-0" aria-hidden />
      <span className="font-medium text-foreground">Due date</span>
      <span>Set due date</span>
    </span>
  );

  const dueDateReadOnlyNode = dueDate ? (
    <div
      className={cn(
        mobileInlineEditRowClassName,
        overdue && 'text-destructive',
        dueSoon && !overdue && 'text-warning',
      )}
      aria-live="polite"
    >
      <div className={cn('flex min-w-0 flex-wrap items-center gap-2 text-base', mobileInlineEditValueClassName)}>
        {overdue ? (
          <AlertCircle className="h-5 w-5 shrink-0" aria-hidden />
        ) : dueSoon ? (
          <AlertTriangle className="h-5 w-5 shrink-0 text-warning" aria-hidden />
        ) : (
          <Clock className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
        )}
        <span className="font-medium text-foreground">Due date</span>
        <span className="truncate font-semibold">{formatDate(dueDate)}</span>
        {overdue ? <span className="text-sm font-semibold">(Overdue)</span> : null}
        {dueSoon && !overdue ? <span className="text-sm font-semibold">(Due soon)</span> : null}
      </div>
    </div>
  ) : null;

  const statusValue = (
    <span className={cn('font-semibold', getWorkOrderStatusTextColor(workOrder.status))}>
      {formatStatus(workOrder.status)}
    </span>
  );

  const statusRowContent = (
    <div className={cn('flex min-w-0 items-center gap-2 text-base', mobileInlineEditValueClassName)}>
      <span className="font-medium text-foreground">Status</span>
      {statusValue}
      {statusPressEnabled ? (
        <ChevronRight className="ml-auto h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
      ) : null}
    </div>
  );

  return (
    <Card className="border-border/80 shadow-elevation-2 lg:hidden">
      <CardContent className="space-y-3 p-4">
        {statusPressEnabled ? (
          <button
            type="button"
            className={cn(
              mobileInlineEditRowClassName,
              'w-full touch-manipulation text-left',
              'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
            )}
            onClick={onStatusPress}
            aria-label={`Status: ${formatStatus(workOrder.status)}. Change status`}
          >
            {statusRowContent}
          </button>
        ) : (
          <div className={mobileInlineEditRowClassName} aria-label={`Status: ${formatStatus(workOrder.status)}`}>
            {statusRowContent}
          </div>
        )}

        {canEditFields ? (
          <InlineEditField
            value={workOrder.priority}
            onSave={async (value) => {
              await saveField('priority', value as 'low' | 'medium' | 'high');
            }}
            canEdit={canEditFields}
            type="select"
            selectOptions={PRIORITY_OPTIONS}
            className="w-full"
            editAriaLabel="Edit priority"
            displayNode={priorityDisplayNode}
          />
        ) : (
          <div className={mobileInlineEditRowClassName}>
            <div className={cn('flex min-w-0 items-center gap-2 text-base', mobileInlineEditValueClassName)}>
              {priorityDisplayNode}
            </div>
          </div>
        )}

        {(dueDate || canEditFields) &&
          (canEditFields ? (
            <InlineEditField
              value={dueDate ?? ''}
              onSave={async (value) => {
                await saveField('dueDate', value || undefined);
              }}
              canEdit={canEditFields}
              type="date"
              className="w-full"
              editAriaLabel="Edit due date"
              displayNode={dueDateDisplayNode}
            />
          ) : (
            dueDateReadOnlyNode
          ))}

        {(assignee || canEditAssignment) && (
          <div className="space-y-1.5 text-base">
            {canEditAssignment ? (
              <InlineEditWorkOrderAssignee
                workOrder={{
                  id: workOrder.id,
                  organization_id: organizationId,
                  equipment_id: workOrder.equipment_id,
                  equipmentTeamId: workOrder.equipmentTeamId,
                  assignee_id: workOrder.assignee_id,
                  assigneeName: assignee?.name ?? null,
                  status: workOrder.status,
                }}
                organizationId={organizationId}
                canEdit={canEditAssignment}
              />
            ) : assignee ? (
              <div className="text-muted-foreground">
                <span className="sr-only">Assignee:</span>
                <span className="font-medium text-foreground">Assigned to</span>{' '}
                <span className="text-base">{assignee.name}</span>
              </div>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
