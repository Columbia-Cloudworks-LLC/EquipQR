BEGIN;
SELECT plan(25);

-- ============================================================================
-- Equipment INSERT/DELETE are team-scoped at the database layer (#650), and
-- no table carries more than one permissive policy per role and action.
-- ============================================================================

-- Users: 1 owner, 2 team-A manager, 3 team-A technician, 4 team-A viewer,
--        5 plain member (no team), 6 owner of a different org
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
  is_super_admin, role, aud,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
SELECT
  ('36000000-0000-0000-0000-00000000000' || n)::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'eq-rls-' || n || '@equipqr.test',
  extensions.crypt('password123', extensions.gen_salt('bf')),
  NOW(), NOW(), NOW(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('name', 'Equipment RLS User ' || n),
  false, 'authenticated', 'authenticated', '', '', '', ''
FROM generate_series(1, 6) AS n
ON CONFLICT (id) DO NOTHING;

INSERT INTO organizations (id, name, plan, member_count, max_members)
VALUES
  ('36000000-aaaa-0000-0000-000000000001'::uuid, 'Equipment RLS Org', 'free', 5, 10),
  ('36000000-aaaa-0000-0000-000000000002'::uuid, 'Equipment RLS Other Org', 'free', 1, 10)
ON CONFLICT (id) DO NOTHING;

INSERT INTO organization_members (user_id, organization_id, role, status, joined_date)
VALUES
  ('36000000-0000-0000-0000-000000000001'::uuid, '36000000-aaaa-0000-0000-000000000001'::uuid, 'owner', 'active', NOW()),
  ('36000000-0000-0000-0000-000000000002'::uuid, '36000000-aaaa-0000-0000-000000000001'::uuid, 'member', 'active', NOW()),
  ('36000000-0000-0000-0000-000000000003'::uuid, '36000000-aaaa-0000-0000-000000000001'::uuid, 'member', 'active', NOW()),
  ('36000000-0000-0000-0000-000000000004'::uuid, '36000000-aaaa-0000-0000-000000000001'::uuid, 'member', 'active', NOW()),
  ('36000000-0000-0000-0000-000000000005'::uuid, '36000000-aaaa-0000-0000-000000000001'::uuid, 'member', 'active', NOW()),
  ('36000000-0000-0000-0000-000000000006'::uuid, '36000000-aaaa-0000-0000-000000000002'::uuid, 'owner', 'active', NOW())
ON CONFLICT DO NOTHING;

INSERT INTO teams (id, organization_id, name)
VALUES
  ('36000000-bbbb-0000-0000-00000000000a'::uuid, '36000000-aaaa-0000-0000-000000000001'::uuid, 'Equipment RLS Team A'),
  ('36000000-bbbb-0000-0000-00000000000b'::uuid, '36000000-aaaa-0000-0000-000000000001'::uuid, 'Equipment RLS Team B')
ON CONFLICT (id) DO NOTHING;

INSERT INTO team_members (team_id, user_id, role)
VALUES
  ('36000000-bbbb-0000-0000-00000000000a'::uuid, '36000000-0000-0000-0000-000000000002'::uuid, 'manager'),
  ('36000000-bbbb-0000-0000-00000000000a'::uuid, '36000000-0000-0000-0000-000000000003'::uuid, 'technician'),
  ('36000000-bbbb-0000-0000-00000000000a'::uuid, '36000000-0000-0000-0000-000000000004'::uuid, 'viewer')
ON CONFLICT DO NOTHING;

-- Existing equipment: e1 and e2 on team A, e3 on team B, e4 unassigned
INSERT INTO equipment (id, organization_id, team_id, name, manufacturer, model, serial_number, status, location, installation_date)
VALUES
  ('36000000-cccc-0000-0000-000000000001'::uuid, '36000000-aaaa-0000-0000-000000000001'::uuid, '36000000-bbbb-0000-0000-00000000000a'::uuid, 'RLS Unit 1', 'Acme', 'X1', 'SN-EQRLS-1', 'active', 'Yard', CURRENT_DATE),
  ('36000000-cccc-0000-0000-000000000002'::uuid, '36000000-aaaa-0000-0000-000000000001'::uuid, '36000000-bbbb-0000-0000-00000000000a'::uuid, 'RLS Unit 2', 'Acme', 'X1', 'SN-EQRLS-2', 'active', 'Yard', CURRENT_DATE),
  ('36000000-cccc-0000-0000-000000000003'::uuid, '36000000-aaaa-0000-0000-000000000001'::uuid, '36000000-bbbb-0000-0000-00000000000b'::uuid, 'RLS Unit 3', 'Acme', 'X1', 'SN-EQRLS-3', 'active', 'Yard', CURRENT_DATE),
  ('36000000-cccc-0000-0000-000000000004'::uuid, '36000000-aaaa-0000-0000-000000000001'::uuid, NULL, 'RLS Unit 4', 'Acme', 'X1', 'SN-EQRLS-4', 'active', 'Yard', CURRENT_DATE)
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- Structural: one permissive policy per role and action, everywhere in public
-- ----------------------------------------------------------------------------

SELECT is(
  (SELECT count(*)::int FROM (
     SELECT p.tablename
     FROM pg_policies p
     CROSS JOIN LATERAL unnest(p.roles) AS r(role_name)
     CROSS JOIN LATERAL unnest(
       CASE WHEN p.cmd = 'ALL'
            THEN ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE']
            ELSE ARRAY[p.cmd] END
     ) AS a(action)
     WHERE p.schemaname = 'public'
       AND p.permissive = 'PERMISSIVE'
       AND p.tablename IN ('equipment', 'equipment_note_images', 'teams', 'work_orders')
     GROUP BY p.tablename, r.role_name, a.action
     HAVING count(*) > 1
   ) dup),
  0,
  'equipment, equipment_note_images, teams and work_orders have one permissive policy per role and action'
);

SELECT is(
  (SELECT count(*)::int FROM pg_policies
   WHERE schemaname = 'public'
     AND (tablename, policyname) IN (
       ('equipment_note_images', 'Users can upload images to their notes'),
       ('equipment_note_images', 'Users can view images for accessible notes'),
       ('organization_members', 'organization_members_insert'),
       ('organization_members', 'organization_members_update'),
       ('organization_members', 'organization_members_delete'),
       ('teams', 'admins_manage_teams'),
       ('teams', 'admins_delete_teams'),
       ('teams', 'admins_update_teams'),
       ('teams', 'members_view_teams'),
       ('work_orders', 'members_access_work_orders'),
       ('work_orders', 'admins_delete_work_orders'),
       ('work_orders', 'Admins can create historical work orders'),
       ('work_orders', 'Users can create work orders in their organization'),
       ('work_orders', 'Users can view work orders in their organization'),
       ('work_orders', 'Admins can update historical work orders'),
       ('work_orders', 'Users can update work orders in their organization')
     )),
  0,
  'legacy duplicate policies are dropped'
);

SELECT is(
  (SELECT array_agg(tablename::text || ':' || n ORDER BY tablename)
   FROM (
     SELECT tablename, count(*)::int AS n FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename IN ('equipment', 'equipment_note_images', 'organization_members', 'teams', 'work_orders')
     GROUP BY tablename
   ) t),
  ARRAY['equipment:4', 'equipment_note_images:3', 'organization_members:5', 'teams:4', 'work_orders:4'],
  'policy counts match production on the affected tables'
);

-- ----------------------------------------------------------------------------
-- Behavior: INSERT
-- ----------------------------------------------------------------------------

SET LOCAL role = 'authenticated';

-- Plain member with no team role
SET LOCAL request.jwt.claims = '{"sub":"36000000-0000-0000-0000-000000000005","role":"authenticated"}';

SELECT throws_ok(
  $$ INSERT INTO public.equipment (organization_id, team_id, name, manufacturer, model, serial_number, status, location, installation_date)
     VALUES ('36000000-aaaa-0000-0000-000000000001', NULL, 'Denied', 'Acme', 'X1', 'SN-EQRLS-D1', 'active', 'Yard', CURRENT_DATE) $$,
  '42501', NULL,
  'member without a team role cannot insert unassigned equipment'
);

SELECT throws_ok(
  $$ INSERT INTO public.equipment (organization_id, team_id, name, manufacturer, model, serial_number, status, location, installation_date)
     VALUES ('36000000-aaaa-0000-0000-000000000001', '36000000-bbbb-0000-0000-00000000000a', 'Denied', 'Acme', 'X1', 'SN-EQRLS-D2', 'active', 'Yard', CURRENT_DATE) $$,
  '42501', NULL,
  'member without a team role cannot insert equipment for a team'
);

SELECT is(
  (SELECT count(*)::int FROM public.equipment WHERE organization_id = '36000000-aaaa-0000-0000-000000000001'),
  4,
  'member without a team role can still read equipment in their org'
);

WITH u AS (
  UPDATE public.equipment SET location = 'Yard 2'
  WHERE id = '36000000-cccc-0000-0000-000000000004' RETURNING 1
)
SELECT is((SELECT count(*)::int FROM u), 1, 'member UPDATE behavior is unchanged');

WITH d AS (
  DELETE FROM public.equipment WHERE id = '36000000-cccc-0000-0000-000000000004' RETURNING 1
)
SELECT is((SELECT count(*)::int FROM d), 0, 'member without a team role cannot delete equipment');

-- Team viewer
SET LOCAL request.jwt.claims = '{"sub":"36000000-0000-0000-0000-000000000004","role":"authenticated"}';

SELECT throws_ok(
  $$ INSERT INTO public.equipment (organization_id, team_id, name, manufacturer, model, serial_number, status, location, installation_date)
     VALUES ('36000000-aaaa-0000-0000-000000000001', '36000000-bbbb-0000-0000-00000000000a', 'Denied', 'Acme', 'X1', 'SN-EQRLS-D3', 'active', 'Yard', CURRENT_DATE) $$,
  '42501', NULL,
  'team viewer cannot insert equipment for their team'
);

WITH d AS (
  DELETE FROM public.equipment WHERE id = '36000000-cccc-0000-0000-000000000001' RETURNING 1
)
SELECT is((SELECT count(*)::int FROM d), 0, 'team viewer cannot delete equipment on their team');

-- Team technician
SET LOCAL request.jwt.claims = '{"sub":"36000000-0000-0000-0000-000000000003","role":"authenticated"}';

SELECT lives_ok(
  $$ INSERT INTO public.equipment (organization_id, team_id, name, manufacturer, model, serial_number, status, location, installation_date)
     VALUES ('36000000-aaaa-0000-0000-000000000001', '36000000-bbbb-0000-0000-00000000000a', 'Tech Unit', 'Acme', 'X1', 'SN-EQRLS-T1', 'active', 'Yard', CURRENT_DATE) $$,
  'technician can insert equipment for their own team'
);

SELECT throws_ok(
  $$ INSERT INTO public.equipment (organization_id, team_id, name, manufacturer, model, serial_number, status, location, installation_date)
     VALUES ('36000000-aaaa-0000-0000-000000000001', '36000000-bbbb-0000-0000-00000000000b', 'Denied', 'Acme', 'X1', 'SN-EQRLS-D4', 'active', 'Yard', CURRENT_DATE) $$,
  '42501', NULL,
  'technician cannot insert equipment for another team'
);

SELECT throws_ok(
  $$ INSERT INTO public.equipment (organization_id, team_id, name, manufacturer, model, serial_number, status, location, installation_date)
     VALUES ('36000000-aaaa-0000-0000-000000000001', NULL, 'Denied', 'Acme', 'X1', 'SN-EQRLS-D5', 'active', 'Yard', CURRENT_DATE) $$,
  '42501', NULL,
  'technician cannot insert unassigned equipment'
);

WITH d AS (
  DELETE FROM public.equipment WHERE id = '36000000-cccc-0000-0000-000000000001' RETURNING 1
)
SELECT is((SELECT count(*)::int FROM d), 0, 'technician cannot delete equipment on their team');

-- Team manager
SET LOCAL request.jwt.claims = '{"sub":"36000000-0000-0000-0000-000000000002","role":"authenticated"}';

SELECT lives_ok(
  $$ INSERT INTO public.equipment (organization_id, team_id, name, manufacturer, model, serial_number, status, location, installation_date)
     VALUES ('36000000-aaaa-0000-0000-000000000001', '36000000-bbbb-0000-0000-00000000000a', 'Manager Unit', 'Acme', 'X1', 'SN-EQRLS-M1', 'active', 'Yard', CURRENT_DATE) $$,
  'manager can insert equipment for their own team'
);

SELECT throws_ok(
  $$ INSERT INTO public.equipment (organization_id, team_id, name, manufacturer, model, serial_number, status, location, installation_date)
     VALUES ('36000000-aaaa-0000-0000-000000000001', '36000000-bbbb-0000-0000-00000000000b', 'Denied', 'Acme', 'X1', 'SN-EQRLS-D6', 'active', 'Yard', CURRENT_DATE) $$,
  '42501', NULL,
  'manager cannot insert equipment for another team'
);

WITH d AS (
  DELETE FROM public.equipment WHERE id = '36000000-cccc-0000-0000-000000000003' RETURNING 1
)
SELECT is((SELECT count(*)::int FROM d), 0, 'manager cannot delete equipment on another team');

WITH d AS (
  DELETE FROM public.equipment WHERE id = '36000000-cccc-0000-0000-000000000004' RETURNING 1
)
SELECT is((SELECT count(*)::int FROM d), 0, 'manager cannot delete unassigned equipment');

WITH d AS (
  DELETE FROM public.equipment WHERE id = '36000000-cccc-0000-0000-000000000001' RETURNING 1
)
SELECT is((SELECT count(*)::int FROM d), 1, 'manager can delete equipment on their own team');

-- Owner of a different organization
SET LOCAL request.jwt.claims = '{"sub":"36000000-0000-0000-0000-000000000006","role":"authenticated"}';

SELECT throws_ok(
  $$ INSERT INTO public.equipment (organization_id, team_id, name, manufacturer, model, serial_number, status, location, installation_date)
     VALUES ('36000000-aaaa-0000-0000-000000000001', NULL, 'Denied', 'Acme', 'X1', 'SN-EQRLS-D7', 'active', 'Yard', CURRENT_DATE) $$,
  '42501', NULL,
  'owner of another org cannot insert equipment into this org'
);

WITH d AS (
  DELETE FROM public.equipment WHERE id = '36000000-cccc-0000-0000-000000000002' RETURNING 1
)
SELECT is((SELECT count(*)::int FROM d), 0, 'owner of another org cannot delete equipment in this org');

-- Org owner
SET LOCAL request.jwt.claims = '{"sub":"36000000-0000-0000-0000-000000000001","role":"authenticated"}';

SELECT lives_ok(
  $$ INSERT INTO public.equipment (organization_id, team_id, name, manufacturer, model, serial_number, status, location, installation_date)
     VALUES ('36000000-aaaa-0000-0000-000000000001', NULL, 'Owner Unit', 'Acme', 'X1', 'SN-EQRLS-O1', 'active', 'Yard', CURRENT_DATE) $$,
  'org owner can insert unassigned equipment'
);

WITH d AS (
  DELETE FROM public.equipment WHERE id = '36000000-cccc-0000-0000-000000000003' RETURNING 1
)
SELECT is((SELECT count(*)::int FROM d), 1, 'org owner can delete equipment on any team');

WITH d AS (
  DELETE FROM public.equipment WHERE id = '36000000-cccc-0000-0000-000000000004' RETURNING 1
)
SELECT is((SELECT count(*)::int FROM d), 1, 'org owner can delete unassigned equipment');

RESET role;

SELECT is(
  (SELECT array_agg(serial_number ORDER BY serial_number) FROM public.equipment
   WHERE organization_id = '36000000-aaaa-0000-0000-000000000001'),
  ARRAY['SN-EQRLS-2', 'SN-EQRLS-M1', 'SN-EQRLS-O1', 'SN-EQRLS-T1'],
  'only the permitted inserts and deletes took effect'
);

SELECT * FROM finish();
ROLLBACK;
