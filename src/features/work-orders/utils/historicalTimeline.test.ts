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
  normalizeLoadedTimelineEvents,
  rowsToTimelineEvents,
  synthesizeDefaultTimeline,
  timelineEventsToRows,
  updateTimelineRowStatus,
  validateTimelineEvents,
  type HistoricalTimelineEditorRow,
} from '@/features/work-orders/utils/historicalTimeline';
import { isTerminalStatus } from '@/features/work-orders/utils/workOrderHelpers';
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

describe('historicalTimeline edge cases', () => {
  let rowCount = 0;
  const row = (newStatus: HistoricalTimelineEditorRow['newStatus'], changedAt?: Date, assigneeId: string | null = null) => ({
    id: `row-${(rowCount += 1)}`,
    newStatus,
    changedAt,
    assigneeId,
  });
  const jan = (day: number) => new Date(Date.UTC(2026, 0, day, 12));

  it('createEmptyTimelineRow copies the seed date (not the same object) or leaves it empty', () => {
    const seed = jan(5);
    const seeded = createEmptyTimelineRow(seed);
    expect(seeded.changedAt).toEqual(seed);
    expect(seeded.changedAt).not.toBe(seed);
    expect(createEmptyTimelineRow().changedAt).toBeUndefined();
  });

  describe('getTimelineRowSeedDate', () => {
    it('has no seed when no row is filled yet', () => {
      expect(getTimelineRowSeedDate([row('', undefined)])).toBeUndefined();
      expect(getTimelineRowSeedDate([])).toBeUndefined();
    });

    it('falls back to the last filled row date when the trailing row has no date', () => {
      expect(getTimelineRowSeedDate([row('submitted', jan(3)), row('', undefined)])).toEqual(jan(3));
    });

    it('has no seed when the last filled row has no usable date', () => {
      expect(getTimelineRowSeedDate([row('submitted', new Date('nope'))])).toBeUndefined();
      expect(getTimelineRowSeedDate([row('submitted', undefined)])).toBeUndefined();
    });
  });

  it('offers no statuses after a row whose status is not chosen yet', () => {
    expect(getSelectableStatusesForRow([row('submitted', jan(1)), row('', undefined), row('', undefined)], 2)).toEqual([]);
  });

  it('keeps the assignee only when a row is set to assigned', () => {
    const rows = [row('submitted', jan(1)), row('accepted', jan(2), 'user-1')];
    expect(updateTimelineRowStatus(rows, 1, 'assigned')[1]?.assigneeId).toBe('user-1');
    expect(updateTimelineRowStatus(rows, 1, 'cancelled')[1]?.assigneeId).toBeNull();
  });

  it('reports no filled row and no way to add one for an all-empty editor', () => {
    const rows = [row('', undefined)];
    expect(getLastFilledRowIndex(rows)).toBe(-1);
    expect(canAddTimelineRow(rows)).toBe(false);
  });

  it('treats a missing (sparse) row as having no status', () => {
    const rows = new Array<HistoricalTimelineEditorRow>(1);
    expect(canAddTimelineRow(rows)).toBe(false);
  });

  it('exports assignees only for assigned events', () => {
    const events = rowsToTimelineEvents([
      row('submitted', jan(1), 'stray'),
      row('accepted', jan(2)),
      row('assigned', jan(3), 'user-1'),
    ]);
    expect(events.map((e) => e.assigneeId)).toEqual([null, null, 'user-1']);
  });

  it('starts an editor with a single submitted row when there are no events', () => {
    const rows = timelineEventsToRows([]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ newStatus: 'submitted', changedAt: undefined, assigneeId: null });
  });

  it('defaults a missing event assignee to null when loading rows', () => {
    expect(timelineEventsToRows([{ newStatus: 'assigned', changedAt: '2026-01-03T12:00:00.000Z' }])[0]?.assigneeId).toBeNull();
  });

  describe('validateTimelineEvents', () => {
    it('requires at least one event', () => {
      expect(validateTimelineEvents([])).toEqual([{ field: 'chain', message: 'Timeline must include at least one event.' }]);
    });

    it('flags a timeline that does not start with submitted', () => {
      expect(validateTimelineEvents([{ newStatus: 'accepted', changedAt: '2026-01-01T00:00:00Z' }])).toEqual([
        { field: 'chain', message: 'Timeline must begin with submitted.' },
        { field: 'chain', message: 'Invalid transition from created to accepted.' },
      ]);
    });

    it('flags illegal transitions and assigned events without an assignee', () => {
      expect(
        validateTimelineEvents([
          { newStatus: 'submitted', changedAt: '2026-01-01T00:00:00Z' },
          { newStatus: 'completed', changedAt: '2026-01-02T00:00:00Z' },
          { newStatus: 'assigned', changedAt: '2026-01-03T00:00:00Z', assigneeId: null },
        ]),
      ).toEqual([
        { field: 'chain', message: 'Invalid transition from submitted to completed.' },
        { field: 'chain', message: 'Invalid transition from completed to assigned.' },
        { field: 'assignee', message: 'Assigned events require an assignee.' },
      ]);
    });
  });

  describe('synthesizeDefaultTimeline', () => {
    const start = jan(1);

    it.each([
      ['submitted', ['submitted']],
      ['in_progress', ['submitted', 'accepted', 'assigned', 'in_progress']],
      ['on_hold', ['submitted', 'accepted', 'assigned', 'on_hold']],
    ] as const)('builds the shortest legal path to %s', (finalStatus, path) => {
      expect(synthesizeDefaultTimeline({ startDate: start, finalStatus }).map((e) => e.newStatus)).toEqual(path);
    });

    it('collapses to the start date when the completion date is missing or earlier', () => {
      const events = synthesizeDefaultTimeline({ startDate: start, finalStatus: 'accepted', completedDate: jan(1 - 3) });
      expect(events.map((e) => e.changedAt)).toEqual([start.toISOString(), start.toISOString()]);
    });

    it('starts legacy or unknown final statuses at submitted', () => {
      // Status strings come from the database; older rows may hold values outside today's enum.
      const legacyStatus = JSON.parse('"archived"');
      expect(synthesizeDefaultTimeline({ startDate: start, finalStatus: legacyStatus }).map((e) => e.newStatus)).toEqual([
        'submitted',
      ]);
    });

    it('records the assignee on the assigned step, or null when none is given', () => {
      const events = synthesizeDefaultTimeline({ startDate: start, finalStatus: 'assigned', completedDate: jan(3) });
      expect(events.map((e) => e.assigneeId)).toEqual([null, null, null]);
    });
  });

  describe('areTimelineEventsEqual', () => {
    it('is false for timelines of different lengths', () => {
      expect(areTimelineEventsEqual([{ newStatus: 'submitted', changedAt: 'x' }], [])).toBe(false);
    });

    it('compares unparseable timestamps as raw strings', () => {
      const a = [{ newStatus: 'submitted' as const, changedAt: 'not a date' }];
      expect(areTimelineEventsEqual(a, [{ newStatus: 'submitted', changedAt: 'not a date' }])).toBe(true);
      expect(areTimelineEventsEqual(a, [{ newStatus: 'submitted', changedAt: 'other' }])).toBe(false);
    });
  });

  it('reads the assignee for assigned history rows, defaulting to null', () => {
    const events = historyRowsToEditorEvents([
      { new_status: 'submitted', changed_at: '2026-01-01T00:00:00Z', reason: null, metadata: null },
      { new_status: 'assigned', changed_at: '2026-01-02T00:00:00Z', reason: null, metadata: null },
    ]);
    expect(events[1]?.assigneeId).toBeNull();
  });

  it('dates the synthesized submitted event at the first event when no start date is given', () => {
    const events = normalizeLoadedTimelineEvents([{ newStatus: 'accepted', changedAt: '2026-01-04T00:00:00.000Z' }]);
    expect(events[0]).toEqual({ newStatus: 'submitted', changedAt: '2026-01-04T00:00:00.000Z', assigneeId: null });
  });

  it('defaults a missing assignee on an assigned event to null in the RPC payload', () => {
    expect(eventsToRpcPayload([{ newStatus: 'assigned', changedAt: 'x' }])[0]?.assignee_id).toBeNull();
  });
});
