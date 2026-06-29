import React, { useEffect, useMemo, useState } from 'react';
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
  getSelectableStatusesForRow,
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
};

export function HistoricalTimelineEditor({
  initialEvents,
  startDate,
  organizationId,
  equipmentId,
  onChange,
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

  const updateRows = (nextRows: HistoricalTimelineEditorRow[]) => {
    setRows(nextRows);
    onChange?.(rowsToTimelineEvents(nextRows));
  };

  const handleStatusChange = (rowIndex: number, status: WorkOrderStatus) => {
    updateRows(updateTimelineRowStatus(rows, rowIndex, status));
  };

  const handleAddRow = () => {
    if (!canAddTimelineRow(rows)) {
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
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Build the operational timeline with backdated status events. Changing an earlier status clears later events so the chain stays valid.
      </p>

      {rows.map((row, rowIndex) => {
        const selectableStatuses = getSelectableStatusesForRow(rows, rowIndex);
        const statusFieldId = `historical-timeline-status-${row.id}`;
        const assigneeFieldId = `historical-timeline-assignee-${row.id}`;
        const isFirstRow = rowIndex === 0;

        return (
          <div key={row.id} className="space-y-3 rounded-lg border p-4">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor={statusFieldId}>Event {rowIndex + 1}</Label>
              {!isFirstRow ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveRow(rowIndex)}
                  aria-label={`Remove timeline event ${rowIndex + 1}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              ) : null}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor={statusFieldId}>Status</Label>
                <Select
                  value={row.newStatus || undefined}
                  onValueChange={(value) => handleStatusChange(rowIndex, value as WorkOrderStatus)}
                  disabled={isFirstRow}
                >
                  <SelectTrigger id={statusFieldId}>
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

              <div className="space-y-2">
                <Label>Event date and time</Label>
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
              <div className="space-y-2">
                <Label htmlFor={assigneeFieldId}>Assignee</Label>
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
                  <SelectTrigger id={assigneeFieldId} aria-label="Select assignee for assigned event">
                    <SelectValue placeholder={assignmentLoading ? 'Loading assignees...' : 'Select assignee'} />
                  </SelectTrigger>
                  <SelectContent>
                    <WorkOrderAssigneeSelectItems options={assignmentOptions} />
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor={`historical-timeline-reason-${row.id}`}>Reason</Label>
              <Textarea
                id={`historical-timeline-reason-${row.id}`}
                value={row.reason}
                onChange={(event) => {
                  const nextRows = rows.map((currentRow, index) =>
                    index === rowIndex ? { ...currentRow, reason: event.target.value } : currentRow,
                  );
                  updateRows(nextRows);
                }}
                rows={2}
                placeholder="Optional note about this status change"
              />
            </div>
          </div>
        );
      })}

      {canAddTimelineRow(rows) ? (
        <Button type="button" variant="outline" onClick={handleAddRow}>
          <Plus className="mr-2 h-4 w-4" />
          Add next status event
        </Button>
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
