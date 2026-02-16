-- =====================================================
-- EquipQR Seed Data - Work Order Notes
-- =====================================================
-- Notes and progress updates on work orders

INSERT INTO public.work_order_notes (
  id,
  work_order_id,
  author_id,
  content,
  hours_worked,
  is_private,
  created_at,
  updated_at
) VALUES
  -- Notes on CAT Excavator Oil Change (in_progress)
  (
    'a10e8400-e29b-41d4-a716-446655440001'::uuid,
    'a00e8400-e29b-41d4-a716-446655440001'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440003'::uuid,
    'Started work. Draining old oil now. Will need about 15 gallons of 15W-40.',
    1.5,
    false,
    '2026-01-08 09:00:00+00',
    '2026-01-08 09:00:00+00'
  ),
  (
    'a10e8400-e29b-41d4-a716-446655440002'::uuid,
    'a00e8400-e29b-41d4-a716-446655440001'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440002'::uuid,
    'Customer called - needs this done by end of day Friday. Prioritize.',
    0,
    true,  -- Private note (admin only)
    '2026-01-08 10:30:00+00',
    '2026-01-08 10:30:00+00'
  ),
  -- Notes on Light Tower (on_hold)
  (
    'a10e8400-e29b-41d4-a716-446655440003'::uuid,
    'a00e8400-e29b-41d4-a716-446655440003'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440003'::uuid,
    'Ordered replacement LED panels from supplier. ETA 5 business days.',
    0.5,
    false,
    '2026-01-05 11:00:00+00',
    '2026-01-05 11:00:00+00'
  ),
  -- Notes on completed Track Tension work order
  (
    'a10e8400-e29b-41d4-a716-446655440004'::uuid,
    'a00e8400-e29b-41d4-a716-446655440004'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440003'::uuid,
    'Adjusted track tension on both sides. Left track was 15% loose. All within spec now.',
    2.5,
    false,
    '2025-12-18 14:00:00+00',
    '2025-12-18 14:00:00+00'
  ),
  (
    'a10e8400-e29b-41d4-a716-446655440005'::uuid,
    'a00e8400-e29b-41d4-a716-446655440004'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440003'::uuid,
    'Final inspection complete. Tracks are holding proper tension under load.',
    1.0,
    false,
    '2025-12-18 16:00:00+00',
    '2025-12-18 16:00:00+00'
  ),
  -- Notes on Boom Lift Certification (Metro)
  (
    'a10e8400-e29b-41d4-a716-446655440010'::uuid,
    'a00e8400-e29b-41d4-a716-446655440011'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440005'::uuid,
    'Completed structural inspection. No cracks or damage found. Moving to hydraulic testing.',
    3.0,
    false,
    '2026-01-07 14:00:00+00',
    '2026-01-07 14:00:00+00'
  ),
  -- Notes on Forklift Battery (Industrial)
  (
    'a10e8400-e29b-41d4-a716-446655440020'::uuid,
    'a00e8400-e29b-41d4-a716-446655440030'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440004'::uuid,
    'New battery arrived. Will install this afternoon.',
    0,
    false,
    '2026-01-08 09:00:00+00',
    '2026-01-08 09:00:00+00'
  )
ON CONFLICT (id) DO NOTHING;
