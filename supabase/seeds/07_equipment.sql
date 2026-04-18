-- =====================================================
-- EquipQR Seed Data - Equipment
-- =====================================================
-- Production-faithful equipment fixture (~150 rows across 6 orgs).
-- Mirrors real prod patterns observed in project ymxkzronkhwxzcdcbnwq:
--   * `location` text uses 4 patterns: "City, ST" / yard label / casing-variant / "Unknown"
--   * `assigned_location_*` is sparse (~5-10% of equipment), street is NEVER set,
--     country is the literal string 'United States', coords have 6+ decimals
--   * `last_known_location` is almost never populated (4 explicit map-test fixtures)
--   * `use_team_location = true` only exists as ONE explicit team-override fixture
--   * Per-org culture: each org has a distinct location-data style
--
-- Existing 30 equipment IDs (referenced by 7 other seed files) are preserved.
-- New rows use the disjoint UUID range aa0e8400-...-44665544Fxxx (F000-F5FF).
--
-- =====================================================
-- City centroid reference table (single source of truth for coords)
-- =====================================================
-- All coordinates in 6+ decimal degrees (Google Geocoding output precision).
-- The seven cities marked PROD are the actual coordinates currently in
-- production rows; the rest are canonical city centroids.
--
--   City              ST  Lat            Lng              Source
--   ------------------ --- -------------- ----------------- ------
--   Atlanta            GA  33.748997      -84.387985        canonical
--   Austin             TX  30.267153      -97.743057        canonical
--   Birmingham         AL  33.518589      -86.810356        canonical
--   Boston             MA  42.360082      -71.058880        canonical
--   Brenham (rural)    TX  30.296716      -96.963862        PROD
--   Charlotte          NC  35.227087      -80.843127        canonical
--   Chicago            IL  41.883250      -87.632388        PROD
--   Cincinnati         OH  39.103119      -84.512016        canonical
--   Cleveland          OH  41.499320      -81.694361        PROD
--   Dallas             TX  32.776664      -96.796988        canonical
--   Denver             CO  39.739236      -104.990251       PROD
--   Detroit            MI  42.331427      -83.045754        canonical
--   Fort Worth         TX  32.755488      -97.330766        canonical
--   Giddings           TX  30.182716      -96.936371        PROD
--   Houston            TX  29.760427      -95.369803        canonical
--   Indianapolis       IN  39.769090      -86.158018        PROD
--   Jacksonville       FL  30.332184      -81.655651        canonical
--   Kansas City        MO  39.099728      -94.578568        canonical
--   Las Vegas          NV  36.169941      -115.139830       canonical
--   Long Beach         CA  33.770050      -118.193740       canonical
--   Los Angeles        CA  34.054908      -118.242643       PROD
--   Louisville         KY  38.252666      -85.758453        canonical
--   Memphis            TN  35.149534      -90.048980        canonical
--   Miami              FL  25.761680      -80.191790        canonical
--   Milwaukee          WI  43.038902      -87.906471        canonical
--   Minneapolis        MN  44.977753      -93.265015        canonical
--   Nashville          TN  36.162663      -86.781601        canonical
--   New Orleans        LA  29.951065      -90.071533        canonical
--   New York           NY  40.712776      -74.005974        canonical
--   Oklahoma City      OK  35.467560      -97.516428        canonical
--   Orlando            FL  28.538336      -81.379234        canonical
--   Philadelphia       PA  39.952584      -75.165222        canonical
--   Phoenix            AZ  33.448377      -112.074037       canonical
--   Pittsburgh         PA  40.440625      -79.995886        canonical
--   Portland           OR  45.515232      -122.678448       canonical
--   Raleigh            NC  35.779590      -78.638176        canonical
--   Sacramento         CA  38.581572      -121.494400       canonical
--   Salt Lake City     UT  40.760780      -111.891045       canonical
--   San Antonio        TX  29.424122      -98.493629        canonical
--   San Diego          CA  32.715738      -117.161084       canonical
--   San Francisco      CA  37.774929      -122.419416       canonical
--   Seattle            WA  47.606139      -122.332848       canonical
--   St. Louis          MO  38.627003      -90.199402        canonical
--   Tampa              FL  27.950575      -82.457178        canonical
--   Tucson             AZ  32.221743      -110.926479       canonical
--   Tulsa              OK  36.153982      -95.992775        canonical
-- =====================================================

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
  -- =====================================================
  -- EXISTING EQUIPMENT (30 rows) - UUIDs preserved (referenced by other seed files)
  -- Locations rewritten to match the 4 production patterns.
  -- =====================================================

  -- Apex Construction Company (org 0000) - National fleet, mostly clean "City, ST"
  -- One team-override fixture (CAT 320 Excavator + Heavy Equipment Team).
  (
    'aa0e8400-e29b-41d4-a716-446655440000'::uuid,
    '660e8400-e29b-41d4-a716-446655440000'::uuid,
    '880e8400-e29b-41d4-a716-446655440000'::uuid,
    'CAT 320 Excavator', 'Caterpillar', '320 GC', 'CAT320GC2023001',
    'active'::equipment_status,
    'Dallas, TX',
    '2023-03-15', 1542.5,
    '{"bucket_capacity": "1.2_cubic_yards", "engine_power": "160_hp"}'::jsonb,
    NULL,
    '2024-01-01 00:00:00+00', '2024-01-01 00:00:00+00'
  ),
  (
    'aa0e8400-e29b-41d4-a716-446655440001'::uuid,
    '660e8400-e29b-41d4-a716-446655440000'::uuid,
    '880e8400-e29b-41d4-a716-446655440000'::uuid,
    'John Deere 850L Dozer', 'John Deere', '850L', 'JD850L2022045',
    'active'::equipment_status,
    'Fort Worth, TX',
    '2022-08-20', 2156.0,
    '{"blade_width": "12_feet", "operating_weight": "42000_lbs"}'::jsonb,
    -- Map test fixture: lat/lng + timestamp only (NULL address fields)
    '{"latitude": 32.755488, "longitude": -97.330766, "timestamp": "2026-04-15T09:15:00Z"}'::jsonb,
    '2024-01-01 00:00:00+00', '2024-01-01 00:00:00+00'
  ),
  (
    'aa0e8400-e29b-41d4-a716-446655440002'::uuid,
    '660e8400-e29b-41d4-a716-446655440000'::uuid,
    '880e8400-e29b-41d4-a716-446655440001'::uuid,
    'Portable Generator', 'Generac', 'G3500', 'GEN001PG2023',
    'active'::equipment_status,
    'Houston, TX',
    '2023-05-12', 892.5,
    '{"fuel_type": "gasoline", "output_watts": "3500"}'::jsonb,
    NULL,
    '2024-01-01 00:00:00+00', '2024-01-01 00:00:00+00'
  ),
  (
    'aa0e8400-e29b-41d4-a716-446655440003'::uuid,
    '660e8400-e29b-41d4-a716-446655440000'::uuid,
    '880e8400-e29b-41d4-a716-446655440001'::uuid,
    'Portable Light Tower', 'Atlas Copco', 'PLT-800', 'ATC001LT2022',
    'maintenance'::equipment_status,
    'Storage',
    '2022-11-20', 2847.25,
    '{"light_type": "LED", "tower_height": "30_feet"}'::jsonb,
    NULL,
    '2024-01-01 00:00:00+00', '2024-01-01 00:00:00+00'
  ),

  -- Metro Equipment Services (org 0001) - California / Southwest, mostly clean
  (
    'aa0e8400-e29b-41d4-a716-446655440010'::uuid,
    '660e8400-e29b-41d4-a716-446655440001'::uuid,
    '880e8400-e29b-41d4-a716-446655440002'::uuid,
    'Bobcat S650 Skid Steer', 'Bobcat', 'S650', 'BOB650SS2023101',
    'active'::equipment_status,
    'Los Angeles, CA',
    '2023-01-10', 456.0,
    '{"rated_capacity": "2690_lbs", "engine": "Tier_4"}'::jsonb,
    -- Map test fixture: full address + current timestamp (active GPS pin)
    '{"latitude": 34.054908, "longitude": -118.242643, "address": "Los Angeles, CA, United States", "timestamp": "2026-04-17T10:00:00Z"}'::jsonb,
    '2024-01-15 00:00:00+00', '2024-01-15 00:00:00+00'
  ),
  (
    'aa0e8400-e29b-41d4-a716-446655440011'::uuid,
    '660e8400-e29b-41d4-a716-446655440001'::uuid,
    '880e8400-e29b-41d4-a716-446655440002'::uuid,
    'JLG 450AJ Boom Lift', 'JLG', '450AJ', 'JLG450AJ2022055',
    'active'::equipment_status,
    'San Francisco, CA',
    '2022-06-15', 1234.5,
    '{"platform_height": "45_feet", "horizontal_reach": "24_feet"}'::jsonb,
    NULL,
    '2024-01-15 00:00:00+00', '2024-01-15 00:00:00+00'
  ),
  (
    'aa0e8400-e29b-41d4-a716-446655440012'::uuid,
    '660e8400-e29b-41d4-a716-446655440001'::uuid,
    '880e8400-e29b-41d4-a716-446655440002'::uuid,
    'Genie GS-2669 Scissor Lift', 'Genie', 'GS-2669', 'GENIE2669SL2023',
    'inactive'::equipment_status,
    'San Diego, CA',
    '2023-04-01', 678.25,
    '{"platform_height": "26_feet", "capacity": "1500_lbs"}'::jsonb,
    NULL,
    '2024-01-15 00:00:00+00', '2024-01-15 00:00:00+00'
  ),

  -- Valley Landscaping (org 0002) - Yard-only org, no city/state location text
  (
    'aa0e8400-e29b-41d4-a716-446655440020'::uuid,
    '660e8400-e29b-41d4-a716-446655440002'::uuid,
    '880e8400-e29b-41d4-a716-446655440004'::uuid,
    'John Deere Z930M Mower', 'John Deere', 'Z930M', 'JDZ930M2023001',
    'active'::equipment_status,
    'Lot 42',
    '2023-02-15', 342.0,
    '{"cutting_width": "60_inches", "engine": "25_hp_Kawasaki"}'::jsonb,
    NULL,
    '2024-02-01 00:00:00+00', '2024-02-01 00:00:00+00'
  ),
  (
    'aa0e8400-e29b-41d4-a716-446655440021'::uuid,
    '660e8400-e29b-41d4-a716-446655440002'::uuid,
    '880e8400-e29b-41d4-a716-446655440004'::uuid,
    'Stihl MS 500i Chainsaw', 'Stihl', 'MS 500i', 'STIHLMS500I2023',
    'active'::equipment_status,
    'Storage',
    '2023-03-01', 156.5,
    '{"bar_length": "20_inches", "engine_type": "fuel_injected"}'::jsonb,
    NULL,
    '2024-02-01 00:00:00+00', '2024-02-01 00:00:00+00'
  ),
  (
    'aa0e8400-e29b-41d4-a716-446655440022'::uuid,
    '660e8400-e29b-41d4-a716-446655440002'::uuid,
    '880e8400-e29b-41d4-a716-446655440004'::uuid,
    'Kubota B2650 Tractor', 'Kubota', 'B2650', 'KUBB2650HSD2022',
    'maintenance'::equipment_status,
    'Loading / Unloading',
    '2022-09-10', 567.0,
    '{"engine_power": "26_hp", "transmission": "HST"}'::jsonb,
    -- Map test fixture: stale GPS (>30 days old, should show stale badge)
    '{"latitude": 38.833900, "longitude": -104.821400, "address": "Colorado Springs, CO, United States", "timestamp": "2025-11-25T10:00:00Z"}'::jsonb,
    '2024-02-01 00:00:00+00', '2024-02-01 00:00:00+00'
  ),

  -- Industrial Rentals Corp (org 0003) - Single-site Texas with casing variants
  (
    'aa0e8400-e29b-41d4-a716-446655440030'::uuid,
    '660e8400-e29b-41d4-a716-446655440003'::uuid,
    '880e8400-e29b-41d4-a716-446655440005'::uuid,
    'Toyota 8FGU25 Forklift', 'Toyota', '8FGU25', 'TOY8FGU252023001',
    'active'::equipment_status,
    'Woodson Brenham',
    '2023-01-05', 1456.0,
    '{"capacity": "5000_lbs", "lift_height": "189_inches"}'::jsonb,
    NULL,
    '2024-02-15 00:00:00+00', '2024-02-15 00:00:00+00'
  ),
  (
    'aa0e8400-e29b-41d4-a716-446655440031'::uuid,
    '660e8400-e29b-41d4-a716-446655440003'::uuid,
    '880e8400-e29b-41d4-a716-446655440005'::uuid,
    'Crown WP 3000 Pallet Jack', 'Crown', 'WP 3000', 'CROWNWP30002023',
    'active'::equipment_status,
    'woodson brenham',
    '2023-02-20', 892.5,
    '{"capacity": "4500_lbs", "fork_length": "48_inches"}'::jsonb,
    NULL,
    '2024-02-15 00:00:00+00', '2024-02-15 00:00:00+00'
  ),
  (
    'aa0e8400-e29b-41d4-a716-446655440032'::uuid,
    '660e8400-e29b-41d4-a716-446655440003'::uuid,
    '880e8400-e29b-41d4-a716-446655440005'::uuid,
    'Ingersoll Rand P185 Compressor', 'Ingersoll Rand', 'P185', 'IRP1852022078',
    'active'::equipment_status,
    'Woodson brenham',
    '2022-07-15', 2345.75,
    '{"cfm": "185", "pressure": "100_psi"}'::jsonb,
    NULL,
    '2024-02-15 00:00:00+00', '2024-02-15 00:00:00+00'
  ),
  (
    'aa0e8400-e29b-41d4-a716-446655440033'::uuid,
    '660e8400-e29b-41d4-a716-446655440003'::uuid,
    '880e8400-e29b-41d4-a716-446655440005'::uuid,
    'Miller Trailblazer 325 Welder', 'Miller', 'Trailblazer 325', 'MILLTB3252023045',
    'inactive'::equipment_status,
    'woodson brenham ',
    '2023-05-01', 234.0,
    '{"welding_output": "325_amps", "engine": "Kohler"}'::jsonb,
    NULL,
    '2024-02-15 00:00:00+00', '2024-02-15 00:00:00+00'
  ),

  -- Apex Construction (org 0000) - additional originals
  (
    'aa0e8400-e29b-41d4-a716-446655440040'::uuid,
    '660e8400-e29b-41d4-a716-446655440000'::uuid,
    '880e8400-e29b-41d4-a716-446655440000'::uuid,
    'CAT 320 Excavator #2', 'Caterpillar', '320 GC', 'CAT320GC2023002',
    'active'::equipment_status,
    'Dallas, TX',
    '2023-06-20', 1876.25,
    '{"bucket_capacity": "1.2_cubic_yards", "engine_power": "160_hp", "year": "2023", "fuel_type": "diesel", "tier_rating": "Tier_4_Final"}'::jsonb,
    NULL,
    '2024-01-01 00:00:00+00', '2024-01-01 00:00:00+00'
  ),
  (
    'aa0e8400-e29b-41d4-a716-446655440041'::uuid,
    '660e8400-e29b-41d4-a716-446655440000'::uuid,
    '880e8400-e29b-41d4-a716-446655440000'::uuid,
    'Komatsu PC210 Excavator', 'Komatsu', 'PC210LC-11', 'KMTPC210LC2022078',
    'active'::equipment_status,
    'Houston, TX',
    '2022-04-15', 3245.5,
    '{"bucket_capacity": "1.06_cubic_yards", "engine_power": "158_hp", "year": "2022", "fuel_type": "diesel", "operating_weight": "52000_lbs"}'::jsonb,
    NULL,
    '2024-01-01 00:00:00+00', '2024-01-01 00:00:00+00'
  ),
  (
    'aa0e8400-e29b-41d4-a716-446655440042'::uuid,
    '660e8400-e29b-41d4-a716-446655440000'::uuid,
    '880e8400-e29b-41d4-a716-446655440000'::uuid,
    'John Deere 700K Dozer', 'John Deere', '700K', 'JD700K2021156',
    'maintenance'::equipment_status,
    'Lot 42',
    '2021-09-10', 4567.75,
    '{"blade_width": "14_feet", "operating_weight": "27500_lbs", "year": "2021", "fuel_type": "diesel"}'::jsonb,
    NULL,
    '2024-01-01 00:00:00+00', '2024-01-01 00:00:00+00'
  ),
  (
    'aa0e8400-e29b-41d4-a716-446655440043'::uuid,
    '660e8400-e29b-41d4-a716-446655440000'::uuid,
    '880e8400-e29b-41d4-a716-446655440001'::uuid,
    'Generac XG7500E Generator', 'Generac', 'XG7500E', 'GENXG75002024001',
    'active'::equipment_status,
    'Atlanta, GA',
    '2024-01-05', 234.5,
    '{"fuel_type": "gasoline", "output_watts": "7500", "year": "2024", "electric_start": true}'::jsonb,
    NULL,
    '2024-01-05 00:00:00+00', '2024-01-05 00:00:00+00'
  ),

  -- Metro Equipment Services (org 0001) - additional originals
  (
    'aa0e8400-e29b-41d4-a716-446655440050'::uuid,
    '660e8400-e29b-41d4-a716-446655440001'::uuid,
    '880e8400-e29b-41d4-a716-446655440002'::uuid,
    'Bobcat S650 Skid Steer #2', 'Bobcat', 'S650', 'BOB650SS2023102',
    'active'::equipment_status,
    'Los Angeles, CA',
    '2023-03-15', 678.0,
    '{"rated_capacity": "2690_lbs", "engine": "Tier_4", "year": "2023", "fuel_type": "diesel"}'::jsonb,
    NULL,
    '2024-01-15 00:00:00+00', '2024-01-15 00:00:00+00'
  ),
  (
    'aa0e8400-e29b-41d4-a716-446655440051'::uuid,
    '660e8400-e29b-41d4-a716-446655440001'::uuid,
    '880e8400-e29b-41d4-a716-446655440002'::uuid,
    'Bobcat S770 Skid Steer', 'Bobcat', 'S770', 'BOB770SS2022089',
    'active'::equipment_status,
    'Las Vegas, NV',
    '2022-11-20', 1245.5,
    '{"rated_capacity": "3475_lbs", "engine": "Tier_4", "year": "2022", "fuel_type": "diesel"}'::jsonb,
    NULL,
    '2024-01-15 00:00:00+00', '2024-01-15 00:00:00+00'
  ),
  (
    'aa0e8400-e29b-41d4-a716-446655440052'::uuid,
    '660e8400-e29b-41d4-a716-446655440001'::uuid,
    '880e8400-e29b-41d4-a716-446655440002'::uuid,
    'Genie GS-1930 Scissor Lift', 'Genie', 'GS-1930', 'GENIE1930SL2023045',
    'active'::equipment_status,
    'Los Angeles, CA',
    '2023-02-01', 345.0,
    '{"platform_height": "19_feet", "capacity": "500_lbs", "year": "2023", "power_type": "electric"}'::jsonb,
    NULL,
    '2024-01-15 00:00:00+00', '2024-01-15 00:00:00+00'
  ),
  (
    'aa0e8400-e29b-41d4-a716-446655440053'::uuid,
    '660e8400-e29b-41d4-a716-446655440001'::uuid,
    '880e8400-e29b-41d4-a716-446655440002'::uuid,
    'JLG 600S Boom Lift', 'JLG', '600S', 'JLG600S2022034',
    'maintenance'::equipment_status,
    'Sacramento, CA',
    '2022-08-10', 2156.25,
    '{"platform_height": "60_feet", "horizontal_reach": "40_feet", "year": "2022", "fuel_type": "diesel"}'::jsonb,
    NULL,
    '2024-01-15 00:00:00+00', '2024-01-15 00:00:00+00'
  ),
  (
    'aa0e8400-e29b-41d4-a716-446655440054'::uuid,
    '660e8400-e29b-41d4-a716-446655440001'::uuid,
    '880e8400-e29b-41d4-a716-446655440002'::uuid,
    'Snorkel TB42J Boom Lift', 'Snorkel', 'TB42J', 'SNKTB42J2023012',
    'active'::equipment_status,
    'Long Beach, CA',
    '2023-04-20', 567.0,
    '{"platform_height": "42_feet", "horizontal_reach": "22_feet", "year": "2023", "fuel_type": "diesel"}'::jsonb,
    NULL,
    '2024-01-15 00:00:00+00', '2024-01-15 00:00:00+00'
  ),

  -- Valley Landscaping (org 0002) - additional originals (yard-only)
  (
    'aa0e8400-e29b-41d4-a716-446655440060'::uuid,
    '660e8400-e29b-41d4-a716-446655440002'::uuid,
    '880e8400-e29b-41d4-a716-446655440004'::uuid,
    'John Deere Z930M Mower #2', 'John Deere', 'Z930M', 'JDZ930M2023002',
    'active'::equipment_status,
    'Lot 43',
    '2023-04-01', 278.5,
    '{"cutting_width": "60_inches", "engine": "25_hp_Kawasaki", "year": "2023"}'::jsonb,
    NULL,
    '2024-02-01 00:00:00+00', '2024-02-01 00:00:00+00'
  ),
  (
    'aa0e8400-e29b-41d4-a716-446655440061'::uuid,
    '660e8400-e29b-41d4-a716-446655440002'::uuid,
    '880e8400-e29b-41d4-a716-446655440004'::uuid,
    'Kubota RTV-X1140 Utility Vehicle', 'Kubota', 'RTV-X1140', 'KUBRTVX11402022056',
    'active'::equipment_status,
    'Lot 45',
    '2022-06-15', 1456.0,
    '{"engine_power": "24.8_hp", "payload_capacity": "1102_lbs", "year": "2022"}'::jsonb,
    NULL,
    '2024-02-01 00:00:00+00', '2024-02-01 00:00:00+00'
  ),
  (
    'aa0e8400-e29b-41d4-a716-446655440062'::uuid,
    '660e8400-e29b-41d4-a716-446655440002'::uuid,
    '880e8400-e29b-41d4-a716-446655440004'::uuid,
    'Husqvarna 572 XP Chainsaw', 'Husqvarna', '572 XP', 'HUSQ572XP2023089',
    'inactive'::equipment_status,
    'Storage',
    '2023-01-15', 89.5,
    '{"bar_length": "24_inches", "engine_displacement": "70.6_cc", "year": "2023"}'::jsonb,
    NULL,
    '2024-02-01 00:00:00+00', '2024-02-01 00:00:00+00'
  ),

  -- Industrial Rentals Corp (org 0003) - additional originals (Woodson Brenham variants)
  (
    'aa0e8400-e29b-41d4-a716-446655440070'::uuid,
    '660e8400-e29b-41d4-a716-446655440003'::uuid,
    '880e8400-e29b-41d4-a716-446655440005'::uuid,
    'Toyota 8FGU25 Forklift #2', 'Toyota', '8FGU25', 'TOY8FGU252023002',
    'active'::equipment_status,
    'Woodson Brenham',
    '2023-03-10', 1234.5,
    '{"capacity": "5000_lbs", "lift_height": "189_inches", "year": "2023"}'::jsonb,
    NULL,
    '2024-02-15 00:00:00+00', '2024-02-15 00:00:00+00'
  ),
  (
    'aa0e8400-e29b-41d4-a716-446655440071'::uuid,
    '660e8400-e29b-41d4-a716-446655440003'::uuid,
    '880e8400-e29b-41d4-a716-446655440005'::uuid,
    'Toyota 8FGU25 Forklift #3', 'Toyota', '8FGU25', 'TOY8FGU252022098',
    'maintenance'::equipment_status,
    'Brenham woodson',
    '2022-08-20', 2567.75,
    '{"capacity": "5000_lbs", "lift_height": "189_inches", "year": "2022"}'::jsonb,
    -- Map test fixture: very stale GPS (~5 months old)
    '{"latitude": 30.182716, "longitude": -96.936371, "address": "Giddings, TX, United States", "timestamp": "2025-11-15T14:00:00Z"}'::jsonb,
    '2024-02-15 00:00:00+00', '2024-02-15 00:00:00+00'
  ),
  (
    'aa0e8400-e29b-41d4-a716-446655440072'::uuid,
    '660e8400-e29b-41d4-a716-446655440003'::uuid,
    '880e8400-e29b-41d4-a716-446655440005'::uuid,
    'Hyster H50FT Forklift', 'Hyster', 'H50FT', 'HYSTH50FT2023034',
    'active'::equipment_status,
    'Woodson Brenham ',
    '2023-05-15', 987.25,
    '{"capacity": "5000_lbs", "lift_height": "188_inches", "year": "2023"}'::jsonb,
    NULL,
    '2024-02-15 00:00:00+00', '2024-02-15 00:00:00+00'
  ),
  (
    'aa0e8400-e29b-41d4-a716-446655440073'::uuid,
    '660e8400-e29b-41d4-a716-446655440003'::uuid,
    '880e8400-e29b-41d4-a716-446655440005'::uuid,
    'Crown FC5245 Forklift', 'Crown', 'FC5245', 'CRWNFC52452024001',
    'active'::equipment_status,
    'Dallas location ',
    '2024-01-10', 156.0,
    '{"capacity": "4500_lbs", "lift_height": "210_inches", "year": "2024", "power_type": "electric"}'::jsonb,
    NULL,
    '2024-02-15 00:00:00+00', '2024-02-15 00:00:00+00'
  ),

  -- Mike's Repair Shop (org 0006) - Geocoded sample, highest coord coverage
  (
    'aa0e8400-e29b-41d4-a716-446655440080'::uuid,
    '660e8400-e29b-41d4-a716-446655440006'::uuid,
    NULL,
    'Sullair 185 Compressor', 'Sullair', '185', 'SULL1852021045',
    'active'::equipment_status,
    'Phoenix, AZ',
    '2021-06-15', 3456.0,
    '{"cfm": "185", "pressure": "100_psi", "year": "2021", "fuel_type": "diesel"}'::jsonb,
    NULL,
    '2024-01-01 00:00:00+00', '2024-01-01 00:00:00+00'
  ),
  (
    'aa0e8400-e29b-41d4-a716-446655440081'::uuid,
    '660e8400-e29b-41d4-a716-446655440006'::uuid,
    NULL,
    'Lincoln Ranger 225 Welder', 'Lincoln Electric', 'Ranger 225', 'LINCRNGR2252022078',
    'active'::equipment_status,
    'Phoenix, AZ',
    '2022-03-20', 1234.5,
    '{"welding_output": "225_amps", "engine": "Kohler_CH730", "year": "2022"}'::jsonb,
    NULL,
    '2024-01-01 00:00:00+00', '2024-01-01 00:00:00+00'
  ),
  (
    'aa0e8400-e29b-41d4-a716-446655440082'::uuid,
    '660e8400-e29b-41d4-a716-446655440006'::uuid,
    NULL,
    'Milwaukee MX FUEL Concrete Saw', 'Milwaukee', 'MX FUEL Cut-Off Saw', 'MILWMXFCS2023056',
    'maintenance'::equipment_status,
    'Phoenix, AZ',
    '2023-08-10', 45.0,
    '{"blade_diameter": "14_inches", "cutting_depth": "5_inches", "year": "2023"}'::jsonb,
    NULL,
    '2024-01-01 00:00:00+00', '2024-01-01 00:00:00+00'
  ),

  -- Tom's Field Services (org 0005) - Small mix
  (
    'aa0e8400-e29b-41d4-a716-446655440090'::uuid,
    '660e8400-e29b-41d4-a716-446655440005'::uuid,
    NULL,
    'Doosan P185 Compressor', 'Doosan', 'P185WDO', 'DSNP185WDO2022034',
    'active'::equipment_status,
    'Charlotte, NC',
    '2022-09-15', 2345.0,
    '{"cfm": "185", "pressure": "100_psi", "year": "2022", "fuel_type": "diesel"}'::jsonb,
    NULL,
    '2023-12-15 00:00:00+00', '2023-12-15 00:00:00+00'
  ),
  (
    'aa0e8400-e29b-41d4-a716-446655440091'::uuid,
    '660e8400-e29b-41d4-a716-446655440005'::uuid,
    NULL,
    'Vermeer S800TX Mini Skid Steer', 'Vermeer', 'S800TX', 'VERMS800TX2023012',
    'active'::equipment_status,
    'Charlotte, NC',
    '2023-02-01', 567.5,
    '{"rated_capacity": "800_lbs", "engine_power": "25_hp", "year": "2023", "fuel_type": "diesel"}'::jsonb,
    NULL,
    '2023-12-15 00:00:00+00', '2023-12-15 00:00:00+00'
  ),

  -- =====================================================
  -- LOCATION DENSITY EXPANSION
  -- ~120 new equipment rows, distributed across the 6 equipment-owning orgs.
  -- Each org has a distinct location-data culture matching its prod analog.
  -- New UUIDs use the disjoint range aa0e8400-...-44665544Fxxx.
  -- =====================================================

  -- -----------------------------------------------------
  -- Apex Construction (org 0000) - National fleet, ~55 new rows
  -- ~85% "City, ST", ~10% yard labels, ~5% "Unknown"
  -- 25+ US metros for cluster/zoom map testing
  -- -----------------------------------------------------
  ('aa0e8400-e29b-41d4-a716-44665544f000'::uuid, '660e8400-e29b-41d4-a716-446655440000'::uuid, '880e8400-e29b-41d4-a716-446655440000'::uuid, 'Caterpillar D6T XL Dozer', 'Caterpillar', 'D6T XL', 'CATD6TXL2023011', 'active'::equipment_status, 'Atlanta, GA', '2023-04-12', 1245.0, '{"blade_width": "14_feet", "operating_weight": "44600_lbs", "year": "2023"}'::jsonb, NULL, '2024-03-01 00:00:00+00', '2024-03-01 00:00:00+00'),
  ('aa0e8400-e29b-41d4-a716-44665544f001'::uuid, '660e8400-e29b-41d4-a716-446655440000'::uuid, '880e8400-e29b-41d4-a716-446655440000'::uuid, 'Caterpillar D6T XL Dozer', 'Caterpillar', 'D6T XL', 'CATD6TXL2022034', 'active'::equipment_status, 'Atlanta, GA', '2022-09-20', 2890.5, '{"blade_width": "14_feet", "operating_weight": "44600_lbs", "year": "2022"}'::jsonb, NULL, '2024-03-01 00:00:00+00', '2024-03-01 00:00:00+00'),
  ('aa0e8400-e29b-41d4-a716-44665544f002'::uuid, '660e8400-e29b-41d4-a716-446655440000'::uuid, '880e8400-e29b-41d4-a716-446655440000'::uuid, 'Komatsu PC210 Excavator', 'Komatsu', 'PC210LC-11', 'KMTPC210LC2023144', 'active'::equipment_status, 'Atlanta, GA', '2023-06-15', 1890.25, '{"bucket_capacity": "1.06_cubic_yards", "year": "2023"}'::jsonb, NULL, '2024-03-01 00:00:00+00', '2024-03-01 00:00:00+00'),
  ('aa0e8400-e29b-41d4-a716-44665544f003'::uuid, '660e8400-e29b-41d4-a716-446655440000'::uuid, '880e8400-e29b-41d4-a716-446655440000'::uuid, 'Komatsu D65EX-17 Dozer', 'Komatsu', 'D65EX-17', 'KMTD65EX2022078', 'active'::equipment_status, 'St. Louis, MO', '2022-04-22', 3210.0, '{"operating_weight": "45200_lbs", "year": "2022"}'::jsonb, NULL, '2024-03-01 00:00:00+00', '2024-03-01 00:00:00+00'),
  ('aa0e8400-e29b-41d4-a716-44665544f004'::uuid, '660e8400-e29b-41d4-a716-446655440000'::uuid, '880e8400-e29b-41d4-a716-446655440000'::uuid, 'Komatsu D65EX-17 Dozer', 'Komatsu', 'D65EX-17', 'KMTD65EX2023089', 'active'::equipment_status, 'St. Louis, MO', '2023-05-10', 1456.75, '{"operating_weight": "45200_lbs", "year": "2023"}'::jsonb, NULL, '2024-03-01 00:00:00+00', '2024-03-01 00:00:00+00'),
  ('aa0e8400-e29b-41d4-a716-44665544f005'::uuid, '660e8400-e29b-41d4-a716-446655440000'::uuid, '880e8400-e29b-41d4-a716-446655440000'::uuid, 'John Deere 470G LC Excavator', 'John Deere', '470G LC', 'JD470GLC2023034', 'active'::equipment_status, 'Chicago, IL', '2023-02-18', 1567.5, '{"operating_weight": "104000_lbs", "year": "2023"}'::jsonb, NULL, '2024-03-01 00:00:00+00', '2024-03-01 00:00:00+00'),
  ('aa0e8400-e29b-41d4-a716-44665544f006'::uuid, '660e8400-e29b-41d4-a716-446655440000'::uuid, '880e8400-e29b-41d4-a716-446655440000'::uuid, 'John Deere 470G LC Excavator', 'John Deere', '470G LC', 'JD470GLC2022112', 'active'::equipment_status, 'Chicago, IL', '2022-11-05', 2934.25, '{"operating_weight": "104000_lbs", "year": "2022"}'::jsonb, NULL, '2024-03-01 00:00:00+00', '2024-03-01 00:00:00+00'),
  ('aa0e8400-e29b-41d4-a716-44665544f007'::uuid, '660e8400-e29b-41d4-a716-446655440000'::uuid, '880e8400-e29b-41d4-a716-446655440000'::uuid, 'Caterpillar D5K2 Dozer', 'Caterpillar', 'D5K2', 'CATD5K22023056', 'active'::equipment_status, 'Phoenix, AZ', '2023-03-08', 1123.0, '{"operating_weight": "21500_lbs", "year": "2023"}'::jsonb, NULL, '2024-03-01 00:00:00+00', '2024-03-01 00:00:00+00'),
  ('aa0e8400-e29b-41d4-a716-44665544f008'::uuid, '660e8400-e29b-41d4-a716-446655440000'::uuid, '880e8400-e29b-41d4-a716-446655440000'::uuid, 'Caterpillar D5K2 Dozer', 'Caterpillar', 'D5K2', 'CATD5K22022067', 'maintenance'::equipment_status, 'Phoenix, AZ', '2022-07-19', 2456.5, '{"operating_weight": "21500_lbs", "year": "2022"}'::jsonb, NULL, '2024-03-01 00:00:00+00', '2024-03-01 00:00:00+00'),
  ('aa0e8400-e29b-41d4-a716-44665544f009'::uuid, '660e8400-e29b-41d4-a716-446655440000'::uuid, '880e8400-e29b-41d4-a716-446655440000'::uuid, 'Doosan DX225LC Excavator', 'Doosan', 'DX225LC', 'DSNDX225LC2023023', 'active'::equipment_status, 'Atlanta, GA', '2023-01-15', 1234.0, '{"operating_weight": "50800_lbs", "year": "2023"}'::jsonb, NULL, '2024-03-01 00:00:00+00', '2024-03-01 00:00:00+00'),
  ('aa0e8400-e29b-41d4-a716-44665544f00a'::uuid, '660e8400-e29b-41d4-a716-446655440000'::uuid, '880e8400-e29b-41d4-a716-446655440000'::uuid, 'Doosan DX225LC Excavator', 'Doosan ', 'DX225LC', 'DSNDX225LC2022067', 'active'::equipment_status, 'Memphis, TN', '2022-08-04', 2789.25, '{"operating_weight": "50800_lbs", "year": "2022"}'::jsonb, NULL, '2024-03-01 00:00:00+00', '2024-03-01 00:00:00+00'),
  ('aa0e8400-e29b-41d4-a716-44665544f00b'::uuid, '660e8400-e29b-41d4-a716-446655440000'::uuid, '880e8400-e29b-41d4-a716-446655440000'::uuid, 'Bobcat E165 Excavator', 'Bobcat', 'E165', 'BOBE1652023012', 'active'::equipment_status, 'Memphis, TN', '2023-04-20', 1067.5, '{"operating_weight": "37000_lbs", "year": "2023"}'::jsonb, NULL, '2024-03-01 00:00:00+00', '2024-03-01 00:00:00+00'),
  ('aa0e8400-e29b-41d4-a716-44665544f00c'::uuid, '660e8400-e29b-41d4-a716-446655440000'::uuid, '880e8400-e29b-41d4-a716-446655440000'::uuid, 'Case CX210D Excavator', 'Case', 'CX210D', 'CASECX210D2023045', 'active'::equipment_status, 'Indianapolis, IN', '2023-05-30', 1345.75, '{"operating_weight": "47800_lbs", "year": "2023"}'::jsonb, NULL, '2024-03-01 00:00:00+00', '2024-03-01 00:00:00+00'),
  ('aa0e8400-e29b-41d4-a716-44665544f00d'::uuid, '660e8400-e29b-41d4-a716-446655440000'::uuid, '880e8400-e29b-41d4-a716-446655440000'::uuid, 'Bobcat E35 Excavator', 'Bobcat', 'E35', 'BOBE352022089', 'active'::equipment_status, 'Cleveland, OH', '2022-10-12', 2123.25, '{"operating_weight": "8003_lbs", "year": "2022"}'::jsonb, NULL, '2024-03-01 00:00:00+00', '2024-03-01 00:00:00+00'),
  ('aa0e8400-e29b-41d4-a716-44665544f00e'::uuid, '660e8400-e29b-41d4-a716-446655440000'::uuid, '880e8400-e29b-41d4-a716-446655440000'::uuid, 'Hitachi ZX350 Excavator', 'Hitachi', 'ZX350LC-6', 'HITZX350LC2023011', 'active'::equipment_status, 'Detroit, MI', '2023-06-08', 987.0, '{"operating_weight": "78000_lbs", "year": "2023"}'::jsonb, NULL, '2024-03-01 00:00:00+00', '2024-03-01 00:00:00+00'),
  ('aa0e8400-e29b-41d4-a716-44665544f00f'::uuid, '660e8400-e29b-41d4-a716-446655440000'::uuid, '880e8400-e29b-41d4-a716-446655440000'::uuid, 'Hitachi ZX350 Excavator', 'Hitachi', 'ZX350LC-6', 'HITZX350LC2022045', 'active'::equipment_status, 'Pittsburgh, PA', '2022-09-15', 2456.5, '{"operating_weight": "78000_lbs", "year": "2022"}'::jsonb, NULL, '2024-03-01 00:00:00+00', '2024-03-01 00:00:00+00'),
  ('aa0e8400-e29b-41d4-a716-44665544f010'::uuid, '660e8400-e29b-41d4-a716-446655440000'::uuid, '880e8400-e29b-41d4-a716-446655440001'::uuid, 'Generac G3500 Generator', 'Generac', 'G3500', 'GEN001PG2024005', 'active'::equipment_status, 'Houston, TX', '2024-02-20', 345.0, '{"fuel_type": "gasoline", "output_watts": "3500"}'::jsonb, NULL, '2024-03-01 00:00:00+00', '2024-03-01 00:00:00+00'),
  ('aa0e8400-e29b-41d4-a716-44665544f011'::uuid, '660e8400-e29b-41d4-a716-446655440000'::uuid, '880e8400-e29b-41d4-a716-446655440001'::uuid, 'Generac G3500 Generator', 'Generac', 'G3500', 'GEN001PG2023089', 'active'::equipment_status, 'San Antonio, TX', '2023-08-12', 678.5, '{"fuel_type": "gasoline", "output_watts": "3500"}'::jsonb, NULL, '2024-03-01 00:00:00+00', '2024-03-01 00:00:00+00'),
  ('aa0e8400-e29b-41d4-a716-44665544f012'::uuid, '660e8400-e29b-41d4-a716-446655440000'::uuid, '880e8400-e29b-41d4-a716-446655440001'::uuid, 'Ingersoll Rand P185 Compressor', 'Ingersoll Rand', 'P185', 'IRP1852023056', 'active'::equipment_status, 'Austin, TX', '2023-03-18', 1234.0, '{"cfm": "185", "pressure": "100_psi"}'::jsonb, NULL, '2024-03-01 00:00:00+00', '2024-03-01 00:00:00+00'),
  ('aa0e8400-e29b-41d4-a716-44665544f013'::uuid, '660e8400-e29b-41d4-a716-446655440000'::uuid, '880e8400-e29b-41d4-a716-446655440001'::uuid, 'Sullair 185 Compressor', 'Sullair', '185', 'SULL1852023034', 'active'::equipment_status, 'New Orleans, LA', '2023-04-25', 1567.25, '{"cfm": "185", "pressure": "100_psi"}'::jsonb, NULL, '2024-03-01 00:00:00+00', '2024-03-01 00:00:00+00'),
  ('aa0e8400-e29b-41d4-a716-44665544f014'::uuid, '660e8400-e29b-41d4-a716-446655440000'::uuid, '880e8400-e29b-41d4-a716-446655440001'::uuid, 'Atlas Copco PLT-800 Light Tower', 'Atlas Copco', 'PLT-800', 'ATC001LT2023023', 'active'::equipment_status, 'Tampa, FL', '2023-05-22', 890.0, '{"light_type": "LED", "tower_height": "30_feet"}'::jsonb, NULL, '2024-03-01 00:00:00+00', '2024-03-01 00:00:00+00'),
  ('aa0e8400-e29b-41d4-a716-44665544f015'::uuid, '660e8400-e29b-41d4-a716-446655440000'::uuid, '880e8400-e29b-41d4-a716-446655440001'::uuid, 'Atlas Copco PLT-800 Light Tower', 'Atlas Copco', 'PLT-800', 'ATC001LT2022034', 'active'::equipment_status, 'Orlando, FL', '2022-08-19', 2345.5, '{"light_type": "LED", "tower_height": "30_feet"}'::jsonb, NULL, '2024-03-01 00:00:00+00', '2024-03-01 00:00:00+00'),
  ('aa0e8400-e29b-41d4-a716-44665544f016'::uuid, '660e8400-e29b-41d4-a716-446655440000'::uuid, '880e8400-e29b-41d4-a716-446655440000'::uuid, 'Caterpillar 320 GC Excavator', 'Caterpillar', '320 GC', 'CAT320GC2024003', 'active'::equipment_status, 'Nashville, TN', '2024-02-05', 567.0, '{"bucket_capacity": "1.2_cubic_yards", "engine_power": "160_hp"}'::jsonb, NULL, '2024-03-01 00:00:00+00', '2024-03-01 00:00:00+00'),
  ('aa0e8400-e29b-41d4-a716-44665544f017'::uuid, '660e8400-e29b-41d4-a716-446655440000'::uuid, '880e8400-e29b-41d4-a716-446655440000'::uuid, 'JCB 3CX Backhoe', 'JCB', '3CX', 'JCB3CX2023045', 'active'::equipment_status, 'Charlotte, NC', '2023-07-14', 1234.5, '{"engine_power": "74_hp", "year": "2023"}'::jsonb, NULL, '2024-03-01 00:00:00+00', '2024-03-01 00:00:00+00'),
  ('aa0e8400-e29b-41d4-a716-44665544f018'::uuid, '660e8400-e29b-41d4-a716-446655440000'::uuid, '880e8400-e29b-41d4-a716-446655440000'::uuid, 'Volvo EC220E Excavator', 'Volvoq', 'EC220E', 'VOLEC220E2022078', 'active'::equipment_status, 'Raleigh, NC', '2022-09-01', 2890.0, '{"operating_weight": "48800_lbs", "year": "2022"}'::jsonb, NULL, '2024-03-01 00:00:00+00', '2024-03-01 00:00:00+00'),
  ('aa0e8400-e29b-41d4-a716-44665544f019'::uuid, '660e8400-e29b-41d4-a716-446655440000'::uuid, '880e8400-e29b-41d4-a716-446655440000'::uuid, 'Caterpillar 950M Wheel Loader', 'Caterpillar', '950M', 'CAT950M2023012', 'active'::equipment_status, 'Birmingham, AL', '2023-02-28', 1567.5, '{"bucket_capacity": "4.5_cubic_yards", "year": "2023"}'::jsonb, NULL, '2024-03-01 00:00:00+00', '2024-03-01 00:00:00+00'),
  ('aa0e8400-e29b-41d4-a716-44665544f01a'::uuid, '660e8400-e29b-41d4-a716-446655440000'::uuid, '880e8400-e29b-41d4-a716-446655440000'::uuid, 'Caterpillar 950M Wheel Loader', 'Caterpillar', '950M', 'CAT950M2022056', 'maintenance'::equipment_status, 'Lot 45', '2022-06-11', 3456.75, '{"bucket_capacity": "4.5_cubic_yards", "year": "2022"}'::jsonb, NULL, '2024-03-01 00:00:00+00', '2024-03-01 00:00:00+00'),
  ('aa0e8400-e29b-41d4-a716-44665544f01b'::uuid, '660e8400-e29b-41d4-a716-446655440000'::uuid, '880e8400-e29b-41d4-a716-446655440000'::uuid, 'Komatsu WA320 Wheel Loader', 'Komatsu', 'WA320-8', 'KMTWA3202023034', 'active'::equipment_status, 'Louisville, KY', '2023-04-04', 1123.0, '{"bucket_capacity": "3.5_cubic_yards", "year": "2023"}'::jsonb, NULL, '2024-03-01 00:00:00+00', '2024-03-01 00:00:00+00'),
  ('aa0e8400-e29b-41d4-a716-44665544f01c'::uuid, '660e8400-e29b-41d4-a716-446655440000'::uuid, '880e8400-e29b-41d4-a716-446655440000'::uuid, 'Komatsu WA320 Wheel Loader', 'Komatsu', 'WA320-8', 'KMTWA3202022067', 'active'::equipment_status, 'Cincinnati, OH', '2022-08-23', 2789.5, '{"bucket_capacity": "3.5_cubic_yards", "year": "2022"}'::jsonb, NULL, '2024-03-01 00:00:00+00', '2024-03-01 00:00:00+00'),
  ('aa0e8400-e29b-41d4-a716-44665544f01d'::uuid, '660e8400-e29b-41d4-a716-446655440000'::uuid, '880e8400-e29b-41d4-a716-446655440001'::uuid, 'Lincoln Ranger 305G Welder', 'Lincoln Electric', 'Ranger 305G', 'LINCRNGR305G2023012', 'active'::equipment_status, 'Oklahoma City, OK', '2023-05-15', 678.5, '{"welding_output": "300_amps", "year": "2023"}'::jsonb, NULL, '2024-03-01 00:00:00+00', '2024-03-01 00:00:00+00'),
  ('aa0e8400-e29b-41d4-a716-44665544f01e'::uuid, '660e8400-e29b-41d4-a716-446655440000'::uuid, '880e8400-e29b-41d4-a716-446655440001'::uuid, 'Lincoln Ranger 305G Welder', 'Lincoln Electric', 'Ranger 305G', 'LINCRNGR305G2022045', 'active'::equipment_status, 'Tulsa, OK', '2022-07-28', 1456.0, '{"welding_output": "300_amps", "year": "2022"}'::jsonb, NULL, '2024-03-01 00:00:00+00', '2024-03-01 00:00:00+00'),
  ('aa0e8400-e29b-41d4-a716-44665544f01f'::uuid, '660e8400-e29b-41d4-a716-446655440000'::uuid, '880e8400-e29b-41d4-a716-446655440000'::uuid, 'Skyjack SJIII 3219 Scissor Lift', 'Skyjack', 'SJIII 3219', 'SKYJ3219SJ2023023', 'active'::equipment_status, 'Kansas City, MO', '2023-03-04', 456.0, '{"platform_height": "19_feet", "year": "2023", "power_type": "electric"}'::jsonb, NULL, '2024-03-01 00:00:00+00', '2024-03-01 00:00:00+00'),
  ('aa0e8400-e29b-41d4-a716-44665544f020'::uuid, '660e8400-e29b-41d4-a716-446655440000'::uuid, '880e8400-e29b-41d4-a716-446655440000'::uuid, 'Skyjack SJIII 3219 Scissor Lift', 'Skyjack', 'SJIII 3219', 'SKYJ3219SJ2022056', 'active'::equipment_status, 'Minneapolis, MN', '2022-09-08', 1234.5, '{"platform_height": "19_feet", "year": "2022", "power_type": "electric"}'::jsonb, NULL, '2024-03-01 00:00:00+00', '2024-03-01 00:00:00+00'),
  ('aa0e8400-e29b-41d4-a716-44665544f021'::uuid, '660e8400-e29b-41d4-a716-446655440000'::uuid, '880e8400-e29b-41d4-a716-446655440000'::uuid, 'Genie GS-3246 Scissor Lift', 'Genie', 'GS-3246', 'GENIE3246SL2023012', 'active'::equipment_status, 'Dallas, TX', '2023-01-19', 567.0, '{"platform_height": "32_feet", "year": "2023", "power_type": "electric"}'::jsonb, NULL, '2024-03-01 00:00:00+00', '2024-03-01 00:00:00+00'),
  ('aa0e8400-e29b-41d4-a716-44665544f022'::uuid, '660e8400-e29b-41d4-a716-446655440000'::uuid, '880e8400-e29b-41d4-a716-446655440000'::uuid, 'Genie GS-3246 Scissor Lift', 'Genie', 'GS-3246', 'GENIE3246SL2022034', 'active'::equipment_status, 'Dallas, TX', '2022-05-22', 1456.75, '{"platform_height": "32_feet", "year": "2022", "power_type": "electric"}'::jsonb, NULL, '2024-03-01 00:00:00+00', '2024-03-01 00:00:00+00'),
  ('aa0e8400-e29b-41d4-a716-44665544f023'::uuid, '660e8400-e29b-41d4-a716-446655440000'::uuid, '880e8400-e29b-41d4-a716-446655440000'::uuid, 'JLG 1850SJ Telehandler', 'JLG', '1850SJ', 'JLG1850SJ2023034', 'active'::equipment_status, 'Salt Lake City, UT', '2023-04-29', 789.0, '{"max_height": "185_feet", "year": "2023"}'::jsonb, NULL, '2024-03-01 00:00:00+00', '2024-03-01 00:00:00+00'),
  ('aa0e8400-e29b-41d4-a716-44665544f024'::uuid, '660e8400-e29b-41d4-a716-446655440000'::uuid, '880e8400-e29b-41d4-a716-446655440000'::uuid, 'Caterpillar 906M Wheel Loader', 'Caterpillar', '906M', 'CAT906M2024002', 'active'::equipment_status, 'Jacksonville, FL', '2024-02-14', 234.0, '{"bucket_capacity": "1.5_cubic_yards", "year": "2024"}'::jsonb, NULL, '2024-03-01 00:00:00+00', '2024-03-01 00:00:00+00'),
  ('aa0e8400-e29b-41d4-a716-44665544f025'::uuid, '660e8400-e29b-41d4-a716-446655440000'::uuid, '880e8400-e29b-41d4-a716-446655440000'::uuid, 'Bobcat T770 Compact Track Loader', 'Bobcat', 'T770', 'BOBT7702023056', 'active'::equipment_status, 'Philadelphia, PA', '2023-06-21', 678.5, '{"rated_capacity": "3475_lbs", "year": "2023"}'::jsonb, NULL, '2024-03-01 00:00:00+00', '2024-03-01 00:00:00+00'),
  ('aa0e8400-e29b-41d4-a716-44665544f026'::uuid, '660e8400-e29b-41d4-a716-446655440000'::uuid, '880e8400-e29b-41d4-a716-446655440000'::uuid, 'Bobcat T770 Compact Track Loader', 'Bobcat', 'T770', 'BOBT7702022078', 'active'::equipment_status, 'New York, NY', '2022-10-30', 1789.25, '{"rated_capacity": "3475_lbs", "year": "2022"}'::jsonb, NULL, '2024-03-01 00:00:00+00', '2024-03-01 00:00:00+00'),
  ('aa0e8400-e29b-41d4-a716-44665544f027'::uuid, '660e8400-e29b-41d4-a716-446655440000'::uuid, '880e8400-e29b-41d4-a716-446655440000'::uuid, 'JCB 4CX Backhoe', 'JCB', '4CX', 'JCB4CX2023023', 'active'::equipment_status, 'Boston, MA', '2023-03-26', 1123.5, '{"engine_power": "108_hp", "year": "2023"}'::jsonb, NULL, '2024-03-01 00:00:00+00', '2024-03-01 00:00:00+00'),
  ('aa0e8400-e29b-41d4-a716-44665544f028'::uuid, '660e8400-e29b-41d4-a716-446655440000'::uuid, '880e8400-e29b-41d4-a716-446655440000'::uuid, 'Caterpillar 320 GC Excavator', 'Caterpillar', '320 GC', 'CAT320GC2023144', 'active'::equipment_status, 'Houston, TX', '2023-08-08', 845.5, '{"bucket_capacity": "1.2_cubic_yards", "engine_power": "160_hp"}'::jsonb, NULL, '2024-03-01 00:00:00+00', '2024-03-01 00:00:00+00'),
  ('aa0e8400-e29b-41d4-a716-44665544f029'::uuid, '660e8400-e29b-41d4-a716-446655440000'::uuid, '880e8400-e29b-41d4-a716-446655440000'::uuid, 'John Deere 850L Dozer', 'John Deere', '850L', 'JD850L2023089', 'active'::equipment_status, 'Fort Worth, TX', '2023-07-15', 1234.0, '{"blade_width": "12_feet", "operating_weight": "42000_lbs"}'::jsonb, NULL, '2024-03-01 00:00:00+00', '2024-03-01 00:00:00+00'),
  ('aa0e8400-e29b-41d4-a716-44665544f02a'::uuid, '660e8400-e29b-41d4-a716-446655440000'::uuid, '880e8400-e29b-41d4-a716-446655440000'::uuid, 'John Deere 850L Dozer', 'John Deere', '850L', 'JD850L2022156', 'active'::equipment_status, 'Dallas, TX', '2022-12-02', 2345.5, '{"blade_width": "12_feet", "operating_weight": "42000_lbs"}'::jsonb, NULL, '2024-03-01 00:00:00+00', '2024-03-01 00:00:00+00'),
  ('aa0e8400-e29b-41d4-a716-44665544f02b'::uuid, '660e8400-e29b-41d4-a716-446655440000'::uuid, '880e8400-e29b-41d4-a716-446655440000'::uuid, 'Komatsu PC350 Excavator', 'Komatsu', 'PC350LC-11', 'KMTPC350LC2023034', 'active'::equipment_status, 'Unknown', '2023-04-18', 1456.0, '{"operating_weight": "78000_lbs", "year": "2023"}'::jsonb, NULL, '2024-03-01 00:00:00+00', '2024-03-01 00:00:00+00'),
  ('aa0e8400-e29b-41d4-a716-44665544f02c'::uuid, '660e8400-e29b-41d4-a716-446655440000'::uuid, '880e8400-e29b-41d4-a716-446655440000'::uuid, 'Volvo L120H Wheel Loader', 'Volvoq', 'L120H', 'VOLL120H2023012', 'active'::equipment_status, 'Unknown', '2023-02-09', 987.5, '{"bucket_capacity": "4.5_cubic_yards", "year": "2023"}'::jsonb, NULL, '2024-03-01 00:00:00+00', '2024-03-01 00:00:00+00'),
  ('aa0e8400-e29b-41d4-a716-44665544f02d'::uuid, '660e8400-e29b-41d4-a716-446655440000'::uuid, '880e8400-e29b-41d4-a716-446655440000'::uuid, 'Caterpillar 320 GC Excavator', 'Caterpillar', '320 GC', 'CAT320GC2024004', 'inactive'::equipment_status, 'Lot 42', '2024-01-22', 89.0, '{"bucket_capacity": "1.2_cubic_yards"}'::jsonb, NULL, '2024-03-01 00:00:00+00', '2024-03-01 00:00:00+00'),
  ('aa0e8400-e29b-41d4-a716-44665544f02e'::uuid, '660e8400-e29b-41d4-a716-446655440000'::uuid, '880e8400-e29b-41d4-a716-446655440001'::uuid, 'Generac XG7500E Generator', 'Generac', 'XG7500E', 'GENXG75002023056', 'active'::equipment_status, 'Memphis, TN', '2023-09-10', 567.0, '{"fuel_type": "gasoline", "output_watts": "7500"}'::jsonb, NULL, '2024-03-01 00:00:00+00', '2024-03-01 00:00:00+00'),
  ('aa0e8400-e29b-41d4-a716-44665544f02f'::uuid, '660e8400-e29b-41d4-a716-446655440000'::uuid, '880e8400-e29b-41d4-a716-446655440000'::uuid, 'Caterpillar 962M Wheel Loader', 'Caterpillar', '962M', 'CAT962M2023034', 'active'::equipment_status, 'Indianapolis, IN', '2023-05-12', 1234.5, '{"bucket_capacity": "5.0_cubic_yards", "year": "2023"}'::jsonb, NULL, '2024-03-01 00:00:00+00', '2024-03-01 00:00:00+00'),
  ('aa0e8400-e29b-41d4-a716-44665544f030'::uuid, '660e8400-e29b-41d4-a716-446655440000'::uuid, '880e8400-e29b-41d4-a716-446655440000'::uuid, 'Hitachi ZX135 Excavator', 'Hitachi', 'ZX135US-6', 'HITZX135US2022045', 'active'::equipment_status, 'Cleveland, OH', '2022-11-18', 2123.75, '{"operating_weight": "30200_lbs", "year": "2022"}'::jsonb, NULL, '2024-03-01 00:00:00+00', '2024-03-01 00:00:00+00'),
  ('aa0e8400-e29b-41d4-a716-44665544f031'::uuid, '660e8400-e29b-41d4-a716-446655440000'::uuid, '880e8400-e29b-41d4-a716-446655440001'::uuid, 'Doosan P185 Compressor', 'Doosan ', 'P185WDO', 'DSNP185WDO2023023', 'active'::equipment_status, 'Charlotte, NC', '2023-03-30', 890.5, '{"cfm": "185", "pressure": "100_psi"}'::jsonb, NULL, '2024-03-01 00:00:00+00', '2024-03-01 00:00:00+00'),
  ('aa0e8400-e29b-41d4-a716-44665544f032'::uuid, '660e8400-e29b-41d4-a716-446655440000'::uuid, '880e8400-e29b-41d4-a716-446655440001'::uuid, 'Doosan P185 Compressor', 'Doosan', 'P185WDO', 'DSNP185WDO2022034', 'active'::equipment_status, 'Atlanta, GA', '2022-07-04', 1789.25, '{"cfm": "185", "pressure": "100_psi"}'::jsonb, NULL, '2024-03-01 00:00:00+00', '2024-03-01 00:00:00+00'),
  ('aa0e8400-e29b-41d4-a716-44665544f033'::uuid, '660e8400-e29b-41d4-a716-446655440000'::uuid, '880e8400-e29b-41d4-a716-446655440000'::uuid, 'Caterpillar D8T Dozer', 'Caterpillar', 'D8T', 'CATD8T2023056', 'active'::equipment_status, 'Houston, TX', '2023-06-26', 1567.0, '{"blade_width": "16_feet", "operating_weight": "84000_lbs", "year": "2023"}'::jsonb, NULL, '2024-03-01 00:00:00+00', '2024-03-01 00:00:00+00'),
  ('aa0e8400-e29b-41d4-a716-44665544f034'::uuid, '660e8400-e29b-41d4-a716-446655440000'::uuid, '880e8400-e29b-41d4-a716-446655440000'::uuid, 'Komatsu PC400 Excavator', 'Komatsu', 'PC400LC-8', 'KMTPC400LC2023012', 'active'::equipment_status, 'Dallas, TX', '2023-02-16', 1890.0, '{"operating_weight": "97000_lbs", "year": "2023"}'::jsonb, NULL, '2024-03-01 00:00:00+00', '2024-03-01 00:00:00+00'),
  ('aa0e8400-e29b-41d4-a716-44665544f035'::uuid, '660e8400-e29b-41d4-a716-446655440000'::uuid, '880e8400-e29b-41d4-a716-446655440000'::uuid, 'Bobcat S850 Skid Steer', 'Bobcat', 'S850', 'BOBS8502022078', 'active'::equipment_status, 'Storage', '2022-08-15', 2345.5, '{"rated_capacity": "3950_lbs", "year": "2022"}'::jsonb, NULL, '2024-03-01 00:00:00+00', '2024-03-01 00:00:00+00'),
  ('aa0e8400-e29b-41d4-a716-44665544f036'::uuid, '660e8400-e29b-41d4-a716-446655440000'::uuid, '880e8400-e29b-41d4-a716-446655440000'::uuid, 'Bobcat S850 Skid Steer', 'Bobcat', 'S850', 'BOBS8502023045', 'active'::equipment_status, 'Houston, TX', '2023-05-04', 1234.25, '{"rated_capacity": "3950_lbs", "year": "2023"}'::jsonb, NULL, '2024-03-01 00:00:00+00', '2024-03-01 00:00:00+00'),

  -- -----------------------------------------------------
  -- Metro Equipment Services (org 0001) - California / Southwest, ~12 new rows
  -- Mostly clean "City, ST"; one cross-org bleed-through ("Dallas location ")
  -- -----------------------------------------------------
  ('aa0e8400-e29b-41d4-a716-44665544f100'::uuid, '660e8400-e29b-41d4-a716-446655440001'::uuid, '880e8400-e29b-41d4-a716-446655440002'::uuid, 'JLG 600S Boom Lift', 'JLG', '600S', 'JLG600S2023089', 'active'::equipment_status, 'Los Angeles, CA', '2023-04-15', 678.0, '{"platform_height": "60_feet", "horizontal_reach": "40_feet", "year": "2023"}'::jsonb, NULL, '2024-03-15 00:00:00+00', '2024-03-15 00:00:00+00'),
  ('aa0e8400-e29b-41d4-a716-44665544f101'::uuid, '660e8400-e29b-41d4-a716-446655440001'::uuid, '880e8400-e29b-41d4-a716-446655440002'::uuid, 'Genie S-65 Telescopic Boom', 'Genie', 'S-65', 'GENIES652023012', 'active'::equipment_status, 'San Diego, CA', '2023-02-22', 890.5, '{"platform_height": "65_feet", "year": "2023"}'::jsonb, NULL, '2024-03-15 00:00:00+00', '2024-03-15 00:00:00+00'),
  ('aa0e8400-e29b-41d4-a716-44665544f102'::uuid, '660e8400-e29b-41d4-a716-446655440001'::uuid, '880e8400-e29b-41d4-a716-446655440002'::uuid, 'Skyjack SJIII 3226 Scissor Lift', 'Skyjack', 'SJIII 3226', 'SKYJ3226SJ2023023', 'active'::equipment_status, 'Sacramento, CA', '2023-03-08', 456.0, '{"platform_height": "26_feet", "year": "2023", "power_type": "electric"}'::jsonb, NULL, '2024-03-15 00:00:00+00', '2024-03-15 00:00:00+00'),
  ('aa0e8400-e29b-41d4-a716-44665544f103'::uuid, '660e8400-e29b-41d4-a716-446655440001'::uuid, '880e8400-e29b-41d4-a716-446655440002'::uuid, 'JLG 1932R Scissor Lift', 'JLG', '1932R', 'JLG1932R2022056', 'active'::equipment_status, 'San Francisco, CA', '2022-09-12', 1567.5, '{"platform_height": "19_feet", "year": "2022", "power_type": "electric"}'::jsonb, NULL, '2024-03-15 00:00:00+00', '2024-03-15 00:00:00+00'),
  ('aa0e8400-e29b-41d4-a716-44665544f104'::uuid, '660e8400-e29b-41d4-a716-446655440001'::uuid, '880e8400-e29b-41d4-a716-446655440002'::uuid, 'Bobcat S650 Skid Steer', 'Bobcat', 'S650', 'BOB650SS2024003', 'active'::equipment_status, 'Long Beach, CA', '2024-01-09', 145.0, '{"rated_capacity": "2690_lbs", "year": "2024"}'::jsonb, NULL, '2024-03-15 00:00:00+00', '2024-03-15 00:00:00+00'),
  ('aa0e8400-e29b-41d4-a716-44665544f105'::uuid, '660e8400-e29b-41d4-a716-446655440001'::uuid, '880e8400-e29b-41d4-a716-446655440002'::uuid, 'Snorkel TB42J Boom Lift', 'Snorkel', 'TB42J', 'SNKTB42J2023045', 'active'::equipment_status, 'Phoenix, AZ', '2023-05-19', 678.25, '{"platform_height": "42_feet", "year": "2023"}'::jsonb, NULL, '2024-03-15 00:00:00+00', '2024-03-15 00:00:00+00'),
  ('aa0e8400-e29b-41d4-a716-44665544f106'::uuid, '660e8400-e29b-41d4-a716-446655440001'::uuid, '880e8400-e29b-41d4-a716-446655440002'::uuid, 'Genie GS-1930 Scissor Lift', 'Genie', 'GS-1930', 'GENIE1930SL2024001', 'active'::equipment_status, 'Las Vegas, NV', '2024-02-28', 234.0, '{"platform_height": "19_feet", "year": "2024", "power_type": "electric"}'::jsonb, NULL, '2024-03-15 00:00:00+00', '2024-03-15 00:00:00+00'),
  ('aa0e8400-e29b-41d4-a716-44665544f107'::uuid, '660e8400-e29b-41d4-a716-446655440001'::uuid, '880e8400-e29b-41d4-a716-446655440002'::uuid, 'JLG 450AJ Boom Lift', 'JLG', '450AJ', 'JLG450AJ2023034', 'active'::equipment_status, 'Tucson, AZ', '2023-07-22', 890.5, '{"platform_height": "45_feet", "year": "2023"}'::jsonb, NULL, '2024-03-15 00:00:00+00', '2024-03-15 00:00:00+00'),
  ('aa0e8400-e29b-41d4-a716-44665544f108'::uuid, '660e8400-e29b-41d4-a716-446655440001'::uuid, '880e8400-e29b-41d4-a716-446655440002'::uuid, 'Skyjack SJIII 4632 Scissor Lift', 'Skyjack', 'SJIII 4632', 'SKYJ4632SJ2022078', 'maintenance'::equipment_status, 'Los Angeles, CA', '2022-10-28', 1234.0, '{"platform_height": "32_feet", "year": "2022", "power_type": "electric"}'::jsonb, NULL, '2024-03-15 00:00:00+00', '2024-03-15 00:00:00+00'),
  ('aa0e8400-e29b-41d4-a716-44665544f109'::uuid, '660e8400-e29b-41d4-a716-446655440001'::uuid, '880e8400-e29b-41d4-a716-446655440003'::uuid, 'Bobcat S570 Skid Steer', 'Bobcat', 'S570', 'BOBS5702023012', 'active'::equipment_status, 'San Diego, CA', '2023-01-30', 345.5, '{"rated_capacity": "1950_lbs", "year": "2023"}'::jsonb, NULL, '2024-03-15 00:00:00+00', '2024-03-15 00:00:00+00'),
  -- Cross-org bleed-through (mirrors prod pattern of "Dallas location " on a non-Dallas org)
  ('aa0e8400-e29b-41d4-a716-44665544f10a'::uuid, '660e8400-e29b-41d4-a716-446655440001'::uuid, '880e8400-e29b-41d4-a716-446655440002'::uuid, 'Genie GS-2669 Scissor Lift', 'Genie', 'GS-2669', 'GENIE2669SL2024002', 'active'::equipment_status, 'Dallas location ', '2024-02-04', 167.0, '{"platform_height": "26_feet", "year": "2024"}'::jsonb, NULL, '2024-03-15 00:00:00+00', '2024-03-15 00:00:00+00'),
  ('aa0e8400-e29b-41d4-a716-44665544f10b'::uuid, '660e8400-e29b-41d4-a716-446655440001'::uuid, '880e8400-e29b-41d4-a716-446655440002'::uuid, 'JLG 800AJ Boom Lift', 'JLG', '800AJ', 'JLG800AJ2022034', 'active'::equipment_status, 'San Francisco, CA', '2022-06-14', 2456.5, '{"platform_height": "80_feet", "year": "2022"}'::jsonb, NULL, '2024-03-15 00:00:00+00', '2024-03-15 00:00:00+00'),

  -- -----------------------------------------------------
  -- Valley Landscaping (org 0002) - Yard-only org, ~10 new rows
  -- Tests "no map markers possible" code path
  -- -----------------------------------------------------
  ('aa0e8400-e29b-41d4-a716-44665544f200'::uuid, '660e8400-e29b-41d4-a716-446655440002'::uuid, '880e8400-e29b-41d4-a716-446655440004'::uuid, 'John Deere Z930M Mower', 'John Deere', 'Z930M', 'JDZ930M2024003', 'active'::equipment_status, 'Lot 42', '2024-02-12', 178.0, '{"cutting_width": "60_inches", "year": "2024"}'::jsonb, NULL, '2024-03-20 00:00:00+00', '2024-03-20 00:00:00+00'),
  ('aa0e8400-e29b-41d4-a716-44665544f201'::uuid, '660e8400-e29b-41d4-a716-446655440002'::uuid, '880e8400-e29b-41d4-a716-446655440004'::uuid, 'Stihl FS 91 R Trimmer', 'Stihl', 'FS 91 R', 'STIHLFS91R2023023', 'active'::equipment_status, 'Storage', '2023-03-18', 234.5, '{"engine_displacement": "28.4_cc", "year": "2023"}'::jsonb, NULL, '2024-03-20 00:00:00+00', '2024-03-20 00:00:00+00'),
  ('aa0e8400-e29b-41d4-a716-44665544f202'::uuid, '660e8400-e29b-41d4-a716-446655440002'::uuid, '880e8400-e29b-41d4-a716-446655440004'::uuid, 'Stihl BR 800 Backpack Blower', 'Stihl', 'BR 800', 'STIHLBR8002023012', 'active'::equipment_status, 'Storage', '2023-04-05', 156.0, '{"engine_displacement": "79.9_cc", "year": "2023"}'::jsonb, NULL, '2024-03-20 00:00:00+00', '2024-03-20 00:00:00+00'),
  ('aa0e8400-e29b-41d4-a716-44665544f203'::uuid, '660e8400-e29b-41d4-a716-446655440002'::uuid, '880e8400-e29b-41d4-a716-446655440004'::uuid, 'Husqvarna 460 Rancher Chainsaw', 'Husqvarna', '460 Rancher', 'HUSQ460R2022034', 'active'::equipment_status, 'Loading / Unloading', '2022-08-22', 567.5, '{"bar_length": "20_inches", "year": "2022"}'::jsonb, NULL, '2024-03-20 00:00:00+00', '2024-03-20 00:00:00+00'),
  ('aa0e8400-e29b-41d4-a716-44665544f204'::uuid, '660e8400-e29b-41d4-a716-446655440002'::uuid, '880e8400-e29b-41d4-a716-446655440004'::uuid, 'Toro Z Master 6000 Mower', 'Toro', 'Z Master 6000', 'TORZM60002023045', 'active'::equipment_status, 'Lot 43', '2023-05-29', 345.0, '{"cutting_width": "60_inches", "year": "2023"}'::jsonb, NULL, '2024-03-20 00:00:00+00', '2024-03-20 00:00:00+00'),
  ('aa0e8400-e29b-41d4-a716-44665544f205'::uuid, '660e8400-e29b-41d4-a716-446655440002'::uuid, '880e8400-e29b-41d4-a716-446655440004'::uuid, 'Toro Z Master 6000 Mower', 'Toro', 'Z Master 6000', 'TORZM60002022056', 'maintenance'::equipment_status, 'Lot 45', '2022-07-10', 1234.5, '{"cutting_width": "60_inches", "year": "2022"}'::jsonb, NULL, '2024-03-20 00:00:00+00', '2024-03-20 00:00:00+00'),
  ('aa0e8400-e29b-41d4-a716-44665544f206'::uuid, '660e8400-e29b-41d4-a716-446655440002'::uuid, '880e8400-e29b-41d4-a716-446655440004'::uuid, 'Kubota L3301 Tractor', 'Kubota', 'L3301', 'KUBL33012023012', 'active'::equipment_status, 'Lot 42', '2023-02-24', 678.0, '{"engine_power": "33_hp", "year": "2023"}'::jsonb, NULL, '2024-03-20 00:00:00+00', '2024-03-20 00:00:00+00'),
  ('aa0e8400-e29b-41d4-a716-44665544f207'::uuid, '660e8400-e29b-41d4-a716-446655440002'::uuid, '880e8400-e29b-41d4-a716-446655440004'::uuid, 'Echo PB-580T Backpack Blower', 'Echo', 'PB-580T', 'ECHPB580T2023023', 'active'::equipment_status, 'Storage', '2023-06-15', 234.0, '{"engine_displacement": "58.2_cc", "year": "2023"}'::jsonb, NULL, '2024-03-20 00:00:00+00', '2024-03-20 00:00:00+00'),
  ('aa0e8400-e29b-41d4-a716-44665544f208'::uuid, '660e8400-e29b-41d4-a716-446655440002'::uuid, '880e8400-e29b-41d4-a716-446655440004'::uuid, 'Stihl MS 271 Chainsaw', 'Stihl', 'MS 271', 'STIHLMS2712022045', 'inactive'::equipment_status, 'Storage', '2022-09-08', 890.0, '{"bar_length": "20_inches", "year": "2022"}'::jsonb, NULL, '2024-03-20 00:00:00+00', '2024-03-20 00:00:00+00'),
  ('aa0e8400-e29b-41d4-a716-44665544f209'::uuid, '660e8400-e29b-41d4-a716-446655440002'::uuid, '880e8400-e29b-41d4-a716-446655440004'::uuid, 'John Deere 1025R Tractor', 'John Deere', '1025R', 'JD1025R2024001', 'active'::equipment_status, 'Loading / Unloading', '2024-01-18', 89.5, '{"engine_power": "23.9_hp", "year": "2024"}'::jsonb, NULL, '2024-03-20 00:00:00+00', '2024-03-20 00:00:00+00'),

  -- -----------------------------------------------------
  -- Industrial Rentals Corp (org 0003) - Single-site Texas with Woodson Brenham variants, ~32 new rows
  -- Mirrors prod pattern of 7 different casing/whitespace strings for the same site
  -- -----------------------------------------------------
  ('aa0e8400-e29b-41d4-a716-44665544f300'::uuid, '660e8400-e29b-41d4-a716-446655440003'::uuid, '880e8400-e29b-41d4-a716-446655440005'::uuid, 'Raymond 840 Pallet Jack', 'Raymond ', '840', 'RAYM8402022034', 'active'::equipment_status, 'Woodson Brenham', '2022-07-15', 2456.0, '{"capacity": "8000_lbs", "year": "2022"}'::jsonb, NULL, '2024-04-01 00:00:00+00', '2024-04-01 00:00:00+00'),
  ('aa0e8400-e29b-41d4-a716-44665544f301'::uuid, '660e8400-e29b-41d4-a716-446655440003'::uuid, '880e8400-e29b-41d4-a716-446655440005'::uuid, 'Raymond 840 Pallet Jack', 'Raymond ', '840', 'RAYM8402023056', 'active'::equipment_status, 'Woodson Brenham', '2023-04-12', 1234.5, '{"capacity": "8000_lbs", "year": "2023"}'::jsonb, NULL, '2024-04-01 00:00:00+00', '2024-04-01 00:00:00+00'),
  ('aa0e8400-e29b-41d4-a716-44665544f302'::uuid, '660e8400-e29b-41d4-a716-446655440003'::uuid, '880e8400-e29b-41d4-a716-446655440005'::uuid, 'Raymond 840 Pallet Jack', 'Raymond ', '840', 'RAYM8402023089', 'active'::equipment_status, 'Woodson Brenham', '2023-05-30', 987.25, '{"capacity": "8000_lbs", "year": "2023"}'::jsonb, NULL, '2024-04-01 00:00:00+00', '2024-04-01 00:00:00+00'),
  ('aa0e8400-e29b-41d4-a716-44665544f303'::uuid, '660e8400-e29b-41d4-a716-446655440003'::uuid, '880e8400-e29b-41d4-a716-446655440005'::uuid, 'Raymond 840 Pallet Jack', 'Rsymond', '840', 'RAYM8402022112', 'active'::equipment_status, 'woodson brenham', '2022-09-07', 1789.5, '{"capacity": "8000_lbs", "year": "2022"}'::jsonb, NULL, '2024-04-01 00:00:00+00', '2024-04-01 00:00:00+00'),
  ('aa0e8400-e29b-41d4-a716-44665544f304'::uuid, '660e8400-e29b-41d4-a716-446655440003'::uuid, '880e8400-e29b-41d4-a716-446655440005'::uuid, 'Raymond 840 Pallet Jack', 'Rsymond', '840', 'RAYM8402023034', 'active'::equipment_status, 'woodson brenham', '2023-03-22', 1023.0, '{"capacity": "8000_lbs", "year": "2023"}'::jsonb, NULL, '2024-04-01 00:00:00+00', '2024-04-01 00:00:00+00'),
  ('aa0e8400-e29b-41d4-a716-44665544f305'::uuid, '660e8400-e29b-41d4-a716-446655440003'::uuid, '880e8400-e29b-41d4-a716-446655440005'::uuid, 'Cromulift FL4200 Forklift', 'Cromulift', 'FL4200', 'CRMFL42002023012', 'active'::equipment_status, 'Loading / Unloading', '2023-01-25', 1456.5, '{"capacity": "4200_lbs", "year": "2023"}'::jsonb, NULL, '2024-04-01 00:00:00+00', '2024-04-01 00:00:00+00'),
  ('aa0e8400-e29b-41d4-a716-44665544f306'::uuid, '660e8400-e29b-41d4-a716-446655440003'::uuid, '880e8400-e29b-41d4-a716-446655440005'::uuid, 'Cromulift FL4200 Forklift', 'Cromulift', 'FL4200', 'CRMFL42002022067', 'active'::equipment_status, 'Loading / Unloading', '2022-08-19', 2345.75, '{"capacity": "4200_lbs", "year": "2022"}'::jsonb, NULL, '2024-04-01 00:00:00+00', '2024-04-01 00:00:00+00'),
  ('aa0e8400-e29b-41d4-a716-44665544f307'::uuid, '660e8400-e29b-41d4-a716-446655440003'::uuid, '880e8400-e29b-41d4-a716-446655440005'::uuid, 'Cromulift FL3300 Forklift', 'Cromulift', 'FL3300', 'CRMFL33002023023', 'active'::equipment_status, 'Loading / Unloading', '2023-02-08', 1234.0, '{"capacity": "3300_lbs", "year": "2023"}'::jsonb, NULL, '2024-04-01 00:00:00+00', '2024-04-01 00:00:00+00'),
  ('aa0e8400-e29b-41d4-a716-44665544f308'::uuid, '660e8400-e29b-41d4-a716-446655440003'::uuid, '880e8400-e29b-41d4-a716-446655440005'::uuid, 'Cromulift FL3300 Forklift', 'Cromulift', 'FL3300', 'CRMFL33002022045', 'maintenance'::equipment_status, 'Loading / Unloading', '2022-06-29', 2789.5, '{"capacity": "3300_lbs", "year": "2022"}'::jsonb, NULL, '2024-04-01 00:00:00+00', '2024-04-01 00:00:00+00'),
  ('aa0e8400-e29b-41d4-a716-44665544f309'::uuid, '660e8400-e29b-41d4-a716-446655440003'::uuid, '880e8400-e29b-41d4-a716-446655440005'::uuid, 'Doosan D45S-7 Forklift', 'Doosan', 'D45S-7', 'DSND45S72023012', 'active'::equipment_status, 'Brenham woodson', '2023-04-14', 890.0, '{"capacity": "10000_lbs", "year": "2023"}'::jsonb, NULL, '2024-04-01 00:00:00+00', '2024-04-01 00:00:00+00'),
  ('aa0e8400-e29b-41d4-a716-44665544f30a'::uuid, '660e8400-e29b-41d4-a716-446655440003'::uuid, '880e8400-e29b-41d4-a716-446655440005'::uuid, 'Doosan D45S-7 Forklift', 'Doosan', 'D45S-7', 'DSND45S72022034', 'active'::equipment_status, 'Brenham woodson', '2022-07-21', 1789.25, '{"capacity": "10000_lbs", "year": "2022"}'::jsonb, NULL, '2024-04-01 00:00:00+00', '2024-04-01 00:00:00+00'),
  ('aa0e8400-e29b-41d4-a716-44665544f30b'::uuid, '660e8400-e29b-41d4-a716-446655440003'::uuid, '880e8400-e29b-41d4-a716-446655440005'::uuid, 'Crown FC 5700 Forklift', 'Crown', 'FC 5700', 'CRWNFC57002023023', 'active'::equipment_status, 'Woodson brenham', '2023-03-17', 1123.5, '{"capacity": "5000_lbs", "year": "2023"}'::jsonb, NULL, '2024-04-01 00:00:00+00', '2024-04-01 00:00:00+00'),
  ('aa0e8400-e29b-41d4-a716-44665544f30c'::uuid, '660e8400-e29b-41d4-a716-446655440003'::uuid, '880e8400-e29b-41d4-a716-446655440005'::uuid, 'Crown FC 5700 Forklift', 'Crown', 'FC 5700', 'CRWNFC57002022056', 'active'::equipment_status, 'Woodson brenham', '2022-08-24', 1890.0, '{"capacity": "5000_lbs", "year": "2022"}'::jsonb, NULL, '2024-04-01 00:00:00+00', '2024-04-01 00:00:00+00'),
  ('aa0e8400-e29b-41d4-a716-44665544f30d'::uuid, '660e8400-e29b-41d4-a716-446655440003'::uuid, '880e8400-e29b-41d4-a716-446655440005'::uuid, 'Mitsubishi FD25N Forklift', 'Mitsubishi', 'FD25N', 'MITFD25N2023034', 'active'::equipment_status, 'Woodson Brenham ', '2023-05-01', 678.5, '{"capacity": "5000_lbs", "year": "2023"}'::jsonb, NULL, '2024-04-01 00:00:00+00', '2024-04-01 00:00:00+00'),
  ('aa0e8400-e29b-41d4-a716-44665544f30e'::uuid, '660e8400-e29b-41d4-a716-446655440003'::uuid, '880e8400-e29b-41d4-a716-446655440005'::uuid, 'Mitsubishi FD25N Forklift', 'Mitsubishi', 'FD25N', 'MITFD25N2022078', 'active'::equipment_status, 'Woodson Brenham ', '2022-10-10', 1567.25, '{"capacity": "5000_lbs", "year": "2022"}'::jsonb, NULL, '2024-04-01 00:00:00+00', '2024-04-01 00:00:00+00'),
  ('aa0e8400-e29b-41d4-a716-44665544f30f'::uuid, '660e8400-e29b-41d4-a716-446655440003'::uuid, '880e8400-e29b-41d4-a716-446655440005'::uuid, 'Yale ERP040VT Forklift', 'Yale', 'ERP040VT', 'YALERP040VT2023012', 'active'::equipment_status, 'woodson brenham ', '2023-02-19', 567.0, '{"capacity": "4000_lbs", "year": "2023", "power_type": "electric"}'::jsonb, NULL, '2024-04-01 00:00:00+00', '2024-04-01 00:00:00+00'),
  ('aa0e8400-e29b-41d4-a716-44665544f310'::uuid, '660e8400-e29b-41d4-a716-446655440003'::uuid, '880e8400-e29b-41d4-a716-446655440005'::uuid, 'Yale ERP040VT Forklift', 'Yale', 'ERP040VT', 'YALERP040VT2022045', 'active'::equipment_status, 'woodson brenham ', '2022-06-04', 1234.0, '{"capacity": "4000_lbs", "year": "2022", "power_type": "electric"}'::jsonb, NULL, '2024-04-01 00:00:00+00', '2024-04-01 00:00:00+00'),
  ('aa0e8400-e29b-41d4-a716-44665544f311'::uuid, '660e8400-e29b-41d4-a716-446655440003'::uuid, '880e8400-e29b-41d4-a716-446655440005'::uuid, 'Hyster H50FT Forklift', 'Hyster', 'H50FT', 'HYSTH50FT2022034', 'active'::equipment_status, 'Woodson Brenham', '2022-08-15', 1890.5, '{"capacity": "5000_lbs", "year": "2022"}'::jsonb, NULL, '2024-04-01 00:00:00+00', '2024-04-01 00:00:00+00'),
  ('aa0e8400-e29b-41d4-a716-44665544f312'::uuid, '660e8400-e29b-41d4-a716-446655440003'::uuid, '880e8400-e29b-41d4-a716-446655440005'::uuid, 'Hyster H50FT Forklift', 'Hyster', 'H50FT', 'HYSTH50FT2023045', 'active'::equipment_status, 'Woodson Brenham', '2023-06-26', 789.5, '{"capacity": "5000_lbs", "year": "2023"}'::jsonb, NULL, '2024-04-01 00:00:00+00', '2024-04-01 00:00:00+00'),
  ('aa0e8400-e29b-41d4-a716-44665544f313'::uuid, '660e8400-e29b-41d4-a716-446655440003'::uuid, '880e8400-e29b-41d4-a716-446655440005'::uuid, 'Toyota 8FGU30 Forklift', 'Toyota', '8FGU30', 'TOY8FGU302022056', 'active'::equipment_status, 'Dallas location ', '2022-09-09', 2123.0, '{"capacity": "6000_lbs", "year": "2022"}'::jsonb, NULL, '2024-04-01 00:00:00+00', '2024-04-01 00:00:00+00'),
  ('aa0e8400-e29b-41d4-a716-44665544f314'::uuid, '660e8400-e29b-41d4-a716-446655440003'::uuid, '880e8400-e29b-41d4-a716-446655440005'::uuid, 'Toyota 8FGU30 Forklift', 'Toyota', '8FGU30', 'TOY8FGU302023023', 'active'::equipment_status, 'Dallas location ', '2023-04-04', 1067.25, '{"capacity": "6000_lbs", "year": "2023"}'::jsonb, NULL, '2024-04-01 00:00:00+00', '2024-04-01 00:00:00+00'),
  ('aa0e8400-e29b-41d4-a716-44665544f315'::uuid, '660e8400-e29b-41d4-a716-446655440003'::uuid, '880e8400-e29b-41d4-a716-446655440005'::uuid, 'Clark C50SD Forklift', 'Clark', 'C50SD', 'CLKC50SD2023012', 'active'::equipment_status, 'Woodson Brenham', '2023-01-13', 890.0, '{"capacity": "5000_lbs", "year": "2023"}'::jsonb, NULL, '2024-04-01 00:00:00+00', '2024-04-01 00:00:00+00'),
  ('aa0e8400-e29b-41d4-a716-44665544f316'::uuid, '660e8400-e29b-41d4-a716-446655440003'::uuid, '880e8400-e29b-41d4-a716-446655440005'::uuid, 'Clark C50SD Forklift', 'Clark', 'C50SD', 'CLKC50SD2022034', 'maintenance'::equipment_status, 'woodson brenham', '2022-07-18', 1789.75, '{"capacity": "5000_lbs", "year": "2022"}'::jsonb, NULL, '2024-04-01 00:00:00+00', '2024-04-01 00:00:00+00'),
  ('aa0e8400-e29b-41d4-a716-44665544f317'::uuid, '660e8400-e29b-41d4-a716-446655440003'::uuid, '880e8400-e29b-41d4-a716-446655440005'::uuid, 'Crown RC 5535 Reach Truck', 'Crown', 'RC 5535', 'CRWNRC55352023023', 'active'::equipment_status, 'Woodson Brenham', '2023-03-30', 567.5, '{"capacity": "3000_lbs", "year": "2023", "power_type": "electric"}'::jsonb, NULL, '2024-04-01 00:00:00+00', '2024-04-01 00:00:00+00'),
  ('aa0e8400-e29b-41d4-a716-44665544f318'::uuid, '660e8400-e29b-41d4-a716-446655440003'::uuid, '880e8400-e29b-41d4-a716-446655440005'::uuid, 'Crown RC 5535 Reach Truck', 'Crown', 'RC 5535', 'CRWNRC55352022056', 'active'::equipment_status, 'Brenham woodson', '2022-08-06', 1456.0, '{"capacity": "3000_lbs", "year": "2022", "power_type": "electric"}'::jsonb, NULL, '2024-04-01 00:00:00+00', '2024-04-01 00:00:00+00'),
  ('aa0e8400-e29b-41d4-a716-44665544f319'::uuid, '660e8400-e29b-41d4-a716-446655440003'::uuid, '880e8400-e29b-41d4-a716-446655440005'::uuid, 'Princeton PiggyBack D5000 Forklift', 'Princeton', 'D5000', 'PRTND50002023034', 'active'::equipment_status, 'Woodson Brenham', '2023-05-08', 678.0, '{"capacity": "5000_lbs", "year": "2023"}'::jsonb, NULL, '2024-04-01 00:00:00+00', '2024-04-01 00:00:00+00'),
  ('aa0e8400-e29b-41d4-a716-44665544f31a'::uuid, '660e8400-e29b-41d4-a716-446655440003'::uuid, '880e8400-e29b-41d4-a716-446655440005'::uuid, 'Moffett M5 Truck-Mounted Forklift', 'moffett', 'M5', 'MOFM52022078', 'active'::equipment_status, 'woodson brenham ', '2022-10-13', 1234.5, '{"capacity": "5500_lbs", "year": "2022"}'::jsonb, NULL, '2024-04-01 00:00:00+00', '2024-04-01 00:00:00+00'),
  ('aa0e8400-e29b-41d4-a716-44665544f31b'::uuid, '660e8400-e29b-41d4-a716-446655440003'::uuid, '880e8400-e29b-41d4-a716-446655440005'::uuid, 'UniLift FLX-2000 Forklift', 'UniLift', 'FLX-2000', 'UNIFLX20002023023', 'active'::equipment_status, 'Woodson brenham', '2023-04-25', 567.0, '{"capacity": "2000_lbs", "year": "2023", "power_type": "electric"}'::jsonb, NULL, '2024-04-01 00:00:00+00', '2024-04-01 00:00:00+00'),
  ('aa0e8400-e29b-41d4-a716-44665544f31c'::uuid, '660e8400-e29b-41d4-a716-446655440003'::uuid, '880e8400-e29b-41d4-a716-446655440005'::uuid, 'UniLift FLX-2000 Forklift', 'UniLift', 'FLX-2000', 'UNIFLX20002022045', 'active'::equipment_status, 'Woodson brenham', '2022-06-30', 1345.5, '{"capacity": "2000_lbs", "year": "2022", "power_type": "electric"}'::jsonb, NULL, '2024-04-01 00:00:00+00', '2024-04-01 00:00:00+00'),
  ('aa0e8400-e29b-41d4-a716-44665544f31d'::uuid, '660e8400-e29b-41d4-a716-446655440003'::uuid, '880e8400-e29b-41d4-a716-446655440005'::uuid, 'Toyota 7FBEU18 Forklift', 'Toyota', '7FBEU18', 'TOY7FBEU182023012', 'active'::equipment_status, 'Woodson Brenham', '2023-02-13', 456.0, '{"capacity": "3500_lbs", "year": "2023", "power_type": "electric"}'::jsonb, NULL, '2024-04-01 00:00:00+00', '2024-04-01 00:00:00+00'),
  ('aa0e8400-e29b-41d4-a716-44665544f31e'::uuid, '660e8400-e29b-41d4-a716-446655440003'::uuid, '880e8400-e29b-41d4-a716-446655440005'::uuid, 'Toyota 7FBEU18 Forklift', 'Toyota', '7FBEU18', 'TOY7FBEU182022034', 'inactive'::equipment_status, 'Woodson Brenham ', '2022-08-03', 1789.25, '{"capacity": "3500_lbs", "year": "2022", "power_type": "electric"}'::jsonb, NULL, '2024-04-01 00:00:00+00', '2024-04-01 00:00:00+00'),
  ('aa0e8400-e29b-41d4-a716-44665544f31f'::uuid, '660e8400-e29b-41d4-a716-446655440003'::uuid, '880e8400-e29b-41d4-a716-446655440005'::uuid, 'Bosch HBX-45 Hydraulic Breaker', 'Bosch', 'HBX-45', 'BOSHBX452023012', 'active'::equipment_status, 'Woodson Brenham', '2023-03-11', 234.0, '{"weight": "45_lbs", "year": "2023"}'::jsonb, NULL, '2024-04-01 00:00:00+00', '2024-04-01 00:00:00+00'),

  -- -----------------------------------------------------
  -- Mike's Repair Shop (org 0006) - Geocoded sample, ~7 new rows
  -- Highest assigned_location_* coverage of any org (well-mapped happy path)
  -- -----------------------------------------------------
  ('aa0e8400-e29b-41d4-a716-44665544f400'::uuid, '660e8400-e29b-41d4-a716-446655440006'::uuid, NULL, 'Lincoln Ranger 225 Welder', 'Lincoln Electric', 'Ranger 225', 'LINCRNGR2252023023', 'active'::equipment_status, 'Tucson, AZ', '2023-04-12', 567.0, '{"welding_output": "225_amps", "year": "2023"}'::jsonb, NULL, '2024-04-10 00:00:00+00', '2024-04-10 00:00:00+00'),
  ('aa0e8400-e29b-41d4-a716-44665544f401'::uuid, '660e8400-e29b-41d4-a716-446655440006'::uuid, NULL, 'Sullair 185 Compressor', 'Sullair', '185', 'SULL1852022034', 'active'::equipment_status, 'Phoenix, AZ', '2022-08-19', 1789.5, '{"cfm": "185", "pressure": "100_psi", "year": "2022"}'::jsonb, NULL, '2024-04-10 00:00:00+00', '2024-04-10 00:00:00+00'),
  ('aa0e8400-e29b-41d4-a716-44665544f402'::uuid, '660e8400-e29b-41d4-a716-446655440006'::uuid, NULL, 'Doosan P185 Compressor', 'Doosan', 'P185WDO', 'DSNP185WDO2023012', 'active'::equipment_status, 'Albuquerque, NM', '2023-03-04', 890.0, '{"cfm": "185", "pressure": "100_psi", "year": "2023"}'::jsonb, NULL, '2024-04-10 00:00:00+00', '2024-04-10 00:00:00+00'),
  ('aa0e8400-e29b-41d4-a716-44665544f403'::uuid, '660e8400-e29b-41d4-a716-446655440006'::uuid, NULL, 'Milwaukee MX FUEL Pipe Threader', 'Milwaukee', 'MX FUEL Pipe Threader', 'MILWMXFPT2023045', 'active'::equipment_status, 'Phoenix, AZ', '2023-05-21', 156.0, '{"max_pipe_size": "2_inches", "year": "2023"}'::jsonb, NULL, '2024-04-10 00:00:00+00', '2024-04-10 00:00:00+00'),
  ('aa0e8400-e29b-41d4-a716-44665544f404'::uuid, '660e8400-e29b-41d4-a716-446655440006'::uuid, NULL, 'Generac G3500 Generator', 'Generac', 'G3500', 'GEN001PG2023034', 'active'::equipment_status, 'Las Vegas, NV', '2023-04-08', 678.5, '{"fuel_type": "gasoline", "output_watts": "3500"}'::jsonb, NULL, '2024-04-10 00:00:00+00', '2024-04-10 00:00:00+00'),
  ('aa0e8400-e29b-41d4-a716-44665544f405'::uuid, '660e8400-e29b-41d4-a716-446655440006'::uuid, NULL, 'Lincoln Ranger 305G Welder', 'Lincoln Electric', 'Ranger 305G', 'LINCRNGR305G2024001', 'active'::equipment_status, 'Tucson, AZ', '2024-01-29', 234.0, '{"welding_output": "300_amps", "year": "2024"}'::jsonb, NULL, '2024-04-10 00:00:00+00', '2024-04-10 00:00:00+00'),
  ('aa0e8400-e29b-41d4-a716-44665544f406'::uuid, '660e8400-e29b-41d4-a716-446655440006'::uuid, NULL, 'Hilti TE 3000-AVR Demolition Hammer', 'Hilti', 'TE 3000-AVR', 'HILTE3000AVR2023012', 'active'::equipment_status, 'Phoenix, AZ', '2023-02-26', 345.0, '{"weight": "65_lbs", "year": "2023"}'::jsonb, NULL, '2024-04-10 00:00:00+00', '2024-04-10 00:00:00+00'),

  -- -----------------------------------------------------
  -- Tom's Field Services (org 0005) - Small mix, ~5 new rows
  -- Includes typo and Unknown
  -- -----------------------------------------------------
  ('aa0e8400-e29b-41d4-a716-44665544f500'::uuid, '660e8400-e29b-41d4-a716-446655440005'::uuid, NULL, 'Vermeer S800TX Mini Skid Steer', 'Vermeer', 'S800TX', 'VERMS800TX2024001', 'active'::equipment_status, 'Charlotte, NC', '2024-02-16', 178.0, '{"rated_capacity": "800_lbs", "year": "2024"}'::jsonb, NULL, '2024-04-15 00:00:00+00', '2024-04-15 00:00:00+00'),
  ('aa0e8400-e29b-41d4-a716-44665544f501'::uuid, '660e8400-e29b-41d4-a716-446655440005'::uuid, NULL, 'Doosan P185 Compressor', 'Doosan', 'P185WDO', 'DSNP185WDO2023056', 'active'::equipment_status, 'Raleigh, NC', '2023-03-12', 890.5, '{"cfm": "185", "pressure": "100_psi", "year": "2023"}'::jsonb, NULL, '2024-04-15 00:00:00+00', '2024-04-15 00:00:00+00'),
  ('aa0e8400-e29b-41d4-a716-44665544f502'::uuid, '660e8400-e29b-41d4-a716-446655440005'::uuid, NULL, 'Stihl MS 500i Chainsaw', 'Stihl', 'MS 500i', 'STIHLMS500I2023034', 'active'::equipment_status, 'Charlotte, NC', '2023-05-09', 345.0, '{"bar_length": "20_inches", "year": "2023"}'::jsonb, NULL, '2024-04-15 00:00:00+00', '2024-04-15 00:00:00+00'),
  ('aa0e8400-e29b-41d4-a716-44665544f503'::uuid, '660e8400-e29b-41d4-a716-446655440005'::uuid, NULL, 'Generac G3500 Generator', 'Generac', 'G3500', 'GEN001PG2022045', 'active'::equipment_status, 'Ekch', '2022-09-23', 1567.5, '{"fuel_type": "gasoline", "output_watts": "3500"}'::jsonb, NULL, '2024-04-15 00:00:00+00', '2024-04-15 00:00:00+00'),
  ('aa0e8400-e29b-41d4-a716-44665544f504'::uuid, '660e8400-e29b-41d4-a716-446655440005'::uuid, NULL, 'Lincoln Ranger 225 Welder', 'Lincoln Electric', 'Ranger 225', 'LINCRNGR2252022067', 'active'::equipment_status, 'Unknown', '2022-08-11', 1234.0, '{"welding_output": "225_amps", "year": "2022"}'::jsonb, NULL, '2024-04-15 00:00:00+00', '2024-04-15 00:00:00+00')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- Tier 1: Team override fixture (single explicit case)
