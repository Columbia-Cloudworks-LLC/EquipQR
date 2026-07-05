import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
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

function resizeTextarea(element: HTMLTextAreaElement) {
  element.style.height = 'auto';
  element.style.height = `${element.scrollHeight}px`;
}

type AutoGrowReasonTextareaProps = {
  id: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
};

function AutoGrowReasonTextarea({ id, value, onChange, placeholder }: AutoGrowReasonTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      resizeTextarea(textareaRef.current);
    }
  }, [value]);

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      resizeTextarea(event.target);
      onChange(event);
    },
    [onChange],
  );

  return (
    <Textarea
      ref={textareaRef}
      id={id}
      value={value}
      onChange={handleChange}
      rows={2}
      className="min-h-0 resize-none overflow-hidden"
      placeholder={placeholder}
    />
  );
}

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
    updateRows([...rows, createEmptyTimelineRow()]);
  };

  const handleRemoveRow = (rowIndex: number) => {
    if (rowIndex === 0) {
      return;
    }
    updateRows(rows.filter((_, index) => index !== rowIndex));
  };

  return (
    <div className="space-y-3">
      <p className="text-xs leading-snug text-muted-foreground">
        Build the operational timeline with backdated status events. Changing an earlier status clears later events so the chain stays valid.
      </p>

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
              <div className="flex w-7 shrink-0 flex-col items-center pt-1">
                <span
                  aria-label={`Timeline step ${rowIndex + 1}`}
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-muted text-xs font-semibold text-foreground"
                >
                  {rowIndex + 1}
                </span>
                {!isLastRow ? (
                  <span
                    aria-hidden="true"
                    className="mt-1 w-px flex-1 min-h-4 bg-border"
                  />
                ) : null}
              </div>

              <div className="min-w-0 flex-1 space-y-2 rounded-md border border-border/80 bg-card/40 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p id={eventHeadingId} className="text-sm font-medium">
                    Event {rowIndex + 1}
                  </p>
                  {!isFirstRow ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 shrink-0"
                      onClick={() => handleRemoveRow(rowIndex)}
                      aria-label={`Remove timeline event ${rowIndex + 1}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  ) : null}
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor={statusFieldId} className="text-xs">
                      Status
                    </Label>
                    <Select
                      value={row.newStatus || undefined}
                      onValueChange={(value) => handleStatusChange(rowIndex, value as WorkOrderStatus)}
                      disabled={isFirstRow}
                    >
                      <SelectTrigger id={statusFieldId} className="h-9">
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

                  <div className="space-y-1.5">
                    <Label className="text-xs">Event date and time</Label>
                    <DateTimePicker
                      date={row.changedAt}
                      onDateChange={(date) => {
                        const nextRows = rows.map((currentRow, index) =>
                          index === rowIndex ? { ...currentRow, changedAt: date } : currentRow,
                        );
                        updateRows(nextRows);
                      }}
                      placeholder="Pick event date and time"
                    />
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

                <div className="space-y-1.5">
                  <Label htmlFor={`historical-timeline-reason-${row.id}`} className="text-xs">
                    Reason
                  </Label>
                  <AutoGrowReasonTextarea
                    id={`historical-timeline-reason-${row.id}`}
                    value={row.reason}
                    onChange={(event) => {
                      const nextRows = rows.map((currentRow, index) =>
                        index === rowIndex ? { ...currentRow, reason: event.target.value } : currentRow,
                      );
                      updateRows(nextRows);
                    }}
                    placeholder="Optional note about this status change"
                  />
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      {canAddRow ? (
        <Button type="button" variant="outline" size="sm" onClick={handleAddRow}>
          <Plus className="mr-2 h-4 w-4" />
          Add historical event
        </Button>
      ) : endsAtTerminalStatus ? (
        <div
          role="status"
          aria-label="Timeline ended at terminal status"
          className="rounded-md border border-dashed border-border/80 bg-muted/30 px-3 py-2 text-xs text-muted-foreground"
        >
          Timeline ends at{' '}
          <span className="font-medium text-foreground">
            {formatStatus(lastFilledStatus as WorkOrderStatus)}
          </span>
          . Remove or change the final event to add another historical status.
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
