-- =====================================================
-- EquipQR Seed Data - Equipment Location History
-- =====================================================
-- Production-faithful scan history (prod has 4 rows, all source='scan',
-- all with address_* columns NULL, all with formatted_address as the
-- literal "lat, lng" string, all metadata = '{}').
--
-- This file seeds:
--   * One 3-row jitter cluster (modeled on the real prod ~5m jitter at
--     40.919345,-90.659318 in Galesburg-area IL) on the CAT 320 Excavator,
--     so the temporal-clustering UI is testable.
--   * Several single-scan rows on other equipment, geographically spread,
--     so the location-history view has non-trivial data to render.
--   * One explicit 'manual' and one 'team_sync' fixture at the end,
--     CLEARLY MARKED as test fixtures NOT seen in production. These keep
--     the source-enum coverage alive for tests.
-- =====================================================

INSERT INTO public.equipment_location_history (
  id,
  equipment_id,
  source,
  latitude,
  longitude,
  address_street,
  address_city,
  address_state,
  address_country,
  formatted_address,
  changed_by,
  metadata,
  created_at
) VALUES
  -- ---------------------------------------------------
  -- Scan jitter cluster on CAT 320 Excavator (3 rows within ~5 meters)
  -- Modeled on the real prod cluster at 40.919345, -90.659318
  -- All within a 4-hour window for temporal-cluster UI testing.
  -- ---------------------------------------------------
  (
    '6d0e8400-e29b-41d4-a716-446655440001'::uuid,
    'aa0e8400-e29b-41d4-a716-446655440000'::uuid, -- CAT 320 Excavator
    'scan',
    40.919345, -90.659318,
    NULL, NULL, NULL, NULL,
    '40.919345, -90.659318',
    'bb0e8400-e29b-41d4-a716-446655440003'::uuid,
    '{}'::jsonb,
    '2026-04-15 08:30:00+00'
  ),
  (
    '6d0e8400-e29b-41d4-a716-446655440002'::uuid,
    'aa0e8400-e29b-41d4-a716-446655440000'::uuid,
    'scan',
    40.919345, -90.659373,
    NULL, NULL, NULL, NULL,
    '40.919345, -90.659373',
    'bb0e8400-e29b-41d4-a716-446655440003'::uuid,
    '{}'::jsonb,
    '2026-04-15 10:45:00+00'
  ),
  (
    '6d0e8400-e29b-41d4-a716-446655440003'::uuid,
    'aa0e8400-e29b-41d4-a716-446655440000'::uuid,
    'scan',
    40.919433, -90.659299,
    NULL, NULL, NULL, NULL,
    '40.919433, -90.659299',
    'bb0e8400-e29b-41d4-a716-446655440001'::uuid,
    '{}'::jsonb,
    '2026-04-15 12:15:00+00'
  ),

  -- ---------------------------------------------------
  -- Geographically spread single-scan rows on other equipment
  -- ---------------------------------------------------
  (
    '6d0e8400-e29b-41d4-a716-446655440004'::uuid,
    'aa0e8400-e29b-41d4-a716-446655440010'::uuid, -- Bobcat S650 Skid Steer (Metro)
    'scan',
    34.054908, -118.242643,
    NULL, NULL, NULL, NULL,
    '34.054908, -118.242643',
    'bb0e8400-e29b-41d4-a716-446655440005'::uuid,
    '{}'::jsonb,
    '2026-04-17 10:00:00+00'
  ),
  (
    '6d0e8400-e29b-41d4-a716-446655440005'::uuid,
    'aa0e8400-e29b-41d4-a716-446655440011'::uuid, -- JLG 450AJ Boom Lift (Metro)
    'scan',
    37.774929, -122.419416,
    NULL, NULL, NULL, NULL,
    '37.774929, -122.419416',
    'bb0e8400-e29b-41d4-a716-446655440005'::uuid,
    '{}'::jsonb,
    '2026-04-16 14:30:00+00'
  ),
  (
    '6d0e8400-e29b-41d4-a716-446655440006'::uuid,
    'aa0e8400-e29b-41d4-a716-446655440032'::uuid, -- Ingersoll Rand P185 Compressor (Industrial / Giddings)
    'scan',
    30.176703, -96.934983,
    NULL, NULL, NULL, NULL,
    '30.176703, -96.934983',
    'bb0e8400-e29b-41d4-a716-446655440007'::uuid,
    '{}'::jsonb,
    '2026-04-14 09:00:00+00'
  ),
  (
    '6d0e8400-e29b-41d4-a716-446655440007'::uuid,
    'aa0e8400-e29b-41d4-a716-446655440080'::uuid, -- Sullair 185 Compressor (Mike's / Phoenix)
    'scan',
    33.448377, -112.074037,
    NULL, NULL, NULL, NULL,
    '33.448377, -112.074037',
    'bb0e8400-e29b-41d4-a716-446655440003'::uuid,
    '{}'::jsonb,
    '2026-04-12 16:20:00+00'
  ),
  (
    '6d0e8400-e29b-41d4-a716-446655440008'::uuid,
    'aa0e8400-e29b-41d4-a716-446655440090'::uuid, -- Doosan P185 Compressor (Tom's / Charlotte)
    'scan',
    35.227087, -80.843127,
    NULL, NULL, NULL, NULL,
    '35.227087, -80.843127',
    'bb0e8400-e29b-41d4-a716-446655440003'::uuid,
    '{}'::jsonb,
    '2026-04-13 11:45:00+00'
  ),

  -- ---------------------------------------------------
  -- Test fixtures NOT seen in production (kept to exercise full enum)
  -- These rows intentionally populate address_* and metadata to give
  -- non-scan code paths real fixtures to render.
  -- ---------------------------------------------------
  (
    '6d0e8400-e29b-41d4-a716-446655440009'::uuid,
    'aa0e8400-e29b-41d4-a716-446655440001'::uuid, -- John Deere 850L Dozer (Apex)
    'manual', -- TEST FIXTURE: prod has 0 manual rows; kept for enum coverage
    32.755488, -97.330766,
    NULL, -- production scan history never sets address_*; fixtures stay null too
    'Fort Worth', 'TX', 'United States',
    'Fort Worth, TX, United States',
    'bb0e8400-e29b-41d4-a716-446655440003'::uuid,
    '{"reason":"operator update","entry_point":"equipment_edit_form"}'::jsonb,
    '2026-04-15 09:16:00+00'
  ),
  (
    '6d0e8400-e29b-41d4-a716-44665544000a'::uuid,
    'aa0e8400-e29b-41d4-a716-446655440000'::uuid, -- CAT 320 Excavator (team_sync paired with use_team_location fixture)
    'team_sync', -- TEST FIXTURE: prod has 0 team_sync rows; kept for enum coverage
    32.776664, -96.796988,
    NULL,
    'Dallas', 'TX', 'United States',
    'Dallas, TX, United States',
    'bb0e8400-e29b-41d4-a716-446655440001'::uuid,
    '{"team_id":"880e8400-e29b-41d4-a716-446655440000","trigger":"team_override_enabled"}'::jsonb,
    '2026-04-17 14:35:00+00'
  )
ON CONFLICT (id) DO NOTHING;