-- Paired with team 880e8400-...0000 (override_equipment_location = true).
-- Matches the production reality that use_team_location is virtually unused.
-- =====================================================
UPDATE public.equipment
SET use_team_location = true
WHERE id = 'aa0e8400-e29b-41d4-a716-446655440000'::uuid; -- CAT 320 Excavator (Apex Heavy Equipment Team)

-- =====================================================
-- Tier 2: assigned_location_* (sparse, ~7% coverage matching prod)
-- Production reality:
--   - assigned_location_street is NEVER populated (always NULL)
--   - assigned_location_country is the literal string 'United States'
--   - lat/lng have 6+ decimal precision (Google Geocoding output)
-- =====================================================

-- Apex Construction equipment with assigned_location_*
UPDATE public.equipment SET
  assigned_location_city = 'Fort Worth',
  assigned_location_state = 'TX',
  assigned_location_country = 'United States',
  assigned_location_lat = 32.755488,
  assigned_location_lng = -97.330766
WHERE id = 'aa0e8400-e29b-41d4-a716-446655440001'::uuid; -- John Deere 850L Dozer

UPDATE public.equipment SET
  assigned_location_city = 'Houston',
  assigned_location_state = 'TX',
  assigned_location_country = 'United States',
  assigned_location_lat = 29.760427,
  assigned_location_lng = -95.369803
