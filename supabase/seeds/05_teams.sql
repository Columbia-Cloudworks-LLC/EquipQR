-- =====================================================
-- EquipQR Seed Data - Teams
-- =====================================================
-- 6 Teams across all organizations.
--
-- Production-faithful team-location pattern (prod has 19 teams, of which only
-- 3 have any location data and 0 have a populated street address):
--
--   * location_address is NEVER populated (0/19 in prod).
--   * Only ~15% of teams have lat/lng coordinates (we keep 1 of 6 here).
--   * Where coords exist, country is the literal string 'United States'.
--   * override_equipment_location = true is rare; we keep ONE explicit fixture
--     paired with equipment aa0e8400-...-446655440000 (CAT 320 Excavator) so
--     the team-override map hierarchy is testable in isolation.
-- =====================================================

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
  -- Team-override fixture: paired with equipment aa0e8400-...-440000
  (
    '880e8400-e29b-41d4-a716-446655440000'::uuid,
    '660e8400-e29b-41d4-a716-446655440000'::uuid,
    'Heavy Equipment Team',
    'Manages excavators, bulldozers, and heavy construction machinery',
    NULL, -- prod never populates this
    'Dallas',
    'TX',
    'United States',
    32.776664,
    -96.796988,
    true, -- single team-override fixture
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
    NULL,
    NULL,
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
    NULL,
    'Los Angeles',
    'CA',
    'United States',
    34.054908,
    -118.242643,
    false,
    '2024-01-15 00:00:00+00',
    '2024-01-15 00:00:00+00'
  ),
  (
    '880e8400-e29b-41d4-a716-446655440003'::uuid,
    '660e8400-e29b-41d4-a716-446655440001'::uuid,
    'Customer Service Team',
    'Handles customer equipment requests and support',
    NULL,
    NULL,
    NULL,
    NULL,
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
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
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
    NULL,
    NULL,
    false,
    '2024-02-15 00:00:00+00',
    '2024-02-15 00:00:00+00'
  )
ON CONFLICT (id) DO NOTHING;
