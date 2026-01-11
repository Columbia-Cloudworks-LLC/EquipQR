-- =====================================================
-- EquipQR Seed Data - Organization Members (Cross-Org Matrix)
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
