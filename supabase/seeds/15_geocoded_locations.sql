-- =====================================================
-- EquipQR Seed Data - Geocoded Locations (Cache)
-- =====================================================
-- Production reality: this table has 0 rows in production. It is a pure
-- runtime cache populated by the geocoding edge function.
--
-- We seed only 3 rows as cache-hit test fixtures, each clearly commented.
-- Use 6-decimal coordinate precision and country embedded in formatted_address
-- (matching the prod assigned_location_country = 'United States' convention).
-- =====================================================

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
  -- Cache fixture: lookup-hit test for an Apex-region city
  (
    '9c0e8400-e29b-41d4-a716-446655440001'::uuid,
    '660e8400-e29b-41d4-a716-446655440000'::uuid,
    'Dallas, TX',
    'dallas tx',
    32.776664,
    -96.796988,
    'Dallas, TX, United States',
    '2026-04-01 00:00:00+00',
    '2026-04-01 00:00:00+00'
  ),
  -- Cache fixture: lookup-hit test for a Metro-region city
  (
    '9c0e8400-e29b-41d4-a716-446655440010'::uuid,
    '660e8400-e29b-41d4-a716-446655440001'::uuid,
    'Los Angeles, CA',
    'los angeles ca',
    34.054908,
    -118.242643,
    'Los Angeles, CA, United States',
    '2026-04-01 00:00:00+00',
    '2026-04-01 00:00:00+00'
  ),
  -- Cache fixture: rural-area test (matches Industrial Rentals coords from prod)
  (
    '9c0e8400-e29b-41d4-a716-446655440030'::uuid,
    '660e8400-e29b-41d4-a716-446655440003'::uuid,
    'Giddings, TX',
    'giddings tx',
    30.182716,
    -96.936371,
    'Giddings, TX, United States',
    '2026-04-01 00:00:00+00',
    '2026-04-01 00:00:00+00'
  )
ON CONFLICT (id) DO NOTHING;
