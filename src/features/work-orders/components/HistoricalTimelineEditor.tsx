import React, { useEffect, useMemo, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateTimePicker } from '@/components/ui/datetime-picker';
import { Plus, Trash2 } from 'lucide-react';
import { WorkOrderAssigneeSelectItems } from '@/features/work-orders/components/WorkOrderAssigneeSelectItems';
import { useWorkOrderContextualAssignment, type AssignmentWorkOrderContext } from '@/features/work-orders/hooks/useWorkOrderContextualAssignment';
import {
  canAddTimelineRow,
  createEmptyTimelineRow,
  createInitialTimelineRow,
  getLastFilledRowIndex,
  getSelectableStatusesForRow,
  getTimelineRowSeedDate,
  hasIncompleteTimelineRows,
  isTerminalStatus,
  rowsToTimelineEvents,
  timelineEventsToRows,
  updateTimelineRowStatus,
  validateTimelineEvents,
  type HistoricalTimelineEditorRow,
  type HistoricalTimelineEvent,
  type WorkOrderStatus,
} from '@/features/work-orders/utils/historicalTimeline';
import { formatStatus } from '@/features/work-orders/utils/workOrderHelpers';

type HistoricalTimelineEditorProps = {
  initialEvents?: HistoricalTimelineEvent[];
  startDate?: Date;
  organizationId: string;
  equipmentId?: string;
  onChange?: (events: HistoricalTimelineEvent[]) => void;
  onIncompleteRowsChange?: (hasIncompleteRows: boolean) => void;
};

