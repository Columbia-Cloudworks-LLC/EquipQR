import { useState } from 'react';
import { Link } from 'react-router-dom';
import { DateTimePicker } from '@/components/ui/datetime-picker';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  dueDateTimeInputWrite,
  dueDayInputValue,
  dueDayInputWrite,
  formatDueDisplay,
  parseDue,
  type DueWrite,
} from '@/features/work-orders/calendar/dueDate';
import type { CalendarEditability } from '@/features/work-orders/calendar/editability';
import { useFormatTimestamp } from '@/hooks/useFormatTimestamp';
import type { MergedWorkOrder } from '@/features/work-orders/types/offlineMergedWorkOrder';
import {
  formatPriority,
  formatStatus,
  getPriorityColor,
  getStatusColor,
} from '@/features/work-orders/utils/workOrderHelpers';

export type WorkOrderCalendarPanelProps = {
  workOrder: MergedWorkOrder;
  editability: CalendarEditability;
  onClose: () => void;
  onDueWrite: (write: DueWrite) => void;
};

export function WorkOrderCalendarPanel({
  workOrder,
  editability,
  onClose,
  onDueWrite,
}: WorkOrderCalendarPanelProps) {
  const { formatDate, formatDateTime } = useFormatTimestamp();
  const due = parseDue(workOrder);
  const editable = editability.kind === 'editable';
  const [showTime, setShowTime] = useState(due.kind === 'timed');
  const teamName = workOrder.teamName ?? workOrder.team?.name ?? '—';
  const equipmentName = workOrder.equipmentName ?? workOrder.equipment?.name ?? '—';
  const assigneeName = workOrder.assigneeName ?? workOrder.assignee_name ?? 'Unassigned';

  return (
    <Sheet key={workOrder.id} open onOpenChange={(open) => { if (!open) onClose(); }}>
        <SheetContent
          side="right"
          className="flex flex-col gap-6 overflow-y-auto"
          data-testid="work-order-calendar-panel"
        >
        <SheetHeader>
          <SheetTitle>{workOrder.title}</SheetTitle>
          <SheetDescription>Work order overview</SheetDescription>
        </SheetHeader>

        <div className="flex flex-wrap gap-2">
          <Badge className={getStatusColor(workOrder.status)}>{formatStatus(workOrder.status)}</Badge>
          <Badge className={getPriorityColor(workOrder.priority)}>{formatPriority(workOrder.priority)}</Badge>
        </div>

        <div className="space-y-2">
          <Label htmlFor="calendar-panel-due-date">Due date</Label>
          {editable ? (
            <>
              <Input
                id="calendar-panel-due-date"
                type="date"
                value={dueDayInputValue(due)}
                onChange={(event) => onDueWrite(dueDayInputWrite(due, event.target.value))}
              />
              {due.kind === 'timed' || showTime ? (
                <DateTimePicker
                  date={due.kind === 'timed' ? new Date(due.at.epochMs) : undefined}
                  onDateChange={(date) => onDueWrite(dueDateTimeInputWrite(
                    date ? { epochMs: date.getTime() } : null,
                  ))}
                />
              ) : (
                <Button type="button" variant="outline" size="sm" onClick={() => setShowTime(true)}>
                  Add time
                </Button>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              {due.kind === 'none'
                ? 'Unscheduled'
                : formatDueDisplay(due, { formatDay: formatDate, formatTimed: formatDateTime })}
            </p>
          )}
        </div>

        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-muted-foreground">Equipment</dt>
            <dd>{equipmentName}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Team</dt>
            <dd>{teamName}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Assignee</dt>
            <dd>{assigneeName}</dd>
          </div>
        </dl>

        <Button asChild>
          <Link to={`/dashboard/work-orders/${workOrder.id}`}>Open details</Link>
        </Button>
      </SheetContent>
    </Sheet>
  );
}