WHERE id = 'aa0e8400-e29b-41d4-a716-446655440002'::uuid; -- Portable Generator

UPDATE public.equipment SET
  assigned_location_city = 'Dallas',
  assigned_location_state = 'TX',
  assigned_location_country = 'United States',
  assigned_location_lat = 32.776664,
  assigned_location_lng = -96.796988
WHERE id = 'aa0e8400-e29b-41d4-a716-446655440040'::uuid; -- CAT 320 Excavator #2

UPDATE public.equipment SET
  assigned_location_city = 'Atlanta',
  assigned_location_state = 'GA',
  assigned_location_country = 'United States',
  assigned_location_lat = 33.748997,
  assigned_location_lng = -84.387985
WHERE id = 'aa0e8400-e29b-41d4-a716-44665544f000'::uuid; -- new: Caterpillar D6T XL Dozer

UPDATE public.equipment SET
  assigned_location_city = 'Indianapolis',
  assigned_location_state = 'IN',
  assigned_location_country = 'United States',
  assigned_location_lat = 39.769090,
  assigned_location_lng = -86.158018
WHERE id = 'aa0e8400-e29b-41d4-a716-44665544f00c'::uuid; -- new: Case CX210D Excavator

UPDATE public.equipment SET
  assigned_location_city = 'Cleveland',
  assigned_location_state = 'OH',
  assigned_location_country = 'United States',
  assigned_location_lat = 41.499320,
  assigned_location_lng = -81.694361
