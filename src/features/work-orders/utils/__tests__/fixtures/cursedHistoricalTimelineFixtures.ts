/**
 * Mirrors durable cursed historical timeline seed shapes (#1279).
 * Keep in sync with supabase/seeds/31_cursed_historical_timeline.sql.
 */

export const cursedHistoricalFixtureIds = {
  orgId: '660e8400-e29b-41d4-a716-446655440011',
  acceptedFirstStubWorkOrderId: 'a00e8400-e29b-41d4-a716-446655440c01',
  multiEventInProgressWorkOrderId: 'a00e8400-e29b-41d4-a716-446655440c02',
  longInProgressChainWorkOrderId: 'a00e8400-e29b-41d4-a716-446655440c03',
  happyPathSubmittedFirstWorkOrderId: 'a00e8400-e29b-41d4-a716-446655440c04',
} as const;

/** c01 — single-event accepted-first stub (exact #1276 deadlock shape). */
export const cursedAcceptedFirstStubHistoryRows = [
  {
    new_status: 'accepted' as const,
    changed_at: '2026-03-24T13:00:00.000Z',
    reason: 'Historical work order created',
    metadata: { fixture: 'cursed_historical_c01', issue: 1279 },
  },
];

/** c02 — multi-event legacy starting at accepted. */
export const cursedMultiEventLegacyHistoryRows = [
  {
    new_status: 'accepted' as const,
    changed_at: '2026-02-10T09:00:00.000Z',
    reason: 'Historical work order created',
    metadata: { fixture: 'cursed_historical_c02', issue: 1279 },
  },
  {
    new_status: 'assigned' as const,
    changed_at: '2026-02-11T10:00:00.000Z',
    reason: 'Assigned technician',
    metadata: {
      fixture: 'cursed_historical_c02',
      assignee_id: 'bb0e8400-e29b-41d4-a716-446655440001',
    },
  },
  {
    new_status: 'in_progress' as const,
    changed_at: '2026-02-12T15:30:00.000Z',
    reason: 'Work started',
    metadata: { fixture: 'cursed_historical_c02' },
  },
];

/** c03 — long in_progress chain with legacy accepted start. */
export const cursedLongInProgressHistoryRows = [
  {
    new_status: 'accepted' as const,
    changed_at: '2025-11-01T08:00:00.000Z',
    reason: 'Historical work order created',
    metadata: { fixture: 'cursed_historical_c03', issue: 1279 },
  },
  {
    new_status: 'assigned' as const,
    changed_at: '2025-11-03T09:00:00.000Z',
    reason: 'Assigned field tech',
    metadata: {
      fixture: 'cursed_historical_c03',
      assignee_id: 'bb0e8400-e29b-41d4-a716-446655440001',
    },
  },
  {
    new_status: 'in_progress' as const,
    changed_at: '2025-11-04T14:00:00.000Z',
    reason: 'Diagnosis started',
    metadata: { fixture: 'cursed_historical_c03' },
  },
  {
    new_status: 'on_hold' as const,
    changed_at: '2025-12-01T11:00:00.000Z',
    reason: 'Waiting on parts',
    metadata: { fixture: 'cursed_historical_c03' },
  },
  {
    new_status: 'in_progress' as const,
    changed_at: '2026-01-20T16:00:00.000Z',
    reason: 'Parts arrived; resumed',
    metadata: { fixture: 'cursed_historical_c03' },
  },
];

/** c04 — happy-path submitted-first contrast. */
export const cursedHappyPathSubmittedFirstHistoryRows = [
  {
    new_status: 'submitted' as const,
    changed_at: '2026-01-05T08:00:00.000Z',
    reason: 'Historical status recorded',
    metadata: { fixture: 'cursed_historical_c04', issue: 1279 },
  },
  {
    new_status: 'accepted' as const,
    changed_at: '2026-01-06T09:00:00.000Z',
    reason: 'Historical status recorded',
    metadata: { fixture: 'cursed_historical_c04' },
  },
  {
    new_status: 'assigned' as const,
    changed_at: '2026-01-07T10:00:00.000Z',
    reason: 'Historical status recorded',
    metadata: {
      fixture: 'cursed_historical_c04',
      assignee_id: 'bb0e8400-e29b-41d4-a716-446655440001',
    },
  },
  {
    new_status: 'in_progress' as const,
    changed_at: '2026-01-08T11:00:00.000Z',
    reason: 'Historical status recorded',
    metadata: { fixture: 'cursed_historical_c04' },
  },
  {
    new_status: 'completed' as const,
    changed_at: '2026-01-09T17:00:00.000Z',
    reason: 'Historical status recorded',
    metadata: { fixture: 'cursed_historical_c04' },
  },
];

/** c06 — out-of-order timestamps boundary (for validateTimelineEvents). */
export const cursedOutOfOrderTimestampEvents = [
  {
    newStatus: 'submitted' as const,
    changedAt: '2026-05-01T12:00:00.000Z',
  },
  {
    newStatus: 'accepted' as const,
    changedAt: '2026-04-30T08:00:00.000Z',
  },
];
