-- =====================================================
-- EquipQR Seed Data - Teams
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
