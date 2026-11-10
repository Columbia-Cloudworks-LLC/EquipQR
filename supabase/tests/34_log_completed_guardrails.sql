-- pgTAP: Log Completed guardrails (migration 20261110120000)
--   * historical work orders default to quickbooks_sync_excluded = true (opt-in to bill)
--   * completed_date / PM completed_at keep the historical service date
--   * log_work_order_service_hours never rolls the equipment meter back
--   * equipment.last_maintenance follows PM work orders inserted as completed
-- Uses seeded data: any active org owner and one of that org's equipment rows.

BEGIN;
SELECT plan(18);

SELECT has_column('public', 'work_orders', 'quickbooks_sync_excluded',
  'work_orders.quickbooks_sync_excluded exists');
SELECT col_not_null('public', 'work_orders', 'quickbooks_sync_excluded',
  'quickbooks_sync_excluded is NOT NULL');
SELECT col_default_is('public', 'work_orders', 'quickbooks_sync_excluded', 'false',
  'quickbooks_sync_excluded defaults to false for regular work orders');
SELECT has_function('public', 'log_work_order_service_hours', ARRAY['uuid', 'numeric', 'text'],
  'log_work_order_service_hours exists');
SELECT is(
  has_function_privilege('anon', 'public.log_work_order_service_hours(uuid, numeric, text)', 'EXECUTE'),
  false,
  'anon cannot execute log_work_order_service_hours'
);

CREATE TEMP TABLE log_completed_ctx (label text PRIMARY KEY, id uuid NOT NULL);
GRANT SELECT ON log_completed_ctx TO authenticated;

INSERT INTO log_completed_ctx (label, id)
SELECT 'owner', om.user_id
FROM public.organization_members om
WHERE om.role = 'owner'
  AND om.status = 'active'
  AND EXISTS (SELECT 1 FROM public.equipment e WHERE e.organization_id = om.organization_id)
ORDER BY om.organization_id, om.user_id
LIMIT 1;

INSERT INTO log_completed_ctx (label, id)
SELECT 'org', om.organization_id
FROM public.organization_members om
JOIN log_completed_ctx c ON c.label = 'owner' AND c.id = om.user_id
WHERE om.role = 'owner' AND om.status = 'active'
  AND EXISTS (SELECT 1 FROM public.equipment e WHERE e.organization_id = om.organization_id)
ORDER BY om.organization_id
LIMIT 1;

INSERT INTO log_completed_ctx (label, id)
SELECT 'equipment', e.id
FROM public.equipment e
JOIN log_completed_ctx c ON c.label = 'org' AND c.id = e.organization_id
ORDER BY e.id
LIMIT 1;

-- Known starting point: meter at 500 hrs, last maintenance long ago.
UPDATE public.equipment
SET working_hours = 500, last_maintenance = DATE '2020-01-01'
WHERE id = (SELECT id FROM log_completed_ctx WHERE label = 'equipment');

SELECT set_config(
  'request.jwt.claims',
  json_build_object('sub', (SELECT id FROM log_completed_ctx WHERE label = 'owner'), 'role', 'authenticated')::text,
  true
);
SET LOCAL ROLE authenticated;

-- A paper PM sheet from March 2024, entered today.
CREATE TEMP TABLE log_completed_result AS
SELECT public.create_historical_work_order_with_pm(
  p_organization_id => (SELECT id FROM log_completed_ctx WHERE label = 'org'),
  p_equipment_id => (SELECT id FROM log_completed_ctx WHERE label = 'equipment'),
  p_title => 'Paper PM sheet',
  p_description => 'Logged from clipboard',
  p_priority => 'medium'::public.work_order_priority,
  p_status => 'completed'::public.work_order_status,
  p_historical_start_date => TIMESTAMPTZ '2024-03-05T12:00:00Z',
  p_assignee_id => (SELECT id FROM log_completed_ctx WHERE label = 'owner'),
  p_completed_date => TIMESTAMPTZ '2024-03-05T12:00:00Z',
  p_has_pm => true,
  p_pm_status => 'completed',
  p_pm_completion_date => TIMESTAMPTZ '2024-03-05T12:00:00Z',
  p_pm_checklist_data => '[{"id":"a","title":"A","section":"S","required":true,"condition":1}]'::jsonb,
  p_timeline_events => NULL::jsonb
) AS result;

