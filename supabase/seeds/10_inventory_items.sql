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
  ),

  -- =====================================================
  -- EXPANDED INVENTORY - Parts for Additional Equipment
  -- =====================================================

  -- Apex Construction: Parts for Komatsu Excavator
  (
    'a20e8400-e29b-41d4-a716-446655440040'::uuid,
    '660e8400-e29b-41d4-a716-446655440000'::uuid,
    'Komatsu Excavator Air Filter',
    'Primary air filter for Komatsu PC210 series',
    'AF-KMT-PC210',
    6,
    3,
    'Warehouse A - Shelf 2',
    78.50,
    'bb0e8400-e29b-41d4-a716-446655440001'::uuid,
    '2025-06-15 00:00:00+00',
    '2026-01-05 00:00:00+00'
  ),
  (
    'a20e8400-e29b-41d4-a716-446655440041'::uuid,
    '660e8400-e29b-41d4-a716-446655440000'::uuid,
    'Excavator Hydraulic Pump Seal Kit',
    'Complete seal kit for CAT/Komatsu hydraulic pumps',
    'HSK-EXC-PUMP',
    4,
    2,
    'Warehouse B - Heavy Parts',
    245.00,
    'bb0e8400-e29b-41d4-a716-446655440001'::uuid,
    '2025-07-01 00:00:00+00',
    '2026-01-03 00:00:00+00'
  ),
  (
    'a20e8400-e29b-41d4-a716-446655440042'::uuid,
    '660e8400-e29b-41d4-a716-446655440000'::uuid,
    'Dozer Track Roller',
    'Replacement track roller for John Deere 700K/850L',
    'TRK-ROLL-JD-700',
    2,  -- LOW STOCK
    4,
    'Warehouse B - Heavy Parts',
    425.00,
    'bb0e8400-e29b-41d4-a716-446655440002'::uuid,
    '2025-08-01 00:00:00+00',
    '2026-01-02 00:00:00+00'
  ),

  -- Metro Equipment: Parts for Rental Fleet
  (
    'a20e8400-e29b-41d4-a716-446655440050'::uuid,
    '660e8400-e29b-41d4-a716-446655440001'::uuid,
    'Bobcat S770 Hydraulic Filter',
    'Hydraulic filter for Bobcat S650/S770 skid steers',
    'HF-BOB-S770',
    8,
    4,
    'Bay 3 - Parts Cabinet',
    65.00,
    'bb0e8400-e29b-41d4-a716-446655440004'::uuid,
    '2025-05-15 00:00:00+00',
    '2026-01-04 00:00:00+00'
  ),
  (
    'a20e8400-e29b-41d4-a716-446655440051'::uuid,
    '660e8400-e29b-41d4-a716-446655440001'::uuid,
    'Genie Scissor Lift Battery',
    '6V deep cycle battery for Genie GS-1930/GS-2669',
    'BATT-GEN-6V',
    4,
    2,
    'Bay 2 - Battery Storage',
    189.00,
    'bb0e8400-e29b-41d4-a716-446655440004'::uuid,
    '2025-06-01 00:00:00+00',
    '2026-01-06 00:00:00+00'
  ),
  (
    'a20e8400-e29b-41d4-a716-446655440052'::uuid,
    '660e8400-e29b-41d4-a716-446655440001'::uuid,
    'JLG Boom Lift Hydraulic Hose',
    'High pressure hydraulic hose for JLG 450AJ/600S',
    'HH-JLG-BOOM',
    6,
    3,
    'Bay 3 - Parts Cabinet',
    125.00,
    'bb0e8400-e29b-41d4-a716-446655440005'::uuid,
    '2025-07-01 00:00:00+00',
    '2026-01-05 00:00:00+00'
  ),
  (
    'a20e8400-e29b-41d4-a716-446655440053'::uuid,
    '660e8400-e29b-41d4-a716-446655440001'::uuid,
    'Snorkel Boom Lift Control Cable',
    'Drive/steer control cable for Snorkel TB42J',
    'CC-SNK-TB42',
    3,
    2,
    'Bay 3 - Parts Cabinet',
    98.50,
    'bb0e8400-e29b-41d4-a716-446655440005'::uuid,
    '2025-08-01 00:00:00+00',
    '2026-01-03 00:00:00+00'
  ),

  -- Valley Landscaping: Parts for Grounds Equipment
  (
    'a20e8400-e29b-41d4-a716-446655440060'::uuid,
    '660e8400-e29b-41d4-a716-446655440002'::uuid,
    'Kubota RTV Oil Filter',
    'Engine oil filter for Kubota RTV-X series',
    'OF-KUB-RTV',
    10,
    4,
    'Tool Room - Cabinet',
    18.50,
    'bb0e8400-e29b-41d4-a716-446655440006'::uuid,
    '2025-04-01 00:00:00+00',
    '2026-01-02 00:00:00+00'
  ),
  (
    'a20e8400-e29b-41d4-a716-446655440061'::uuid,
    '660e8400-e29b-41d4-a716-446655440002'::uuid,
    'Husqvarna Chainsaw Bar & Chain',
    '24 inch bar and chain combo for Husqvarna 572 XP',
    'BC-HUSQ-24',
    2,  -- LOW STOCK
    3,
    'Tool Room - Wall Rack',
    145.00,
    'bb0e8400-e29b-41d4-a716-446655440006'::uuid,
    '2025-04-15 00:00:00+00',
    '2026-01-04 00:00:00+00'
  ),
  (
    'a20e8400-e29b-41d4-a716-446655440062'::uuid,
    '660e8400-e29b-41d4-a716-446655440002'::uuid,
    'Mower Spindle Assembly',
    'Complete spindle assembly for John Deere Z930M',
    'SPIN-JD-Z930',
    1,  -- CRITICAL LOW
    2,
    'Tool Room - Parts Shelf',
    289.00,
    'bb0e8400-e29b-41d4-a716-446655440006'::uuid,
    '2025-05-01 00:00:00+00',
    '2026-01-07 00:00:00+00'
  ),

  -- Industrial Rentals: Parts for Warehouse Equipment
  (
    'a20e8400-e29b-41d4-a716-446655440070'::uuid,
    '660e8400-e29b-41d4-a716-446655440003'::uuid,
    'Hyster Forklift Propane Regulator',
    'LPG regulator for Hyster H50FT',
    'REG-HYS-LPG',
    3,
    2,
    'Dock C - Parts Shelf',
    156.00,
    'bb0e8400-e29b-41d4-a716-446655440007'::uuid,
    '2025-05-01 00:00:00+00',
    '2026-01-05 00:00:00+00'
  ),
  (
    'a20e8400-e29b-41d4-a716-446655440071'::uuid,
    '660e8400-e29b-41d4-a716-446655440003'::uuid,
    'Crown Forklift Charger',
    '48V battery charger for Crown FC series',
    'CHG-CRN-48V',
    1,
    1,
    'Dock A - Charging Station',
    1450.00,
    'bb0e8400-e29b-41d4-a716-446655440007'::uuid,
    '2025-06-01 00:00:00+00',
    '2026-01-03 00:00:00+00'
  ),
  (
    'a20e8400-e29b-41d4-a716-446655440072'::uuid,
    '660e8400-e29b-41d4-a716-446655440003'::uuid,
    'Forklift Mast Chain',
    'Replacement mast chain for Toyota/Hyster forklifts',
    'MC-FORK-UNI',
    4,
    2,
    'Dock A - Parts Shelf',
    385.00,
    'bb0e8400-e29b-41d4-a716-446655440007'::uuid,
    '2025-07-01 00:00:00+00',
    '2026-01-06 00:00:00+00'
  ),
  (
    'a20e8400-e29b-41d4-a716-446655440073'::uuid,
    '660e8400-e29b-41d4-a716-446655440003'::uuid,
    'Forklift Seat Cushion',
    'Universal replacement seat cushion',
    'SEAT-FORK-UNI',
    6,
    3,
    'Staging Area - Rack 1',
    89.00,
    'bb0e8400-e29b-41d4-a716-446655440008'::uuid,
    '2025-08-01 00:00:00+00',
    '2026-01-02 00:00:00+00'
  ),

  -- Mike's Repair Shop: Parts for Shop Equipment
  (
    'a20e8400-e29b-41d4-a716-446655440080'::uuid,
    '660e8400-e29b-41d4-a716-446655440006'::uuid,
    'Sullair Compressor Oil',
    '5 gallon synthetic compressor oil for Sullair 185',
    'OIL-SULL-5G',
    3,
    2,
    'Shop Bay 1 - Shelf',
    125.00,
    'bb0e8400-e29b-41d4-a716-446655440005'::uuid,
    '2025-03-01 00:00:00+00',
    '2026-01-04 00:00:00+00'
  ),
  (
    'a20e8400-e29b-41d4-a716-446655440081'::uuid,
    '660e8400-e29b-41d4-a716-446655440006'::uuid,
    'Lincoln Welder Electrode Holder',
    'Replacement electrode holder for Lincoln Ranger 225',
    'EH-LINC-225',
    2,
    2,
    'Shop Bay 2 - Tool Box',
    45.00,
    'bb0e8400-e29b-41d4-a716-446655440005'::uuid,
    '2025-04-01 00:00:00+00',
    '2026-01-05 00:00:00+00'
  ),
  (
    'a20e8400-e29b-41d4-a716-446655440082'::uuid,
    '660e8400-e29b-41d4-a716-446655440006'::uuid,
    'Milwaukee Diamond Blade 14"',
    'Diamond cutting blade for Milwaukee MX FUEL saw',
    'DB-MILW-14',
    4,
    2,
    'Tool Storage',
    189.00,
    'bb0e8400-e29b-41d4-a716-446655440005'::uuid,
    '2025-05-01 00:00:00+00',
    '2026-01-06 00:00:00+00'
  ),

  -- Tom's Field Services: Parts for Field Equipment
  (
    'a20e8400-e29b-41d4-a716-446655440090'::uuid,
    '660e8400-e29b-41d4-a716-446655440005'::uuid,
    'Doosan Compressor Separator',
    'Oil/air separator element for Doosan P185',
    'SEP-DSN-P185',
    2,
    2,
    'Field Trailer - Parts Box',
    165.00,
    'bb0e8400-e29b-41d4-a716-446655440003'::uuid,
    '2025-06-01 00:00:00+00',
    '2026-01-03 00:00:00+00'
  ),
  (
    'a20e8400-e29b-41d4-a716-446655440091'::uuid,
    '660e8400-e29b-41d4-a716-446655440005'::uuid,
    'Vermeer Mini Skid Steer Tracks',
    'Rubber tracks for Vermeer S800TX',
    'TRK-VER-S800',
    0,  -- OUT OF STOCK
    1,
    'Field Trailer - Parts Box',
    895.00,
    'bb0e8400-e29b-41d4-a716-446655440003'::uuid,
    '2025-07-01 00:00:00+00',
    '2025-12-15 00:00:00+00'
  )
ON CONFLICT (id) DO NOTHING;
