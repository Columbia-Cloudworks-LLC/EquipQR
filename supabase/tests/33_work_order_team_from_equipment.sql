-- pgTAP: A work order's team is its equipment's team.
--
-- work_orders.team_id was removed (20261105043341). Every team-scoped rule for
-- work orders must read equipment.team_id, so moving equipment to another team
-- moves its work orders with it. Covers the column removal, cost access,
-- team-manager checks, the work_order_notes insert policy, assignee validation
-- and audit triggers, notifications, CSV export and historical creation.

BEGIN;
SELECT plan(24);

-- ── Fixtures ────────────────────────────────────────────────────────────────
-- 01 owner, 02 tech on team A, 03 manager on team A, 04 tech on team B, 05 plain member

INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
  is_super_admin, role, aud,
  confirmation_token, recovery_token, email_change_token_new, email_change
) VALUES
  ('33000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'wot-owner@equipqr.test', extensions.crypt('password123', extensions.gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}'::jsonb, '{"name":"WOT Owner"}'::jsonb, false, 'authenticated', 'authenticated', '', '', '', ''),
  ('33000000-0000-0000-0000-000000000002'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'wot-tech-a@equipqr.test', extensions.crypt('password123', extensions.gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}'::jsonb, '{"name":"WOT Tech A"}'::jsonb, false, 'authenticated', 'authenticated', '', '', '', ''),
  ('33000000-0000-0000-0000-000000000003'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'wot-manager-a@equipqr.test', extensions.crypt('password123', extensions.gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}'::jsonb, '{"name":"WOT Manager A"}'::jsonb, false, 'authenticated', 'authenticated', '', '', '', ''),
  ('33000000-0000-0000-0000-000000000004'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'wot-tech-b@equipqr.test', extensions.crypt('password123', extensions.gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}'::jsonb, '{"name":"WOT Tech B"}'::jsonb, false, 'authenticated', 'authenticated', '', '', '', ''),
  ('33000000-0000-0000-0000-000000000005'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'wot-plain@equipqr.test', extensions.crypt('password123', extensions.gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}'::jsonb, '{"name":"WOT Plain"}'::jsonb, false, 'authenticated', 'authenticated', '', '', '', '')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.organizations (id, name, plan, member_count, max_members)
VALUES ('33000000-aaaa-0000-0000-000000000001'::uuid, 'WO Team Org', 'free', 5, 10)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.organization_members (organization_id, user_id, role, status, joined_date)
VALUES
  ('33000000-aaaa-0000-0000-000000000001'::uuid, '33000000-0000-0000-0000-000000000001'::uuid, 'owner', 'active', NOW()),
  ('33000000-aaaa-0000-0000-000000000001'::uuid, '33000000-0000-0000-0000-000000000002'::uuid, 'member', 'active', NOW()),
  ('33000000-aaaa-0000-0000-000000000001'::uuid, '33000000-0000-0000-0000-000000000003'::uuid, 'member', 'active', NOW()),
  ('33000000-aaaa-0000-0000-000000000001'::uuid, '33000000-0000-0000-0000-000000000004'::uuid, 'member', 'active', NOW()),
  ('33000000-aaaa-0000-0000-000000000001'::uuid, '33000000-0000-0000-0000-000000000005'::uuid, 'member', 'active', NOW())
ON CONFLICT DO NOTHING;

INSERT INTO public.teams (id, organization_id, name)
VALUES
  ('33000000-bbbb-0000-0000-00000000000a'::uuid, '33000000-aaaa-0000-0000-000000000001'::uuid, 'WOT Team A'),
  ('33000000-bbbb-0000-0000-00000000000b'::uuid, '33000000-aaaa-0000-0000-000000000001'::uuid, 'WOT Team B')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.team_members (team_id, user_id, role)
VALUES
  ('33000000-bbbb-0000-0000-00000000000a'::uuid, '33000000-0000-0000-0000-000000000002'::uuid, 'technician'),
  ('33000000-bbbb-0000-0000-00000000000a'::uuid, '33000000-0000-0000-0000-000000000003'::uuid, 'manager'),
  ('33000000-bbbb-0000-0000-00000000000b'::uuid, '33000000-0000-0000-0000-000000000004'::uuid, 'technician')
ON CONFLICT DO NOTHING;

INSERT INTO public.equipment (
  id, organization_id, name, manufacturer, model, serial_number, status, location, installation_date, team_id
) VALUES (
  '33000000-cccc-0000-0000-000000000001'::uuid,
  '33000000-aaaa-0000-0000-000000000001'::uuid,
  'WOT Loader', 'CAT', '950', 'SN-WOT-001', 'active', 'Yard', CURRENT_DATE,
  '33000000-bbbb-0000-0000-00000000000a'::uuid
);

INSERT INTO public.work_orders (
  id, organization_id, equipment_id, title, description, created_by, status, priority
) VALUES (
  '33000000-dddd-0000-0000-000000000001'::uuid,
  '33000000-aaaa-0000-0000-000000000001'::uuid,
  '33000000-cccc-0000-0000-000000000001'::uuid,
  'WOT Work Order', 'Team comes from equipment', '33000000-0000-0000-0000-000000000001'::uuid,
  'submitted', 'medium'
);

-- ── Schema ──────────────────────────────────────────────────────────────────

SELECT hasnt_column('public', 'work_orders', 'team_id', 'work_orders has no team_id column');
SELECT ok(
  NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_work_orders_team_id'),
  'idx_work_orders_team_id is gone'
);

-- ── Equipment on team A ─────────────────────────────────────────────────────

SELECT ok(
  public.can_access_work_order_costs('33000000-dddd-0000-0000-000000000001'::uuid, '33000000-0000-0000-0000-000000000002'::uuid),
  'team A technician can access costs while equipment is on team A'
);
SELECT ok(
  NOT public.can_access_work_order_costs('33000000-dddd-0000-0000-000000000001'::uuid, '33000000-0000-0000-0000-000000000004'::uuid),
  'team B technician cannot access costs while equipment is on team A'
);
SELECT ok(
  public.can_access_work_order_costs('33000000-dddd-0000-0000-000000000001'::uuid, '33000000-0000-0000-0000-000000000001'::uuid),
  'org owner can access costs'
);
SELECT ok(
  public.is_work_order_team_manager('33000000-0000-0000-0000-000000000003'::uuid, '33000000-dddd-0000-0000-000000000001'::uuid),
  'team A manager manages the work order while equipment is on team A'
);
SELECT ok(
  NOT public.is_work_order_team_manager('33000000-0000-0000-0000-000000000002'::uuid, '33000000-dddd-0000-0000-000000000001'::uuid),
  'team A technician is not a work order team manager'
);

-- ── Move the equipment to team B: the work order follows ────────────────────

UPDATE public.equipment
SET team_id = '33000000-bbbb-0000-0000-00000000000b'::uuid
WHERE id = '33000000-cccc-0000-0000-000000000001'::uuid;

SELECT ok(
  NOT public.can_access_work_order_costs('33000000-dddd-0000-0000-000000000001'::uuid, '33000000-0000-0000-0000-000000000002'::uuid),
  'team A technician loses cost access after the equipment moves to team B'
);
SELECT ok(
  public.can_access_work_order_costs('33000000-dddd-0000-0000-000000000001'::uuid, '33000000-0000-0000-0000-000000000004'::uuid),
  'team B technician gains cost access after the equipment moves to team B'
);
SELECT ok(
  NOT public.is_work_order_team_manager('33000000-0000-0000-0000-000000000003'::uuid, '33000000-dddd-0000-0000-000000000001'::uuid),
  'team A manager no longer manages the work order after the move'
);

-- ── Triggers: assignee validation and audit work without a team column ──────
-- Status history records auth.uid() as changed_by, so act as the org owner.
SELECT set_config('request.jwt.claim.sub', '33000000-0000-0000-0000-000000000001', true);
SELECT set_config('request.jwt.claims', json_build_object('sub', '33000000-0000-0000-0000-000000000001', 'role', 'authenticated')::text, true);

SELECT lives_ok(
  $$UPDATE public.work_orders
    SET assignee_id = '33000000-0000-0000-0000-000000000004'::uuid, status = 'assigned'
    WHERE id = '33000000-dddd-0000-0000-000000000001'::uuid$$,
  'assigning a team B technician succeeds (validate + audit triggers)'
);
SELECT throws_ok(
  $$UPDATE public.work_orders
    SET assignee_id = '33000000-0000-0000-0000-000000000002'::uuid
    WHERE id = '33000000-dddd-0000-0000-000000000001'::uuid$$,
  NULL,
  NULL,
  'assigning a team A technician to team B equipment is rejected'
);
SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM public.audit_log
    WHERE entity_id = '33000000-dddd-0000-0000-000000000001'::uuid
      AND (changes ? 'team_id' OR metadata ? 'team_id')
  ),
  'work order audit entries no longer record team_id'
);

-- ── Notifications carry the equipment team ──────────────────────────────────

SELECT lives_ok(
  $$SELECT public.create_work_order_notifications(
      '33000000-dddd-0000-0000-000000000001'::uuid, 'in_progress', '33000000-0000-0000-0000-000000000001'::uuid)$$,
  'create_work_order_notifications runs'
);
SELECT is(
  (SELECT count(*) FROM public.notifications
   WHERE data->>'work_order_id' = '33000000-dddd-0000-0000-000000000001'
     AND data->>'team_id' IS DISTINCT FROM '33000000-bbbb-0000-0000-00000000000b'),
  0::bigint,
  'work order notifications reference the equipment team'
);

-- ── As the org owner: export and historical creation ────────────────────────

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '33000000-0000-0000-0000-000000000001', true);
SELECT set_config('request.jwt.claims', json_build_object('sub', '33000000-0000-0000-0000-000000000001', 'role', 'authenticated')::text, true);

SELECT is(
  jsonb_array_length(public.export_work_orders_csv_rows(
    '33000000-aaaa-0000-0000-000000000001'::uuid,
    ARRAY['title', 'team_name'],
    p_team_id => '33000000-bbbb-0000-0000-00000000000b'::uuid
  )),
  1,
  'CSV export filtered to team B returns the work order'
);
SELECT is(
  public.export_work_orders_csv_rows(
    '33000000-aaaa-0000-0000-000000000001'::uuid,
    ARRAY['title', 'team_name'],
    p_team_id => '33000000-bbbb-0000-0000-00000000000b'::uuid
  )->0->>'team_name',
  'WOT Team B',
  'CSV export team_name is the equipment team'
);
SELECT is(
  jsonb_array_length(public.export_work_orders_csv_rows(
    '33000000-aaaa-0000-0000-000000000001'::uuid,
    ARRAY['title'],
    p_team_id => '33000000-bbbb-0000-0000-00000000000a'::uuid
  )),
  0,
  'CSV export filtered to team A no longer includes the work order'
);
SELECT is(
  jsonb_array_length(public.export_work_orders_csv_rows(
    '33000000-aaaa-0000-0000-000000000001'::uuid,
    ARRAY['title'],
    p_status => 'assigned',
    p_priority => 'medium'
  )),
  1,
  'CSV export status and priority filters compare enum columns to text'
);

SELECT is(
  (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'create_historical_work_order_with_pm'
     AND NOT ('p_team_id' = ANY (p.proargnames))),
  2::bigint,
  'both create_historical_work_order_with_pm overloads exist and neither takes p_team_id'
);
SELECT is(
  (public.create_historical_work_order_with_pm(
    p_organization_id => '33000000-aaaa-0000-0000-000000000001'::uuid,
    p_equipment_id => '33000000-cccc-0000-0000-000000000001'::uuid,
    p_title => 'WOT Historical Timeline',
    p_description => 'Historical with timeline overload',
    p_priority => 'low',
    p_status => 'completed',
    p_historical_start_date => NOW() - interval '20 days',
    p_assignee_id => '33000000-0000-0000-0000-000000000004'::uuid,
    p_completed_date => NOW() - interval '19 days',
    p_timeline_events => NULL
  ))->>'success',
  'true',
  'historical creation via the timeline overload succeeds'
);

-- ── work_order_notes insert policy uses the equipment team ──────────────────

SELECT set_config('request.jwt.claim.sub', '33000000-0000-0000-0000-000000000004', true);
SELECT set_config('request.jwt.claims', json_build_object('sub', '33000000-0000-0000-0000-000000000004', 'role', 'authenticated')::text, true);
SELECT lives_ok(
  $$INSERT INTO public.work_order_notes (work_order_id, author_id, content, is_private)
    VALUES ('33000000-dddd-0000-0000-000000000001'::uuid, '33000000-0000-0000-0000-000000000004'::uuid, 'Team B note', true)$$,
  'team B technician can add a private note (equipment is on team B)'
);

SELECT set_config('request.jwt.claim.sub', '33000000-0000-0000-0000-000000000002', true);
SELECT set_config('request.jwt.claims', json_build_object('sub', '33000000-0000-0000-0000-000000000002', 'role', 'authenticated')::text, true);
SELECT throws_ok(
  $$INSERT INTO public.work_order_notes (work_order_id, author_id, content, is_private)
    VALUES ('33000000-dddd-0000-0000-000000000001'::uuid, '33000000-0000-0000-0000-000000000002'::uuid, 'Team A note', false)$$,
  '42501',
  NULL,
  'team A technician cannot add notes after the equipment moved to team B'
);

SELECT set_config('request.jwt.claim.sub', '33000000-0000-0000-0000-000000000005', true);
SELECT set_config('request.jwt.claims', json_build_object('sub', '33000000-0000-0000-0000-000000000005', 'role', 'authenticated')::text, true);
SELECT throws_ok(
  $$INSERT INTO public.work_order_notes (work_order_id, author_id, content, is_private)
    VALUES ('33000000-dddd-0000-0000-000000000001'::uuid, '33000000-0000-0000-0000-000000000005'::uuid, 'Plain note', false)$$,
  '42501',
  NULL,
  'plain member with no team cannot add notes'
);

RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