SELECT is(
  (SELECT (result ->> 'success')::boolean FROM log_completed_result),
  true,
  'historical completed work order with PM is created'
);

RESET ROLE;
INSERT INTO log_completed_ctx (label, id)
SELECT 'work_order', (result ->> 'work_order_id')::uuid FROM log_completed_result;
SET LOCAL ROLE authenticated;

SELECT is(
  (SELECT completed_date FROM public.work_orders
    WHERE id = (SELECT id FROM log_completed_ctx WHERE label = 'work_order')),
  TIMESTAMPTZ '2024-03-05T12:00:00Z',
  'completed_date keeps the historical service date, not now()'
);

SELECT is(
  (SELECT completed_at FROM public.preventative_maintenance
    WHERE work_order_id = (SELECT id FROM log_completed_ctx WHERE label = 'work_order')),
  TIMESTAMPTZ '2024-03-05T12:00:00Z',
  'PM completed_at keeps the historical service date'
);

SELECT is(
  (SELECT quickbooks_sync_excluded FROM public.work_orders
    WHERE id = (SELECT id FROM log_completed_ctx WHERE label = 'work_order')),
  true,
  'historical work orders default to Do Not Sync'
);

SELECT is(
  (SELECT last_maintenance FROM public.equipment
    WHERE id = (SELECT id FROM log_completed_ctx WHERE label = 'equipment')),
  DATE '2024-03-05',
  'a PM work order inserted as completed advances equipment.last_maintenance'
);

-- Reading below the current meter: logged, but the meter stays put.
SELECT is(
  (public.log_work_order_service_hours(
    (SELECT id FROM log_completed_ctx WHERE label = 'work_order'), 320
  ) ->> 'equipment_hours_updated')::boolean,
  false,
  'a lower historical reading reports the meter as unchanged'
);

SELECT is(
  (SELECT working_hours FROM public.equipment
    WHERE id = (SELECT id FROM log_completed_ctx WHERE label = 'equipment')),
  500::numeric,
  'equipment working hours are never rolled back by an old paper sheet'
);

SELECT is(
  (SELECT equipment_working_hours_at_completion FROM public.preventative_maintenance
    WHERE work_order_id = (SELECT id FROM log_completed_ctx WHERE label = 'work_order')),
  320::numeric,
  'the PM records the meter reading taken at the service'
);

SELECT is(
  (SELECT count(*)::integer FROM public.equipment_working_hours_history
    WHERE work_order_id = (SELECT id FROM log_completed_ctx WHERE label = 'work_order')
      AND old_hours = 500 AND new_hours = 500 AND hours_added = 0),
  1,
  'the lower reading is kept in hour history without changing the meter'
);

-- Reading above the current meter: the meter advances.
SELECT is(
  (public.log_work_order_service_hours(
    (SELECT id FROM log_completed_ctx WHERE label = 'work_order'), 612.5
  ) ->> 'equipment_hours_updated')::boolean,
  true,
  'a higher reading reports the meter as updated'
);

SELECT is(
  (SELECT working_hours FROM public.equipment
    WHERE id = (SELECT id FROM log_completed_ctx WHERE label = 'equipment')),
  612.5::numeric,
  'a higher reading advances equipment working hours'
);

SELECT is(
  (public.log_work_order_service_hours(
    (SELECT id FROM log_completed_ctx WHERE label = 'work_order'), -1
  ) ->> 'success')::boolean,
  false,
  'negative readings are rejected'
);

-- A user outside the organization cannot log hours against the work order.
RESET ROLE;
SELECT set_config(
  'request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-00000000dead', 'role', 'authenticated')::text,
  true
);
SET LOCAL ROLE authenticated;

SELECT is(
  (public.log_work_order_service_hours(
    (SELECT id FROM log_completed_ctx WHERE label = 'work_order'), 9999
  ) ->> 'success')::boolean,
  false,
  'non-members cannot log service hours'
);

RESET ROLE;
SELECT * FROM finish();
ROLLBACK;
