-- =====================================================
-- EquipQR Seed Data - Inventory Transactions (Audit Trail)
-- =====================================================
-- Stock movement history for inventory items

INSERT INTO public.inventory_transactions (
  id,
  inventory_item_id,
  organization_id,
  user_id,
  previous_quantity,
  new_quantity,
  change_amount,
  transaction_type,
  work_order_id,
  notes,
  created_at
) VALUES
  -- Hydraulic Oil transactions
  (
    'a30e8400-e29b-41d4-a716-446655440001'::uuid,
    'a20e8400-e29b-41d4-a716-446655440001'::uuid,
    '660e8400-e29b-41d4-a716-446655440000'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440001'::uuid,
    0,
    30,
    30,
    'initial',
    NULL,
    'Initial inventory setup',
    '2025-06-01 00:00:00+00'
  ),
  (
    'a30e8400-e29b-41d4-a716-446655440002'::uuid,
    'a20e8400-e29b-41d4-a716-446655440001'::uuid,
    '660e8400-e29b-41d4-a716-446655440000'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440003'::uuid,
    30,
    27,
    -3,
    'work_order',
    'a00e8400-e29b-41d4-a716-446655440004'::uuid,
    'Used for track tension work order',
    '2025-12-18 14:30:00+00'
  ),
  (
    'a30e8400-e29b-41d4-a716-446655440003'::uuid,
    'a20e8400-e29b-41d4-a716-446655440001'::uuid,
    '660e8400-e29b-41d4-a716-446655440000'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440003'::uuid,
    27,
    24,
    -3,
    'work_order',
    'a00e8400-e29b-41d4-a716-446655440001'::uuid,
    'Oil change in progress - CAT 320',
    '2026-01-08 09:30:00+00'
  ),
  -- Air Filter transactions (now low stock)
  (
    'a30e8400-e29b-41d4-a716-446655440004'::uuid,
    'a20e8400-e29b-41d4-a716-446655440002'::uuid,
    '660e8400-e29b-41d4-a716-446655440000'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440001'::uuid,
    0,
    10,
    10,
    'initial',
    NULL,
    'Initial inventory setup',
    '2025-06-01 00:00:00+00'
  ),
  (
    'a30e8400-e29b-41d4-a716-446655440005'::uuid,
    'a20e8400-e29b-41d4-a716-446655440002'::uuid,
    '660e8400-e29b-41d4-a716-446655440000'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440003'::uuid,
    10,
    3,
    -7,
    'usage',
    NULL,
    'Used for various equipment maintenance',
    '2026-01-07 11:00:00+00'
  ),
  -- Track shoes went to zero
  (
    'a30e8400-e29b-41d4-a716-446655440006'::uuid,
    'a20e8400-e29b-41d4-a716-446655440003'::uuid,
    '660e8400-e29b-41d4-a716-446655440000'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440001'::uuid,
    0,
    4,
    4,
    'initial',
    NULL,
    'Initial inventory setup',
    '2025-06-01 00:00:00+00'
  ),
  (
    'a30e8400-e29b-41d4-a716-446655440007'::uuid,
    'a20e8400-e29b-41d4-a716-446655440003'::uuid,
    '660e8400-e29b-41d4-a716-446655440000'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440003'::uuid,
    4,
    0,
    -4,
    'usage',
    NULL,
    'Used all track shoes - need to reorder',
    '2026-01-02 15:00:00+00'
  ),
  -- Metro: Pallet jack wheels usage
  (
    'a30e8400-e29b-41d4-a716-446655440010'::uuid,
    'a20e8400-e29b-41d4-a716-446655440031'::uuid,
    '660e8400-e29b-41d4-a716-446655440003'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440008'::uuid,
    12,
    10,
    -2,
    'work_order',
    'a00e8400-e29b-41d4-a716-446655440031'::uuid,
    'Replaced wheels on Crown pallet jack',
    '2026-01-03 14:00:00+00'
  )
ON CONFLICT (id) DO NOTHING;
