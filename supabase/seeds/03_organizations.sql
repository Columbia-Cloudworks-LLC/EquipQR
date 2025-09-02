-- =====================================================
-- Organizations Seed Data (Simplified)
-- Creates basic test organizations without complex subscription data
-- =====================================================

-- Insert basic test organizations
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
  -- Main test organization (Construction Company)
  (
    '660e8400-e29b-41d4-a716-446655440000'::uuid,
    'Apex Construction Company',
    'premium'::organization_plan,
    5,
    50,
    ARRAY[
      'Equipment Management',
      'Work Orders',
      'Team Management',
      'Preventive Maintenance',
      'Fleet Tracking'
    ],
    '2024-01-01 00:00:00+00',
    '2024-01-01 00:00:00+00'
  ),
  -- Secondary organization (Small Contractor)
  (
    '660e8400-e29b-41d4-a716-446655440001'::uuid,
    'Metro Landscaping Services',
    'free'::organization_plan,
    3,
    5,
    ARRAY[
      'Equipment Management',
      'Work Orders',
      'Team Management'
    ],
    '2024-01-15 00:00:00+00',
    '2024-01-15 00:00:00+00'
  )
ON CONFLICT (id) DO NOTHING;
