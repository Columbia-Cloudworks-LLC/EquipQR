import { describe, expect, it } from 'vitest';
import {
  canAddTimelineRow,
  clearDownstreamRows,
  createInitialTimelineRow,
  eventsToRpcPayload,
  getAllowedNextStatuses,
  getSelectableStatusesForRow,
  isTerminalStatus,
  rowsToTimelineEvents,
  synthesizeDefaultTimeline,
  timelineEventsToRows,
  updateTimelineRowStatus,
  validateTimelineEvents,
  type HistoricalTimelineEditorRow,
} from '@/features/work-orders/utils/historicalTimeline';

describe('historicalTimeline helpers', () => {
  it('returns strict allowed next statuses', () => {
    expect(getAllowedNextStatuses('submitted')).toEqual(['accepted', 'cancelled']);
    expect(getAllowedNextStatuses('accepted')).toEqual(['assigned', 'cancelled']);
    expect(getAllowedNextStatuses('assigned')).toEqual(['in_progress', 'on_hold']);
    expect(getAllowedNextStatuses('in_progress')).toEqual(['on_hold', 'completed']);
    expect(getAllowedNextStatuses('on_hold')).toEqual(['in_progress', 'cancelled']);
    expect(getAllowedNextStatuses('completed')).toEqual([]);
  });

  it('marks completed and cancelled as terminal', () => {
    expect(isTerminalStatus('completed')).toBe(true);
    expect(isTerminalStatus('cancelled')).toBe(true);
    expect(isTerminalStatus('in_progress')).toBe(false);
  });

  it('clears downstream row values when an upstream status changes', () => {
    const rows: HistoricalTimelineEditorRow[] = [
      { ...createInitialTimelineRow(new Date('2024-01-01')), newStatus: 'submitted' },
      {
        id: 'row-2',
        newStatus: 'accepted',
        changedAt: new Date('2024-01-02'),
        reason: 'Accepted',
        assigneeId: null,
      },
      {
        id: 'row-3',
        newStatus: 'assigned',
        changedAt: new Date('2024-01-03'),
        reason: 'Assigned',
        assigneeId: 'user-1',
      },
    ];

    const updated = updateTimelineRowStatus(rows, 1, 'cancelled');
    expect(updated[2]?.newStatus).toBe('');
    expect(updated[2]?.assigneeId).toBeNull();
  });

  it('derives selectable statuses from the previous row only', () => {
    const rows: HistoricalTimelineEditorRow[] = [
      { ...createInitialTimelineRow(), newStatus: 'submitted' },
      { id: 'row-2', newStatus: 'accepted', changedAt: new Date(), reason: '', assigneeId: null },
    ];

    expect(getSelectableStatusesForRow(rows, 0)).toEqual(['submitted']);
    expect(getSelectableStatusesForRow(rows, 1)).toEqual(['accepted', 'cancelled']);

    rows.push({
      id: 'row-3',
      newStatus: 'assigned',
      changedAt: new Date(),
      reason: '',
      assigneeId: null,
    });
    expect(getSelectableStatusesForRow(rows, 2)).toEqual(['assigned', 'cancelled']);
  });

  it('requires assignee on assigned events during validation', () => {
    const events = synthesizeDefaultTimeline({
      startDate: new Date('2024-01-01'),
      finalStatus: 'assigned',
      completedDate: new Date('2024-01-05'),
    });

    const errors = validateTimelineEvents(events);
    expect(errors.some((error) => error.field === 'assignee')).toBe(true);
  });

  it('validates chronological ordering', () => {
    const events = [
      {
        newStatus: 'submitted' as const,
        changedAt: new Date('2024-01-05').toISOString(),
        reason: 'Created',
      },
      {
        newStatus: 'accepted' as const,
        changedAt: new Date('2024-01-01').toISOString(),
        reason: 'Accepted',
      },
    ];

    const errors = validateTimelineEvents(events);
    expect(errors.some((error) => error.field === 'dates')).toBe(true);
  });

  it('synthesizes a valid completed chain with chronological dates', () => {
    const events = synthesizeDefaultTimeline({
      startDate: new Date('2024-01-01T08:00:00.000Z'),
      finalStatus: 'completed',
      completedDate: new Date('2024-01-05T16:00:00.000Z'),
      assigneeId: 'user-1',
    });

    expect(events.map((event) => event.newStatus)).toEqual([
      'submitted',
      'accepted',
      'assigned',
      'in_progress',
      'completed',
    ]);
    expect(validateTimelineEvents(events)).toEqual([]);
  });

  it('converts rows to RPC payload transitions', () => {
    const rows = timelineEventsToRows(
      synthesizeDefaultTimeline({
        startDate: new Date('2024-01-01'),
        finalStatus: 'cancelled',
        completedDate: new Date('2024-01-02'),
      }),
    );

    const payload = eventsToRpcPayload(rowsToTimelineEvents(rows));
    expect(payload[0]).toMatchObject({ old_status: null, new_status: 'submitted' });
    expect(payload[1]).toMatchObject({ old_status: 'submitted', new_status: 'cancelled' });
  });

  it('allows adding another row until terminal status is reached', () => {
    const rows: HistoricalTimelineEditorRow[] = [
      { ...createInitialTimelineRow(), newStatus: 'submitted' },
      { id: 'row-2', newStatus: 'accepted', changedAt: new Date(), reason: '', assigneeId: null },
    ];

    expect(canAddTimelineRow(rows)).toBe(true);

    const terminalRows = clearDownstreamRows(rows, 1);
    terminalRows[1] = {
      ...terminalRows[1],
      newStatus: 'cancelled',
      changedAt: new Date(),
    };
    expect(canAddTimelineRow(terminalRows)).toBe(false);
  });
});
