import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { AlertCircle, AlertTriangle, ChevronRight, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  formatPriority,
  formatStatus,
  getPriorityTextColor,
  getWorkOrderStatusTextColor,
} from '@/features/work-orders/utils/workOrderHelpers';
import {
  applyDueWrite,
  dueDateTimeInputWrite,
  dueDayInputValue,
  dueDayInputWrite,
  dueTimeInputValue,
  formatDueDisplay,
  isDueOverdue,
  parseCalendarDay,
  parseDue,
  persistDue,
  todayLocal,
  type DueDate,
  type DuePersist,
} from '@/features/work-orders/calendar';
import { useFormatTimestamp } from '@/hooks/useFormatTimestamp';
import InlineEditField from '@/features/equipment/components/InlineEditField';
import {
  mobileInlineEditRowClassName,
  mobileInlineEditValueClassName,
} from '@/features/equipment/components/inlineEditStyles';
import { InlineEditWorkOrderAssignee } from '@/features/work-orders/components/InlineEditWorkOrderAssignee';
import { WorkOrderDueTimePicker } from '@/features/work-orders/components/WorkOrderDueTimePicker';
import { useWorkOrderInlineFieldSave } from '@/features/work-orders/hooks/useWorkOrderInlineFieldSave';
import QuickBooksInvoiceStatusBadge from '@/features/work-orders/components/QuickBooksInvoiceStatusBadge';
import type { QuickBooksInvoiceStatus, WorkOrderStatus } from '@/features/work-orders/types/workOrder';

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

interface MobileDueDateStatusContentProps {
  formattedDueDate: string;
  overdue: boolean;
  dueSoon: boolean;
}

function MobileDueDateStatusContent({
  formattedDueDate,
  overdue,
  dueSoon,
}: MobileDueDateStatusContentProps) {
  return (
    <>
      {overdue ? (
        <AlertCircle className="h-5 w-5 shrink-0" aria-hidden />
      ) : dueSoon ? (
        <AlertTriangle className="h-5 w-5 shrink-0 text-warning" aria-hidden />
      ) : (
        <Clock className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
      )}
      <span className="font-medium text-foreground">Due date</span>
      <span className="truncate font-semibold">{formattedDueDate}</span>
      {overdue ? <span className="text-sm font-semibold">(Overdue)</span> : null}
      {dueSoon && !overdue ? <span className="text-sm font-semibold">(Due soon)</span> : null}
    </>
  );
}