WHERE id = 'aa0e8400-e29b-41d4-a716-44665544f00d'::uuid; -- new: Bobcat E35 Excavator

-- Metro Equipment Services with assigned_location_*
UPDATE public.equipment SET
  assigned_location_city = 'Los Angeles',
  assigned_location_state = 'CA',
  assigned_location_country = 'United States',
  assigned_location_lat = 34.054908,
  assigned_location_lng = -118.242643
WHERE id = 'aa0e8400-e29b-41d4-a716-446655440010'::uuid; -- Bobcat S650 Skid Steer

UPDATE public.equipment SET
  assigned_location_city = 'San Francisco',
  assigned_location_state = 'CA',
  assigned_location_country = 'United States',
  assigned_location_lat = 37.774929,
  assigned_location_lng = -122.419416
WHERE id = 'aa0e8400-e29b-41d4-a716-446655440011'::uuid; -- JLG 450AJ Boom Lift

UPDATE public.equipment SET
  assigned_location_city = 'San Diego',
  assigned_location_state = 'CA',
  assigned_location_country = 'United States',
  assigned_location_lat = 32.715738,
  assigned_location_lng = -117.161084
WHERE id = 'aa0e8400-e29b-41d4-a716-44665544f101'::uuid; -- new: Genie S-65 Telescopic Boom

