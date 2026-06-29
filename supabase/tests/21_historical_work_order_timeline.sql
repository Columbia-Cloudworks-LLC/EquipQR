BEGIN;
SELECT plan(6);

SELECT has_function(
  'public',
  'replace_historical_work_order_timeline',
  ARRAY['uuid', 'jsonb', 'boolean'],
  'replace_historical_work_order_timeline exists'
);

SELECT has_function(
  'public',
  'synthesize_historical_timeline_events',
  ARRAY['timestamp with time zone', 'timestamp with time zone', 'work_order_status', 'uuid'],
  'synthesize_historical_timeline_events exists'
);

SELECT is(
  public.historical_timeline_allowed_next_statuses('submitted'::public.work_order_status),
  ARRAY['accepted', 'cancelled']::public.work_order_status[],
  'submitted allows accepted or cancelled'
);

SELECT is(
  public.historical_timeline_allowed_next_statuses('accepted'::public.work_order_status),
  ARRAY['assigned', 'cancelled']::public.work_order_status[],
  'accepted allows assigned or cancelled'
);

SELECT is(
  jsonb_array_length(
    public.synthesize_historical_timeline_events(
      TIMESTAMPTZ '2024-01-01T08:00:00Z',
      TIMESTAMPTZ '2024-01-05T16:00:00Z',
      'completed'::public.work_order_status,
      '10000000-0000-0000-0000-000000000099'::uuid
    )
  ),
  5,
  'completed status synthesizes five timeline events'
);

SELECT is(
  (public.synthesize_historical_timeline_events(
    TIMESTAMPTZ '2024-01-01T08:00:00Z',
    TIMESTAMPTZ '2024-01-05T16:00:00Z',
    'completed'::public.work_order_status,
    '10000000-0000-0000-0000-000000000099'::uuid
  ) -> 0 ->> 'new_status'),
  'submitted',
  'synthesized timeline begins with submitted'
);

SELECT * FROM finish();
ROLLBACK;
