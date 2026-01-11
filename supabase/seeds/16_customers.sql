-- =====================================================
-- EquipQR Seed Data - Customers (For Industrial Rentals)
-- =====================================================
-- Customer records for the rental business scenario

INSERT INTO public.customers (
  id,
  organization_id,
  name,
  status,
  created_at
) VALUES
  (
    'c00e8400-e29b-41d4-a716-446655440001'::uuid,
    '660e8400-e29b-41d4-a716-446655440003'::uuid,
    'ABC Construction Co',
    'active',
    '2025-03-15 00:00:00+00'
  ),
  (
    'c00e8400-e29b-41d4-a716-446655440002'::uuid,
    '660e8400-e29b-41d4-a716-446655440003'::uuid,
    'Metro Builders LLC',
    'active',
    '2025-04-01 00:00:00+00'
  ),
  (
    'c00e8400-e29b-41d4-a716-446655440003'::uuid,
    '660e8400-e29b-41d4-a716-446655440003'::uuid,
    'Lakeside Development Group',
    'active',
    '2025-06-15 00:00:00+00'
  ),
  (
    'c00e8400-e29b-41d4-a716-446655440004'::uuid,
    '660e8400-e29b-41d4-a716-446655440003'::uuid,
    'Inactive Customer Inc',
    'inactive',
    '2024-08-01 00:00:00+00'
  )
ON CONFLICT (id) DO NOTHING;
