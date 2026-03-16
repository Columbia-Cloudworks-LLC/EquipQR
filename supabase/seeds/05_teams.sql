-- =====================================================
-- EquipQR Seed Data - Teams
-- =====================================================
-- 6 Teams across all organizations

INSERT INTO public.teams (
  id,
  organization_id,
  name,
  description,
  location_address,
  location_city,
  location_state,
  location_country,
  location_lat,
  location_lng,
  override_equipment_location,
  created_at,
  updated_at
) VALUES 
  -- Apex Construction Company Teams
  (
    '880e8400-e29b-41d4-a716-446655440000'::uuid,
    '660e8400-e29b-41d4-a716-446655440000'::uuid,
    'Heavy Equipment Team',
    'Manages excavators, bulldozers, and heavy construction machinery',
    '1500 Main St',
    'Dallas',
    'TX',
    'US',
    32.7767,
    -96.7970,
    true,
    '2024-01-01 00:00:00+00',
    '2024-01-01 00:00:00+00'
  ),
  (
    '880e8400-e29b-41d4-a716-446655440001'::uuid,
    '660e8400-e29b-41d4-a716-446655440000'::uuid,
    'Site Operations Team',
    'Handles generators, compressors, and site support equipment',
    NULL,
    NULL,
    NULL,
    NULL,
    29.7604,
    -95.3698,
    false,
    '2024-01-01 00:00:00+00',
    '2024-01-01 00:00:00+00'
  ),
  -- Metro Equipment Services Teams
  (
    '880e8400-e29b-41d4-a716-446655440002'::uuid,
    '660e8400-e29b-41d4-a716-446655440001'::uuid,
    'Rental Fleet Team',
    'Manages rental equipment inventory and maintenance',
    '2000 Sunset Blvd',
    'Los Angeles',
    'CA',
    'US',
    34.0522,
    -118.2437,
    true,
    '2024-01-15 00:00:00+00',
    '2024-01-15 00:00:00+00'
  ),
  (
    '880e8400-e29b-41d4-a716-446655440003'::uuid,
    '660e8400-e29b-41d4-a716-446655440001'::uuid,
    'Customer Service Team',
    'Handles customer equipment requests and support',
    '100 Harbor Dr',
    'San Diego',
    'CA',
    'US',
    NULL,
    NULL,
    false,
    '2024-01-15 00:00:00+00',
    '2024-01-15 00:00:00+00'
  ),
  -- Valley Landscaping Team
  (
    '880e8400-e29b-41d4-a716-446655440004'::uuid,
    '660e8400-e29b-41d4-a716-446655440002'::uuid,
    'Grounds Crew',
    'Landscaping equipment and maintenance team',
    '200 E Colfax Ave',
    'Denver',
    'CO',
    'US',
    39.7392,
    -104.9903,
    false,
    '2024-02-01 00:00:00+00',
    '2024-02-01 00:00:00+00'
  ),
  -- Industrial Rentals Corp Team
  (
    '880e8400-e29b-41d4-a716-446655440005'::uuid,
    '660e8400-e29b-41d4-a716-446655440003'::uuid,
    'Warehouse Team',
    'Equipment storage, logistics, and inventory management',
    NULL,
    NULL,
    NULL,
    NULL,
    41.8781,
    -87.6298,
    true,
    '2024-02-15 00:00:00+00',
    '2024-02-15 00:00:00+00'
  )
ON CONFLICT (id) DO NOTHING;
