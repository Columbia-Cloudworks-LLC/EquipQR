-- =====================================================
-- EquipQR Seed Data - Inventory Items
-- =====================================================
-- Parts and supplies with varied stock levels for testing
-- Includes: normal stock, low stock, out of stock, no SKU items

INSERT INTO public.inventory_items (
  id,
  organization_id,
  name,
  description,
  sku,
  quantity_on_hand,
  low_stock_threshold,
  location,
  default_unit_cost,
  created_by,
  created_at,
  updated_at
) VALUES
  -- Apex Construction Inventory
  (
    'a20e8400-e29b-41d4-a716-446655440001'::uuid,
    '660e8400-e29b-41d4-a716-446655440000'::uuid,
    'Hydraulic Oil 15W-40 (5 Gal)',
    'Heavy duty hydraulic fluid for excavators and dozers',
    'HYD-OIL-15W40-5G',
    24,
    10,
    'Warehouse A - Shelf 1',
    89.99,
    'bb0e8400-e29b-41d4-a716-446655440001'::uuid,
    '2025-06-01 00:00:00+00',
    '2026-01-05 00:00:00+00'
  ),
  (
    'a20e8400-e29b-41d4-a716-446655440002'::uuid,
    '660e8400-e29b-41d4-a716-446655440000'::uuid,
    'Air Filter - Heavy Equipment',
    'Fits CAT 320, John Deere 850L, and similar',
    'AF-HVY-CAT320',
    3,  -- LOW STOCK (below threshold of 5)
    5,
    'Warehouse A - Shelf 2',
    45.00,
    'bb0e8400-e29b-41d4-a716-446655440001'::uuid,
    '2025-06-01 00:00:00+00',
    '2026-01-07 00:00:00+00'
  ),
  (
    'a20e8400-e29b-41d4-a716-446655440003'::uuid,
    '660e8400-e29b-41d4-a716-446655440000'::uuid,
    'Excavator Track Shoes (Set of 10)',
    'Replacement track shoes for CAT 320 series',
    'TRK-SHOE-CAT320-10',
    0,  -- OUT OF STOCK
    4,
    'Warehouse B - Heavy Parts',
    1250.00,
    'bb0e8400-e29b-41d4-a716-446655440001'::uuid,
    '2025-06-01 00:00:00+00',
    '2026-01-02 00:00:00+00'
  ),
  (
    'a20e8400-e29b-41d4-a716-446655440004'::uuid,
    '660e8400-e29b-41d4-a716-446655440000'::uuid,
    'Fuel Filter - Diesel',
    'Universal diesel fuel filter',
    'FF-DIESEL-UNI',
    18,
    8,
    'Warehouse A - Shelf 3',
    22.50,
    'bb0e8400-e29b-41d4-a716-446655440002'::uuid,
    '2025-08-15 00:00:00+00',
    '2026-01-06 00:00:00+00'
  ),
  (
    'a20e8400-e29b-41d4-a716-446655440005'::uuid,
    '660e8400-e29b-41d4-a716-446655440000'::uuid,
    'LED Panel - Light Tower',
    'Replacement LED panel for Atlas Copco PLT-800',
    NULL,  -- NO SKU (testing optional field)
    2,  -- LOW STOCK
    3,
    'Warehouse A - Electrical',
    350.00,
    'bb0e8400-e29b-41d4-a716-446655440002'::uuid,
    '2025-09-01 00:00:00+00',
    '2026-01-05 00:00:00+00'
  ),
  
  -- Metro Equipment Inventory
  (
    'a20e8400-e29b-41d4-a716-446655440010'::uuid,
    '660e8400-e29b-41d4-a716-446655440001'::uuid,
    'Hydraulic Seal Kit - Boom Lift',
    'Complete cylinder seal kit for JLG 450AJ',
    'HSK-JLG-450AJ',
    8,
    4,
    'Bay 3 - Parts Cabinet',
    185.00,
    'bb0e8400-e29b-41d4-a716-446655440004'::uuid,
    '2025-05-01 00:00:00+00',
    '2026-01-04 00:00:00+00'
  ),
  (
    'a20e8400-e29b-41d4-a716-446655440011'::uuid,
    '660e8400-e29b-41d4-a716-446655440001'::uuid,
    'Scissor Lift Cylinder Seal',
    'Hydraulic cylinder seal for Genie GS-2669',
    'CYL-SEAL-GS2669',
    0,  -- OUT OF STOCK (needed for WO)
    2,
    'Bay 3 - Parts Cabinet',
    95.00,
    'bb0e8400-e29b-41d4-a716-446655440004'::uuid,
    '2025-05-01 00:00:00+00',
    '2025-12-20 00:00:00+00'
  ),
  (
    'a20e8400-e29b-41d4-a716-446655440012'::uuid,
    '660e8400-e29b-41d4-a716-446655440001'::uuid,
    'Skid Steer Bucket Teeth (Set of 5)',
    'Replacement teeth for Bobcat S650 bucket',
    'BKT-TEETH-BOB-5',
    15,
    5,
    'Bay 2 - Ground Level',
    125.00,
    'bb0e8400-e29b-41d4-a716-446655440004'::uuid,
    '2025-07-01 00:00:00+00',
    '2026-01-03 00:00:00+00'
  ),
  
  -- Valley Landscaping Inventory
  (
    'a20e8400-e29b-41d4-a716-446655440020'::uuid,
    '660e8400-e29b-41d4-a716-446655440002'::uuid,
    'Mower Blade Set - 60 inch',
    'Set of 3 blades for John Deere Z930M',
    'BLADE-JD-Z930-60',
    4,
    2,
    'Tool Room - Wall Rack',
    89.00,
    'bb0e8400-e29b-41d4-a716-446655440006'::uuid,
    '2025-03-01 00:00:00+00',
    '2026-01-02 00:00:00+00'
  ),
  (
    'a20e8400-e29b-41d4-a716-446655440021'::uuid,
    '660e8400-e29b-41d4-a716-446655440002'::uuid,
    'Chainsaw Chain - 20 inch',
    'Replacement chain for Stihl MS 500i',
    'CHAIN-STL-20',
    6,
    3,
    'Tool Room - Cabinet',
    35.00,
    'bb0e8400-e29b-41d4-a716-446655440006'::uuid,
    '2025-03-01 00:00:00+00',
    '2025-12-15 00:00:00+00'
  ),
  
  -- Industrial Rentals Inventory
  (
    'a20e8400-e29b-41d4-a716-446655440030'::uuid,
    '660e8400-e29b-41d4-a716-446655440003'::uuid,
    'Forklift Battery - Industrial',
    '48V industrial battery for Toyota 8FGU25',
    'BATT-IND-48V-TOY',
    2,
    1,
    'Dock A - Battery Storage',
    2850.00,
    'bb0e8400-e29b-41d4-a716-446655440007'::uuid,
    '2025-04-01 00:00:00+00',
    '2026-01-07 00:00:00+00'
  ),
  (
    'a20e8400-e29b-41d4-a716-446655440031'::uuid,
    '660e8400-e29b-41d4-a716-446655440003'::uuid,
    'Pallet Jack Wheels - Polyurethane',
    'Front wheel set for Crown WP 3000',
    'WHEEL-PJ-POLY-2',
    10,
    4,
    'Dock B - Parts Shelf',
    145.00,
    'bb0e8400-e29b-41d4-a716-446655440007'::uuid,
    '2025-04-01 00:00:00+00',
    '2026-01-03 00:00:00+00'
  ),
  (
    'a20e8400-e29b-41d4-a716-446655440032'::uuid,
    '660e8400-e29b-41d4-a716-446655440003'::uuid,
    'Compressor Air Filter',
    'Air filter for Ingersoll Rand P185',
    'AF-IR-P185',
    5,
    3,
    'Staging Area - Rack 2',
    55.00,
    'bb0e8400-e29b-41d4-a716-446655440007'::uuid,
    '2025-06-01 00:00:00+00',
    '2025-12-20 00:00:00+00'
  )
ON CONFLICT (id) DO NOTHING;
