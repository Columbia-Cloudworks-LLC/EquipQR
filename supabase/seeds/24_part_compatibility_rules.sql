-- =====================================================
-- EquipQR Seed Data - Part Compatibility Rules
-- =====================================================
-- Links inventory parts to equipment by manufacturer/model patterns
-- These rules determine which parts are suggested for equipment in:
--   - Work order part picker
--   - Part Lookup page (By Make/Model tab)
--
-- Organization IDs:
--   Apex Construction: 660e8400-e29b-41d4-a716-446655440000
--   Metro Equipment:   660e8400-e29b-41d4-a716-446655440001
--   Valley Landscaping: 660e8400-e29b-41d4-a716-446655440002
--   Industrial:        660e8400-e29b-41d4-a716-446655440003
--
-- Match Types:
--   'any'    - Matches any model from the manufacturer
--   'exact'  - Matches specific model exactly
--   'prefix' - Matches models starting with pattern
-- =====================================================

INSERT INTO public.part_compatibility_rules (
  inventory_item_id,
  manufacturer,
  model,
  manufacturer_norm,
  model_norm,
  match_type,
  model_pattern_raw,
  model_pattern_norm,
  status,
  notes,
  created_by
) VALUES
  -- =====================================================
  -- APEX CONSTRUCTION COMPANY RULES
  -- Equipment: Caterpillar 320 GC, John Deere 850L/700K, 
  --            Generac G3500/XG7500E, Atlas Copco PLT-800, 
  --            Komatsu PC210LC-11
  -- =====================================================

  -- Hydraulic Oil 15W-40 (a20e8400...0001) - Universal for heavy equipment
  (
    'a20e8400-e29b-41d4-a716-446655440001'::uuid,
    'Caterpillar',
    NULL,
    'caterpillar',
    NULL,
    'any'::model_match_type,
    NULL,
    NULL,
    'verified'::verification_status,
    'Standard hydraulic fluid for all CAT excavators and dozers',
    'bb0e8400-e29b-41d4-a716-446655440001'::uuid
  ),
  (
    'a20e8400-e29b-41d4-a716-446655440001'::uuid,
    'John Deere',
    NULL,
    'john deere',
    NULL,
    'any'::model_match_type,
    NULL,
    NULL,
    'verified'::verification_status,
    'Standard hydraulic fluid for all John Deere equipment',
    'bb0e8400-e29b-41d4-a716-446655440001'::uuid
  ),
  (
    'a20e8400-e29b-41d4-a716-446655440001'::uuid,
    'Komatsu',
    NULL,
    'komatsu',
    NULL,
    'any'::model_match_type,
    NULL,
    NULL,
    'verified'::verification_status,
    'Standard hydraulic fluid for all Komatsu excavators',
    'bb0e8400-e29b-41d4-a716-446655440001'::uuid
  ),

  -- Air Filter - Heavy Equipment (a20e8400...0002) - Specific models
  (
    'a20e8400-e29b-41d4-a716-446655440002'::uuid,
    'Caterpillar',
    '320 GC',
    'caterpillar',
    '320 gc',
    'exact'::model_match_type,
    NULL,
    NULL,
    'verified'::verification_status,
    'OEM replacement air filter for CAT 320 GC',
    'bb0e8400-e29b-41d4-a716-446655440001'::uuid
  ),
  (
    'a20e8400-e29b-41d4-a716-446655440002'::uuid,
    'John Deere',
    '850L',
    'john deere',
    '850l',
    'exact'::model_match_type,
    NULL,
    NULL,
    'verified'::verification_status,
    'Compatible filter for JD 850L dozer',
    'bb0e8400-e29b-41d4-a716-446655440001'::uuid
  ),

  -- Excavator Track Shoes (a20e8400...0003) - CAT 320 series (prefix match)
  (
    'a20e8400-e29b-41d4-a716-446655440003'::uuid,
    'Caterpillar',
    '320',
    'caterpillar',
    NULL,
    'prefix'::model_match_type,
    '320',
    '320',
    'verified'::verification_status,
    'Fits all CAT 320 series excavators (320, 320 GC, 320D, etc.)',
    'bb0e8400-e29b-41d4-a716-446655440001'::uuid
  ),

  -- Fuel Filter - Diesel (a20e8400...0004) - Universal diesel equipment
  (
    'a20e8400-e29b-41d4-a716-446655440004'::uuid,
    'Caterpillar',
    NULL,
    'caterpillar',
    NULL,
    'any'::model_match_type,
    NULL,
    NULL,
    'unverified'::verification_status,
    'Universal diesel filter - verify compatibility before use',
    'bb0e8400-e29b-41d4-a716-446655440001'::uuid
  ),
  (
    'a20e8400-e29b-41d4-a716-446655440004'::uuid,
    'John Deere',
    NULL,
    'john deere',
    NULL,
    'any'::model_match_type,
    NULL,
    NULL,
    'unverified'::verification_status,
    NULL,
    'bb0e8400-e29b-41d4-a716-446655440001'::uuid
  ),
  (
    'a20e8400-e29b-41d4-a716-446655440004'::uuid,
    'Komatsu',
    NULL,
    'komatsu',
    NULL,
    'any'::model_match_type,
    NULL,
    NULL,
    'unverified'::verification_status,
    NULL,
    'bb0e8400-e29b-41d4-a716-446655440001'::uuid
  ),

  -- LED Panel - Light Tower (a20e8400...0005) - Atlas Copco PLT-800 specific
  (
    'a20e8400-e29b-41d4-a716-446655440005'::uuid,
    'Atlas Copco',
    'PLT-800',
    'atlas copco',
    'plt-800',
    'exact'::model_match_type,
    NULL,
    NULL,
    'verified'::verification_status,
    'OEM LED replacement panel for PLT-800 light tower',
    'bb0e8400-e29b-41d4-a716-446655440001'::uuid
  ),

  -- Komatsu Excavator Air Filter (a20e8400...0040) - PC210 series
  (
    'a20e8400-e29b-41d4-a716-446655440040'::uuid,
    'Komatsu',
    'PC210',
    'komatsu',
    NULL,
    'prefix'::model_match_type,
    'PC210',
    'pc210',
    'verified'::verification_status,
    'Fits all Komatsu PC210 series (PC210LC-11, PC210-11, etc.)',
    'bb0e8400-e29b-41d4-a716-446655440001'::uuid
  ),

  -- Excavator Hydraulic Pump Seal Kit (a20e8400...0041) - CAT and Komatsu
  (
    'a20e8400-e29b-41d4-a716-446655440041'::uuid,
    'Caterpillar',
    NULL,
    'caterpillar',
    NULL,
    'any'::model_match_type,
    NULL,
    NULL,
    'unverified'::verification_status,
    'Aftermarket seal kit - verify pump model before use',
    'bb0e8400-e29b-41d4-a716-446655440001'::uuid
  ),
  (
    'a20e8400-e29b-41d4-a716-446655440041'::uuid,
    'Komatsu',
    NULL,
    'komatsu',
    NULL,
    'any'::model_match_type,
    NULL,
    NULL,
    'unverified'::verification_status,
    NULL,
    'bb0e8400-e29b-41d4-a716-446655440001'::uuid
  ),

  -- Dozer Track Roller (a20e8400...0042) - John Deere 700K and 850L
  (
    'a20e8400-e29b-41d4-a716-446655440042'::uuid,
    'John Deere',
    '700K',
    'john deere',
    '700k',
    'exact'::model_match_type,
    NULL,
    NULL,
    'verified'::verification_status,
    'OEM replacement track roller',
    'bb0e8400-e29b-41d4-a716-446655440001'::uuid
  ),
  (
    'a20e8400-e29b-41d4-a716-446655440042'::uuid,
    'John Deere',
    '850L',
    'john deere',
    '850l',
    'exact'::model_match_type,
    NULL,
    NULL,
    'verified'::verification_status,
    'OEM replacement track roller',
    'bb0e8400-e29b-41d4-a716-446655440001'::uuid
  ),

  -- =====================================================
  -- METRO EQUIPMENT SERVICES RULES
  -- Equipment: Bobcat S650/S770, JLG 450AJ/600S, 
  --            Genie GS-2669/GS-1930, Snorkel TB42J
  -- =====================================================

  -- Hydraulic Seal Kit - Boom Lift (a20e8400...0010) - JLG specific
  (
    'a20e8400-e29b-41d4-a716-446655440010'::uuid,
    'JLG',
    '450AJ',
    'jlg',
    '450aj',
    'exact'::model_match_type,
    NULL,
    NULL,
    'verified'::verification_status,
    'Complete cylinder seal kit - verified fit',
    'bb0e8400-e29b-41d4-a716-446655440004'::uuid
  ),

  -- Scissor Lift Cylinder Seal (a20e8400...0011) - Genie GS-2669
  (
    'a20e8400-e29b-41d4-a716-446655440011'::uuid,
    'Genie',
    'GS-2669',
    'genie',
    'gs-2669',
    'exact'::model_match_type,
    NULL,
    NULL,
    'verified'::verification_status,
    'OEM hydraulic cylinder seal',
    'bb0e8400-e29b-41d4-a716-446655440004'::uuid
  ),

  -- Skid Steer Bucket Teeth (a20e8400...0012) - Bobcat S650
  (
    'a20e8400-e29b-41d4-a716-446655440012'::uuid,
    'Bobcat',
    'S650',
    'bobcat',
    's650',
    'exact'::model_match_type,
    NULL,
    NULL,
    'verified'::verification_status,
    'Standard replacement bucket teeth',
    'bb0e8400-e29b-41d4-a716-446655440004'::uuid
  ),

  -- Bobcat S770 Hydraulic Filter (a20e8400...0050) - Bobcat S series
  (
    'a20e8400-e29b-41d4-a716-446655440050'::uuid,
    'Bobcat',
    'S650',
    'bobcat',
    's650',
    'exact'::model_match_type,
    NULL,
    NULL,
    'verified'::verification_status,
    'Cross-compatible with S650 and S770',
    'bb0e8400-e29b-41d4-a716-446655440004'::uuid
  ),
  (
    'a20e8400-e29b-41d4-a716-446655440050'::uuid,
    'Bobcat',
    'S770',
    'bobcat',
    's770',
    'exact'::model_match_type,
    NULL,
    NULL,
    'verified'::verification_status,
    'OEM hydraulic filter',
    'bb0e8400-e29b-41d4-a716-446655440004'::uuid
  ),

  -- Genie Scissor Lift Battery (a20e8400...0051) - All Genie GS models
  (
    'a20e8400-e29b-41d4-a716-446655440051'::uuid,
    'Genie',
    'GS',
    'genie',
    NULL,
    'prefix'::model_match_type,
    'GS',
    'gs',
    'verified'::verification_status,
    'Universal battery for all Genie GS scissor lifts',
    'bb0e8400-e29b-41d4-a716-446655440004'::uuid
  ),

  -- JLG Boom Lift Hydraulic Hose (a20e8400...0052) - JLG boom lifts
  (
    'a20e8400-e29b-41d4-a716-446655440052'::uuid,
    'JLG',
    '450AJ',
    'jlg',
    '450aj',
    'exact'::model_match_type,
    NULL,
    NULL,
    'verified'::verification_status,
    'High pressure hose - verified fit',
    'bb0e8400-e29b-41d4-a716-446655440005'::uuid
  ),
  (
    'a20e8400-e29b-41d4-a716-446655440052'::uuid,
    'JLG',
    '600S',
    'jlg',
    '600s',
    'exact'::model_match_type,
    NULL,
    NULL,
    'verified'::verification_status,
    'High pressure hose - verified fit',
    'bb0e8400-e29b-41d4-a716-446655440005'::uuid
  ),

  -- Snorkel Boom Lift Control Cable (a20e8400...0053) - Snorkel TB42J
  (
    'a20e8400-e29b-41d4-a716-446655440053'::uuid,
    'Snorkel',
    'TB42J',
    'snorkel',
    'tb42j',
    'exact'::model_match_type,
    NULL,
    NULL,
    'verified'::verification_status,
    'OEM control cable replacement',
    'bb0e8400-e29b-41d4-a716-446655440005'::uuid
  ),

  -- =====================================================
  -- VALLEY LANDSCAPING RULES
  -- Equipment: John Deere Z930M, Stihl MS 500i, 
  --            Kubota B2650/RTV-X1140, Husqvarna 572 XP
  -- =====================================================

  -- Mower Blade Set (a20e8400...0020) - John Deere Z930M
  (
    'a20e8400-e29b-41d4-a716-446655440020'::uuid,
    'John Deere',
    'Z930M',
    'john deere',
    'z930m',
    'exact'::model_match_type,
    NULL,
    NULL,
    'verified'::verification_status,
    'OEM blade set for 60 inch deck',
    'bb0e8400-e29b-41d4-a716-446655440006'::uuid
  ),

  -- Kubota RTV Oil Filter (a20e8400...0060) - Kubota RTV series
  (
    'a20e8400-e29b-41d4-a716-446655440060'::uuid,
    'Kubota',
    'RTV',
    'kubota',
    NULL,
    'prefix'::model_match_type,
    'RTV',
    'rtv',
    'verified'::verification_status,
    'Fits all Kubota RTV utility vehicles',
    'bb0e8400-e29b-41d4-a716-446655440006'::uuid
  ),

  -- Mower Spindle Assembly (a20e8400...0062) - John Deere Z930M
  (
    'a20e8400-e29b-41d4-a716-446655440062'::uuid,
    'John Deere',
    'Z930M',
    'john deere',
    'z930m',
    'exact'::model_match_type,
    NULL,
    NULL,
    'verified'::verification_status,
    'Complete spindle assembly with bearings',
    'bb0e8400-e29b-41d4-a716-446655440006'::uuid
  ),

  -- =====================================================
  -- INDUSTRIAL RENTALS CORP RULES
  -- Equipment: Toyota 8FGU25, Crown WP 3000/FC5245, 
  --            Ingersoll Rand P185, Miller Trailblazer 325,
  --            Hyster H50FT
  -- =====================================================

  -- Forklift Battery - Industrial (a20e8400...0030) - Toyota 8FGU25
  (
    'a20e8400-e29b-41d4-a716-446655440030'::uuid,
    'Toyota',
    '8FGU25',
    'toyota',
    '8fgu25',
    'exact'::model_match_type,
    NULL,
    NULL,
    'verified'::verification_status,
    '48V industrial battery - OEM replacement',
    'bb0e8400-e29b-41d4-a716-446655440007'::uuid
  ),

  -- Pallet Jack Wheels (a20e8400...0031) - Crown WP 3000
  (
    'a20e8400-e29b-41d4-a716-446655440031'::uuid,
    'Crown',
    'WP 3000',
    'crown',
    'wp 3000',
    'exact'::model_match_type,
    NULL,
    NULL,
    'verified'::verification_status,
    'Polyurethane front wheel set',
    'bb0e8400-e29b-41d4-a716-446655440007'::uuid
  ),

  -- Compressor Air Filter (a20e8400...0032) - Ingersoll Rand P185
  (
    'a20e8400-e29b-41d4-a716-446655440032'::uuid,
    'Ingersoll Rand',
    'P185',
    'ingersoll rand',
    'p185',
    'exact'::model_match_type,
    NULL,
    NULL,
    'verified'::verification_status,
    'OEM air filter element',
    'bb0e8400-e29b-41d4-a716-446655440007'::uuid
  ),

  -- Hyster Forklift Propane Regulator (a20e8400...0070) - Hyster H50FT
  (
    'a20e8400-e29b-41d4-a716-446655440070'::uuid,
    'Hyster',
    'H50FT',
    'hyster',
    'h50ft',
    'exact'::model_match_type,
    NULL,
    NULL,
    'verified'::verification_status,
    'LPG regulator - verified fit',
    'bb0e8400-e29b-41d4-a716-446655440007'::uuid
  ),

  -- Crown Forklift Charger (a20e8400...0071) - All Crown electric forklifts
  (
    'a20e8400-e29b-41d4-a716-446655440071'::uuid,
    'Crown',
    NULL,
    'crown',
    NULL,
    'any'::model_match_type,
    NULL,
    NULL,
    'verified'::verification_status,
    '48V charger compatible with all Crown electric forklifts',
    'bb0e8400-e29b-41d4-a716-446655440007'::uuid
  ),

  -- Forklift Mast Chain (a20e8400...0072) - Toyota and Hyster
  (
    'a20e8400-e29b-41d4-a716-446655440072'::uuid,
    'Toyota',
    NULL,
    'toyota',
    NULL,
    'any'::model_match_type,
    NULL,
    NULL,
    'verified'::verification_status,
    'Universal mast chain for Toyota forklifts',
    'bb0e8400-e29b-41d4-a716-446655440007'::uuid
  ),
  (
    'a20e8400-e29b-41d4-a716-446655440072'::uuid,
    'Hyster',
    NULL,
    'hyster',
    NULL,
    'any'::model_match_type,
    NULL,
    NULL,
    'verified'::verification_status,
    'Universal mast chain for Hyster forklifts',
    'bb0e8400-e29b-41d4-a716-446655440007'::uuid
  ),

  -- Forklift Seat Cushion (a20e8400...0073) - Universal forklifts
  (
    'a20e8400-e29b-41d4-a716-446655440073'::uuid,
    'Toyota',
    NULL,
    'toyota',
    NULL,
    'any'::model_match_type,
    NULL,
    NULL,
    'unverified'::verification_status,
    'Universal seat - check dimensions before ordering',
    'bb0e8400-e29b-41d4-a716-446655440008'::uuid
  ),
  (
    'a20e8400-e29b-41d4-a716-446655440073'::uuid,
    'Hyster',
    NULL,
    'hyster',
    NULL,
    'any'::model_match_type,
    NULL,
    NULL,
    'unverified'::verification_status,
    'Universal seat - check dimensions before ordering',
    'bb0e8400-e29b-41d4-a716-446655440008'::uuid
  ),
  (
    'a20e8400-e29b-41d4-a716-446655440073'::uuid,
    'Crown',
    NULL,
    'crown',
    NULL,
    'any'::model_match_type,
    NULL,
    NULL,
    'unverified'::verification_status,
    'Universal seat - check dimensions before ordering',
    'bb0e8400-e29b-41d4-a716-446655440008'::uuid
  )
-- Note: Partial unique indexes prevent duplicates:
-- - idx_part_compat_rules_unique_with_model (for specific models)
-- - idx_part_compat_rules_unique_any_model (for "any model" rules)
;
