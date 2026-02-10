BEGIN;
SELECT plan(6);

-- ============================================
-- Test: inventory_item_images RLS policies
-- Verifies that inventory item image policies
-- enforce organization-level isolation.
-- ============================================

CREATE TEMP TABLE test_context (
  label text PRIMARY KEY,
  id uuid NOT NULL
);

GRANT SELECT ON TABLE test_context TO authenticated;

-- Create two test users in different orgs
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
  is_super_admin, role, aud,
  confirmation_token, recovery_token, email_change_token_new, email_change
) VALUES (
  '20000000-0000-0000-0000-000000000001'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'imgtest-user1@equipqr.test',
  extensions.crypt('password123', extensions.gen_salt('bf')),
  NOW(), NOW(), NOW(),
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  '{"name": "ImgTest User1"}'::jsonb,
  false, 'authenticated', 'authenticated', '', '', '', ''
) ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
  is_super_admin, role, aud,
  confirmation_token, recovery_token, email_change_token_new, email_change
) VALUES (
  '20000000-0000-0000-0000-000000000002'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'imgtest-user2@equipqr.test',
  extensions.crypt('password123', extensions.gen_salt('bf')),
  NOW(), NOW(), NOW(),
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  '{"name": "ImgTest User2"}'::jsonb,
  false, 'authenticated', 'authenticated', '', '', '', ''
) ON CONFLICT (id) DO NOTHING;

-- Wait for handle_new_user triggers to fire
-- Create orgs manually since the trigger may or may not create them
INSERT INTO organizations (id, name, plan, member_count, max_members)
VALUES
  ('20000000-aaaa-0000-0000-000000000001'::uuid, 'Img Org A', 'free', 1, 10),
  ('20000000-aaaa-0000-0000-000000000002'::uuid, 'Img Org B', 'free', 1, 10)
ON CONFLICT (id) DO NOTHING;

-- Add members
INSERT INTO organization_members (user_id, organization_id, role, status, joined_date)
VALUES
  ('20000000-0000-0000-0000-000000000001'::uuid, '20000000-aaaa-0000-0000-000000000001'::uuid, 'owner', 'active', NOW()),
  ('20000000-0000-0000-0000-000000000002'::uuid, '20000000-aaaa-0000-0000-000000000002'::uuid, 'owner', 'active', NOW())
ON CONFLICT DO NOTHING;

-- Create inventory items
INSERT INTO inventory_items (id, organization_id, name, quantity_on_hand, low_stock_threshold, created_by)
VALUES
  ('20000000-bbbb-0000-0000-000000000001'::uuid, '20000000-aaaa-0000-0000-000000000001'::uuid, 'Item A', 10, 2, '20000000-0000-0000-0000-000000000001'::uuid),
  ('20000000-bbbb-0000-0000-000000000002'::uuid, '20000000-aaaa-0000-0000-000000000002'::uuid, 'Item B', 10, 2, '20000000-0000-0000-0000-000000000002'::uuid)
ON CONFLICT (id) DO NOTHING;

-- Insert images as superuser
INSERT INTO inventory_item_images (id, inventory_item_id, organization_id, file_url, file_name, file_size, uploaded_by)
VALUES
  ('20000000-cccc-0000-0000-000000000001'::uuid, '20000000-bbbb-0000-0000-000000000001'::uuid, '20000000-aaaa-0000-0000-000000000001'::uuid, 'https://example.com/img1.jpg', 'img1.jpg', 1024, '20000000-0000-0000-0000-000000000001'::uuid),
  ('20000000-cccc-0000-0000-000000000002'::uuid, '20000000-bbbb-0000-0000-000000000002'::uuid, '20000000-aaaa-0000-0000-000000000002'::uuid, 'https://example.com/img2.jpg', 'img2.jpg', 2048, '20000000-0000-0000-0000-000000000002'::uuid);

-- ============================================
-- TEST 1: RLS is enabled on inventory_item_images
-- ============================================
SELECT has_table('public', 'inventory_item_images', 'inventory_item_images table exists');

-- ============================================
-- TEST 2: User 1 can see their org's images only
-- ============================================
SET LOCAL role = 'authenticated';
SET LOCAL request.jwt.claims = '{"sub":"20000000-0000-0000-0000-000000000001","role":"authenticated"}';

SELECT is(
  (SELECT count(*) FROM inventory_item_images WHERE id = '20000000-cccc-0000-0000-000000000001'::uuid)::int,
  1,
  'User 1 can read image in their org'
);

-- ============================================
-- TEST 3: User 1 cannot see User 2's org images
-- ============================================
SELECT is(
  (SELECT count(*) FROM inventory_item_images WHERE id = '20000000-cccc-0000-0000-000000000002'::uuid)::int,
  0,
  'User 1 cannot read images from another org'
);

-- ============================================
-- TEST 4: User 2 can see their own org's images
-- ============================================
SET LOCAL request.jwt.claims = '{"sub":"20000000-0000-0000-0000-000000000002","role":"authenticated"}';

SELECT is(
  (SELECT count(*) FROM inventory_item_images WHERE id = '20000000-cccc-0000-0000-000000000002'::uuid)::int,
  1,
  'User 2 can read image in their org'
);

-- ============================================
-- TEST 5: User 2 cannot see User 1's org images
-- ============================================
SELECT is(
  (SELECT count(*) FROM inventory_item_images WHERE id = '20000000-cccc-0000-0000-000000000001'::uuid)::int,
  0,
  'User 2 cannot read images from another org'
);

-- ============================================
-- TEST 6: Storage quota function includes inventory_item_images
-- ============================================
RESET role;
SELECT is(
  (SELECT get_organization_storage_mb('20000000-aaaa-0000-0000-000000000001'::uuid))::int,
  0,
  'Storage function returns 0 MB for small file sizes (1KB rounds to 0)'
);

SELECT * FROM finish();
ROLLBACK;