export function HistoricalTimelineEditor({
  initialEvents,
  startDate,
  organizationId,
  equipmentId,
  onChange,
  onIncompleteRowsChange,
}: HistoricalTimelineEditorProps) {
  const [rows, setRows] = useState<HistoricalTimelineEditorRow[]>(() => {
    if (initialEvents && initialEvents.length > 0) {
      return timelineEventsToRows(initialEvents);
    }
    return [createInitialTimelineRow(startDate)];
  });

  useEffect(() => {
    if (initialEvents && initialEvents.length > 0) {
      setRows(timelineEventsToRows(initialEvents));
      return;
    }

    if (startDate) {
      setRows([createInitialTimelineRow(startDate)]);
    }
  }, [initialEvents, startDate]);

  useEffect(() => {
    onIncompleteRowsChange?.(hasIncompleteTimelineRows(rows));
  }, [rows, onIncompleteRowsChange]);

  const assignmentContext: AssignmentWorkOrderContext = useMemo(
    () => ({
      id: 'historical-timeline-editor',
      organization_id: organizationId,
      equipment_id: equipmentId,
      equipmentTeamId: null,
    }),
    [organizationId, equipmentId],
  );

  const { assignmentOptions, isLoading: assignmentLoading, equipmentHasNoTeam } =
    useWorkOrderContextualAssignment(assignmentContext);

  const validationErrors = useMemo(
    () => validateTimelineEvents(rowsToTimelineEvents(rows)),
    [rows],
  );

  const canAddRow = canAddTimelineRow(rows);
  const lastFilledIndex = getLastFilledRowIndex(rows);
  const lastFilledStatus =
    lastFilledIndex >= 0 ? (rows[lastFilledIndex]?.newStatus as WorkOrderStatus | '') : '';
  const endsAtTerminalStatus =
    lastFilledStatus !== '' && isTerminalStatus(lastFilledStatus as WorkOrderStatus);

  const updateRows = (nextRows: HistoricalTimelineEditorRow[]) => {
    setRows(nextRows);
    onChange?.(rowsToTimelineEvents(nextRows));
    onIncompleteRowsChange?.(hasIncompleteTimelineRows(nextRows));
  };

  const handleStatusChange = (rowIndex: number, status: WorkOrderStatus) => {
    updateRows(updateTimelineRowStatus(rows, rowIndex, status));
  };

  const handleAddRow = () => {
    if (!canAddRow) {
      return;
    }
    updateRows([...rows, createEmptyTimelineRow(getTimelineRowSeedDate(rows))]);
  };

  const handleRemoveRow = (rowIndex: number) => {
    if (rowIndex === 0) {
      return;
    }
    updateRows(rows.filter((_, index) => index !== rowIndex));
  };

  return (
    <div className="space-y-3">
      <ol
        aria-label="Operational timeline events"
        className="relative m-0 list-none space-y-2 p-0"
      >
        {rows.map((row, rowIndex) => {
          const selectableStatuses = getSelectableStatusesForRow(rows, rowIndex);
          const statusFieldId = `historical-timeline-status-${row.id}`;
          const assigneeFieldId = `historical-timeline-assignee-${row.id}`;
          const eventHeadingId = `historical-timeline-event-${row.id}`;
          const isFirstRow = rowIndex === 0;
          const isLastRow = rowIndex === rows.length - 1;

          return (
            <li key={row.id} className="relative flex gap-3" aria-labelledby={eventHeadingId}>
              <div className="flex w-7 shrink-0 flex-col items-center self-stretch pt-1">
                {isFirstRow ? (
                  <span
                    aria-label={`Timeline step ${rowIndex + 1}`}
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-muted text-xs font-semibold text-foreground"
                  >
                    {rowIndex + 1}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleRemoveRow(rowIndex)}
                    aria-label={`Remove timeline event ${rowIndex + 1}`}
                    className="group/step flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-xs font-semibold text-foreground transition-colors hover:border-destructive/50 hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    <span
                      className="group-hover/step:hidden group-focus-visible/step:hidden"
                      aria-hidden="true"
                    >
                      {rowIndex + 1}
                    </span>
                    <Trash2
                      className="hidden h-3.5 w-3.5 text-destructive group-hover/step:block group-focus-visible/step:block"
                      aria-hidden="true"
                    />
                  </button>
                )}
                {!isLastRow ? (
                  <span
                    aria-hidden="true"
                    className="mt-1 w-px flex-1 min-h-4 bg-border"
                  />
                ) : canAddRow ? (
                  <>
                    <span
                      aria-hidden="true"
                      className="mt-1 w-px flex-1 min-h-4 bg-border"
                    />
                    <button
                      type="button"
                      onClick={handleAddRow}
                      aria-label="Add event"
                      data-testid="timeline-add-event"
                      className="mt-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-success/40 bg-success/15 text-success shadow-sm transition-colors hover:border-success/60 hover:bg-success/25 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    >
                      <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </>
                ) : null}
              </div>

              <div className="min-w-0 flex-1 space-y-2 rounded-md border border-border/80 bg-card/40 p-3">
                <span id={eventHeadingId} className="sr-only">
                  Timeline event {rowIndex + 1}
                </span>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:grid-rows-[auto_minmax(2.75rem,auto)] sm:gap-x-2 sm:gap-y-1.5">
                  <div className="col-span-full flex items-center gap-2 sm:contents">
                    <Label
                      htmlFor={statusFieldId}
                      className="min-w-0 flex-1 text-xs sm:col-start-1 sm:row-start-1 sm:flex-none"
                    >
                      Status
                    </Label>
                    <Label className="hidden min-w-0 flex-1 text-xs sm:col-start-2 sm:row-start-1 sm:block sm:flex-none">
                      Event date and time
                    </Label>
                  </div>

                  <div className="min-w-0 w-full sm:col-start-1 sm:row-start-2">
                    <Select
                      value={row.newStatus || undefined}
                      onValueChange={(value) => handleStatusChange(rowIndex, value as WorkOrderStatus)}
                      disabled={isFirstRow}
                    >
                      <SelectTrigger id={statusFieldId} className="w-full">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        {selectableStatuses.map((status) => (
                          <SelectItem key={status} value={status}>
                            {formatStatus(status)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5 sm:contents">
                    <Label className="text-xs sm:col-start-2 sm:row-start-1 sm:hidden">
                      Event date and time
                    </Label>
                    <div className="min-w-0 w-full sm:col-start-2 sm:row-start-2">
                      <DateTimePicker
                        date={row.changedAt}
                        onDateChange={(date) => {
                          const nextRows = rows.map((currentRow, index) =>
                            index === rowIndex ? { ...currentRow, changedAt: date } : currentRow,
                          );
                          updateRows(nextRows);
                        }}
                        placeholder="Pick event date and time"
                        showShortcuts
                      />
                    </div>
                  </div>
                </div>

                {row.newStatus === 'assigned' ? (
                  <div className="space-y-1.5">
                    <Label htmlFor={assigneeFieldId} className="text-xs">
                      Assignee
                    </Label>
                    {equipmentHasNoTeam ? (
                      <p className="text-xs text-muted-foreground">
                        Equipment has no team. Showing organization admins.
                      </p>
                    ) : null}
                    <Select
                      value={row.assigneeId ?? undefined}
                      onValueChange={(value) => {
                        const nextRows = rows.map((currentRow, index) =>
                          index === rowIndex ? { ...currentRow, assigneeId: value } : currentRow,
                        );
                        updateRows(nextRows);
                      }}
                      disabled={assignmentLoading}
                    >
                      <SelectTrigger id={assigneeFieldId} aria-label="Select assignee for assigned event" className="h-9">
                        <SelectValue placeholder={assignmentLoading ? 'Loading assignees...' : 'Select assignee'} />
                      </SelectTrigger>
                      <SelectContent>
                        <WorkOrderAssigneeSelectItems options={assignmentOptions} />
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>

      {endsAtTerminalStatus && !canAddRow ? (
        <div className="flex gap-3">
          <div className="w-7 shrink-0" aria-hidden="true" />
          <div
            role="status"
            aria-label="Timeline ended at terminal status"
            className="min-w-0 flex-1 rounded-md border border-dashed border-border/80 bg-muted/30 px-3 py-2 text-xs text-muted-foreground"
          >
            Timeline ends at{' '}
            <span className="font-medium text-foreground">
              {formatStatus(lastFilledStatus as WorkOrderStatus)}
            </span>
            . Remove or change the final event to add another historical status.
          </div>
        </div>
      ) : null}

      {validationErrors.length > 0 ? (
        <div className="space-y-1 text-sm text-destructive">
          {validationErrors.map((error) => (
            <p key={`${error.field}-${error.message}`}>{error.message}</p>
          ))}
        </div>
      ) : null}

      {rows.some((row) => row.newStatus !== '' && isTerminalStatus(row.newStatus as WorkOrderStatus)) ? (
        <p className="text-xs text-muted-foreground">
          Terminal statuses end the timeline. Save when the final event matches the work order outcome you want to record.
        </p>
      ) : null}
    </div>
  );
}
