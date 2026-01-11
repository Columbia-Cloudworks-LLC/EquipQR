-- =====================================================
-- EquipQR Seed Data - Equipment Notes
-- =====================================================
-- Comments and notes on equipment

INSERT INTO public.equipment_notes (
  id,
  equipment_id,
  author_id,
  content,
  is_private,
  created_at,
  updated_at
) VALUES
  -- CAT 320 Excavator notes
  (
    'e00e8400-e29b-41d4-a716-446655440001'::uuid,
    'aa0e8400-e29b-41d4-a716-446655440000'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440001'::uuid,
    'This unit runs hot in summer months. Monitor coolant temp closely when ambient is above 95°F.',
    false,
    '2025-07-15 10:00:00+00',
    '2025-07-15 10:00:00+00'
  ),
  (
    'e00e8400-e29b-41d4-a716-446655440002'::uuid,
    'aa0e8400-e29b-41d4-a716-446655440000'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440003'::uuid,
    'Replaced alternator belt on 12/10. Should last another 2000 hours.',
    false,
    '2025-12-10 14:00:00+00',
    '2025-12-10 14:00:00+00'
  ),
  -- John Deere Dozer notes
  (
    'e00e8400-e29b-41d4-a716-446655440003'::uuid,
    'aa0e8400-e29b-41d4-a716-446655440001'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440002'::uuid,
    'Internal note: Check for manufacturer recall on hydraulic lines. Bulletin #JD-2025-0043.',
    true,  -- Private note
    '2025-11-20 09:00:00+00',
    '2025-11-20 09:00:00+00'
  ),
  -- Light Tower notes
  (
    'e00e8400-e29b-41d4-a716-446655440004'::uuid,
    'aa0e8400-e29b-41d4-a716-446655440003'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440003'::uuid,
    'Mast extends slowly. Needs hydraulic fluid top-off and possible pump inspection.',
    false,
    '2025-12-28 11:00:00+00',
    '2025-12-28 11:00:00+00'
  ),
  -- Boom Lift notes (Metro)
  (
    'e00e8400-e29b-41d4-a716-446655440005'::uuid,
    'aa0e8400-e29b-41d4-a716-446655440011'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440004'::uuid,
    'Popular rental unit. Keep in top condition - high revenue generator.',
    true,  -- Private note
    '2025-10-15 08:00:00+00',
    '2025-10-15 08:00:00+00'
  ),
  (
    'e00e8400-e29b-41d4-a716-446655440006'::uuid,
    'aa0e8400-e29b-41d4-a716-446655440011'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440005'::uuid,
    'Customer reported minor drift when platform fully extended. Checked - within spec but monitor.',
    false,
    '2025-12-01 15:00:00+00',
    '2025-12-01 15:00:00+00'
  ),
  -- Forklift notes (Industrial)
  (
    'e00e8400-e29b-41d4-a716-446655440007'::uuid,
    'aa0e8400-e29b-41d4-a716-446655440030'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440007'::uuid,
    'Primary warehouse forklift. Battery replaced Jan 2026. Next replacement due ~Jan 2029.',
    false,
    '2026-01-08 10:00:00+00',
    '2026-01-08 10:00:00+00'
  )
ON CONFLICT (id) DO NOTHING;
