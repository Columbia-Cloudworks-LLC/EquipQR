BEGIN;
SELECT plan(11);

-- ============================================
-- Inventory RBAC — Parts Consumer (issue #1095)
-- ============================================

INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
  is_super_admin, role, aud,
  confirmation_token, recovery_token, email_change_token_new, email_change
) VALUES
  ('22000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'rbac-owner@equipqr.test', extensions.crypt('password123', extensions.gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}'::jsonb, '{"name":"RBAC Owner"}'::jsonb, false, 'authenticated', 'authenticated', '', '', '', ''),
  ('22000000-0000-0000-0000-000000000002'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'rbac-member@equipqr.test', extensions.crypt('password123', extensions.gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}'::jsonb, '{"name":"RBAC Member"}'::jsonb, false, 'authenticated', 'authenticated', '', '', '', ''),
  ('22000000-0000-0000-0000-000000000003'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'rbac-consumer@equipqr.test', extensions.crypt('password123', extensions.gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}'::jsonb, '{"name":"RBAC Consumer"}'::jsonb, false, 'authenticated', 'authenticated', '', '', '', ''),
  ('22000000-0000-0000-0000-000000000004'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'rbac-manager@equipqr.test', extensions.crypt('password123', extensions.gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}'::jsonb, '{"name":"RBAC Manager"}'::jsonb, false, 'authenticated', 'authenticated', '', '', '', '')
ON CONFLICT (id) DO NOTHING;

INSERT INTO organizations (id, name, plan, member_count, max_members)
VALUES ('22000000-aaaa-0000-0000-000000000001'::uuid, 'Inventory RBAC Org', 'free', 4, 10)
ON CONFLICT (id) DO NOTHING;

INSERT INTO organization_members (user_id, organization_id, role, status, joined_date)
VALUES
  ('22000000-0000-0000-0000-000000000001'::uuid, '22000000-aaaa-0000-0000-000000000001'::uuid, 'owner', 'active', NOW()),
  ('22000000-0000-0000-0000-000000000002'::uuid, '22000000-aaaa-0000-0000-000000000001'::uuid, 'member', 'active', NOW()),
  ('22000000-0000-0000-0000-000000000003'::uuid, '22000000-aaaa-0000-0000-000000000001'::uuid, 'member', 'active', NOW()),
  ('22000000-0000-0000-0000-000000000004'::uuid, '22000000-aaaa-0000-0000-000000000001'::uuid, 'member', 'active', NOW())
ON CONFLICT DO NOTHING;

INSERT INTO parts_consumers (organization_id, user_id, assigned_by)
VALUES (
  '22000000-aaaa-0000-0000-000000000001'::uuid,
  '22000000-0000-0000-0000-000000000003'::uuid,
  '22000000-0000-0000-0000-000000000001'::uuid
)
ON CONFLICT DO NOTHING;

INSERT INTO parts_managers (organization_id, user_id, assigned_by)
VALUES (
  '22000000-aaaa-0000-0000-000000000001'::uuid,
  '22000000-0000-0000-0000-000000000004'::uuid,
  '22000000-0000-0000-0000-000000000001'::uuid
)
ON CONFLICT DO NOTHING;

INSERT INTO inventory_items (id, organization_id, name, quantity_on_hand, low_stock_threshold, created_by)
VALUES (
  '22000000-bbbb-0000-0000-000000000001'::uuid,
  '22000000-aaaa-0000-0000-000000000001'::uuid,
  'RBAC Test Item',
  5,
  1,
  '22000000-0000-0000-0000-000000000001'::uuid
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO part_alternate_groups (id, organization_id, name, status, created_by)
VALUES (
  '22000000-dddd-0000-0000-000000000001'::uuid,
  '22000000-aaaa-0000-0000-000000000001'::uuid,
  'RBAC Alt Group',
  'unverified',
  '22000000-0000-0000-0000-000000000001'::uuid
)
ON CONFLICT (id) DO NOTHING;

SELECT has_function('public', 'can_access_inventory', ARRAY['uuid', 'uuid'], 'can_access_inventory exists');
SELECT has_function('public', 'is_parts_consumer', ARRAY['uuid', 'uuid'], 'is_parts_consumer exists');
SELECT has_table('public', 'parts_consumers', 'parts_consumers table exists');

SELECT ok(
  public.can_access_inventory('22000000-aaaa-0000-0000-000000000001'::uuid, '22000000-0000-0000-0000-000000000001'::uuid),
  'owner can access inventory'
);

SELECT ok(
  public.can_access_inventory('22000000-aaaa-0000-0000-000000000001'::uuid, '22000000-0000-0000-0000-000000000003'::uuid),
  'parts consumer can access inventory'
);

SELECT ok(
  NOT public.can_access_inventory('22000000-aaaa-0000-0000-000000000001'::uuid, '22000000-0000-0000-0000-000000000002'::uuid),
  'plain member cannot access inventory'
);

SET LOCAL role = 'authenticated';
SET LOCAL request.jwt.claims = '{"sub":"22000000-0000-0000-0000-000000000002","role":"authenticated"}';

SELECT is(
  (SELECT count(*) FROM inventory_items WHERE organization_id = '22000000-aaaa-0000-0000-000000000001'::uuid)::int,
  0,
  'plain member cannot read inventory_items via RLS'
);

SET LOCAL request.jwt.claims = '{"sub":"22000000-0000-0000-0000-000000000003","role":"authenticated"}';

SELECT is(
  (SELECT count(*) FROM inventory_items WHERE organization_id = '22000000-aaaa-0000-0000-000000000001'::uuid)::int,
  1,
  'parts consumer can read inventory_items via RLS'
);

SELECT is(
  (SELECT count(*) FROM part_alternate_groups WHERE organization_id = '22000000-aaaa-0000-0000-000000000001'::uuid)::int,
  1,
  'parts consumer can read alternate groups via RLS'
);

SET LOCAL request.jwt.claims = '{"sub":"22000000-0000-0000-0000-000000000002","role":"authenticated"}';

SELECT throws_like(
  $$ SELECT public.adjust_inventory_quantity(
    '22000000-bbbb-0000-0000-000000000001'::uuid,
    1,
    'test adjustment'::text
  ) $$,
  '%permission%adjust inventory%',
  'plain member cannot adjust inventory quantity'
);

SET LOCAL request.jwt.claims = '{"sub":"22000000-0000-0000-0000-000000000004","role":"authenticated"}';

SELECT lives_ok(
  $$ SELECT public.adjust_inventory_quantity(
    '22000000-bbbb-0000-0000-000000000001'::uuid,
    1,
    'manager adjustment'::text
  ) $$,
  'parts manager can adjust inventory quantity'
);

SELECT * FROM finish();
ROLLBACK;
