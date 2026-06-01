BEGIN;
SELECT plan(7);

-- ============================================
-- Test: scan_follow_up_events RLS policies
-- Verifies organization-level isolation for
-- reads and that inserts are self-attributed.
-- ============================================

-- Create two test users in different orgs
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
  is_super_admin, role, aud,
  confirmation_token, recovery_token, email_change_token_new, email_change
) VALUES (
  '30000000-0000-0000-0000-000000000001'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'scanfollow-user1@equipqr.test',
  extensions.crypt('password123', extensions.gen_salt('bf')),
  NOW(), NOW(), NOW(),
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  '{"name": "ScanFollow User1"}'::jsonb,
  false, 'authenticated', 'authenticated', '', '', '', ''
) ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
  is_super_admin, role, aud,
  confirmation_token, recovery_token, email_change_token_new, email_change
) VALUES (
  '30000000-0000-0000-0000-000000000002'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'scanfollow-user2@equipqr.test',
  extensions.crypt('password123', extensions.gen_salt('bf')),
  NOW(), NOW(), NOW(),
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  '{"name": "ScanFollow User2"}'::jsonb,
  false, 'authenticated', 'authenticated', '', '', '', ''
) ON CONFLICT (id) DO NOTHING;

-- Create orgs manually (trigger may or may not create them)
INSERT INTO organizations (id, name, plan, member_count, max_members)
VALUES
  ('30000000-aaaa-0000-0000-000000000001'::uuid, 'ScanFollow Org A', 'free', 1, 10),
  ('30000000-aaaa-0000-0000-000000000002'::uuid, 'ScanFollow Org B', 'free', 1, 10)
ON CONFLICT (id) DO NOTHING;

-- Add members
INSERT INTO organization_members (user_id, organization_id, role, status, joined_date)
VALUES
  ('30000000-0000-0000-0000-000000000001'::uuid, '30000000-aaaa-0000-0000-000000000001'::uuid, 'owner', 'active', NOW()),
  ('30000000-0000-0000-0000-000000000002'::uuid, '30000000-aaaa-0000-0000-000000000002'::uuid, 'owner', 'active', NOW())
ON CONFLICT DO NOTHING;

-- Create equipment in each org
INSERT INTO public.equipment (id, organization_id, name, manufacturer, model, serial_number, status, location, installation_date)
VALUES
  ('30000000-bbbb-0000-0000-000000000001'::uuid, '30000000-aaaa-0000-0000-000000000001'::uuid, 'Equip A', 'Maker', 'M1', 'SN-SF-001', 'active', 'Yard A', CURRENT_DATE),
  ('30000000-bbbb-0000-0000-000000000002'::uuid, '30000000-aaaa-0000-0000-000000000002'::uuid, 'Equip B', 'Maker', 'M2', 'SN-SF-002', 'active', 'Yard B', CURRENT_DATE)
ON CONFLICT (id) DO NOTHING;

-- Create one scan per equipment (location NULL keeps the privacy/history triggers no-op)
INSERT INTO public.scans (id, equipment_id, scanned_by, scanned_at, location, notes)
VALUES
  ('30000000-cccc-0000-0000-000000000001'::uuid, '30000000-bbbb-0000-0000-000000000001'::uuid, '30000000-0000-0000-0000-000000000001'::uuid, NOW(), NULL, 'QR code scan'),
  ('30000000-cccc-0000-0000-000000000002'::uuid, '30000000-bbbb-0000-0000-000000000002'::uuid, '30000000-0000-0000-0000-000000000002'::uuid, NOW(), NULL, 'QR code scan')
ON CONFLICT (id) DO NOTHING;

-- Seed follow-up events as superuser
INSERT INTO public.scan_follow_up_events (id, scan_id, equipment_id, event_type, performed_by, performed_at)
VALUES
  ('30000000-dddd-0000-0000-000000000001'::uuid, '30000000-cccc-0000-0000-000000000001'::uuid, '30000000-bbbb-0000-0000-000000000001'::uuid, 'generic_work_order_created', '30000000-0000-0000-0000-000000000001'::uuid, NOW()),
  ('30000000-dddd-0000-0000-000000000002'::uuid, '30000000-cccc-0000-0000-000000000002'::uuid, '30000000-bbbb-0000-0000-000000000002'::uuid, 'note_image_added', '30000000-0000-0000-0000-000000000002'::uuid, NOW());

-- ============================================
-- TEST 1: RLS-protected table exists
-- ============================================
SELECT has_table('public', 'scan_follow_up_events', 'scan_follow_up_events table exists');

-- ============================================
-- TEST 2: User 1 can read events in their org
-- ============================================
SET LOCAL role = 'authenticated';
SET LOCAL request.jwt.claims = '{"sub":"30000000-0000-0000-0000-000000000001","role":"authenticated"}';

SELECT is(
  (SELECT count(*) FROM scan_follow_up_events WHERE id = '30000000-dddd-0000-0000-000000000001'::uuid)::int,
  1,
  'User 1 can read follow-up events in their org'
);

-- ============================================
-- TEST 3: User 1 cannot read another org's events
-- ============================================
SELECT is(
  (SELECT count(*) FROM scan_follow_up_events WHERE id = '30000000-dddd-0000-0000-000000000002'::uuid)::int,
  0,
  'User 1 cannot read follow-up events from another org'
);

-- ============================================
-- TEST 4: User 1 can insert a self-attributed event in their org
-- ============================================
SELECT lives_ok(
  $$INSERT INTO public.scan_follow_up_events (scan_id, equipment_id, event_type, performed_by)
    VALUES ('30000000-cccc-0000-0000-000000000001'::uuid, '30000000-bbbb-0000-0000-000000000001'::uuid, 'dashboard_opened', '30000000-0000-0000-0000-000000000001'::uuid)$$,
  'User 1 can insert a self-attributed follow-up event in their org'
);

-- ============================================
-- TEST 5: User 1 cannot insert an event attributed to another user
-- ============================================
SELECT throws_ok(
  $$INSERT INTO public.scan_follow_up_events (scan_id, equipment_id, event_type, performed_by)
    VALUES ('30000000-cccc-0000-0000-000000000001'::uuid, '30000000-bbbb-0000-0000-000000000001'::uuid, 'dashboard_opened', '30000000-0000-0000-0000-000000000002'::uuid)$$,
  '42501',
  NULL,
  'User 1 cannot insert an event attributed to another user'
);

-- ============================================
-- TEST 6: User 2 can read events in their org
-- ============================================
SET LOCAL request.jwt.claims = '{"sub":"30000000-0000-0000-0000-000000000002","role":"authenticated"}';

SELECT is(
  (SELECT count(*) FROM scan_follow_up_events WHERE id = '30000000-dddd-0000-0000-000000000002'::uuid)::int,
  1,
  'User 2 can read follow-up events in their org'
);

-- ============================================
-- TEST 7: User 2 cannot read User 1's org events
-- ============================================
SELECT is(
  (SELECT count(*) FROM scan_follow_up_events WHERE id = '30000000-dddd-0000-0000-000000000001'::uuid)::int,
  0,
  'User 2 cannot read follow-up events from another org'
);

SELECT * FROM finish();
ROLLBACK;
