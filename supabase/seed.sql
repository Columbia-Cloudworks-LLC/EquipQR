-- =====================================================
-- EquipQR Comprehensive Seed Data for Local Development
-- =====================================================
-- This seed file creates a complete test environment with:
-- - 8 Organizations (4 business orgs + 4 personal orgs, every user owns one)
-- - 8 Test Users with cross-organizational memberships
-- - 6 Teams distributed across organizations
-- - 14 Equipment items with GPS coordinates for map testing
-- - Work Orders in all statuses (submitted, in_progress, completed, etc.)
-- - Inventory Items with varied stock levels (normal, low, out-of-stock)
-- - Inventory Transactions (audit trail)
-- - Equipment Part Compatibility links
-- - QR Code Scan history with location tracking
-- - Geocoded Locations cache
-- - Customer records for rental business testing
--
-- All test users have password: password123
--
-- IMPORTANT: This seed file is designed for LOCAL DEVELOPMENT ONLY.
-- Auth user inserts only work in local Supabase, not production.
-- =====================================================

-- =====================================================
-- SECTION 1: TEST USERS (auth.users)
-- =====================================================
-- These inserts only work in local Supabase where we have direct
-- access to auth schema. Production uses Supabase Auth APIs.

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
  crypt('password123', gen_salt('bf')),
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
  crypt('password123', gen_salt('bf')),
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
  crypt('password123', gen_salt('bf')),
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
  crypt('password123', gen_salt('bf')),
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
  crypt('password123', gen_salt('bf')),
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
  crypt('password123', gen_salt('bf')),
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
  crypt('password123', gen_salt('bf')),
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
  crypt('password123', gen_salt('bf')),
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

-- =====================================================
-- SECTION 2: USER PROFILES
-- =====================================================

