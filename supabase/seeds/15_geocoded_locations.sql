-- =====================================================
-- EquipQR Seed Data - Geocoded Locations (Cache)
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
