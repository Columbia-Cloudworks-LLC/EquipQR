import { describe, expect, it } from 'vitest';
import {
  areTimelineEventsEqual,
  canAddTimelineRow,
  clearDownstreamRows,
  createEmptyTimelineRow,
  createInitialTimelineRow,
  eventsToRpcPayload,
  getAllowedNextStatuses,
  getLastFilledRowIndex,
  getSelectableStatusesForRow,
  getTimelineRowSeedDate,
  hasIncompleteTimelineRows,
  historyRowsToEditorEvents,
  isTerminalStatus,
  normalizeLoadedTimelineEvents,
  rowsToTimelineEvents,
  synthesizeDefaultTimeline,
  timelineEventsToRows,
  updateTimelineRowStatus,
  validateTimelineEvents,
  type HistoricalTimelineEditorRow,
} from '@/features/work-orders/utils/historicalTimeline';
import {
  cursedAcceptedFirstStubHistoryRows,
  cursedHappyPathSubmittedFirstHistoryRows,
  cursedLongInProgressHistoryRows,
  cursedMultiEventLegacyHistoryRows,
  cursedOutOfOrderTimestampEvents,
} from '@/features/work-orders/utils/cursedHistoricalTimelineFixtures';

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

  it('seeds empty rows from the previous filled event timestamp', () => {
    const rows: HistoricalTimelineEditorRow[] = [
      { ...createInitialTimelineRow(new Date('2024-01-01T08:00:00Z')), newStatus: 'submitted' },
      {
        id: 'row-2',
        newStatus: 'accepted',
        changedAt: new Date('2024-01-02T10:30:00Z'),
        assigneeId: null,
      },
    ];

    const seeded = createEmptyTimelineRow(getTimelineRowSeedDate(rows));
    expect(seeded.changedAt?.toISOString()).toBe('2024-01-02T10:30:00.000Z');
  });

  it('seeds empty rows from a draft row timestamp before status is selected', () => {
    const rows: HistoricalTimelineEditorRow[] = [
      { ...createInitialTimelineRow(new Date('2024-01-01T08:00:00Z')), newStatus: 'submitted' },
      {
        id: 'row-2',
        newStatus: 'accepted',
        changedAt: new Date('2024-01-02T10:30:00Z'),
        assigneeId: null,
      },
      {
        id: 'row-3',
        newStatus: '',
        changedAt: new Date('2024-01-02T14:00:00Z'),
        assigneeId: null,
      },
    ];

    const seeded = createEmptyTimelineRow(getTimelineRowSeedDate(rows));
    expect(seeded.changedAt?.toISOString()).toBe('2024-01-02T14:00:00.000Z');
  });

  it('clears downstream row values when an upstream status changes', () => {
    const rows: HistoricalTimelineEditorRow[] = [
      { ...createInitialTimelineRow(new Date('2024-01-01')), newStatus: 'submitted' },
      {
        id: 'row-2',
        newStatus: 'accepted',
        changedAt: new Date('2024-01-02'),
        assigneeId: null,
      },
      {
        id: 'row-3',
        newStatus: 'assigned',
        changedAt: new Date('2024-01-03'),
        assigneeId: 'user-1',
      },
    ];

    const updated = updateTimelineRowStatus(rows, 1, 'cancelled');
    expect(updated[2]?.newStatus).toBe('');
    expect(updated[2]?.assigneeId).toBeNull();
  });

  it('finds the last filled timeline row index', () => {
    const rows: HistoricalTimelineEditorRow[] = [
      { ...createInitialTimelineRow(), newStatus: 'submitted' },
      { id: 'row-2', newStatus: '', changedAt: undefined, assigneeId: null },
    ];

    expect(getLastFilledRowIndex(rows)).toBe(0);
    rows[1] = { ...rows[1], newStatus: 'accepted', changedAt: new Date() };
    expect(getLastFilledRowIndex(rows)).toBe(1);
  });

  it('derives selectable statuses from the previous row only', () => {
    const rows: HistoricalTimelineEditorRow[] = [
      { ...createInitialTimelineRow(), newStatus: 'submitted' },
      { id: 'row-2', newStatus: 'accepted', changedAt: new Date(), assigneeId: null },
    ];

    expect(getSelectableStatusesForRow(rows, 0)).toEqual(['submitted']);
    expect(getSelectableStatusesForRow(rows, 1)).toEqual(['accepted', 'cancelled']);

    rows.push({
      id: 'row-3',
      newStatus: 'assigned',
      changedAt: new Date(),
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
      },
      {
        newStatus: 'accepted' as const,
        changedAt: new Date('2024-01-01').toISOString(),
      },
    ];

    const errors = validateTimelineEvents(events);
    expect(errors.some((error) => error.field === 'dates')).toBe(true);
  });

  it('clamps stale completion dates before the start date', () => {
    const events = synthesizeDefaultTimeline({
      startDate: new Date('2024-06-01T08:00:00.000Z'),
      finalStatus: 'accepted',
      completedDate: new Date('2024-01-01T08:00:00.000Z'),
    });

    expect(events).toHaveLength(2);
    expect(new Date(events[0].changedAt).getTime()).toBeLessThanOrEqual(
      new Date(events[1].changedAt).getTime(),
    );
    expect(validateTimelineEvents(events)).toEqual([]);
  });

  it('detects incomplete timeline rows missing status or date', () => {
    const completeRows: HistoricalTimelineEditorRow[] = [
      { ...createInitialTimelineRow(new Date('2024-01-01')), newStatus: 'submitted' },
      { id: 'row-2', newStatus: 'accepted', changedAt: new Date('2024-01-02'), assigneeId: null },
    ];
    expect(hasIncompleteTimelineRows(completeRows)).toBe(false);

    const emptyAddedRow: HistoricalTimelineEditorRow[] = [
      ...completeRows,
      { id: 'row-3', newStatus: '', changedAt: undefined, assigneeId: null },
    ];
    expect(hasIncompleteTimelineRows(emptyAddedRow)).toBe(true);

    const invalidDateRow: HistoricalTimelineEditorRow[] = [
      ...completeRows,
      { id: 'row-3', newStatus: 'assigned', changedAt: new Date('invalid'), assigneeId: null },
    ];
    expect(hasIncompleteTimelineRows(invalidDateRow)).toBe(true);
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

  it('converts rows to RPC payload transitions without reason text', () => {
    const rows = timelineEventsToRows(
      synthesizeDefaultTimeline({
        startDate: new Date('2024-01-01'),
        finalStatus: 'cancelled',
        completedDate: new Date('2024-01-02'),
      }),
    );

    const payload = eventsToRpcPayload(rowsToTimelineEvents(rows));
    expect(payload[0]).toMatchObject({ old_status: null, new_status: 'submitted', reason: null });
    expect(payload[1]).toMatchObject({ old_status: 'submitted', new_status: 'cancelled', reason: null });
  });

  it('allows adding another row until terminal status is reached', () => {
    const rows: HistoricalTimelineEditorRow[] = [
      { ...createInitialTimelineRow(), newStatus: 'submitted' },
      { id: 'row-2', newStatus: 'accepted', changedAt: new Date(), assigneeId: null },
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

  it('prepends submitted when legacy history begins with accepted', () => {
    const legacy = [
      {
        newStatus: 'accepted' as const,
        changedAt: '2026-03-24T13:00:00.000Z',
      },
    ];

    const normalized = normalizeLoadedTimelineEvents(legacy, '2026-03-24T13:00:00.000Z');
    expect(normalized.map((event) => event.newStatus)).toEqual(['submitted', 'accepted']);
    expect(validateTimelineEvents(normalized)).toEqual([]);
    expect(getSelectableStatusesForRow(
      timelineEventsToRows(normalized),
      1,
    )).toEqual(['accepted', 'cancelled']);
  });

  it('historyRowsToEditorEvents repairs legacy rows for the timeline editor', () => {
    const events = historyRowsToEditorEvents(
      [
        {
          new_status: 'accepted',
          changed_at: '2026-03-24T13:00:00.000Z',
          reason: 'Historical work order created',
          metadata: null,
        },
      ],
      '2026-03-24T13:00:00.000Z',
    );

    expect(events[0]?.newStatus).toBe('submitted');
    expect(events[1]?.newStatus).toBe('accepted');
    expect(validateTimelineEvents(events)).toEqual([]);
  });

  it('leaves valid submitted-first timelines unchanged', () => {
    const valid = [
      {
        newStatus: 'submitted' as const,
        changedAt: '2026-03-03T04:50:00.000Z',
      },
      {
        newStatus: 'accepted' as const,
        changedAt: '2026-03-11T12:44:00.000Z',
      },
    ];

    expect(normalizeLoadedTimelineEvents(valid)).toEqual(valid);
  });

  it('clamps prepended submitted date when start date is after first event', () => {
    const legacy = [
      {
        newStatus: 'accepted' as const,
        changedAt: '2026-03-24T13:00:00.000Z',
      },
    ];

    const normalized = normalizeLoadedTimelineEvents(legacy, '2026-04-01T08:00:00.000Z');
    expect(normalized[0]?.changedAt).toBe('2026-03-24T13:00:00.000Z');
  });

  it('compares timeline events for draft dirty detection', () => {
    const base = [
      {
        newStatus: 'submitted' as const,
        changedAt: '2024-01-01T08:00:00.000Z',
      },
      {
        newStatus: 'accepted' as const,
        changedAt: '2024-01-02T08:00:00.000Z',
      },
    ];

    expect(areTimelineEventsEqual(base, [...base])).toBe(true);
    expect(
      areTimelineEventsEqual(base, [
        base[0]!,
        { ...base[1]!, changedAt: '2024-01-03T08:00:00.000Z' },
      ]),
    ).toBe(false);
    expect(
      areTimelineEventsEqual(
        [
          {
            newStatus: 'assigned' as const,
            changedAt: '2024-01-03T08:00:00.000Z',
            assigneeId: 'user-1',
          },
        ],
        [
          {
            newStatus: 'assigned' as const,
            changedAt: '2024-01-03T08:00:00.000Z',
            assigneeId: null,
          },
        ],
      ),
    ).toBe(false);
    expect(
      areTimelineEventsEqual(
        [
          {
            newStatus: 'accepted' as const,
            changedAt: '2024-01-02T08:00:00.000Z',
            assigneeId: 'user-1',
          },
        ],
        [
          {
            newStatus: 'accepted' as const,
            changedAt: '2024-01-02T08:00:00.000Z',
          },
        ],
      ),
    ).toBe(true);
    expect(
      areTimelineEventsEqual(
        [
          {
            newStatus: 'accepted' as const,
            changedAt: '2024-01-02T08:00:00.000Z',
          },
        ],
        [
          {
            newStatus: 'accepted' as const,
            changedAt: '2024-01-02T08:00:00Z',
          },
        ],
      ),
    ).toBe(true);
  });

  describe('cursed historical timeline fixtures (#1279)', () => {
    it('normalizes durable accepted-first stub so Event 1 is locked to submitted', () => {
      const events = historyRowsToEditorEvents(
        cursedAcceptedFirstStubHistoryRows,
        '2026-03-24T13:00:00.000Z',
      );
      const rows = timelineEventsToRows(events);

      expect(events.map((event) => event.newStatus)).toEqual(['submitted', 'accepted']);
      expect(getSelectableStatusesForRow(rows, 0)).toEqual(['submitted']);
      expect(getSelectableStatusesForRow(rows, 1)).toEqual(['accepted', 'cancelled']);
      expect(getAllowedNextStatuses('accepted')).toEqual(['assigned', 'cancelled']);
      expect(validateTimelineEvents(events)).toEqual([]);
    });

    it('repairs multi-event legacy accepted-first chains for editor load', () => {
      const events = historyRowsToEditorEvents(
        cursedMultiEventLegacyHistoryRows,
        '2026-02-10T09:00:00.000Z',
      );

      expect(events[0]?.newStatus).toBe('submitted');
      expect(events.map((event) => event.newStatus)).toEqual([
        'submitted',
        'accepted',
        'assigned',
        'in_progress',
      ]);
      expect(validateTimelineEvents(events)).toEqual([]);
    });

    it('repairs long in_progress legacy chains without dropping later transitions', () => {
      const events = historyRowsToEditorEvents(
        cursedLongInProgressHistoryRows,
        '2025-11-01T08:00:00.000Z',
      );

      expect(events[0]?.newStatus).toBe('submitted');
      expect(events.map((event) => event.newStatus)).toEqual([
        'submitted',
        'accepted',
        'assigned',
        'in_progress',
        'on_hold',
        'in_progress',
      ]);
      expect(validateTimelineEvents(events)).toEqual([]);
    });

    it('leaves happy-path submitted-first contrast fixtures unchanged', () => {
      const events = historyRowsToEditorEvents(
        cursedHappyPathSubmittedFirstHistoryRows,
        '2026-01-05T08:00:00.000Z',
      );

      expect(events.map((event) => event.newStatus)).toEqual([
        'submitted',
        'accepted',
        'assigned',
        'in_progress',
        'completed',
      ]);
      expect(normalizeLoadedTimelineEvents(events)).toEqual(events);
    });

    it('flags out-of-order timestamp boundary fixtures', () => {
      const errors = validateTimelineEvents(cursedOutOfOrderTimestampEvents);
      expect(errors.some((error) => error.field === 'dates')).toBe(true);
    });
  });
});
