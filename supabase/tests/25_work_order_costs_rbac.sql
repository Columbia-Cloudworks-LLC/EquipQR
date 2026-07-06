BEGIN;
SELECT plan(19);

-- ============================================================================
-- Work order costs RBAC — customer roles (requestor/viewer) and plain members
-- must be oblivious to cost line items (parts, pricing, labor).
-- Covers can_access_work_order_costs, work_order_costs RLS, and
-- work-order-scoped Parts Consumer inventory adjustments.
-- ============================================================================

INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
  is_super_admin, role, aud,
  confirmation_token, recovery_token, email_change_token_new, email_change
) VALUES
  ('25000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'costs-owner@equipqr.test', extensions.crypt('password123', extensions.gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}'::jsonb, '{"name":"Costs Owner"}'::jsonb, false, 'authenticated', 'authenticated', '', '', '', ''),
  ('25000000-0000-0000-0000-000000000002'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'costs-tech@equipqr.test', extensions.crypt('password123', extensions.gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}'::jsonb, '{"name":"Costs Tech"}'::jsonb, false, 'authenticated', 'authenticated', '', '', '', ''),
  ('25000000-0000-0000-0000-000000000003'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'costs-requestor@equipqr.test', extensions.crypt('password123', extensions.gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}'::jsonb, '{"name":"Costs Requestor"}'::jsonb, false, 'authenticated', 'authenticated', '', '', '', ''),
  ('25000000-0000-0000-0000-000000000004'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'costs-viewer@equipqr.test', extensions.crypt('password123', extensions.gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}'::jsonb, '{"name":"Costs Viewer"}'::jsonb, false, 'authenticated', 'authenticated', '', '', '', ''),
  ('25000000-0000-0000-0000-000000000005'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'costs-plain@equipqr.test', extensions.crypt('password123', extensions.gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}'::jsonb, '{"name":"Costs Plain"}'::jsonb, false, 'authenticated', 'authenticated', '', '', '', ''),
  ('25000000-0000-0000-0000-000000000006'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'costs-assignee@equipqr.test', extensions.crypt('password123', extensions.gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}'::jsonb, '{"name":"Costs Assignee"}'::jsonb, false, 'authenticated', 'authenticated', '', '', '', '')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.organizations (id, name, plan, member_count, max_members)
VALUES ('25000000-aaaa-0000-0000-000000000001'::uuid, 'Costs RBAC Org', 'free', 6, 10)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.organization_members (organization_id, user_id, role, status, joined_date)
VALUES
  ('25000000-aaaa-0000-0000-000000000001'::uuid, '25000000-0000-0000-0000-000000000001'::uuid, 'owner', 'active', NOW()),
  ('25000000-aaaa-0000-0000-000000000001'::uuid, '25000000-0000-0000-0000-000000000002'::uuid, 'member', 'active', NOW()),
  ('25000000-aaaa-0000-0000-000000000001'::uuid, '25000000-0000-0000-0000-000000000003'::uuid, 'member', 'active', NOW()),
  ('25000000-aaaa-0000-0000-000000000001'::uuid, '25000000-0000-0000-0000-000000000004'::uuid, 'member', 'active', NOW()),
  ('25000000-aaaa-0000-0000-000000000001'::uuid, '25000000-0000-0000-0000-000000000005'::uuid, 'member', 'active', NOW()),
  ('25000000-aaaa-0000-0000-000000000001'::uuid, '25000000-0000-0000-0000-000000000006'::uuid, 'member', 'active', NOW())
ON CONFLICT DO NOTHING;

INSERT INTO public.teams (id, organization_id, name)
VALUES ('25000000-bbbb-0000-0000-000000000001'::uuid, '25000000-aaaa-0000-0000-000000000001'::uuid, 'Costs RBAC Team')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.team_members (team_id, user_id, role)
VALUES
  ('25000000-bbbb-0000-0000-000000000001'::uuid, '25000000-0000-0000-0000-000000000002'::uuid, 'technician'),
  ('25000000-bbbb-0000-0000-000000000001'::uuid, '25000000-0000-0000-0000-000000000003'::uuid, 'requestor'),
  ('25000000-bbbb-0000-0000-000000000001'::uuid, '25000000-0000-0000-0000-000000000004'::uuid, 'viewer')
ON CONFLICT DO NOTHING;

-- Inventory grants: tech + requestor are Parts Consumers; plain member is a
-- Parts Manager (manager grant must NOT leak work order cost visibility).
INSERT INTO public.parts_consumers (organization_id, user_id, assigned_by)
VALUES
  ('25000000-aaaa-0000-0000-000000000001'::uuid, '25000000-0000-0000-0000-000000000002'::uuid, '25000000-0000-0000-0000-000000000001'::uuid),
  ('25000000-aaaa-0000-0000-000000000001'::uuid, '25000000-0000-0000-0000-000000000003'::uuid, '25000000-0000-0000-0000-000000000001'::uuid)
ON CONFLICT DO NOTHING;

INSERT INTO public.parts_managers (organization_id, user_id, assigned_by)
VALUES ('25000000-aaaa-0000-0000-000000000001'::uuid, '25000000-0000-0000-0000-000000000005'::uuid, '25000000-0000-0000-0000-000000000001'::uuid)
ON CONFLICT DO NOTHING;

INSERT INTO public.equipment (
  id, organization_id, name, manufacturer, model, serial_number, status, location, installation_date, team_id
) VALUES (
  '25000000-cccc-0000-0000-000000000001'::uuid,
  '25000000-aaaa-0000-0000-000000000001'::uuid,
  'Costs RBAC Forklift', 'Toyota', '8FGCU25', 'SN-COSTS-001', 'active', 'Warehouse A', CURRENT_DATE,
  '25000000-bbbb-0000-0000-000000000001'::uuid
);

INSERT INTO public.work_orders (
  id, organization_id, equipment_id, title, description, created_by, status, priority, team_id
) VALUES (
  '25000000-dddd-0000-0000-000000000001'::uuid,
  '25000000-aaaa-0000-0000-000000000001'::uuid,
  '25000000-cccc-0000-0000-000000000001'::uuid,
  'Costs RBAC WO', 'Work order with cost rows', '25000000-0000-0000-0000-000000000003'::uuid,
  'submitted', 'medium',
  '25000000-bbbb-0000-0000-000000000001'::uuid
);

-- Simulate a legacy/edge assignee who is not on the work order's team
-- (validate_work_order_assignee blocks this through normal writes today, but
-- can_access_work_order_costs must still handle historical rows). Triggers are
-- bypassed for this fixture tweak only.
SET LOCAL session_replication_role = 'replica';
UPDATE public.work_orders
SET assignee_id = '25000000-0000-0000-0000-000000000006'::uuid
WHERE id = '25000000-dddd-0000-0000-000000000001'::uuid;
SET LOCAL session_replication_role = 'origin';

INSERT INTO public.work_order_costs (id, work_order_id, description, quantity, unit_price_cents, created_by)
VALUES (
  '25000000-eeee-0000-0000-000000000001'::uuid,
  '25000000-dddd-0000-0000-000000000001'::uuid,
  'Labor', 2, 7500, '25000000-0000-0000-0000-000000000001'::uuid
);

INSERT INTO public.inventory_items (id, organization_id, name, quantity_on_hand, low_stock_threshold, created_by)
VALUES (
  '25000000-ffff-0000-0000-000000000001'::uuid,
  '25000000-aaaa-0000-0000-000000000001'::uuid,
  'Costs RBAC Part', 10, 1, '25000000-0000-0000-0000-000000000001'::uuid
)
ON CONFLICT (id) DO NOTHING;

-- ── Helper function semantics ───────────────────────────────────────────────

SELECT has_function('public', 'can_access_work_order_costs', ARRAY['uuid', 'uuid'], 'can_access_work_order_costs exists');

SELECT ok(
  public.can_access_work_order_costs('25000000-dddd-0000-0000-000000000001'::uuid, '25000000-0000-0000-0000-000000000001'::uuid),
  'org owner can access work order costs'
);

SELECT ok(
  public.can_access_work_order_costs('25000000-dddd-0000-0000-000000000001'::uuid, '25000000-0000-0000-0000-000000000002'::uuid),
  'team technician can access work order costs'
);

SELECT ok(
  NOT public.can_access_work_order_costs('25000000-dddd-0000-0000-000000000001'::uuid, '25000000-0000-0000-0000-000000000003'::uuid),
  'team requestor cannot access work order costs'
);

SELECT ok(
  NOT public.can_access_work_order_costs('25000000-dddd-0000-0000-000000000001'::uuid, '25000000-0000-0000-0000-000000000004'::uuid),
  'team viewer cannot access work order costs'
);

SELECT ok(
  NOT public.can_access_work_order_costs('25000000-dddd-0000-0000-000000000001'::uuid, '25000000-0000-0000-0000-000000000005'::uuid),
  'plain member (even Parts Manager) cannot access work order costs'
);

SELECT ok(
  public.can_access_work_order_costs('25000000-dddd-0000-0000-000000000001'::uuid, '25000000-0000-0000-0000-000000000006'::uuid),
  'work order assignee (not on team) can access work order costs'
);

-- ── RLS behavior: SELECT ────────────────────────────────────────────────────

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '25000000-0000-0000-0000-000000000003', true);
SELECT set_config('request.jwt.claims', json_build_object('sub', '25000000-0000-0000-0000-000000000003')::text, true);

SELECT is(
  (SELECT count(*)::int FROM public.work_order_costs WHERE work_order_id = '25000000-dddd-0000-0000-000000000001'::uuid),
  0,
  'requestor cannot read work order cost rows via RLS (even on own work order)'
);

SELECT set_config('request.jwt.claim.sub', '25000000-0000-0000-0000-000000000004', true);
SELECT set_config('request.jwt.claims', json_build_object('sub', '25000000-0000-0000-0000-000000000004')::text, true);

SELECT is(
  (SELECT count(*)::int FROM public.work_order_costs WHERE work_order_id = '25000000-dddd-0000-0000-000000000001'::uuid),
  0,
  'viewer cannot read work order cost rows via RLS'
);

SELECT set_config('request.jwt.claim.sub', '25000000-0000-0000-0000-000000000005', true);
SELECT set_config('request.jwt.claims', json_build_object('sub', '25000000-0000-0000-0000-000000000005')::text, true);

SELECT is(
  (SELECT count(*)::int FROM public.work_order_costs WHERE work_order_id = '25000000-dddd-0000-0000-000000000001'::uuid),
  0,
  'plain member cannot read work order cost rows via RLS'
);

SELECT set_config('request.jwt.claim.sub', '25000000-0000-0000-0000-000000000002', true);
SELECT set_config('request.jwt.claims', json_build_object('sub', '25000000-0000-0000-0000-000000000002')::text, true);

SELECT is(
  (SELECT count(*)::int FROM public.work_order_costs WHERE work_order_id = '25000000-dddd-0000-0000-000000000001'::uuid),
  1,
  'team technician can read work order cost rows via RLS'
);

SELECT set_config('request.jwt.claim.sub', '25000000-0000-0000-0000-000000000001', true);
SELECT set_config('request.jwt.claims', json_build_object('sub', '25000000-0000-0000-0000-000000000001')::text, true);

SELECT is(
  (SELECT count(*)::int FROM public.work_order_costs WHERE work_order_id = '25000000-dddd-0000-0000-000000000001'::uuid),
  1,
  'org owner can read work order cost rows via RLS'
);

-- ── RLS behavior: INSERT ────────────────────────────────────────────────────

SELECT set_config('request.jwt.claim.sub', '25000000-0000-0000-0000-000000000003', true);
SELECT set_config('request.jwt.claims', json_build_object('sub', '25000000-0000-0000-0000-000000000003')::text, true);

SELECT throws_ok($$
  INSERT INTO public.work_order_costs (work_order_id, description, quantity, unit_price_cents, created_by)
  VALUES ('25000000-dddd-0000-0000-000000000001'::uuid, 'Requestor cost', 1, 100, '25000000-0000-0000-0000-000000000003'::uuid);
$$, '42501', NULL, 'requestor cannot insert work order cost rows');

SELECT set_config('request.jwt.claim.sub', '25000000-0000-0000-0000-000000000002', true);
SELECT set_config('request.jwt.claims', json_build_object('sub', '25000000-0000-0000-0000-000000000002')::text, true);

SELECT lives_ok($$
  INSERT INTO public.work_order_costs (work_order_id, description, quantity, unit_price_cents, created_by)
  VALUES ('25000000-dddd-0000-0000-000000000001'::uuid, 'Tech part', 1, 500, '25000000-0000-0000-0000-000000000002'::uuid);
$$, 'team technician can insert work order cost rows');

-- ── adjust_inventory_quantity: work-order-scoped Parts Consumer access ──────

-- consumer + technician: work-order-scoped consumption allowed
SELECT is(
  public.adjust_inventory_quantity(
    '25000000-ffff-0000-0000-000000000001'::uuid,
    -2,
    'Used in work order (pgTAP)',
    '25000000-dddd-0000-0000-000000000001'::uuid
  ),
  8,
  'Parts Consumer technician can consume inventory through a work order'
);

-- consumer + technician: non-work-order adjustment denied
SELECT throws_ok($$
  SELECT public.adjust_inventory_quantity(
    '25000000-ffff-0000-0000-000000000001'::uuid,
    -1,
    'Ad-hoc adjustment (pgTAP)'
  );
$$, 'User does not have permission to adjust inventory');

-- consumer + requestor: denied even with a work order (no cost access)
SELECT set_config('request.jwt.claim.sub', '25000000-0000-0000-0000-000000000003', true);
SELECT set_config('request.jwt.claims', json_build_object('sub', '25000000-0000-0000-0000-000000000003')::text, true);

SELECT throws_ok($$
  SELECT public.adjust_inventory_quantity(
    '25000000-ffff-0000-0000-000000000001'::uuid,
    -1,
    'Requestor consumption attempt (pgTAP)',
    '25000000-dddd-0000-0000-000000000001'::uuid
  );
$$, 'User does not have permission to adjust inventory');

-- assignee without any inventory grant: denied despite cost access
SELECT set_config('request.jwt.claim.sub', '25000000-0000-0000-0000-000000000006', true);
SELECT set_config('request.jwt.claims', json_build_object('sub', '25000000-0000-0000-0000-000000000006')::text, true);

SELECT throws_ok($$
  SELECT public.adjust_inventory_quantity(
    '25000000-ffff-0000-0000-000000000001'::uuid,
    -1,
    'Assignee without grant (pgTAP)',
    '25000000-dddd-0000-0000-000000000001'::uuid
  );
$$, 'User does not have permission to adjust inventory');

-- Parts Manager: free-standing adjustments still work (regression)
SELECT set_config('request.jwt.claim.sub', '25000000-0000-0000-0000-000000000005', true);
SELECT set_config('request.jwt.claims', json_build_object('sub', '25000000-0000-0000-0000-000000000005')::text, true);

SELECT is(
  public.adjust_inventory_quantity(
    '25000000-ffff-0000-0000-000000000001'::uuid,
    1,
    'Manager restock (pgTAP)'
  ),
  9,
  'Parts Manager can adjust inventory without a work order'
);

SELECT * FROM finish();
ROLLBACK;
