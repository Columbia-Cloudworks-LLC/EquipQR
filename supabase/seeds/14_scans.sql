-- =====================================================
-- EquipQR Seed Data - QR Code Scans
-- =====================================================
-- Scan history showing equipment location and usage

INSERT INTO public.scans (
  id,
  equipment_id,
  scanned_by,
  scanned_at,
  location,
  notes
) VALUES
  -- CAT 320 Excavator - Multiple scans showing movement
  (
    '5c0e8400-e29b-41d4-a716-446655440001'::uuid,
    'aa0e8400-e29b-41d4-a716-446655440000'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440003'::uuid,
    '2026-01-01 07:00:00+00',
    'Apex Yard - Pre-deployment inspection',
    'Checked fluids, all good'
  ),
  (
    '5c0e8400-e29b-41d4-a716-446655440002'::uuid,
    'aa0e8400-e29b-41d4-a716-446655440000'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440003'::uuid,
    '2026-01-03 06:30:00+00',
    'Site Alpha - Dallas Downtown',
    'Arrived on site'
  ),
  (
    '5c0e8400-e29b-41d4-a716-446655440003'::uuid,
    'aa0e8400-e29b-41d4-a716-446655440000'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440001'::uuid,
    '2026-01-08 14:30:00+00',
    'Site Alpha - Dallas Downtown',
    'Operator check-in after lunch'
  ),
  
  -- John Deere Dozer scan
  (
    '5c0e8400-e29b-41d4-a716-446655440004'::uuid,
    'aa0e8400-e29b-41d4-a716-446655440001'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440003'::uuid,
    '2026-01-07 09:15:00+00',
    'Fort Worth Industrial Park',
    'Daily inspection complete'
  ),
  
  -- Generator scan
  (
    '5c0e8400-e29b-41d4-a716-446655440005'::uuid,
    'aa0e8400-e29b-41d4-a716-446655440002'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440003'::uuid,
    '2026-01-05 16:45:00+00',
    'Houston Energy District',
    'Fuel level check - 75%'
  ),
  
  -- Bobcat Skid Steer - Rental check-out (Metro)
  (
    '5c0e8400-e29b-41d4-a716-446655440010'::uuid,
    'aa0e8400-e29b-41d4-a716-446655440010'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440005'::uuid,
    '2026-01-08 10:00:00+00',
    'LA Convention Center Job Site',
    'Rented to ABC Construction - 3 day rental'
  ),
  
  -- JLG Boom Lift - Multiple scans (Metro)
  (
    '5c0e8400-e29b-41d4-a716-446655440011'::uuid,
    'aa0e8400-e29b-41d4-a716-446655440011'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440004'::uuid,
    '2026-01-06 08:00:00+00',
    'San Francisco - New Tower Project',
    NULL
  ),
  (
    '5c0e8400-e29b-41d4-a716-446655440012'::uuid,
    'aa0e8400-e29b-41d4-a716-446655440011'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440005'::uuid,
    '2026-01-08 12:30:00+00',
    'San Francisco - New Tower Project',
    'Extended rental - customer requested 2 more weeks'
  ),
  
  -- Valley Landscaping scans
  (
    '5c0e8400-e29b-41d4-a716-446655440020'::uuid,
    'aa0e8400-e29b-41d4-a716-446655440020'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440006'::uuid,
    '2026-01-08 08:00:00+00',
    'Denver City Park - North Section',
    'Morning mowing route started'
  ),
  (
    '5c0e8400-e29b-41d4-a716-446655440021'::uuid,
    'aa0e8400-e29b-41d4-a716-446655440021'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440006'::uuid,
    '2026-01-08 11:00:00+00',
    'Boulder Mountain Parks',
    'Tree removal job'
  ),
  
  -- Industrial forklift - warehouse operations
  (
    '5c0e8400-e29b-41d4-a716-446655440030'::uuid,
    'aa0e8400-e29b-41d4-a716-446655440030'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440007'::uuid,
    '2026-01-08 15:00:00+00',
    'Chicago DC - Loading Dock 3',
    'Shift start inspection'
  ),
  (
    '5c0e8400-e29b-41d4-a716-446655440031'::uuid,
    'aa0e8400-e29b-41d4-a716-446655440030'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440008'::uuid,
    '2026-01-08 15:45:00+00',
    'Chicago DC - Aisle 14',
    NULL
  ),
  (
    '5c0e8400-e29b-41d4-a716-446655440032'::uuid,
    'aa0e8400-e29b-41d4-a716-446655440031'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440008'::uuid,
    '2026-01-08 08:00:00+00',
    'Detroit Auto Plant',
    'Morning shift check'
  )
ON CONFLICT (id) DO NOTHING;