INSERT INTO public.profiles (id, email, name, created_at, updated_at)
VALUES 
  ('bb0e8400-e29b-41d4-a716-446655440001'::uuid, 'owner@apex.test', 'Alex Apex', NOW(), NOW()),
  ('bb0e8400-e29b-41d4-a716-446655440002'::uuid, 'admin@apex.test', 'Amanda Admin', NOW(), NOW()),
  ('bb0e8400-e29b-41d4-a716-446655440003'::uuid, 'tech@apex.test', 'Tom Technician', NOW(), NOW()),
  ('bb0e8400-e29b-41d4-a716-446655440004'::uuid, 'owner@metro.test', 'Marcus Metro', NOW(), NOW()),
  ('bb0e8400-e29b-41d4-a716-446655440005'::uuid, 'tech@metro.test', 'Mike Mechanic', NOW(), NOW()),
  ('bb0e8400-e29b-41d4-a716-446655440006'::uuid, 'owner@valley.test', 'Victor Valley', NOW(), NOW()),
  ('bb0e8400-e29b-41d4-a716-446655440007'::uuid, 'owner@industrial.test', 'Irene Industrial', NOW(), NOW()),
  ('bb0e8400-e29b-41d4-a716-446655440008'::uuid, 'multi@equipqr.test', 'Multi Org User', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- SECTION 3: ORGANIZATIONS
-- =====================================================
-- 8 Organizations: 4 business orgs + 4 personal orgs (every user owns one org)

INSERT INTO public.organizations (
  id, 
  name, 
  plan, 
  member_count, 
  max_members, 
  features, 
  created_at, 
  updated_at
) VALUES 
  -- Apex Construction Company (Premium) - Primary test org
  (
    '660e8400-e29b-41d4-a716-446655440000'::uuid,
    'Apex Construction Company',
    'premium'::organization_plan,
    5,
    50,
    ARRAY['Equipment Management', 'Work Orders', 'Team Management', 'Fleet Tracking', 'Preventive Maintenance'],
    '2024-01-01 00:00:00+00',
    '2024-01-01 00:00:00+00'
  ),
  -- Metro Equipment Services (Premium) - Secondary org, cross-membership testing
  (
    '660e8400-e29b-41d4-a716-446655440001'::uuid,
    'Metro Equipment Services', 
    'premium'::organization_plan,
    4,
    50,
    ARRAY['Equipment Management', 'Work Orders', 'Team Management', 'Fleet Tracking'],
    '2024-01-15 00:00:00+00',
    '2024-01-15 00:00:00+00'
  ),
  -- Valley Landscaping (Free) - Free tier testing
  (
    '660e8400-e29b-41d4-a716-446655440002'::uuid,
    'Valley Landscaping',
    'free'::organization_plan,
    3,
    5,
    ARRAY['Equipment Management', 'Work Orders', 'Team Management'],
    '2024-02-01 00:00:00+00',
    '2024-02-01 00:00:00+00'
  ),
  -- Industrial Rentals Corp (Premium) - Rental business scenario
  (
    '660e8400-e29b-41d4-a716-446655440003'::uuid,
    'Industrial Rentals Corp',
    'premium'::organization_plan,
    3,
    50,
    ARRAY['Equipment Management', 'Work Orders', 'Team Management', 'Fleet Tracking', 'Rental Tracking'],
    '2024-02-15 00:00:00+00',
    '2024-02-15 00:00:00+00'
  ),
  -- =====================================================
  -- Personal Organizations (every user owns one org per business rules)
  -- =====================================================
  -- Amanda's Equipment Services (Free) - Personal org for admin@apex.test
  (
    '660e8400-e29b-41d4-a716-446655440004'::uuid,
    'Amanda''s Equipment Services',
    'free'::organization_plan,
    1,
    5,
    ARRAY['Equipment Management', 'Work Orders', 'Team Management'],
    '2023-12-01 00:00:00+00',
    '2023-12-01 00:00:00+00'
  ),
  -- Tom's Field Services (Free) - Personal org for tech@apex.test
  (
    '660e8400-e29b-41d4-a716-446655440005'::uuid,
    'Tom''s Field Services',
    'free'::organization_plan,
    1,
    5,
    ARRAY['Equipment Management', 'Work Orders', 'Team Management'],
    '2023-12-15 00:00:00+00',
    '2023-12-15 00:00:00+00'
  ),
  -- Mike's Repair Shop (Free) - Personal org for tech@metro.test
  (
    '660e8400-e29b-41d4-a716-446655440006'::uuid,
    'Mike''s Repair Shop',
    'free'::organization_plan,
    1,
    5,
    ARRAY['Equipment Management', 'Work Orders', 'Team Management'],
    '2024-01-01 00:00:00+00',
    '2024-01-01 00:00:00+00'
  ),
  -- Multi Org Consulting (Free) - Personal org for multi@equipqr.test
  (
    '660e8400-e29b-41d4-a716-446655440007'::uuid,
    'Multi Org Consulting',
    'free'::organization_plan,
    1,
    5,
    ARRAY['Equipment Management', 'Work Orders', 'Team Management'],
    '2023-11-01 00:00:00+00',
    '2023-11-01 00:00:00+00'
  )
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- SECTION 4: ORGANIZATION MEMBERS (Cross-Org Matrix)
-- =====================================================
-- Creates the complex web of memberships for testing RBAC scenarios
-- BUSINESS RULE: Every user owns exactly ONE organization (created at signup)
--
-- Ownership Matrix (each user owns their personal org):
-- | User                    | Owns (Personal Org)       |
-- |-------------------------|---------------------------|
-- | owner@apex.test         | Apex Construction         |
-- | admin@apex.test         | Amanda's Equipment        |
-- | tech@apex.test          | Tom's Field Services      |
-- | owner@metro.test        | Metro Equipment           |
-- | tech@metro.test         | Mike's Repair Shop        |
-- | owner@valley.test       | Valley Landscaping        |
-- | owner@industrial.test   | Industrial Rentals        |
-- | multi@equipqr.test      | Multi Org Consulting      |
--
-- Cross-Org Membership Matrix (invitations to other orgs):
-- | User                    | Apex   | Metro  | Valley | Industrial |
-- |-------------------------|--------|--------|--------|------------|
-- | owner@apex.test         | owner  | member | -      | -          |
-- | admin@apex.test         | admin  | -      | member | -          |
-- | tech@apex.test          | member | -      | -      | -          |
-- | owner@metro.test        | -      | owner  | -      | admin      |
-- | tech@metro.test         | -      | member | -      | -          |
-- | owner@valley.test       | -      | -      | owner  | -          |
-- | owner@industrial.test   | member | -      | -      | owner      |
-- | multi@equipqr.test      | member | member | member | member     |

INSERT INTO public.organization_members (
  id,
  organization_id,
  user_id,
  role,
  status,
  joined_date
) VALUES 
  -- Apex Construction Company members
  ('cc0e8400-e29b-41d4-a716-446655440001'::uuid, '660e8400-e29b-41d4-a716-446655440000'::uuid, 'bb0e8400-e29b-41d4-a716-446655440001'::uuid, 'owner', 'active', '2024-01-01 00:00:00+00'),
  ('cc0e8400-e29b-41d4-a716-446655440002'::uuid, '660e8400-e29b-41d4-a716-446655440000'::uuid, 'bb0e8400-e29b-41d4-a716-446655440002'::uuid, 'admin', 'active', '2024-01-02 00:00:00+00'),
  ('cc0e8400-e29b-41d4-a716-446655440003'::uuid, '660e8400-e29b-41d4-a716-446655440000'::uuid, 'bb0e8400-e29b-41d4-a716-446655440003'::uuid, 'member', 'active', '2024-01-03 00:00:00+00'),
  ('cc0e8400-e29b-41d4-a716-446655440004'::uuid, '660e8400-e29b-41d4-a716-446655440000'::uuid, 'bb0e8400-e29b-41d4-a716-446655440007'::uuid, 'member', 'active', '2024-01-10 00:00:00+00'),
  ('cc0e8400-e29b-41d4-a716-446655440005'::uuid, '660e8400-e29b-41d4-a716-446655440000'::uuid, 'bb0e8400-e29b-41d4-a716-446655440008'::uuid, 'member', 'active', '2024-01-15 00:00:00+00'),
  
  -- Metro Equipment Services members
  ('cc0e8400-e29b-41d4-a716-446655440010'::uuid, '660e8400-e29b-41d4-a716-446655440001'::uuid, 'bb0e8400-e29b-41d4-a716-446655440004'::uuid, 'owner', 'active', '2024-01-15 00:00:00+00'),
  ('cc0e8400-e29b-41d4-a716-446655440011'::uuid, '660e8400-e29b-41d4-a716-446655440001'::uuid, 'bb0e8400-e29b-41d4-a716-446655440005'::uuid, 'member', 'active', '2024-01-16 00:00:00+00'),
  ('cc0e8400-e29b-41d4-a716-446655440012'::uuid, '660e8400-e29b-41d4-a716-446655440001'::uuid, 'bb0e8400-e29b-41d4-a716-446655440001'::uuid, 'member', 'active', '2024-01-20 00:00:00+00'),
  ('cc0e8400-e29b-41d4-a716-446655440013'::uuid, '660e8400-e29b-41d4-a716-446655440001'::uuid, 'bb0e8400-e29b-41d4-a716-446655440008'::uuid, 'member', 'active', '2024-01-25 00:00:00+00'),
  
  -- Valley Landscaping members
  ('cc0e8400-e29b-41d4-a716-446655440020'::uuid, '660e8400-e29b-41d4-a716-446655440002'::uuid, 'bb0e8400-e29b-41d4-a716-446655440006'::uuid, 'owner', 'active', '2024-02-01 00:00:00+00'),
  ('cc0e8400-e29b-41d4-a716-446655440021'::uuid, '660e8400-e29b-41d4-a716-446655440002'::uuid, 'bb0e8400-e29b-41d4-a716-446655440002'::uuid, 'member', 'active', '2024-02-05 00:00:00+00'),
  ('cc0e8400-e29b-41d4-a716-446655440022'::uuid, '660e8400-e29b-41d4-a716-446655440002'::uuid, 'bb0e8400-e29b-41d4-a716-446655440008'::uuid, 'member', 'active', '2024-02-10 00:00:00+00'),
  
  -- Industrial Rentals Corp members
  ('cc0e8400-e29b-41d4-a716-446655440030'::uuid, '660e8400-e29b-41d4-a716-446655440003'::uuid, 'bb0e8400-e29b-41d4-a716-446655440007'::uuid, 'owner', 'active', '2024-02-15 00:00:00+00'),
  ('cc0e8400-e29b-41d4-a716-446655440031'::uuid, '660e8400-e29b-41d4-a716-446655440003'::uuid, 'bb0e8400-e29b-41d4-a716-446655440004'::uuid, 'admin', 'active', '2024-02-20 00:00:00+00'),
  ('cc0e8400-e29b-41d4-a716-446655440032'::uuid, '660e8400-e29b-41d4-a716-446655440003'::uuid, 'bb0e8400-e29b-41d4-a716-446655440008'::uuid, 'member', 'active', '2024-02-25 00:00:00+00'),
  
  -- Personal Organizations (each user owns their own org created at signup)
  -- Amanda's Equipment Services - owned by admin@apex.test
  ('cc0e8400-e29b-41d4-a716-446655440040'::uuid, '660e8400-e29b-41d4-a716-446655440004'::uuid, 'bb0e8400-e29b-41d4-a716-446655440002'::uuid, 'owner', 'active', '2023-12-01 00:00:00+00'),
  -- Tom's Field Services - owned by tech@apex.test
  ('cc0e8400-e29b-41d4-a716-446655440041'::uuid, '660e8400-e29b-41d4-a716-446655440005'::uuid, 'bb0e8400-e29b-41d4-a716-446655440003'::uuid, 'owner', 'active', '2023-12-15 00:00:00+00'),
  -- Mike's Repair Shop - owned by tech@metro.test
  ('cc0e8400-e29b-41d4-a716-446655440042'::uuid, '660e8400-e29b-41d4-a716-446655440006'::uuid, 'bb0e8400-e29b-41d4-a716-446655440005'::uuid, 'owner', 'active', '2024-01-01 00:00:00+00'),
  -- Multi Org Consulting - owned by multi@equipqr.test
  ('cc0e8400-e29b-41d4-a716-446655440043'::uuid, '660e8400-e29b-41d4-a716-446655440007'::uuid, 'bb0e8400-e29b-41d4-a716-446655440008'::uuid, 'owner', 'active', '2023-11-01 00:00:00+00')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- SECTION 5: TEAMS
-- =====================================================
-- 6 Teams across all organizations

INSERT INTO public.teams (
  id,
  organization_id,
  name,
  description,
  created_at,
  updated_at
) VALUES 
  -- Apex Construction Company Teams
  (
    '880e8400-e29b-41d4-a716-446655440000'::uuid,
    '660e8400-e29b-41d4-a716-446655440000'::uuid,
    'Heavy Equipment Team',
    'Manages excavators, bulldozers, and heavy construction machinery',
    '2024-01-01 00:00:00+00',
    '2024-01-01 00:00:00+00'
  ),
  (
    '880e8400-e29b-41d4-a716-446655440001'::uuid,
    '660e8400-e29b-41d4-a716-446655440000'::uuid,
    'Site Operations Team',
    'Handles generators, compressors, and site support equipment',
    '2024-01-01 00:00:00+00',
    '2024-01-01 00:00:00+00'
  ),
  -- Metro Equipment Services Teams
  (
    '880e8400-e29b-41d4-a716-446655440002'::uuid,
    '660e8400-e29b-41d4-a716-446655440001'::uuid,
    'Rental Fleet Team',
    'Manages rental equipment inventory and maintenance',
    '2024-01-15 00:00:00+00',
    '2024-01-15 00:00:00+00'
  ),
  (
    '880e8400-e29b-41d4-a716-446655440003'::uuid,
    '660e8400-e29b-41d4-a716-446655440001'::uuid,
    'Customer Service Team',
    'Handles customer equipment requests and support',
    '2024-01-15 00:00:00+00',
    '2024-01-15 00:00:00+00'
  ),
  -- Valley Landscaping Team
  (
    '880e8400-e29b-41d4-a716-446655440004'::uuid,
    '660e8400-e29b-41d4-a716-446655440002'::uuid,
    'Grounds Crew',
    'Landscaping equipment and maintenance team',
    '2024-02-01 00:00:00+00',
    '2024-02-01 00:00:00+00'
  ),
  -- Industrial Rentals Corp Team
  (
    '880e8400-e29b-41d4-a716-446655440005'::uuid,
    '660e8400-e29b-41d4-a716-446655440003'::uuid,
    'Warehouse Team',
    'Equipment storage, logistics, and inventory management',
    '2024-02-15 00:00:00+00',
    '2024-02-15 00:00:00+00'
  )
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- SECTION 6: TEAM MEMBERS
-- =====================================================
-- Assigns users to teams with appropriate roles
-- Team roles: owner, manager, technician, requestor, viewer

INSERT INTO public.team_members (
  id,
  team_id,
  user_id,
  role,
  joined_date
) VALUES 
  -- Heavy Equipment Team (Apex)
  ('dd0e8400-e29b-41d4-a716-446655440001'::uuid, '880e8400-e29b-41d4-a716-446655440000'::uuid, 'bb0e8400-e29b-41d4-a716-446655440001'::uuid, 'manager', '2024-01-01 00:00:00+00'),
  ('dd0e8400-e29b-41d4-a716-446655440002'::uuid, '880e8400-e29b-41d4-a716-446655440000'::uuid, 'bb0e8400-e29b-41d4-a716-446655440003'::uuid, 'technician', '2024-01-03 00:00:00+00'),
  
  -- Site Operations Team (Apex)
  ('dd0e8400-e29b-41d4-a716-446655440003'::uuid, '880e8400-e29b-41d4-a716-446655440001'::uuid, 'bb0e8400-e29b-41d4-a716-446655440002'::uuid, 'manager', '2024-01-02 00:00:00+00'),
  ('dd0e8400-e29b-41d4-a716-446655440004'::uuid, '880e8400-e29b-41d4-a716-446655440001'::uuid, 'bb0e8400-e29b-41d4-a716-446655440003'::uuid, 'technician', '2024-01-03 00:00:00+00'),
  
  -- Rental Fleet Team (Metro)
  ('dd0e8400-e29b-41d4-a716-446655440005'::uuid, '880e8400-e29b-41d4-a716-446655440002'::uuid, 'bb0e8400-e29b-41d4-a716-446655440004'::uuid, 'manager', '2024-01-15 00:00:00+00'),
  ('dd0e8400-e29b-41d4-a716-446655440006'::uuid, '880e8400-e29b-41d4-a716-446655440002'::uuid, 'bb0e8400-e29b-41d4-a716-446655440005'::uuid, 'technician', '2024-01-16 00:00:00+00'),
  
  -- Customer Service Team (Metro)
  ('dd0e8400-e29b-41d4-a716-446655440007'::uuid, '880e8400-e29b-41d4-a716-446655440003'::uuid, 'bb0e8400-e29b-41d4-a716-446655440001'::uuid, 'viewer', '2024-01-20 00:00:00+00'),
  
  -- Grounds Crew (Valley)
  ('dd0e8400-e29b-41d4-a716-446655440008'::uuid, '880e8400-e29b-41d4-a716-446655440004'::uuid, 'bb0e8400-e29b-41d4-a716-446655440006'::uuid, 'manager', '2024-02-01 00:00:00+00'),
  ('dd0e8400-e29b-41d4-a716-446655440009'::uuid, '880e8400-e29b-41d4-a716-446655440004'::uuid, 'bb0e8400-e29b-41d4-a716-446655440002'::uuid, 'technician', '2024-02-05 00:00:00+00'),
  
  -- Warehouse Team (Industrial)
  ('dd0e8400-e29b-41d4-a716-446655440010'::uuid, '880e8400-e29b-41d4-a716-446655440005'::uuid, 'bb0e8400-e29b-41d4-a716-446655440007'::uuid, 'manager', '2024-02-15 00:00:00+00'),
  ('dd0e8400-e29b-41d4-a716-446655440011'::uuid, '880e8400-e29b-41d4-a716-446655440005'::uuid, 'bb0e8400-e29b-41d4-a716-446655440004'::uuid, 'technician', '2024-02-20 00:00:00+00'),
  ('dd0e8400-e29b-41d4-a716-446655440012'::uuid, '880e8400-e29b-41d4-a716-446655440005'::uuid, 'bb0e8400-e29b-41d4-a716-446655440008'::uuid, 'technician', '2024-02-25 00:00:00+00')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- SECTION 7: EQUIPMENT
-- =====================================================
-- Sample equipment for all organizations with GPS coordinates for map testing
-- Locations spread across US: Texas (Apex), California (Metro), Colorado (Valley), Midwest/East (Industrial)

INSERT INTO public.equipment (
  id,
  organization_id,
  team_id,
  name,
  manufacturer,
  model,
  serial_number,
  status,
  location,
  installation_date,
  working_hours,
  custom_attributes,
  last_known_location,
  created_at,
  updated_at
) VALUES 
  -- Apex Construction Company Equipment (Texas Region - Clustered)
  (
    'aa0e8400-e29b-41d4-a716-446655440000'::uuid,
    '660e8400-e29b-41d4-a716-446655440000'::uuid,
    '880e8400-e29b-41d4-a716-446655440000'::uuid,
    'CAT 320 Excavator',
    'Caterpillar',
    '320 GC',
    'CAT320GC2023001',
    'active'::equipment_status,
    'Construction Site A - North Sector',
    '2023-03-15',
    1542.5,
    '{"bucket_capacity": "1.2_cubic_yards", "engine_power": "160_hp"}'::jsonb,
    '{"latitude": 32.7767, "longitude": -96.7970, "address": "Downtown Dallas, TX - Site Alpha", "timestamp": "2026-01-08T14:30:00Z"}'::jsonb,
    '2024-01-01 00:00:00+00',
    '2024-01-01 00:00:00+00'
  ),
  (
    'aa0e8400-e29b-41d4-a716-446655440001'::uuid,
    '660e8400-e29b-41d4-a716-446655440000'::uuid,
    '880e8400-e29b-41d4-a716-446655440000'::uuid,
    'John Deere 850L Dozer',
    'John Deere',
    '850L',
    'JD850L2022045',
    'active'::equipment_status,
    'Construction Site B - Grading Area',
    '2022-08-20',
    2156.0,
    '{"blade_width": "12_feet", "operating_weight": "42000_lbs"}'::jsonb,
    '{"latitude": 32.7555, "longitude": -97.3308, "address": "Fort Worth Industrial Park, TX", "timestamp": "2026-01-07T09:15:00Z"}'::jsonb,
    '2024-01-01 00:00:00+00',
    '2024-01-01 00:00:00+00'
  ),
  (
    'aa0e8400-e29b-41d4-a716-446655440002'::uuid,
    '660e8400-e29b-41d4-a716-446655440000'::uuid,
    '880e8400-e29b-41d4-a716-446655440001'::uuid,
    'Portable Generator',
    'Generac',
    'G3500',
    'GEN001PG2023',
    'active'::equipment_status,
    'Construction Site A - Power Station',
    '2023-05-12',
    892.5,
    '{"fuel_type": "gasoline", "output_watts": "3500"}'::jsonb,
    '{"latitude": 29.7604, "longitude": -95.3698, "address": "Houston Energy District, TX", "timestamp": "2026-01-05T16:45:00Z"}'::jsonb,
    '2024-01-01 00:00:00+00',
    '2024-01-01 00:00:00+00'
  ),
  (
    'aa0e8400-e29b-41d4-a716-446655440003'::uuid,
    '660e8400-e29b-41d4-a716-446655440000'::uuid,
    '880e8400-e29b-41d4-a716-446655440001'::uuid,
    'Portable Light Tower',
    'Atlas Copco',
    'PLT-800',
    'ATC001LT2022',
    'maintenance'::equipment_status,
    'Equipment Yard - Bay 3',
    '2022-11-20',
    2847.25,
    '{"light_type": "LED", "tower_height": "30_feet"}'::jsonb,
    NULL,  -- No GPS location (testing empty location state on map)
    '2024-01-01 00:00:00+00',
    '2024-01-01 00:00:00+00'
  ),
  
  -- Metro Equipment Services Equipment (California - Spread Out)
  (
    'aa0e8400-e29b-41d4-a716-446655440010'::uuid,
    '660e8400-e29b-41d4-a716-446655440001'::uuid,
    '880e8400-e29b-41d4-a716-446655440002'::uuid,
    'Bobcat S650 Skid Steer',
    'Bobcat',
    'S650',
    'BOB650SS2023101',
    'active'::equipment_status,
    'Metro Yard - Rental Bay 1',
    '2023-01-10',
    456.0,
    '{"rated_capacity": "2690_lbs", "engine": "Tier_4"}'::jsonb,
    '{"latitude": 34.0522, "longitude": -118.2437, "address": "Los Angeles Convention Center, CA", "timestamp": "2026-01-08T10:00:00Z"}'::jsonb,
    '2024-01-15 00:00:00+00',
    '2024-01-15 00:00:00+00'
  ),
  (
    'aa0e8400-e29b-41d4-a716-446655440011'::uuid,
    '660e8400-e29b-41d4-a716-446655440001'::uuid,
    '880e8400-e29b-41d4-a716-446655440002'::uuid,
    'JLG 450AJ Boom Lift',
    'JLG',
    '450AJ',
    'JLG450AJ2022055',
    'active'::equipment_status,
    'Metro Yard - Rental Bay 2',
    '2022-06-15',
    1234.5,
    '{"platform_height": "45_feet", "horizontal_reach": "24_feet"}'::jsonb,
    '{"latitude": 37.7749, "longitude": -122.4194, "address": "San Francisco Financial District, CA", "timestamp": "2026-01-08T12:30:00Z"}'::jsonb,
    '2024-01-15 00:00:00+00',
    '2024-01-15 00:00:00+00'
  ),
  (
    'aa0e8400-e29b-41d4-a716-446655440012'::uuid,
    '660e8400-e29b-41d4-a716-446655440001'::uuid,
    '880e8400-e29b-41d4-a716-446655440002'::uuid,
    'Genie GS-2669 Scissor Lift',
    'Genie',
    'GS-2669',
    'GENIE2669SL2023',
    'inactive'::equipment_status,
    'Metro Yard - Maintenance Shop',
    '2023-04-01',
    678.25,
    '{"platform_height": "26_feet", "capacity": "1500_lbs"}'::jsonb,
    '{"latitude": 32.7157, "longitude": -117.1611, "address": "San Diego Shipyard, CA", "timestamp": "2026-01-07T18:00:00Z"}'::jsonb,
    '2024-01-15 00:00:00+00',
    '2024-01-15 00:00:00+00'
  ),
  
  -- Valley Landscaping Equipment (Colorado - Mountain Region)
  (
    'aa0e8400-e29b-41d4-a716-446655440020'::uuid,
    '660e8400-e29b-41d4-a716-446655440002'::uuid,
    '880e8400-e29b-41d4-a716-446655440004'::uuid,
    'John Deere Z930M Mower',
    'John Deere',
    'Z930M',
    'JDZ930M2023001',
    'active'::equipment_status,
    'Valley Shop - Equipment Bay',
    '2023-02-15',
    342.0,
    '{"cutting_width": "60_inches", "engine": "25_hp_Kawasaki"}'::jsonb,
    '{"latitude": 39.7392, "longitude": -104.9903, "address": "Denver City Park, CO", "timestamp": "2026-01-08T08:00:00Z"}'::jsonb,
    '2024-02-01 00:00:00+00',
    '2024-02-01 00:00:00+00'
  ),
  (
    'aa0e8400-e29b-41d4-a716-446655440021'::uuid,
    '660e8400-e29b-41d4-a716-446655440002'::uuid,
    '880e8400-e29b-41d4-a716-446655440004'::uuid,
    'Stihl MS 500i Chainsaw',
    'Stihl',
    'MS 500i',
    'STIHLMS500I2023',
    'active'::equipment_status,
    'Valley Shop - Tool Room',
    '2023-03-01',
    156.5,
    '{"bar_length": "20_inches", "engine_type": "fuel_injected"}'::jsonb,
    '{"latitude": 40.0150, "longitude": -105.2705, "address": "Boulder Mountain Parks, CO", "timestamp": "2026-01-08T11:00:00Z"}'::jsonb,
    '2024-02-01 00:00:00+00',
    '2024-02-01 00:00:00+00'
  ),
  (
    'aa0e8400-e29b-41d4-a716-446655440022'::uuid,
    '660e8400-e29b-41d4-a716-446655440002'::uuid,
    '880e8400-e29b-41d4-a716-446655440004'::uuid,
    'Kubota B2650 Tractor',
    'Kubota',
    'B2650',
    'KUBB2650HSD2022',
    'maintenance'::equipment_status,
    'Valley Shop - Service Area',
    '2022-09-10',
    567.0,
    '{"engine_power": "26_hp", "transmission": "HST"}'::jsonb,
    '{"latitude": 38.8339, "longitude": -104.8214, "address": "Colorado Springs Golf Course, CO", "timestamp": "2025-11-25T10:00:00Z"}'::jsonb,  -- STALE: 45+ days old
    '2024-02-01 00:00:00+00',
    '2024-02-01 00:00:00+00'
  ),
  
  -- Industrial Rentals Corp Equipment (Nationwide - Cross-Country)
  (
    'aa0e8400-e29b-41d4-a716-446655440030'::uuid,
    '660e8400-e29b-41d4-a716-446655440003'::uuid,
    '880e8400-e29b-41d4-a716-446655440005'::uuid,
    'Toyota 8FGU25 Forklift',
    'Toyota',
    '8FGU25',
    'TOY8FGU252023001',
    'active'::equipment_status,
    'Industrial Warehouse - Dock A',
    '2023-01-05',
    1456.0,
    '{"capacity": "5000_lbs", "lift_height": "189_inches"}'::jsonb,
    '{"latitude": 41.8781, "longitude": -87.6298, "address": "Chicago Distribution Center, IL", "timestamp": "2026-01-08T15:30:00Z"}'::jsonb,
    '2024-02-15 00:00:00+00',
    '2024-02-15 00:00:00+00'
  ),
  (
    'aa0e8400-e29b-41d4-a716-446655440031'::uuid,
    '660e8400-e29b-41d4-a716-446655440003'::uuid,
    '880e8400-e29b-41d4-a716-446655440005'::uuid,
    'Crown WP 3000 Pallet Jack',
    'Crown',
    'WP 3000',
    'CROWNWP30002023',
    'active'::equipment_status,
    'Industrial Warehouse - Dock B',
    '2023-02-20',
    892.5,
    '{"capacity": "4500_lbs", "fork_length": "48_inches"}'::jsonb,
    '{"latitude": 42.3314, "longitude": -83.0458, "address": "Detroit Auto Plant, MI", "timestamp": "2026-01-08T08:00:00Z"}'::jsonb,
    '2024-02-15 00:00:00+00',
    '2024-02-15 00:00:00+00'
  ),
  (
    'aa0e8400-e29b-41d4-a716-446655440032'::uuid,
    '660e8400-e29b-41d4-a716-446655440003'::uuid,
    '880e8400-e29b-41d4-a716-446655440005'::uuid,
    'Ingersoll Rand P185 Compressor',
    'Ingersoll Rand',
    'P185',
    'IRP1852022078',
    'active'::equipment_status,
    'Industrial Warehouse - Staging Area',
    '2022-07-15',
    2345.75,
    '{"cfm": "185", "pressure": "100_psi"}'::jsonb,
    '{"latitude": 33.7490, "longitude": -84.3880, "address": "Atlanta Industrial Park, GA", "timestamp": "2026-01-06T14:00:00Z"}'::jsonb,
    '2024-02-15 00:00:00+00',
    '2024-02-15 00:00:00+00'
  ),
  (
    'aa0e8400-e29b-41d4-a716-446655440033'::uuid,
    '660e8400-e29b-41d4-a716-446655440003'::uuid,
    '880e8400-e29b-41d4-a716-446655440005'::uuid,
    'Miller Trailblazer 325 Welder',
    'Miller',
    'Trailblazer 325',
    'MILLTB3252023045',
    'inactive'::equipment_status,
    'Industrial Warehouse - Repair Shop',
    '2023-05-01',
    234.0,
    '{"welding_output": "325_amps", "engine": "Kohler"}'::jsonb,
    '{"latitude": 40.7128, "longitude": -74.0060, "address": "Manhattan Construction Site, NY", "timestamp": "2026-01-07T11:00:00Z"}'::jsonb,
    '2024-02-15 00:00:00+00',
    '2024-02-15 00:00:00+00'
  )
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- SECTION 8: WORK ORDERS (Various Statuses)
-- =====================================================
-- Work orders in all statuses for testing workflow transitions
-- Includes: submitted, accepted, assigned, in_progress, on_hold, completed, cancelled

INSERT INTO public.work_orders (
  id,
  organization_id,
  equipment_id,
  title,
  description,
  status,
  priority,
  assignee_id,
  assignee_name,
  team_id,
  created_by,
  created_by_name,
  created_date,
  due_date,
  estimated_hours,
  completed_date,
  updated_at
) VALUES
  -- Apex Construction: Active work orders in various states
  (
    'a00e8400-e29b-41d4-a716-446655440001'::uuid,
    '660e8400-e29b-41d4-a716-446655440000'::uuid,
    'aa0e8400-e29b-41d4-a716-446655440000'::uuid,
    'Oil Change - CAT 320 Excavator',
    'Scheduled 500-hour oil change and filter replacement. Check hydraulic fluid levels.',
    'in_progress',
    'high',
    'bb0e8400-e29b-41d4-a716-446655440003'::uuid,
    'Tom Technician',
    '880e8400-e29b-41d4-a716-446655440000'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440002'::uuid,
    'Amanda Admin',
    '2026-01-06',
    '2026-01-10',
    4.0,
    NULL,
    '2026-01-08 10:30:00+00'
  ),
  (
    'a00e8400-e29b-41d4-a716-446655440002'::uuid,
    '660e8400-e29b-41d4-a716-446655440000'::uuid,
    'aa0e8400-e29b-41d4-a716-446655440001'::uuid,
    'Replace Hydraulic Filter',
    'Hydraulic pressure dropping. Replace main filter and check for leaks.',
    'submitted',
    'medium',
    NULL,
    NULL,
    '880e8400-e29b-41d4-a716-446655440000'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440003'::uuid,
    'Tom Technician',
    '2026-01-08',
    '2026-01-15',
    3.0,
    NULL,
    '2026-01-08 14:00:00+00'
  ),
  (
    'a00e8400-e29b-41d4-a716-446655440003'::uuid,
    '660e8400-e29b-41d4-a716-446655440000'::uuid,
    'aa0e8400-e29b-41d4-a716-446655440003'::uuid,
    'Light Tower Bulb Replacement',
    'Two LED panels not functioning. Need replacement parts before repair can proceed.',
    'on_hold',
    'low',
    'bb0e8400-e29b-41d4-a716-446655440003'::uuid,
    'Tom Technician',
    '880e8400-e29b-41d4-a716-446655440001'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440001'::uuid,
    'Alex Apex',
    '2026-01-02',
    '2026-01-12',
    2.0,
    NULL,
    '2026-01-05 11:00:00+00'
  ),
  (
    'a00e8400-e29b-41d4-a716-446655440004'::uuid,
    '660e8400-e29b-41d4-a716-446655440000'::uuid,
    'aa0e8400-e29b-41d4-a716-446655440000'::uuid,
    'Track Tension Adjustment',
    'Annual track tension check and adjustment completed successfully.',
    'completed',
    'medium',
    'bb0e8400-e29b-41d4-a716-446655440003'::uuid,
    'Tom Technician',
    '880e8400-e29b-41d4-a716-446655440000'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440002'::uuid,
    'Amanda Admin',
    '2025-12-15',
    '2025-12-20',
    3.5,
    '2025-12-18',
    '2025-12-18 16:00:00+00'
  ),
  (
    'a00e8400-e29b-41d4-a716-446655440005'::uuid,
    '660e8400-e29b-41d4-a716-446655440000'::uuid,
    'aa0e8400-e29b-41d4-a716-446655440002'::uuid,
    'Generator Fuel System Check',
    'Cancelled - generator was sold to another contractor.',
    'cancelled',
    'low',
    NULL,
    NULL,
    '880e8400-e29b-41d4-a716-446655440001'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440001'::uuid,
    'Alex Apex',
    '2025-12-01',
    '2025-12-15',
    2.0,
    NULL,
    '2025-12-05 09:00:00+00'
  ),
  
  -- Metro Equipment: Rental maintenance work orders
  (
    'a00e8400-e29b-41d4-a716-446655440010'::uuid,
    '660e8400-e29b-41d4-a716-446655440001'::uuid,
    'aa0e8400-e29b-41d4-a716-446655440010'::uuid,
    'Pre-Rental Inspection - Skid Steer',
    'Complete 50-point inspection before rental to ABC Construction.',
    'assigned',
    'high',
    'bb0e8400-e29b-41d4-a716-446655440005'::uuid,
    'Mike Mechanic',
    '880e8400-e29b-41d4-a716-446655440002'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440004'::uuid,
    'Marcus Metro',
    '2026-01-08',
    '2026-01-09',
    2.0,
    NULL,
    '2026-01-08 07:30:00+00'
  ),
  (
    'a00e8400-e29b-41d4-a716-446655440011'::uuid,
    '660e8400-e29b-41d4-a716-446655440001'::uuid,
    'aa0e8400-e29b-41d4-a716-446655440011'::uuid,
    'Boom Lift Annual Certification',
    'OSHA-required annual safety inspection and certification.',
    'in_progress',
    'high',
    'bb0e8400-e29b-41d4-a716-446655440005'::uuid,
    'Mike Mechanic',
    '880e8400-e29b-41d4-a716-446655440002'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440004'::uuid,
    'Marcus Metro',
    '2026-01-05',
    '2026-01-12',
    6.0,
    NULL,
    '2026-01-07 14:00:00+00'
  ),
  (
    'a00e8400-e29b-41d4-a716-446655440012'::uuid,
    '660e8400-e29b-41d4-a716-446655440001'::uuid,
    'aa0e8400-e29b-41d4-a716-446655440012'::uuid,
    'Scissor Lift Hydraulic Repair',
    'Platform not holding height. Diagnosed as cylinder seal failure.',
    'accepted',
    'medium',
    NULL,
    NULL,
    '880e8400-e29b-41d4-a716-446655440002'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440005'::uuid,
    'Mike Mechanic',
    '2026-01-07',
    '2026-01-20',
    8.0,
    NULL,
    '2026-01-07 15:00:00+00'
  ),
  
  -- Valley Landscaping: Seasonal maintenance
  (
    'a00e8400-e29b-41d4-a716-446655440020'::uuid,
    '660e8400-e29b-41d4-a716-446655440002'::uuid,
    'aa0e8400-e29b-41d4-a716-446655440020'::uuid,
    'Mower Blade Sharpening',
    'Sharpen all three blades for spring season prep.',
    'submitted',
    'low',
    NULL,
    NULL,
    '880e8400-e29b-41d4-a716-446655440004'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440006'::uuid,
    'Victor Valley',
    '2026-01-08',
    '2026-01-25',
    1.5,
    NULL,
    '2026-01-08 09:00:00+00'
  ),
  (
    'a00e8400-e29b-41d4-a716-446655440021'::uuid,
    '660e8400-e29b-41d4-a716-446655440002'::uuid,
    'aa0e8400-e29b-41d4-a716-446655440022'::uuid,
    'Tractor PTO Repair',
    'PTO not engaging properly. May need clutch pack replacement.',
    'in_progress',
    'high',
    'bb0e8400-e29b-41d4-a716-446655440002'::uuid,
    'Amanda Admin',
    '880e8400-e29b-41d4-a716-446655440004'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440006'::uuid,
    'Victor Valley',
    '2026-01-03',
    '2026-01-08',  -- OVERDUE
    5.0,
    NULL,
    '2026-01-06 14:00:00+00'
  ),
  
  -- Industrial Rentals: Warehouse equipment
  (
    'a00e8400-e29b-41d4-a716-446655440030'::uuid,
    '660e8400-e29b-41d4-a716-446655440003'::uuid,
    'aa0e8400-e29b-41d4-a716-446655440030'::uuid,
    'Forklift Battery Replacement',
    'Battery not holding charge. Replace with new industrial battery.',
    'in_progress',
    'high',
    'bb0e8400-e29b-41d4-a716-446655440004'::uuid,
    'Marcus Metro',
    '880e8400-e29b-41d4-a716-446655440005'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440007'::uuid,
    'Irene Industrial',
    '2026-01-07',
    '2026-01-08',  -- Due today - urgent
    3.0,
    NULL,
    '2026-01-08 09:00:00+00'
  ),
  (
    'a00e8400-e29b-41d4-a716-446655440031'::uuid,
    '660e8400-e29b-41d4-a716-446655440003'::uuid,
    'aa0e8400-e29b-41d4-a716-446655440031'::uuid,
    'Pallet Jack Wheel Replacement',
    'Front wheels worn. Replace with polyurethane wheels.',
    'completed',
    'medium',
    'bb0e8400-e29b-41d4-a716-446655440008'::uuid,
    'Multi Org User',
    '880e8400-e29b-41d4-a716-446655440005'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440007'::uuid,
    'Irene Industrial',
    '2025-12-28',
    '2026-01-05',
    2.0,
    '2026-01-03',
    '2026-01-03 15:00:00+00'
  )
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- SECTION 9: WORK ORDER NOTES
-- =====================================================
-- Notes and progress updates on work orders

INSERT INTO public.work_order_notes (
  id,
  work_order_id,
  author_id,
  content,
  hours_worked,
  is_private,
  created_at,
  updated_at
) VALUES
  -- Notes on CAT Excavator Oil Change (in_progress)
  (
    'a10e8400-e29b-41d4-a716-446655440001'::uuid,
    'a00e8400-e29b-41d4-a716-446655440001'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440003'::uuid,
    'Started work. Draining old oil now. Will need about 15 gallons of 15W-40.',
    1.5,
    false,
    '2026-01-08 09:00:00+00',
    '2026-01-08 09:00:00+00'
  ),
  (
    'a10e8400-e29b-41d4-a716-446655440002'::uuid,
    'a00e8400-e29b-41d4-a716-446655440001'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440002'::uuid,
    'Customer called - needs this done by end of day Friday. Prioritize.',
    0,
    true,  -- Private note (admin only)
    '2026-01-08 10:30:00+00',
    '2026-01-08 10:30:00+00'
  ),
  -- Notes on Light Tower (on_hold)
  (
    'a10e8400-e29b-41d4-a716-446655440003'::uuid,
    'a00e8400-e29b-41d4-a716-446655440003'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440003'::uuid,
    'Ordered replacement LED panels from supplier. ETA 5 business days.',
    0.5,
    false,
    '2026-01-05 11:00:00+00',
    '2026-01-05 11:00:00+00'
  ),
  -- Notes on completed Track Tension work order
  (
    'a10e8400-e29b-41d4-a716-446655440004'::uuid,
    'a00e8400-e29b-41d4-a716-446655440004'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440003'::uuid,
    'Adjusted track tension on both sides. Left track was 15% loose. All within spec now.',
    2.5,
    false,
    '2025-12-18 14:00:00+00',
    '2025-12-18 14:00:00+00'
  ),
  (
    'a10e8400-e29b-41d4-a716-446655440005'::uuid,
    'a00e8400-e29b-41d4-a716-446655440004'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440003'::uuid,
    'Final inspection complete. Tracks are holding proper tension under load.',
    1.0,
    false,
    '2025-12-18 16:00:00+00',
    '2025-12-18 16:00:00+00'
  ),
  -- Notes on Boom Lift Certification (Metro)
  (
    'a10e8400-e29b-41d4-a716-446655440010'::uuid,
    'a00e8400-e29b-41d4-a716-446655440011'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440005'::uuid,
    'Completed structural inspection. No cracks or damage found. Moving to hydraulic testing.',
    3.0,
    false,
    '2026-01-07 14:00:00+00',
    '2026-01-07 14:00:00+00'
  ),
  -- Notes on Forklift Battery (Industrial)
  (
    'a10e8400-e29b-41d4-a716-446655440020'::uuid,
    'a00e8400-e29b-41d4-a716-446655440030'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440004'::uuid,
    'New battery arrived. Will install this afternoon.',
    0,
    false,
    '2026-01-08 09:00:00+00',
    '2026-01-08 09:00:00+00'
  )
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- SECTION 10: INVENTORY ITEMS
-- =====================================================
-- Parts and supplies with varied stock levels for testing
-- Includes: normal stock, low stock, out of stock, no SKU items

INSERT INTO public.inventory_items (
  id,
  organization_id,
  name,
  description,
  sku,
  quantity_on_hand,
  low_stock_threshold,
  location,
  default_unit_cost,
  created_by,
  created_at,
  updated_at
) VALUES
  -- Apex Construction Inventory
  (
    'a20e8400-e29b-41d4-a716-446655440001'::uuid,
    '660e8400-e29b-41d4-a716-446655440000'::uuid,
    'Hydraulic Oil 15W-40 (5 Gal)',
    'Heavy duty hydraulic fluid for excavators and dozers',
    'HYD-OIL-15W40-5G',
    24,
    10,
    'Warehouse A - Shelf 1',
    89.99,
    'bb0e8400-e29b-41d4-a716-446655440001'::uuid,
    '2025-06-01 00:00:00+00',
    '2026-01-05 00:00:00+00'
  ),
  (
    'a20e8400-e29b-41d4-a716-446655440002'::uuid,
    '660e8400-e29b-41d4-a716-446655440000'::uuid,
    'Air Filter - Heavy Equipment',
    'Fits CAT 320, John Deere 850L, and similar',
    'AF-HVY-CAT320',
    3,  -- LOW STOCK (below threshold of 5)
    5,
    'Warehouse A - Shelf 2',
    45.00,
    'bb0e8400-e29b-41d4-a716-446655440001'::uuid,
    '2025-06-01 00:00:00+00',
    '2026-01-07 00:00:00+00'
  ),
  (
    'a20e8400-e29b-41d4-a716-446655440003'::uuid,
    '660e8400-e29b-41d4-a716-446655440000'::uuid,
    'Excavator Track Shoes (Set of 10)',
    'Replacement track shoes for CAT 320 series',
    'TRK-SHOE-CAT320-10',
    0,  -- OUT OF STOCK
    4,
    'Warehouse B - Heavy Parts',
    1250.00,
    'bb0e8400-e29b-41d4-a716-446655440001'::uuid,
    '2025-06-01 00:00:00+00',
    '2026-01-02 00:00:00+00'
  ),
  (
    'a20e8400-e29b-41d4-a716-446655440004'::uuid,
    '660e8400-e29b-41d4-a716-446655440000'::uuid,
    'Fuel Filter - Diesel',
    'Universal diesel fuel filter',
    'FF-DIESEL-UNI',
    18,
    8,
    'Warehouse A - Shelf 3',
    22.50,
    'bb0e8400-e29b-41d4-a716-446655440002'::uuid,
    '2025-08-15 00:00:00+00',
    '2026-01-06 00:00:00+00'
  ),
  (
    'a20e8400-e29b-41d4-a716-446655440005'::uuid,
    '660e8400-e29b-41d4-a716-446655440000'::uuid,
    'LED Panel - Light Tower',
    'Replacement LED panel for Atlas Copco PLT-800',
    NULL,  -- NO SKU (testing optional field)
    2,  -- LOW STOCK
    3,
    'Warehouse A - Electrical',
    350.00,
    'bb0e8400-e29b-41d4-a716-446655440002'::uuid,
    '2025-09-01 00:00:00+00',
    '2026-01-05 00:00:00+00'
  ),
  
  -- Metro Equipment Inventory
  (
    'a20e8400-e29b-41d4-a716-446655440010'::uuid,
    '660e8400-e29b-41d4-a716-446655440001'::uuid,
    'Hydraulic Seal Kit - Boom Lift',
    'Complete cylinder seal kit for JLG 450AJ',
    'HSK-JLG-450AJ',
    8,
    4,
    'Bay 3 - Parts Cabinet',
    185.00,
    'bb0e8400-e29b-41d4-a716-446655440004'::uuid,
    '2025-05-01 00:00:00+00',
    '2026-01-04 00:00:00+00'
  ),
  (
    'a20e8400-e29b-41d4-a716-446655440011'::uuid,
    '660e8400-e29b-41d4-a716-446655440001'::uuid,
    'Scissor Lift Cylinder Seal',
    'Hydraulic cylinder seal for Genie GS-2669',
    'CYL-SEAL-GS2669',
    0,  -- OUT OF STOCK (needed for WO)
    2,
    'Bay 3 - Parts Cabinet',
    95.00,
    'bb0e8400-e29b-41d4-a716-446655440004'::uuid,
    '2025-05-01 00:00:00+00',
    '2025-12-20 00:00:00+00'
  ),
  (
    'a20e8400-e29b-41d4-a716-446655440012'::uuid,
    '660e8400-e29b-41d4-a716-446655440001'::uuid,
    'Skid Steer Bucket Teeth (Set of 5)',
    'Replacement teeth for Bobcat S650 bucket',
    'BKT-TEETH-BOB-5',
    15,
    5,
    'Bay 2 - Ground Level',
    125.00,
    'bb0e8400-e29b-41d4-a716-446655440004'::uuid,
    '2025-07-01 00:00:00+00',
    '2026-01-03 00:00:00+00'
  ),
  
  -- Valley Landscaping Inventory
  (
    'a20e8400-e29b-41d4-a716-446655440020'::uuid,
    '660e8400-e29b-41d4-a716-446655440002'::uuid,
    'Mower Blade Set - 60 inch',
    'Set of 3 blades for John Deere Z930M',
    'BLADE-JD-Z930-60',
    4,
    2,
    'Tool Room - Wall Rack',
    89.00,
    'bb0e8400-e29b-41d4-a716-446655440006'::uuid,
    '2025-03-01 00:00:00+00',
    '2026-01-02 00:00:00+00'
  ),
  (
    'a20e8400-e29b-41d4-a716-446655440021'::uuid,
    '660e8400-e29b-41d4-a716-446655440002'::uuid,
    'Chainsaw Chain - 20 inch',
    'Replacement chain for Stihl MS 500i',
    'CHAIN-STL-20',
    6,
    3,
    'Tool Room - Cabinet',
    35.00,
    'bb0e8400-e29b-41d4-a716-446655440006'::uuid,
    '2025-03-01 00:00:00+00',
    '2025-12-15 00:00:00+00'
  ),
  
  -- Industrial Rentals Inventory
  (
    'a20e8400-e29b-41d4-a716-446655440030'::uuid,
    '660e8400-e29b-41d4-a716-446655440003'::uuid,
    'Forklift Battery - Industrial',
    '48V industrial battery for Toyota 8FGU25',
    'BATT-IND-48V-TOY',
    2,
    1,
    'Dock A - Battery Storage',
    2850.00,
    'bb0e8400-e29b-41d4-a716-446655440007'::uuid,
    '2025-04-01 00:00:00+00',
    '2026-01-07 00:00:00+00'
  ),
  (
    'a20e8400-e29b-41d4-a716-446655440031'::uuid,
    '660e8400-e29b-41d4-a716-446655440003'::uuid,
    'Pallet Jack Wheels - Polyurethane',
    'Front wheel set for Crown WP 3000',
    'WHEEL-PJ-POLY-2',
    10,
    4,
    'Dock B - Parts Shelf',
    145.00,
    'bb0e8400-e29b-41d4-a716-446655440007'::uuid,
    '2025-04-01 00:00:00+00',
    '2026-01-03 00:00:00+00'
  ),
  (
    'a20e8400-e29b-41d4-a716-446655440032'::uuid,
    '660e8400-e29b-41d4-a716-446655440003'::uuid,
    'Compressor Air Filter',
    'Air filter for Ingersoll Rand P185',
    'AF-IR-P185',
    5,
    3,
    'Staging Area - Rack 2',
    55.00,
    'bb0e8400-e29b-41d4-a716-446655440007'::uuid,
    '2025-06-01 00:00:00+00',
    '2025-12-20 00:00:00+00'
  )
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- SECTION 11: INVENTORY TRANSACTIONS (Audit Trail)
-- =====================================================
-- Stock movement history for inventory items

INSERT INTO public.inventory_transactions (
  id,
  inventory_item_id,
  organization_id,
  user_id,
  previous_quantity,
  new_quantity,
  change_amount,
  transaction_type,
  work_order_id,
  notes,
  created_at
) VALUES
  -- Hydraulic Oil transactions
  (
    'a30e8400-e29b-41d4-a716-446655440001'::uuid,
    'a20e8400-e29b-41d4-a716-446655440001'::uuid,
    '660e8400-e29b-41d4-a716-446655440000'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440001'::uuid,
    0,
    30,
    30,
    'initial',
    NULL,
    'Initial inventory setup',
    '2025-06-01 00:00:00+00'
  ),
  (
    'a30e8400-e29b-41d4-a716-446655440002'::uuid,
    'a20e8400-e29b-41d4-a716-446655440001'::uuid,
    '660e8400-e29b-41d4-a716-446655440000'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440003'::uuid,
    30,
    27,
    -3,
    'work_order',
    'a00e8400-e29b-41d4-a716-446655440004'::uuid,
    'Used for track tension work order',
    '2025-12-18 14:30:00+00'
  ),
  (
    'a30e8400-e29b-41d4-a716-446655440003'::uuid,
    'a20e8400-e29b-41d4-a716-446655440001'::uuid,
    '660e8400-e29b-41d4-a716-446655440000'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440003'::uuid,
    27,
    24,
    -3,
    'work_order',
    'a00e8400-e29b-41d4-a716-446655440001'::uuid,
    'Oil change in progress - CAT 320',
    '2026-01-08 09:30:00+00'
  ),
  -- Air Filter transactions (now low stock)
  (
    'a30e8400-e29b-41d4-a716-446655440004'::uuid,
    'a20e8400-e29b-41d4-a716-446655440002'::uuid,
    '660e8400-e29b-41d4-a716-446655440000'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440001'::uuid,
    0,
    10,
    10,
    'initial',
    NULL,
    'Initial inventory setup',
    '2025-06-01 00:00:00+00'
  ),
  (
    'a30e8400-e29b-41d4-a716-446655440005'::uuid,
    'a20e8400-e29b-41d4-a716-446655440002'::uuid,
    '660e8400-e29b-41d4-a716-446655440000'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440003'::uuid,
    10,
    3,
    -7,
    'usage',
    NULL,
    'Used for various equipment maintenance',
    '2026-01-07 11:00:00+00'
  ),
  -- Track shoes went to zero
  (
    'a30e8400-e29b-41d4-a716-446655440006'::uuid,
    'a20e8400-e29b-41d4-a716-446655440003'::uuid,
    '660e8400-e29b-41d4-a716-446655440000'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440001'::uuid,
    0,
    4,
    4,
    'initial',
    NULL,
    'Initial inventory setup',
    '2025-06-01 00:00:00+00'
  ),
  (
    'a30e8400-e29b-41d4-a716-446655440007'::uuid,
    'a20e8400-e29b-41d4-a716-446655440003'::uuid,
    '660e8400-e29b-41d4-a716-446655440000'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440003'::uuid,
    4,
    0,
    -4,
    'usage',
    NULL,
    'Used all track shoes - need to reorder',
    '2026-01-02 15:00:00+00'
  ),
  -- Metro: Pallet jack wheels usage
  (
    'a30e8400-e29b-41d4-a716-446655440010'::uuid,
    'a20e8400-e29b-41d4-a716-446655440031'::uuid,
    '660e8400-e29b-41d4-a716-446655440003'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440008'::uuid,
    12,
    10,
    -2,
    'work_order',
    'a00e8400-e29b-41d4-a716-446655440031'::uuid,
    'Replaced wheels on Crown pallet jack',
    '2026-01-03 14:00:00+00'
  )
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- SECTION 12: EQUIPMENT PART COMPATIBILITY (Direct Links)
-- =====================================================
-- Links inventory items to specific equipment pieces

INSERT INTO public.equipment_part_compatibility (
  equipment_id,
  inventory_item_id
) VALUES
  -- CAT 320 Excavator compatible parts
  ('aa0e8400-e29b-41d4-a716-446655440000'::uuid, 'a20e8400-e29b-41d4-a716-446655440001'::uuid),  -- Hydraulic Oil
  ('aa0e8400-e29b-41d4-a716-446655440000'::uuid, 'a20e8400-e29b-41d4-a716-446655440002'::uuid),  -- Air Filter
  ('aa0e8400-e29b-41d4-a716-446655440000'::uuid, 'a20e8400-e29b-41d4-a716-446655440003'::uuid),  -- Track Shoes
  ('aa0e8400-e29b-41d4-a716-446655440000'::uuid, 'a20e8400-e29b-41d4-a716-446655440004'::uuid),  -- Fuel Filter
  
  -- John Deere Dozer compatible parts
  ('aa0e8400-e29b-41d4-a716-446655440001'::uuid, 'a20e8400-e29b-41d4-a716-446655440001'::uuid),  -- Hydraulic Oil
  ('aa0e8400-e29b-41d4-a716-446655440001'::uuid, 'a20e8400-e29b-41d4-a716-446655440002'::uuid),  -- Air Filter
  ('aa0e8400-e29b-41d4-a716-446655440001'::uuid, 'a20e8400-e29b-41d4-a716-446655440004'::uuid),  -- Fuel Filter
  
  -- Generator parts
  ('aa0e8400-e29b-41d4-a716-446655440002'::uuid, 'a20e8400-e29b-41d4-a716-446655440004'::uuid),  -- Fuel Filter
  
  -- Light Tower parts
  ('aa0e8400-e29b-41d4-a716-446655440003'::uuid, 'a20e8400-e29b-41d4-a716-446655440005'::uuid),  -- LED Panel
  
  -- Metro: Boom Lift parts
  ('aa0e8400-e29b-41d4-a716-446655440011'::uuid, 'a20e8400-e29b-41d4-a716-446655440010'::uuid),  -- Hydraulic Seal Kit
  
  -- Metro: Scissor Lift parts
  ('aa0e8400-e29b-41d4-a716-446655440012'::uuid, 'a20e8400-e29b-41d4-a716-446655440011'::uuid),  -- Cylinder Seal
  
  -- Metro: Skid Steer parts
  ('aa0e8400-e29b-41d4-a716-446655440010'::uuid, 'a20e8400-e29b-41d4-a716-446655440012'::uuid),  -- Bucket Teeth
  
  -- Valley: Mower parts
  ('aa0e8400-e29b-41d4-a716-446655440020'::uuid, 'a20e8400-e29b-41d4-a716-446655440020'::uuid),  -- Blade Set
  
  -- Valley: Chainsaw parts
  ('aa0e8400-e29b-41d4-a716-446655440021'::uuid, 'a20e8400-e29b-41d4-a716-446655440021'::uuid),  -- Chain
  
  -- Industrial: Forklift parts
  ('aa0e8400-e29b-41d4-a716-446655440030'::uuid, 'a20e8400-e29b-41d4-a716-446655440030'::uuid),  -- Battery
  
  -- Industrial: Pallet Jack parts
  ('aa0e8400-e29b-41d4-a716-446655440031'::uuid, 'a20e8400-e29b-41d4-a716-446655440031'::uuid),  -- Wheels
  
  -- Industrial: Compressor parts
  ('aa0e8400-e29b-41d4-a716-446655440032'::uuid, 'a20e8400-e29b-41d4-a716-446655440032'::uuid)   -- Air Filter
ON CONFLICT DO NOTHING;

-- =====================================================
-- SECTION 13: EQUIPMENT NOTES
-- =====================================================
-- Comments and notes on equipment

INSERT INTO public.equipment_notes (
  id,
  equipment_id,
  author_id,
  content,
  is_private,
  created_at,
  updated_at
) VALUES
  -- CAT 320 Excavator notes
  (
    'e00e8400-e29b-41d4-a716-446655440001'::uuid,
    'aa0e8400-e29b-41d4-a716-446655440000'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440001'::uuid,
    'This unit runs hot in summer months. Monitor coolant temp closely when ambient is above 95°F.',
    false,
    '2025-07-15 10:00:00+00',
    '2025-07-15 10:00:00+00'
  ),
  (
    'e00e8400-e29b-41d4-a716-446655440002'::uuid,
    'aa0e8400-e29b-41d4-a716-446655440000'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440003'::uuid,
    'Replaced alternator belt on 12/10. Should last another 2000 hours.',
    false,
    '2025-12-10 14:00:00+00',
    '2025-12-10 14:00:00+00'
  ),
  -- John Deere Dozer notes
  (
    'e00e8400-e29b-41d4-a716-446655440003'::uuid,
    'aa0e8400-e29b-41d4-a716-446655440001'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440002'::uuid,
    'Internal note: Check for manufacturer recall on hydraulic lines. Bulletin #JD-2025-0043.',
    true,  -- Private note
    '2025-11-20 09:00:00+00',
    '2025-11-20 09:00:00+00'
  ),
  -- Light Tower notes
  (
    'e00e8400-e29b-41d4-a716-446655440004'::uuid,
    'aa0e8400-e29b-41d4-a716-446655440003'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440003'::uuid,
    'Mast extends slowly. Needs hydraulic fluid top-off and possible pump inspection.',
    false,
    '2025-12-28 11:00:00+00',
    '2025-12-28 11:00:00+00'
  ),
  -- Boom Lift notes (Metro)
  (
    'e00e8400-e29b-41d4-a716-446655440005'::uuid,
    'aa0e8400-e29b-41d4-a716-446655440011'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440004'::uuid,
    'Popular rental unit. Keep in top condition - high revenue generator.',
    true,  -- Private note
    '2025-10-15 08:00:00+00',
    '2025-10-15 08:00:00+00'
  ),
  (
    'e00e8400-e29b-41d4-a716-446655440006'::uuid,
    'aa0e8400-e29b-41d4-a716-446655440011'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440005'::uuid,
    'Customer reported minor drift when platform fully extended. Checked - within spec but monitor.',
    false,
    '2025-12-01 15:00:00+00',
    '2025-12-01 15:00:00+00'
  ),
  -- Forklift notes (Industrial)
  (
    'e00e8400-e29b-41d4-a716-446655440007'::uuid,
    'aa0e8400-e29b-41d4-a716-446655440030'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440007'::uuid,
    'Primary warehouse forklift. Battery replaced Jan 2026. Next replacement due ~Jan 2029.',
    false,
    '2026-01-08 10:00:00+00',
    '2026-01-08 10:00:00+00'
  )
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- SECTION 14: QR CODE SCANS
-- =====================================================
-- Scan history showing equipment location and usage

INSERT INTO public.scans (
  id,
  equipment_id,
  scanned_by,
  scanned_at,
  location,
  notes
) VALUES
  -- CAT 320 Excavator - Multiple scans showing movement
  (
    '5c0e8400-e29b-41d4-a716-446655440001'::uuid,
    'aa0e8400-e29b-41d4-a716-446655440000'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440003'::uuid,
    '2026-01-01 07:00:00+00',
    'Apex Yard - Pre-deployment inspection',
    'Checked fluids, all good'
  ),
  (
    '5c0e8400-e29b-41d4-a716-446655440002'::uuid,
    'aa0e8400-e29b-41d4-a716-446655440000'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440003'::uuid,
    '2026-01-03 06:30:00+00',
    'Site Alpha - Dallas Downtown',
    'Arrived on site'
  ),
  (
    '5c0e8400-e29b-41d4-a716-446655440003'::uuid,
    'aa0e8400-e29b-41d4-a716-446655440000'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440001'::uuid,
    '2026-01-08 14:30:00+00',
    'Site Alpha - Dallas Downtown',
    'Operator check-in after lunch'
  ),
  
  -- John Deere Dozer scan
  (
    '5c0e8400-e29b-41d4-a716-446655440004'::uuid,
    'aa0e8400-e29b-41d4-a716-446655440001'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440003'::uuid,
    '2026-01-07 09:15:00+00',
    'Fort Worth Industrial Park',
    'Daily inspection complete'
  ),
  
  -- Generator scan
  (
    '5c0e8400-e29b-41d4-a716-446655440005'::uuid,
    'aa0e8400-e29b-41d4-a716-446655440002'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440003'::uuid,
    '2026-01-05 16:45:00+00',
    'Houston Energy District',
    'Fuel level check - 75%'
  ),
  
  -- Bobcat Skid Steer - Rental check-out (Metro)
  (
    '5c0e8400-e29b-41d4-a716-446655440010'::uuid,
    'aa0e8400-e29b-41d4-a716-446655440010'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440005'::uuid,
    '2026-01-08 10:00:00+00',
    'LA Convention Center Job Site',
    'Rented to ABC Construction - 3 day rental'
  ),
  
  -- JLG Boom Lift - Multiple scans (Metro)
  (
    '5c0e8400-e29b-41d4-a716-446655440011'::uuid,
    'aa0e8400-e29b-41d4-a716-446655440011'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440004'::uuid,
    '2026-01-06 08:00:00+00',
    'San Francisco - New Tower Project',
    NULL
  ),
  (
    '5c0e8400-e29b-41d4-a716-446655440012'::uuid,
    'aa0e8400-e29b-41d4-a716-446655440011'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440005'::uuid,
    '2026-01-08 12:30:00+00',
    'San Francisco - New Tower Project',
    'Extended rental - customer requested 2 more weeks'
  ),
  
  -- Valley Landscaping scans
  (
    '5c0e8400-e29b-41d4-a716-446655440020'::uuid,
    'aa0e8400-e29b-41d4-a716-446655440020'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440006'::uuid,
    '2026-01-08 08:00:00+00',
    'Denver City Park - North Section',
    'Morning mowing route started'
  ),
  (
    '5c0e8400-e29b-41d4-a716-446655440021'::uuid,
    'aa0e8400-e29b-41d4-a716-446655440021'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440006'::uuid,
    '2026-01-08 11:00:00+00',
    'Boulder Mountain Parks',
    'Tree removal job'
  ),
  
  -- Industrial forklift - warehouse operations
  (
    '5c0e8400-e29b-41d4-a716-446655440030'::uuid,
    'aa0e8400-e29b-41d4-a716-446655440030'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440007'::uuid,
    '2026-01-08 15:00:00+00',
    'Chicago DC - Loading Dock 3',
    'Shift start inspection'
  ),
  (
    '5c0e8400-e29b-41d4-a716-446655440031'::uuid,
    'aa0e8400-e29b-41d4-a716-446655440030'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440008'::uuid,
    '2026-01-08 15:45:00+00',
    'Chicago DC - Aisle 14',
    NULL
  ),
  (
    '5c0e8400-e29b-41d4-a716-446655440032'::uuid,
    'aa0e8400-e29b-41d4-a716-446655440031'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440008'::uuid,
    '2026-01-08 08:00:00+00',
    'Detroit Auto Plant',
    'Morning shift check'
  )
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- SECTION 15: GEOCODED LOCATIONS (Cache)
-- =====================================================
-- Cached location lookups for map features

INSERT INTO public.geocoded_locations (
  id,
  organization_id,
  input_text,
  normalized_text,
  latitude,
  longitude,
  formatted_address,
  created_at,
  updated_at
) VALUES
  -- Apex locations
  (
    '9c0e8400-e29b-41d4-a716-446655440001'::uuid,
    '660e8400-e29b-41d4-a716-446655440000'::uuid,
    'Site Alpha - Dallas Downtown',
    'site alpha dallas downtown',
    32.7767,
    -96.7970,
    '1500 Main St, Dallas, TX 75201, USA',
    '2025-11-01 00:00:00+00',
    '2025-11-01 00:00:00+00'
  ),
  (
    '9c0e8400-e29b-41d4-a716-446655440002'::uuid,
    '660e8400-e29b-41d4-a716-446655440000'::uuid,
    'Fort Worth Industrial Park',
    'fort worth industrial park',
    32.7555,
    -97.3308,
    '2000 Industrial Blvd, Fort Worth, TX 76102, USA',
    '2025-11-01 00:00:00+00',
    '2025-11-01 00:00:00+00'
  ),
  (
    '9c0e8400-e29b-41d4-a716-446655440003'::uuid,
    '660e8400-e29b-41d4-a716-446655440000'::uuid,
    'Houston Energy District',
    'houston energy district',
    29.7604,
    -95.3698,
    '1200 Smith St, Houston, TX 77002, USA',
    '2025-11-15 00:00:00+00',
    '2025-11-15 00:00:00+00'
  ),
  -- Metro locations
  (
    '9c0e8400-e29b-41d4-a716-446655440010'::uuid,
    '660e8400-e29b-41d4-a716-446655440001'::uuid,
    'LA Convention Center',
    'la convention center',
    34.0407,
    -118.2688,
    '1201 S Figueroa St, Los Angeles, CA 90015, USA',
    '2025-12-01 00:00:00+00',
    '2025-12-01 00:00:00+00'
  ),
  (
    '9c0e8400-e29b-41d4-a716-446655440011'::uuid,
    '660e8400-e29b-41d4-a716-446655440001'::uuid,
    'San Francisco Financial District',
    'san francisco financial district',
    37.7749,
    -122.4194,
    '555 California St, San Francisco, CA 94104, USA',
    '2025-12-01 00:00:00+00',
    '2025-12-01 00:00:00+00'
  ),
  -- Valley locations
  (
    '9c0e8400-e29b-41d4-a716-446655440020'::uuid,
    '660e8400-e29b-41d4-a716-446655440002'::uuid,
    'Denver City Park',
    'denver city park',
    39.7392,
    -104.9903,
    'City Park, Denver, CO 80205, USA',
    '2025-10-15 00:00:00+00',
    '2025-10-15 00:00:00+00'
  ),
  (
    '9c0e8400-e29b-41d4-a716-446655440021'::uuid,
    '660e8400-e29b-41d4-a716-446655440002'::uuid,
    'Boulder Mountain Parks',
    'boulder mountain parks',
    40.0150,
    -105.2705,
    'Boulder Mountain Parks, Boulder, CO 80302, USA',
    '2025-10-15 00:00:00+00',
    '2025-10-15 00:00:00+00'
  ),
  -- Industrial locations
  (
    '9c0e8400-e29b-41d4-a716-446655440030'::uuid,
    '660e8400-e29b-41d4-a716-446655440003'::uuid,
    'Chicago Distribution Center',
    'chicago distribution center',
    41.8525,
    -87.6324,
    '500 W Monroe St, Chicago, IL 60661, USA',
    '2025-09-01 00:00:00+00',
    '2025-09-01 00:00:00+00'
  ),
  (
    '9c0e8400-e29b-41d4-a716-446655440031'::uuid,
    '660e8400-e29b-41d4-a716-446655440003'::uuid,
    'Detroit Auto Plant',
    'detroit auto plant',
    42.3314,
    -83.0458,
    '2000 E Jefferson Ave, Detroit, MI 48207, USA',
    '2025-09-01 00:00:00+00',
    '2025-09-01 00:00:00+00'
  ),
  (
    '9c0e8400-e29b-41d4-a716-446655440032'::uuid,
    '660e8400-e29b-41d4-a716-446655440003'::uuid,
    'Atlanta Industrial Park',
    'atlanta industrial park',
    33.7490,
    -84.3880,
    '1000 Northside Dr NW, Atlanta, GA 30318, USA',
    '2025-09-15 00:00:00+00',
    '2025-09-15 00:00:00+00'
  )
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- SECTION 16: CUSTOMERS (For Industrial Rentals)
-- =====================================================
-- Customer records for the rental business scenario

INSERT INTO public.customers (
  id,
  organization_id,
  name,
  status,
  created_at
) VALUES
  (
    'c00e8400-e29b-41d4-a716-446655440001'::uuid,
    '660e8400-e29b-41d4-a716-446655440003'::uuid,
    'ABC Construction Co',
    'active',
    '2025-03-15 00:00:00+00'
  ),
  (
    'c00e8400-e29b-41d4-a716-446655440002'::uuid,
    '660e8400-e29b-41d4-a716-446655440003'::uuid,
    'Metro Builders LLC',
    'active',
    '2025-04-01 00:00:00+00'
  ),
  (
    'c00e8400-e29b-41d4-a716-446655440003'::uuid,
    '660e8400-e29b-41d4-a716-446655440003'::uuid,
    'Lakeside Development Group',
    'active',
    '2025-06-15 00:00:00+00'
  ),
  (
    'c00e8400-e29b-41d4-a716-446655440004'::uuid,
    '660e8400-e29b-41d4-a716-446655440003'::uuid,
    'Inactive Customer Inc',
    'inactive',
    '2024-08-01 00:00:00+00'
  )
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- USAGE INSTRUCTIONS
-- =====================================================
-- After running 'npx supabase db reset', you can login as any test user:
--
-- BUSINESS RULE: Every user owns exactly ONE organization (created at signup)
--
-- | Email                   | Password    | Owns (Personal Org)        | Also Member At           |
-- |-------------------------|-------------|----------------------------|--------------------------|
-- | owner@apex.test         | password123 | Apex Construction          | Metro (member)           |
-- | admin@apex.test         | password123 | Amanda's Equipment         | Apex (admin), Valley     |
-- | tech@apex.test          | password123 | Tom's Field Services       | Apex (member)            |
-- | owner@metro.test        | password123 | Metro Equipment            | Industrial (admin)       |
-- | tech@metro.test         | password123 | Mike's Repair Shop         | Metro (member)           |
-- | owner@valley.test       | password123 | Valley Landscaping         | -                        |
-- | owner@industrial.test   | password123 | Industrial Rentals         | Apex (member)            |
-- | multi@equipqr.test      | password123 | Multi Org Consulting       | All 4 business orgs      |
--
-- Organizations (8 total):
-- Business Orgs (4):
-- - Apex Construction Company (premium) - primary test org
-- - Metro Equipment Services (premium) - cross-membership testing
-- - Valley Landscaping (free) - free tier testing
-- - Industrial Rentals Corp (premium) - rental business scenario
-- Personal Orgs (4):
-- - Amanda's Equipment Services (free) - admin@apex.test's org
-- - Tom's Field Services (free) - tech@apex.test's org
-- - Mike's Repair Shop (free) - tech@metro.test's org
-- - Multi Org Consulting (free) - multi@equipqr.test's org
--
-- Test Scenarios:
-- 1. Ownership: Every user owns exactly one org (business rule compliance)
-- 2. Cross-org membership: owner@apex.test is also member at Metro
-- 3. Multi-org admin: owner@metro.test is admin at Industrial
-- 4. Free tier: Valley Landscaping and personal orgs test feature limitations
-- 5. Multi-org user: multi@equipqr.test tests org switching (owns 1, member of 4)
--
-- Equipment Locations (Map Testing):
-- - Apex: Texas region (Dallas, Fort Worth, Houston) - clustered
-- - Metro: California (LA, SF, San Diego) - spread out
-- - Valley: Colorado (Denver, Boulder, Colorado Springs)
-- - Industrial: Nationwide (Chicago, Detroit, Atlanta, NYC)
-- - Personal orgs have no equipment (minimal orgs)
-- - One equipment (Light Tower) has NULL location for empty state testing
-- - One equipment (Kubota Tractor) has stale 45-day-old location
--
-- Work Order Status Coverage:
-- - submitted (2): New requests awaiting review
-- - accepted (1): Approved, not yet started
-- - assigned (1): Assigned to technician
-- - in_progress (4): Currently being worked
-- - on_hold (1): Blocked waiting for parts
-- - completed (2): Historical completed work
-- - cancelled (1): Cancelled work order
--
-- Inventory Edge Cases:
-- - Normal stock: Hydraulic Oil (24 qty, threshold 10)
-- - LOW STOCK: Air Filter (3 qty, threshold 5), LED Panel (2 qty, threshold 3)
-- - OUT OF STOCK: Track Shoes (0 qty), Scissor Lift Cylinder Seal (0 qty)
-- - No SKU: LED Panel (testing optional field)
--
-- QR Scan History:
-- - CAT Excavator has 3 scans over 8 days (movement tracking)
-- - Forklift has 2 scans in same day (high usage)
-- - Various equipment with location-specific scans
-- =====================================================
