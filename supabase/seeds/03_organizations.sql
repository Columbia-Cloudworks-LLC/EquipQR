-- =====================================================
-- EquipQR Seed Data - Organizations
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
    'premium'::public.organization_plan,
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
    'premium'::public.organization_plan,
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
    'free'::public.organization_plan,
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
    'premium'::public.organization_plan,
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
    'free'::public.organization_plan,
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
    'free'::public.organization_plan,
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
    'free'::public.organization_plan,
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
    'free'::public.organization_plan,
    1,
    5,
    ARRAY['Equipment Management', 'Work Orders', 'Team Management'],
    '2023-11-01 00:00:00+00',
    '2023-11-01 00:00:00+00'
  )
ON CONFLICT (id) DO NOTHING;