-- Industrial Rentals with assigned_location_* (Giddings + rural Brenham coords from prod)
UPDATE public.equipment SET
  assigned_location_city = 'Giddings',
  assigned_location_state = 'TX',
  assigned_location_country = 'United States',
  assigned_location_lat = 30.182716,
  assigned_location_lng = -96.936371
WHERE id = 'aa0e8400-e29b-41d4-a716-446655440032'::uuid; -- Ingersoll Rand P185 Compressor

UPDATE public.equipment SET
  assigned_location_city = 'Giddings',
  assigned_location_state = 'TX',
  assigned_location_country = 'United States',
  assigned_location_lat = 30.182716,
  assigned_location_lng = -96.936371
WHERE id = 'aa0e8400-e29b-41d4-a716-44665544f300'::uuid; -- new: Raymond 840 Pallet Jack

-- Rural Brenham coord (prod has this exact lat/lng with state but no city)
UPDATE public.equipment SET
  assigned_location_city = NULL,
  assigned_location_state = 'TX',
  assigned_location_country = 'United States',
  assigned_location_lat = 30.296716,
  assigned_location_lng = -96.963862
WHERE id = 'aa0e8400-e29b-41d4-a716-44665544f31e'::uuid; -- new: Toyota 7FBEU18 Forklift (inactive, no city)

