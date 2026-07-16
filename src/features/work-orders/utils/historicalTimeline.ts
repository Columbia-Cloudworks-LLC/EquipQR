import type { z } from 'zod';
import { workOrderStatusSchema } from '@/features/work-orders/schemas/workOrderSchema';

export type WorkOrderStatus = z.infer<typeof workOrderStatusSchema>;

export type HistoricalTimelineEvent = {
  newStatus: WorkOrderStatus;
  changedAt: string;
  assigneeId?: string | null;
};

export type HistoricalTimelineEditorRow = {
  id: string;
  newStatus: WorkOrderStatus | '';
  changedAt: Date | undefined;
  assigneeId: string | null;
};

export type HistoricalTimelineValidationError = {
  field: 'chain' | 'dates' | 'assignee';
  message: string;
};

const TERMINAL_STATUSES: WorkOrderStatus[] = ['completed', 'cancelled'];

export function isTerminalStatus(status: WorkOrderStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

export function getAllowedNextStatuses(currentStatus: WorkOrderStatus): WorkOrderStatus[] {
  switch (currentStatus) {
    case 'submitted':
      return ['accepted', 'cancelled'];
    case 'accepted':
      return ['assigned', 'cancelled'];
    case 'assigned':
      return ['in_progress', 'on_hold'];
    case 'in_progress':
      return ['on_hold', 'completed'];
    case 'on_hold':
      return ['in_progress', 'cancelled'];
    default:
      return [];
  }
}

export function createInitialTimelineRow(startDate?: Date): HistoricalTimelineEditorRow {
  return {
    id: crypto.randomUUID(),
    newStatus: 'submitted',
    changedAt: startDate,
    assigneeId: null,
  };
}

export function createEmptyTimelineRow(seedDate?: Date): HistoricalTimelineEditorRow {
  return {
    id: crypto.randomUUID(),
    newStatus: '',
    changedAt: seedDate ? new Date(seedDate.getTime()) : undefined,
    assigneeId: null,
  };
}

export function getTimelineRowSeedDate(rows: HistoricalTimelineEditorRow[]): Date | undefined {
  const previousRow = rows[rows.length - 1];
  if (previousRow?.changedAt instanceof Date && !Number.isNaN(previousRow.changedAt.getTime())) {
    return new Date(previousRow.changedAt.getTime());
  }

  const lastFilledIndex = getLastFilledRowIndex(rows);
  if (lastFilledIndex < 0) {
    return undefined;
  }

  const changedAt = rows[lastFilledIndex]?.changedAt;
  return changedAt instanceof Date && !Number.isNaN(changedAt.getTime())
    ? new Date(changedAt.getTime())
    : undefined;
}

export function getSelectableStatusesForRow(
  rows: HistoricalTimelineEditorRow[],
  rowIndex: number,
): WorkOrderStatus[] {
  if (rowIndex === 0) {
    return ['submitted'];
  }

  const previousStatus = rows[rowIndex - 1]?.newStatus;
  if (!previousStatus || previousStatus === '') {
    return [];
  }

  return getAllowedNextStatuses(previousStatus);
}

export function clearDownstreamRows(
  rows: HistoricalTimelineEditorRow[],
  fromIndex: number,
): HistoricalTimelineEditorRow[] {
  return rows.map((row, index) => {
    if (index <= fromIndex) {
      return row;
    }

    return {
      ...row,
      newStatus: '',
      changedAt: undefined,
      assigneeId: null,
    };
  });
}

export function updateTimelineRowStatus(
  rows: HistoricalTimelineEditorRow[],
  rowIndex: number,
  newStatus: WorkOrderStatus,
): HistoricalTimelineEditorRow[] {
  const updated = rows.map((row, index) => {
    if (index !== rowIndex) {
      return row;
    }

    return {
      ...row,
      newStatus,
      assigneeId: newStatus === 'assigned' ? row.assigneeId : null,
    };
  });

  return clearDownstreamRows(updated, rowIndex);
}

export function getLastFilledRowIndex(rows: HistoricalTimelineEditorRow[]): number {
  for (let index = rows.length - 1; index >= 0; index -= 1) {
    if (rows[index]?.newStatus !== '') {
      return index;
    }
  }
  return -1;
}

export function canAddTimelineRow(rows: HistoricalTimelineEditorRow[]): boolean {
  const lastFilledIndex = getLastFilledRowIndex(rows);

  if (lastFilledIndex === -1) {
    return false;
  }

  const lastStatus = rows[lastFilledIndex]?.newStatus;
  if (!lastStatus || lastStatus === '') {
    return false;
  }

  return !isTerminalStatus(lastStatus) && getAllowedNextStatuses(lastStatus).length > 0;
}

export function rowsToTimelineEvents(rows: HistoricalTimelineEditorRow[]): HistoricalTimelineEvent[] {
  return rows
    .filter((row): row is HistoricalTimelineEditorRow & { newStatus: WorkOrderStatus; changedAt: Date } =>
      row.newStatus !== '' && row.changedAt instanceof Date,
    )
    .map((row) => ({
      newStatus: row.newStatus,
      changedAt: row.changedAt.toISOString(),
      assigneeId: row.newStatus === 'assigned' ? row.assigneeId : null,
    }));
}

export function hasIncompleteTimelineRows(rows: HistoricalTimelineEditorRow[]): boolean {
  return rows.some((row) => {
    const hasStatus = row.newStatus !== '';
    const hasDate = row.changedAt instanceof Date && !Number.isNaN(row.changedAt.getTime());
    return !hasStatus || !hasDate;
  });
}

export function timelineEventsToRows(events: HistoricalTimelineEvent[]): HistoricalTimelineEditorRow[] {
  if (events.length === 0) {
    return [createInitialTimelineRow()];
  }

  return events.map((event) => ({
    id: crypto.randomUUID(),
    newStatus: event.newStatus,
    changedAt: new Date(event.changedAt),
    assigneeId: event.assigneeId ?? null,
  }));
}

export function validateTimelineEvents(
  events: HistoricalTimelineEvent[],
): HistoricalTimelineValidationError[] {
  const errors: HistoricalTimelineValidationError[] = [];

  if (events.length === 0) {
    errors.push({ field: 'chain', message: 'Timeline must include at least one event.' });
    return errors;
  }

  if (events[0]?.newStatus !== 'submitted') {
    errors.push({ field: 'chain', message: 'Timeline must begin with submitted.' });
  }

  let previousStatus: WorkOrderStatus | null = null;
  for (let index = 0; index < events.length; index += 1) {
    const event = events[index];
    const allowed = previousStatus === null
      ? (['submitted'] as WorkOrderStatus[])
      : getAllowedNextStatuses(previousStatus);

    if (!allowed.includes(event.newStatus)) {
      errors.push({
        field: 'chain',
        message: `Invalid transition from ${previousStatus ?? 'created'} to ${event.newStatus}.`,
      });
    }

    if (event.newStatus === 'assigned' && !event.assigneeId) {
      errors.push({
        field: 'assignee',
        message: 'Assigned events require an assignee.',
      });
    }

    previousStatus = event.newStatus;
  }

  for (let index = 1; index < events.length; index += 1) {
    const previous = new Date(events[index - 1].changedAt).getTime();
    const current = new Date(events[index].changedAt).getTime();
    if (current < previous) {
      errors.push({
        field: 'dates',
        message: 'Timeline events must be in chronological order.',
      });
      break;
    }
  }

  return errors;
}

function distributeDates(
  startMs: number,
  endMs: number,
  count: number,
): number[] {
  if (count <= 1) {
    return [startMs];
  }

  const step = (endMs - startMs) / (count - 1);
  return Array.from({ length: count }, (_, index) => Math.round(startMs + step * index));
}

export function synthesizeDefaultTimeline(params: {
  startDate: Date;
  finalStatus: WorkOrderStatus;
  completedDate?: Date | null;
  assigneeId?: string | null;
}): HistoricalTimelineEvent[] {
  const { startDate, finalStatus, completedDate, assigneeId } = params;
  const endDate =
    completedDate && completedDate.getTime() >= startDate.getTime()
      ? completedDate
      : startDate;

  const statusPath: WorkOrderStatus[] = (() => {
    switch (finalStatus) {
      case 'submitted':
        return ['submitted'];
      case 'accepted':
        return ['submitted', 'accepted'];
      case 'assigned':
        return ['submitted', 'accepted', 'assigned'];
      case 'in_progress':
        return ['submitted', 'accepted', 'assigned', 'in_progress'];
      case 'on_hold':
        return ['submitted', 'accepted', 'assigned', 'on_hold'];
      case 'completed':
        return ['submitted', 'accepted', 'assigned', 'in_progress', 'completed'];
      case 'cancelled':
        return ['submitted', 'cancelled'];
      default:
        return ['submitted'];
    }
  })();

  const timestamps = distributeDates(startDate.getTime(), endDate.getTime(), statusPath.length);

  return statusPath.map((newStatus, index) => ({
    newStatus,
    changedAt: new Date(timestamps[index]).toISOString(),
    assigneeId: newStatus === 'assigned' ? assigneeId ?? null : null,
  }));
}

function normalizeTimelineEvent(event: HistoricalTimelineEvent): HistoricalTimelineEvent {
  const parsedChangedAt = new Date(event.changedAt);
  const changedAt = Number.isNaN(parsedChangedAt.getTime())
    ? event.changedAt
    : parsedChangedAt.toISOString();

  return {
    newStatus: event.newStatus,
    changedAt,
    assigneeId: event.newStatus === 'assigned' ? (event.assigneeId ?? null) : null,
  };
}

export function areTimelineEventsEqual(
  left: HistoricalTimelineEvent[],
  right: HistoricalTimelineEvent[],
): boolean {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((event, index) => {
    const normalizedLeft = normalizeTimelineEvent(event);
    const normalizedRight = normalizeTimelineEvent(right[index]!);
    return (
      normalizedLeft.newStatus === normalizedRight.newStatus &&
      normalizedLeft.changedAt === normalizedRight.changedAt &&
      normalizedLeft.assigneeId === normalizedRight.assigneeId
    );
  });
}

export function historyRowsToEvents(
  historyRows: Array<{
    new_status: string;
    changed_at: string;
    reason: string | null;
    metadata: Record<string, unknown> | null;
  }>,
): HistoricalTimelineEvent[] {
  return [...historyRows]
    .sort(
      (left, right) => new Date(left.changed_at).getTime() - new Date(right.changed_at).getTime(),
    )
    .map((row) => ({
      newStatus: row.new_status as HistoricalTimelineEvent['newStatus'],
      changedAt: row.changed_at,
      assigneeId:
        row.new_status === 'assigned'
          ? ((row.metadata?.assignee_id as string | undefined) ?? null)
          : null,
    }));
}

/**
 * Legacy historical creates stored only `accepted` (or another status) as the first
 * status-history row. The editor requires a leading `submitted` event.
 */
export function normalizeLoadedTimelineEvents(
  events: HistoricalTimelineEvent[],
  startDate?: Date | string | null,
): HistoricalTimelineEvent[] {
  if (events.length === 0 || events[0]?.newStatus === 'submitted') {
    return events;
  }

  const firstChangedAt = new Date(events[0]!.changedAt);
  const parsedStart = startDate ? new Date(startDate) : firstChangedAt;
  const submittedAt =
    Number.isNaN(parsedStart.getTime()) || parsedStart.getTime() > firstChangedAt.getTime()
      ? firstChangedAt
      : parsedStart;

  return [
    {
      newStatus: 'submitted',
      changedAt: submittedAt.toISOString(),
      assigneeId: null,
    },
    ...events,
  ];
}

export function historyRowsToEditorEvents(
  historyRows: Array<{
    new_status: string;
    changed_at: string;
    reason: string | null;
    metadata: Record<string, unknown> | null;
  }>,
  startDate?: Date | string | null,
): HistoricalTimelineEvent[] {
  return normalizeLoadedTimelineEvents(historyRowsToEvents(historyRows), startDate);
}

export function eventsToRpcPayload(events: HistoricalTimelineEvent[]): Array<{
  old_status: WorkOrderStatus | null;
  new_status: WorkOrderStatus;
  changed_at: string;
  reason: string | null;
  assignee_id: string | null;
}> {
  let previousStatus: WorkOrderStatus | null = null;

  return events.map((event) => {
    const payload = {
      old_status: previousStatus,
      new_status: event.newStatus,
      changed_at: event.changedAt,
      reason: null,
      assignee_id: event.newStatus === 'assigned' ? event.assigneeId ?? null : null,
    };
    previousStatus = event.newStatus;
    return payload;
  });
}