export interface MobileWorkOrderCompactSummaryProps {
  workOrder: {
    id: string;
    status: WorkOrderStatus;
    priority: 'low' | 'medium' | 'high';
    due_date?: string;
    due_date_has_time?: boolean;
    assignee_id?: string | null;
    updated_at?: string | null;
    equipment_id?: string;
    organization_id?: string;
    equipmentTeamId?: string | null;
    invoice_status?: QuickBooksInvoiceStatus | null;
    quickbooks_invoice_number?: string | null;
    invoice_balance_cents?: number | null;
    invoice_paid_at?: string | null;
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
  const { formatDate, formatDateTime } = useFormatTimestamp();
  const { saveField, savePatch } = useWorkOrderInlineFieldSave(workOrder.id, workOrder.updated_at);
  const serverDue = React.useMemo(
    () =>
      parseDue({
        dueDate: workOrder.due_date,
        dueDateHasTime: workOrder.due_date_has_time ?? false,
      }),
    [workOrder.due_date, workOrder.due_date_has_time],
  );
  const [draftDue, setDraftDue] = React.useState<DueDate>(serverDue);
  const draftDueRef = React.useRef<DueDate>(serverDue);
  const serverDueRef = React.useRef<DueDate>(serverDue);
  serverDueRef.current = serverDue;
  const queuedPersistRef = React.useRef<DuePersist | null>(null);
  const inFlightSavePromiseRef = React.useRef<Promise<void> | null>(null);

  React.useEffect(() => {
    queuedPersistRef.current = null;
    inFlightSavePromiseRef.current = null;
    draftDueRef.current = serverDueRef.current;
    setDraftDue(serverDueRef.current);
  }, [workOrder.id]);

  React.useEffect(() => {
    if (inFlightSavePromiseRef.current || queuedPersistRef.current !== null) {
      return;
    }
    draftDueRef.current = serverDue;
    setDraftDue(serverDue);
  }, [serverDue]);

  const due = draftDue;
  const dueDate = due.kind !== 'none';
  const overdue = isDueOverdue(due, workOrder.status);
  const dueSoon =
    !overdue &&
    due.kind === 'timed' &&
    (() => {
      const hoursUntilDue = (due.at.epochMs - Date.now()) / (1000 * 60 * 60);
      return hoursUntilDue > 0 && hoursUntilDue < 24;
    })();
  const statusPressEnabled = Boolean(canChangeStatus && onStatusPress);
  const formattedDueDate = formatDueDisplay(due, {
    formatDay: formatDate,
    formatTimed: formatDateTime,
  });

  const persistDueWrite = async (write: Parameters<typeof applyDueWrite>[1]) => {
    const nextDue = applyDueWrite(draftDueRef.current, write);
    draftDueRef.current = nextDue;
    setDraftDue(nextDue);
    queuedPersistRef.current = persistDue(nextDue);

    if (inFlightSavePromiseRef.current) {
      return inFlightSavePromiseRef.current;
    }

    const flushPromise = (async () => {
      try {
        while (queuedPersistRef.current !== null) {
          const nextPatch = queuedPersistRef.current;
          queuedPersistRef.current = null;
          await savePatch({
            dueDate: nextPatch.dueDate ?? '',
            dueDateHasTime: nextPatch.dueDateHasTime,
          });
        }
      } catch (error) {
        queuedPersistRef.current = null;
        draftDueRef.current = serverDueRef.current;
        setDraftDue(serverDueRef.current);
        throw error;
      } finally {
        inFlightSavePromiseRef.current = null;
      }
    })();

    inFlightSavePromiseRef.current = flushPromise;
    return flushPromise;
  };

  const handleDueTimeChange = async (raw: string) => {
    if (raw === '') {
      await persistDueWrite(dueDateTimeInputWrite(null));
      return;
    }

    const currentDue = draftDueRef.current;
    const day = parseCalendarDay(dueDayInputValue(currentDue)) ?? todayLocal();

    const [hours, minutes] = raw.split(':').map(Number);
    await persistDueWrite(dueDateTimeInputWrite({
      epochMs: new Date(day.y, day.m - 1, day.d, hours, minutes, 0, 0).getTime(),
    }));
  };

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
      <MobileDueDateStatusContent
        formattedDueDate={formattedDueDate}
        overdue={overdue}
        dueSoon={dueSoon}
      />
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
        <MobileDueDateStatusContent
          formattedDueDate={formattedDueDate}
          overdue={overdue}
          dueSoon={dueSoon}
        />
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

        {workOrder.invoice_status ? (
          <div className={mobileInlineEditRowClassName}>
            <div
              className={cn(
                'flex min-w-0 flex-wrap items-start gap-2 text-base',
                mobileInlineEditValueClassName,
              )}
            >
              <span className="shrink-0 font-medium text-foreground">Invoice</span>
              <QuickBooksInvoiceStatusBadge
                status={workOrder.invoice_status}
                invoiceNumber={workOrder.quickbooks_invoice_number}
                balanceCents={workOrder.invoice_balance_cents}
                paidAt={workOrder.invoice_paid_at}
                className="min-w-0 max-w-full whitespace-normal text-left leading-4 [overflow-wrap:anywhere]"
              />
            </div>
          </div>
        ) : null}

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
            <div className="space-y-2">
              <InlineEditField
                value={dueDayInputValue(due)}
                onSave={async (value) => {
                  await persistDueWrite(dueDayInputWrite(draftDueRef.current, value));
                }}
                canEdit={canEditFields}
                type="date"
                className="w-full"
                editAriaLabel="Edit due date"
                displayNode={dueDateDisplayNode}
              />
              <div className="space-y-1.5">
                <Label htmlFor="mobile-work-order-due-time-hour">Due time</Label>
                <WorkOrderDueTimePicker
                  idPrefix="mobile-work-order-due-time"
                  value={dueTimeInputValue(due)}
                  onChange={(nextValue) => {
                    void handleDueTimeChange(nextValue);
                  }}
                />
              </div>
            </div>
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