-- Mike's Repair Shop with assigned_location_* (highest coverage org)
UPDATE public.equipment SET
  assigned_location_city = 'Phoenix',
  assigned_location_state = 'AZ',
  assigned_location_country = 'United States',
  assigned_location_lat = 33.448377,
  assigned_location_lng = -112.074037
WHERE id = 'aa0e8400-e29b-41d4-a716-446655440080'::uuid; -- Sullair 185 Compressor

UPDATE public.equipment SET
  assigned_location_city = 'Phoenix',
  assigned_location_state = 'AZ',
  assigned_location_country = 'United States',
  assigned_location_lat = 33.448377,
  assigned_location_lng = -112.074037
WHERE id = 'aa0e8400-e29b-41d4-a716-446655440081'::uuid; -- Lincoln Ranger 225 Welder

UPDATE public.equipment SET
  assigned_location_city = 'Tucson',
  assigned_location_state = 'AZ',
  assigned_location_country = 'United States',
  assigned_location_lat = 32.221743,
  assigned_location_lng = -110.926479
WHERE id = 'aa0e8400-e29b-41d4-a716-44665544f400'::uuid; -- new: Lincoln Ranger 225 Welder (Tucson)

UPDATE public.equipment SET
  assigned_location_city = 'Phoenix',
  assigned_location_state = 'AZ',
  assigned_location_country = 'United States',
  assigned_location_lat = 33.448377,
  assigned_location_lng = -112.074037
WHERE id = 'aa0e8400-e29b-41d4-a716-44665544f401'::uuid; -- new: Sullair 185 Compressor

UPDATE public.equipment SET
  assigned_location_city = 'Las Vegas',
  assigned_location_state = 'NV',
  assigned_location_country = 'United States',
  assigned_location_lat = 36.169941,
  assigned_location_lng = -115.139830
WHERE id = 'aa0e8400-e29b-41d4-a716-44665544f404'::uuid; -- new: Generac G3500 Generator

UPDATE public.equipment SET
  assigned_location_city = 'Tucson',
  assigned_location_state = 'AZ',
  assigned_location_country = 'United States',
  assigned_location_lat = 32.221743,
  assigned_location_lng = -110.926479
WHERE id = 'aa0e8400-e29b-41d4-a716-44665544f405'::uuid; -- new: Lincoln Ranger 305G Welder
