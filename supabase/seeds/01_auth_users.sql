-- =====================================================
-- EquipQR Seed Data - Test Users (auth.users)
-- =====================================================
-- These inserts only work in local Supabase where we have direct
-- access to auth schema. Production uses Supabase Auth APIs.
--
-- All test users have password: password123
--
-- NOTE: The handle_new_user trigger fires on auth.users INSERT and will:
--   1. Create/update a profile record (ON CONFLICT safe)
--   2. Check for existing organization memberships
--   3. Skip org creation if memberships already exist (from later seed files)
--
-- This works because:
--   - Profiles use ON CONFLICT DO UPDATE (idempotent)
--   - The trigger checks for existing memberships before creating orgs
--   - Seeds run in order: users → profiles → orgs → members
--   - When trigger fires, members don't exist yet, so it creates orgs
--   - But our seed orgs/members INSERT use ON CONFLICT DO NOTHING
--
-- IMPORTANT: If you see duplicate orgs, ensure the migration
-- 20260111000001_make_handle_new_user_idempotent.sql has been applied.
-- =====================================================

-- User 1: owner@apex.test - Owner of Apex, member of Metro
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role,
  aud,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
) VALUES (
  'bb0e8400-e29b-41d4-a716-446655440001'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'owner@apex.test',
  extensions.crypt('password123', extensions.gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  '{"name": "Alex Apex"}'::jsonb,
  false,
  'authenticated',
  'authenticated',
  '',
  '',
  '',
  ''
) ON CONFLICT (id) DO NOTHING;

-- User 2: admin@apex.test - Admin at Apex, technician at Valley
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role,
  aud,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
) VALUES (
  'bb0e8400-e29b-41d4-a716-446655440002'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'admin@apex.test',
  extensions.crypt('password123', extensions.gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  '{"name": "Amanda Admin"}'::jsonb,
  false,
  'authenticated',
  'authenticated',
  '',
  '',
  '',
  ''
) ON CONFLICT (id) DO NOTHING;

-- User 3: tech@apex.test - Technician at Apex only
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role,
  aud,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
) VALUES (
  'bb0e8400-e29b-41d4-a716-446655440003'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'tech@apex.test',
  extensions.crypt('password123', extensions.gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  '{"name": "Tom Technician"}'::jsonb,
  false,
  'authenticated',
  'authenticated',
  '',
  '',
  '',
  ''
) ON CONFLICT (id) DO NOTHING;

-- User 4: owner@metro.test - Owner of Metro, admin at Industrial
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role,
  aud,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
) VALUES (
  'bb0e8400-e29b-41d4-a716-446655440004'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'owner@metro.test',
  extensions.crypt('password123', extensions.gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  '{"name": "Marcus Metro"}'::jsonb,
  false,
  'authenticated',
  'authenticated',
  '',
  '',
  '',
  ''
) ON CONFLICT (id) DO NOTHING;

-- User 5: tech@metro.test - Technician at Metro only
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role,
  aud,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
) VALUES (
  'bb0e8400-e29b-41d4-a716-446655440005'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'tech@metro.test',
  extensions.crypt('password123', extensions.gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  '{"name": "Mike Mechanic"}'::jsonb,
  false,
  'authenticated',
  'authenticated',
  '',
  '',
  '',
  ''
) ON CONFLICT (id) DO NOTHING;

-- User 6: owner@valley.test - Owner of Valley only
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role,
  aud,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
) VALUES (
  'bb0e8400-e29b-41d4-a716-446655440006'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'owner@valley.test',
  extensions.crypt('password123', extensions.gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  '{"name": "Victor Valley"}'::jsonb,
  false,
  'authenticated',
  'authenticated',
  '',
  '',
  '',
  ''
) ON CONFLICT (id) DO NOTHING;

-- User 7: owner@industrial.test - Owner of Industrial, member at Apex
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role,
  aud,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
) VALUES (
  'bb0e8400-e29b-41d4-a716-446655440007'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'owner@industrial.test',
  extensions.crypt('password123', extensions.gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  '{"name": "Irene Industrial"}'::jsonb,
  false,
  'authenticated',
  'authenticated',
  '',
  '',
  '',
  ''
) ON CONFLICT (id) DO NOTHING;

-- User 8: multi@equipqr.test - Member of ALL organizations (multi-org tester)
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role,
  aud,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
) VALUES (
  'bb0e8400-e29b-41d4-a716-446655440008'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'multi@equipqr.test',
  extensions.crypt('password123', extensions.gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  '{"name": "Multi Org User"}'::jsonb,
  false,
  'authenticated',
  'authenticated',
  '',
  '',
  '',
  ''
) ON CONFLICT (id) DO NOTHING;
