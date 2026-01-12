-- =====================================================
-- EquipQR Seed Data - Part Alternate Groups
-- =====================================================
-- Demonstrates part number interchangeability for technicians
-- Enables searching by OEM/aftermarket part numbers to find alternatives
--
-- Use Case: Technician searches "CAT-1R-0750" and finds:
--   - WIX alternative in stock
--   - Baldwin alternative to order
--   - Verification status for confidence
--
-- Organization IDs:
--   Apex Construction: 660e8400-e29b-41d4-a716-446655440000
--   Metro Equipment:   660e8400-e29b-41d4-a716-446655440001
--   Valley Landscaping: 660e8400-e29b-41d4-a716-446655440002
--   Industrial:        660e8400-e29b-41d4-a716-446655440003
--
-- User IDs (created_by):
--   owner@apex.test:      bb0e8400-e29b-41d4-a716-446655440001
--   admin@apex.test:      bb0e8400-e29b-41d4-a716-446655440002
--   owner@metro.test:     bb0e8400-e29b-41d4-a716-446655440004
--   owner@valley.test:    bb0e8400-e29b-41d4-a716-446655440006
--   owner@industrial.test: bb0e8400-e29b-41d4-a716-446655440007
-- =====================================================

-- =====================================================
-- PART 1: CREATE ALTERNATE GROUPS
-- =====================================================
-- UUID prefix: b30e8400 for alternate groups

INSERT INTO public.part_alternate_groups (
  id,
  organization_id,
  name,
  description,
  status,
  notes,
  evidence_url,
  created_by,
  verified_by,
  verified_at,
  created_at
) VALUES
  -- =====================================================
  -- APEX CONSTRUCTION GROUPS
  -- =====================================================
  (
    'b30e8400-e29b-41d4-a716-446655440001'::uuid,
    '660e8400-e29b-41d4-a716-446655440000'::uuid,
    'Oil Filter - CAT/Komatsu Heavy Equipment',
    'Interchangeable oil filters for Caterpillar and Komatsu excavators. Cross-referenced from manufacturer interchange guide.',
    'verified'::verification_status,
    'Verified using CAT Parts Cross-Reference Guide 2024 and field testing on CAT 320 GC. All filters meet OEM specifications for filtration and flow rate.',
    'https://parts.cat.com/cross-reference-guide',
    'bb0e8400-e29b-41d4-a716-446655440001'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440001'::uuid,
    '2025-11-15 00:00:00+00',
    '2025-10-01 00:00:00+00'
  ),
  (
    'b30e8400-e29b-41d4-a716-446655440002'::uuid,
    '660e8400-e29b-41d4-a716-446655440000'::uuid,
    'Air Filter - CAT 320 Series',
    'Primary air filters compatible with all CAT 320 series excavators. OEM and aftermarket options.',
    'verified'::verification_status,
    'Cross-referenced with Donaldson and Baldwin filter catalogs. Dimensions and filtration specs verified.',
    NULL,
    'bb0e8400-e29b-41d4-a716-446655440001'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440002'::uuid,
    '2025-12-01 00:00:00+00',
    '2025-11-01 00:00:00+00'
  ),
  (
    'b30e8400-e29b-41d4-a716-446655440003'::uuid,
    '660e8400-e29b-41d4-a716-446655440000'::uuid,
    'Fuel Filter - Universal Diesel',
    'Universal diesel fuel filters for heavy equipment. Unverified - use with caution.',
    'unverified'::verification_status,
    'Customer reported these work but not officially cross-referenced. Verify thread size before use.',
    NULL,
    'bb0e8400-e29b-41d4-a716-446655440002'::uuid,
    NULL,
    NULL,
    '2025-12-15 00:00:00+00'
  ),

  -- =====================================================
  -- METRO EQUIPMENT GROUPS
  -- =====================================================
  (
    'b30e8400-e29b-41d4-a716-446655440010'::uuid,
    '660e8400-e29b-41d4-a716-446655440001'::uuid,
    'Hydraulic Seal Kit - JLG Boom Lifts',
    'Cylinder seal kits for JLG articulating boom lifts. OEM and aftermarket equivalents.',
    'verified'::verification_status,
    'Verified on JLG 450AJ and 600S models. Aftermarket kits from Hercules and NOK are identical to OEM.',
    'https://www.jlg.com/parts-catalog',
    'bb0e8400-e29b-41d4-a716-446655440004'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440004'::uuid,
    '2025-10-20 00:00:00+00',
    '2025-09-15 00:00:00+00'
  ),
  (
    'b30e8400-e29b-41d4-a716-446655440011'::uuid,
    '660e8400-e29b-41d4-a716-446655440001'::uuid,
    'Battery - Genie Scissor Lifts',
    '6V deep cycle batteries for Genie electric scissor lifts. Multiple brands interchangeable.',
    'verified'::verification_status,
    'All batteries in this group are 6V, 225Ah, Group GC2 size. Tested on GS-1930 and GS-2669.',
    NULL,
    'bb0e8400-e29b-41d4-a716-446655440004'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440004'::uuid,
    '2025-11-10 00:00:00+00',
    '2025-10-01 00:00:00+00'
  ),
  (
    'b30e8400-e29b-41d4-a716-446655440012'::uuid,
    '660e8400-e29b-41d4-a716-446655440001'::uuid,
    'Hydraulic Filter - Bobcat Skid Steers',
    'Hydraulic filters for Bobcat S-series skid steers. Multiple aftermarket options available.',
    'unverified'::verification_status,
    'Technician reported these filters work. Waiting for official cross-reference confirmation.',
    NULL,
    'bb0e8400-e29b-41d4-a716-446655440005'::uuid,
    NULL,
    NULL,
    '2026-01-02 00:00:00+00'
  ),

  -- =====================================================
  -- INDUSTRIAL RENTALS GROUPS
  -- =====================================================
  (
    'b30e8400-e29b-41d4-a716-446655440020'::uuid,
    '660e8400-e29b-41d4-a716-446655440003'::uuid,
    'Forklift Battery - 48V Industrial',
    '48V industrial batteries for Toyota, Crown, and Hyster forklifts. Multiple brands compatible.',
    'verified'::verification_status,
    'All batteries meet BCI Group specifications. Verified fit on Toyota 8FGU25 and Crown FC5245.',
    'https://www.industrial-batteries.com/cross-reference',
    'bb0e8400-e29b-41d4-a716-446655440007'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440007'::uuid,
    '2025-08-15 00:00:00+00',
    '2025-07-01 00:00:00+00'
  ),
  (
    'b30e8400-e29b-41d4-a716-446655440021'::uuid,
    '660e8400-e29b-41d4-a716-446655440003'::uuid,
    'Air Filter - Ingersoll Rand P185 Compressor',
    'Air intake filters for IR P185 portable compressors. OEM and compatible aftermarket filters.',
    'verified'::verification_status,
    'Donaldson and Baldwin filters confirmed compatible by Ingersoll Rand service manual.',
    NULL,
    'bb0e8400-e29b-41d4-a716-446655440007'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440007'::uuid,
    '2025-12-10 00:00:00+00',
    '2025-11-20 00:00:00+00'
  ),

  -- =====================================================
  -- VALLEY LANDSCAPING GROUPS
  -- =====================================================
  (
    'b30e8400-e29b-41d4-a716-446655440030'::uuid,
    '660e8400-e29b-41d4-a716-446655440002'::uuid,
    'Oil Filter - Kubota Compact Equipment',
    'Engine oil filters for Kubota tractors and UTVs. Multiple aftermarket brands available.',
    'verified'::verification_status,
    'Wix, Fram, and Napa filters verified on Kubota B2650 and RTV-X1140.',
    NULL,
    'bb0e8400-e29b-41d4-a716-446655440006'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440006'::uuid,
    '2025-09-01 00:00:00+00',
    '2025-08-01 00:00:00+00'
  ),
  (
    'b30e8400-e29b-41d4-a716-446655440031'::uuid,
    '660e8400-e29b-41d4-a716-446655440002'::uuid,
    'Chainsaw Chain - 20 inch .325 Pitch',
    'Replacement chains for Stihl and Husqvarna chainsaws. Compatible with 20" bars.',
    'unverified'::verification_status,
    'Oregon and Stihl chains appear interchangeable. Need to verify drive link count.',
    NULL,
    'bb0e8400-e29b-41d4-a716-446655440006'::uuid,
    NULL,
    NULL,
    '2026-01-05 00:00:00+00'
  )
ON CONFLICT (id) DO NOTHING;


-- =====================================================
-- PART 2: CREATE PART IDENTIFIERS
-- =====================================================
-- UUID prefix: b40e8400 for part identifiers
-- These are the actual part numbers technicians search for

INSERT INTO public.part_identifiers (
  id,
  organization_id,
  identifier_type,
  raw_value,
  norm_value,
  inventory_item_id,
  manufacturer,
  notes,
  created_by,
  created_at
) VALUES
  -- =====================================================
  -- APEX CONSTRUCTION IDENTIFIERS
  -- =====================================================
  
  -- Oil Filter Group (b30e8400...0001) identifiers
  (
    'b40e8400-e29b-41d4-a716-446655440001'::uuid,
    '660e8400-e29b-41d4-a716-446655440000'::uuid,
    'oem'::part_identifier_type,
    'CAT-1R-0750',
    'cat-1r-0750',
    NULL,  -- Not in inventory (OEM reference)
    'Caterpillar',
    'OEM oil filter for CAT excavators and dozers',
    'bb0e8400-e29b-41d4-a716-446655440001'::uuid,
    '2025-10-01 00:00:00+00'
  ),
  (
    'b40e8400-e29b-41d4-a716-446655440002'::uuid,
    '660e8400-e29b-41d4-a716-446655440000'::uuid,
    'oem'::part_identifier_type,
    'KMT-6742-01-4540',
    'kmt-6742-01-4540',
    NULL,
    'Komatsu',
    'OEM oil filter for Komatsu PC series',
    'bb0e8400-e29b-41d4-a716-446655440001'::uuid,
    '2025-10-01 00:00:00+00'
  ),
  (
    'b40e8400-e29b-41d4-a716-446655440003'::uuid,
    '660e8400-e29b-41d4-a716-446655440000'::uuid,
    'aftermarket'::part_identifier_type,
    'WIX-57090',
    'wix-57090',
    NULL,
    'WIX',
    'Aftermarket equivalent - same filtration specs',
    'bb0e8400-e29b-41d4-a716-446655440001'::uuid,
    '2025-10-01 00:00:00+00'
  ),
  (
    'b40e8400-e29b-41d4-a716-446655440004'::uuid,
    '660e8400-e29b-41d4-a716-446655440000'::uuid,
    'aftermarket'::part_identifier_type,
    'BF7679-D',
    'bf7679-d',
    NULL,
    'Baldwin',
    'Baldwin heavy duty oil filter',
    'bb0e8400-e29b-41d4-a716-446655440001'::uuid,
    '2025-10-01 00:00:00+00'
  ),
  (
    'b40e8400-e29b-41d4-a716-446655440005'::uuid,
    '660e8400-e29b-41d4-a716-446655440000'::uuid,
    'sku'::part_identifier_type,
    'HYD-OIL-15W40-5G',
    'hyd-oil-15w40-5g',
    'a20e8400-e29b-41d4-a716-446655440001'::uuid,  -- Links to existing inventory item
    NULL,
    'Internal SKU for hydraulic oil',
    'bb0e8400-e29b-41d4-a716-446655440001'::uuid,
    '2025-10-01 00:00:00+00'
  ),

  -- Air Filter Group (b30e8400...0002) identifiers
  (
    'b40e8400-e29b-41d4-a716-446655440010'::uuid,
    '660e8400-e29b-41d4-a716-446655440000'::uuid,
    'oem'::part_identifier_type,
    'CAT-142-1339',
    'cat-142-1339',
    NULL,
    'Caterpillar',
    'OEM primary air filter for CAT 320 series',
    'bb0e8400-e29b-41d4-a716-446655440001'::uuid,
    '2025-11-01 00:00:00+00'
  ),
  (
    'b40e8400-e29b-41d4-a716-446655440011'::uuid,
    '660e8400-e29b-41d4-a716-446655440000'::uuid,
    'aftermarket'::part_identifier_type,
    'P532503',
    'p532503',
    NULL,
    'Donaldson',
    'Donaldson equivalent air filter',
    'bb0e8400-e29b-41d4-a716-446655440001'::uuid,
    '2025-11-01 00:00:00+00'
  ),
  (
    'b40e8400-e29b-41d4-a716-446655440012'::uuid,
    '660e8400-e29b-41d4-a716-446655440000'::uuid,
    'sku'::part_identifier_type,
    'AF-HVY-CAT320',
    'af-hvy-cat320',
    'a20e8400-e29b-41d4-a716-446655440002'::uuid,  -- Links to Air Filter - Heavy Equipment
    NULL,
    'Internal SKU for CAT 320 air filter',
    'bb0e8400-e29b-41d4-a716-446655440001'::uuid,
    '2025-11-01 00:00:00+00'
  ),

  -- Fuel Filter Group (b30e8400...0003) identifiers
  (
    'b40e8400-e29b-41d4-a716-446655440020'::uuid,
    '660e8400-e29b-41d4-a716-446655440000'::uuid,
    'sku'::part_identifier_type,
    'FF-DIESEL-UNI',
    'ff-diesel-uni',
    'a20e8400-e29b-41d4-a716-446655440004'::uuid,  -- Links to Fuel Filter - Diesel
    NULL,
    'Internal SKU',
    'bb0e8400-e29b-41d4-a716-446655440002'::uuid,
    '2025-12-15 00:00:00+00'
  ),
  (
    'b40e8400-e29b-41d4-a716-446655440021'::uuid,
    '660e8400-e29b-41d4-a716-446655440000'::uuid,
    'cross_ref'::part_identifier_type,
    'NAPA-3355',
    'napa-3355',
    NULL,
    'NAPA',
    'NAPA cross reference number',
    'bb0e8400-e29b-41d4-a716-446655440002'::uuid,
    '2025-12-15 00:00:00+00'
  ),

  -- =====================================================
  -- METRO EQUIPMENT IDENTIFIERS
  -- =====================================================

  -- JLG Seal Kit Group (b30e8400...0010) identifiers
  (
    'b40e8400-e29b-41d4-a716-446655440030'::uuid,
    '660e8400-e29b-41d4-a716-446655440001'::uuid,
    'oem'::part_identifier_type,
    'JLG-7024359',
    'jlg-7024359',
    NULL,
    'JLG',
    'OEM cylinder seal kit for 450AJ',
    'bb0e8400-e29b-41d4-a716-446655440004'::uuid,
    '2025-09-15 00:00:00+00'
  ),
  (
    'b40e8400-e29b-41d4-a716-446655440031'::uuid,
    '660e8400-e29b-41d4-a716-446655440001'::uuid,
    'aftermarket'::part_identifier_type,
    'HERC-SK7024359',
    'herc-sk7024359',
    NULL,
    'Hercules',
    'Hercules aftermarket seal kit - identical specs',
    'bb0e8400-e29b-41d4-a716-446655440004'::uuid,
    '2025-09-15 00:00:00+00'
  ),
  (
    'b40e8400-e29b-41d4-a716-446655440032'::uuid,
    '660e8400-e29b-41d4-a716-446655440001'::uuid,
    'sku'::part_identifier_type,
    'HSK-JLG-450AJ',
    'hsk-jlg-450aj',
    'a20e8400-e29b-41d4-a716-446655440010'::uuid,  -- Links to Hydraulic Seal Kit - Boom Lift
    NULL,
    'Internal SKU',
    'bb0e8400-e29b-41d4-a716-446655440004'::uuid,
    '2025-09-15 00:00:00+00'
  ),

  -- Genie Battery Group (b30e8400...0011) identifiers
  (
    'b40e8400-e29b-41d4-a716-446655440040'::uuid,
    '660e8400-e29b-41d4-a716-446655440001'::uuid,
    'oem'::part_identifier_type,
    'GN-105295',
    'gn-105295',
    NULL,
    'Genie',
    'OEM battery for Genie scissor lifts',
    'bb0e8400-e29b-41d4-a716-446655440004'::uuid,
    '2025-10-01 00:00:00+00'
  ),
  (
    'b40e8400-e29b-41d4-a716-446655440041'::uuid,
    '660e8400-e29b-41d4-a716-446655440001'::uuid,
    'aftermarket'::part_identifier_type,
    'US-2200XC',
    'us-2200xc',
    NULL,
    'US Battery',
    'US Battery 6V deep cycle',
    'bb0e8400-e29b-41d4-a716-446655440004'::uuid,
    '2025-10-01 00:00:00+00'
  ),
  (
    'b40e8400-e29b-41d4-a716-446655440042'::uuid,
    '660e8400-e29b-41d4-a716-446655440001'::uuid,
    'aftermarket'::part_identifier_type,
    'TROJ-T-105',
    'troj-t-105',
    NULL,
    'Trojan',
    'Trojan T-105 deep cycle - industry standard',
    'bb0e8400-e29b-41d4-a716-446655440004'::uuid,
    '2025-10-01 00:00:00+00'
  ),
  (
    'b40e8400-e29b-41d4-a716-446655440043'::uuid,
    '660e8400-e29b-41d4-a716-446655440001'::uuid,
    'sku'::part_identifier_type,
    'BATT-GEN-6V',
    'batt-gen-6v',
    'a20e8400-e29b-41d4-a716-446655440051'::uuid,  -- Links to Genie Scissor Lift Battery
    NULL,
    'Internal SKU',
    'bb0e8400-e29b-41d4-a716-446655440004'::uuid,
    '2025-10-01 00:00:00+00'
  ),

  -- Bobcat Hydraulic Filter Group (b30e8400...0012) identifiers
  (
    'b40e8400-e29b-41d4-a716-446655440050'::uuid,
    '660e8400-e29b-41d4-a716-446655440001'::uuid,
    'oem'::part_identifier_type,
    'BOB-6661248',
    'bob-6661248',
    NULL,
    'Bobcat',
    'OEM hydraulic filter',
    'bb0e8400-e29b-41d4-a716-446655440005'::uuid,
    '2026-01-02 00:00:00+00'
  ),
  (
    'b40e8400-e29b-41d4-a716-446655440051'::uuid,
    '660e8400-e29b-41d4-a716-446655440001'::uuid,
    'sku'::part_identifier_type,
    'HF-BOB-S770',
    'hf-bob-s770',
    'a20e8400-e29b-41d4-a716-446655440050'::uuid,  -- Links to Bobcat S770 Hydraulic Filter
    NULL,
    'Internal SKU',
    'bb0e8400-e29b-41d4-a716-446655440005'::uuid,
    '2026-01-02 00:00:00+00'
  ),

  -- =====================================================
  -- INDUSTRIAL RENTALS IDENTIFIERS
  -- =====================================================

  -- Forklift Battery Group (b30e8400...0020) identifiers
  (
    'b40e8400-e29b-41d4-a716-446655440060'::uuid,
    '660e8400-e29b-41d4-a716-446655440003'::uuid,
    'oem'::part_identifier_type,
    'TOY-7FB25-BATT',
    'toy-7fb25-batt',
    NULL,
    'Toyota',
    'OEM battery specification for Toyota forklifts',
    'bb0e8400-e29b-41d4-a716-446655440007'::uuid,
    '2025-07-01 00:00:00+00'
  ),
  (
    'b40e8400-e29b-41d4-a716-446655440061'::uuid,
    '660e8400-e29b-41d4-a716-446655440003'::uuid,
    'aftermarket'::part_identifier_type,
    'DEKA-D125',
    'deka-d125',
    NULL,
    'Deka',
    'Deka industrial battery - heavy duty',
    'bb0e8400-e29b-41d4-a716-446655440007'::uuid,
    '2025-07-01 00:00:00+00'
  ),
  (
    'b40e8400-e29b-41d4-a716-446655440062'::uuid,
    '660e8400-e29b-41d4-a716-446655440003'::uuid,
    'sku'::part_identifier_type,
    'BATT-IND-48V-TOY',
    'batt-ind-48v-toy',
    'a20e8400-e29b-41d4-a716-446655440030'::uuid,  -- Links to Forklift Battery - Industrial
    NULL,
    'Internal SKU',
    'bb0e8400-e29b-41d4-a716-446655440007'::uuid,
    '2025-07-01 00:00:00+00'
  ),

  -- Compressor Air Filter Group (b30e8400...0021) identifiers
  (
    'b40e8400-e29b-41d4-a716-446655440070'::uuid,
    '660e8400-e29b-41d4-a716-446655440003'::uuid,
    'oem'::part_identifier_type,
    'IR-39708466',
    'ir-39708466',
    NULL,
    'Ingersoll Rand',
    'OEM air filter for P185',
    'bb0e8400-e29b-41d4-a716-446655440007'::uuid,
    '2025-11-20 00:00:00+00'
  ),
  (
    'b40e8400-e29b-41d4-a716-446655440071'::uuid,
    '660e8400-e29b-41d4-a716-446655440003'::uuid,
    'aftermarket'::part_identifier_type,
    'DON-P526509',
    'don-p526509',
    NULL,
    'Donaldson',
    'Donaldson compatible filter',
    'bb0e8400-e29b-41d4-a716-446655440007'::uuid,
    '2025-11-20 00:00:00+00'
  ),
  (
    'b40e8400-e29b-41d4-a716-446655440072'::uuid,
    '660e8400-e29b-41d4-a716-446655440003'::uuid,
    'sku'::part_identifier_type,
    'AF-IR-P185',
    'af-ir-p185',
    'a20e8400-e29b-41d4-a716-446655440032'::uuid,  -- Links to Compressor Air Filter
    NULL,
    'Internal SKU',
    'bb0e8400-e29b-41d4-a716-446655440007'::uuid,
    '2025-11-20 00:00:00+00'
  ),

  -- =====================================================
  -- VALLEY LANDSCAPING IDENTIFIERS
  -- =====================================================

  -- Kubota Oil Filter Group (b30e8400...0030) identifiers
  (
    'b40e8400-e29b-41d4-a716-446655440080'::uuid,
    '660e8400-e29b-41d4-a716-446655440002'::uuid,
    'oem'::part_identifier_type,
    'KUB-HH150-32094',
    'kub-hh150-32094',
    NULL,
    'Kubota',
    'OEM oil filter for Kubota compact equipment',
    'bb0e8400-e29b-41d4-a716-446655440006'::uuid,
    '2025-08-01 00:00:00+00'
  ),
  (
    'b40e8400-e29b-41d4-a716-446655440081'::uuid,
    '660e8400-e29b-41d4-a716-446655440002'::uuid,
    'aftermarket'::part_identifier_type,
    'WIX-51394',
    'wix-51394',
    NULL,
    'WIX',
    'WIX equivalent filter',
    'bb0e8400-e29b-41d4-a716-446655440006'::uuid,
    '2025-08-01 00:00:00+00'
  ),
  (
    'b40e8400-e29b-41d4-a716-446655440082'::uuid,
    '660e8400-e29b-41d4-a716-446655440002'::uuid,
    'aftermarket'::part_identifier_type,
    'FRAM-PH3614',
    'fram-ph3614',
    NULL,
    'Fram',
    'Fram compatible filter',
    'bb0e8400-e29b-41d4-a716-446655440006'::uuid,
    '2025-08-01 00:00:00+00'
  ),
  (
    'b40e8400-e29b-41d4-a716-446655440083'::uuid,
    '660e8400-e29b-41d4-a716-446655440002'::uuid,
    'sku'::part_identifier_type,
    'OF-KUB-RTV',
    'of-kub-rtv',
    'a20e8400-e29b-41d4-a716-446655440060'::uuid,  -- Links to Kubota RTV Oil Filter
    NULL,
    'Internal SKU',
    'bb0e8400-e29b-41d4-a716-446655440006'::uuid,
    '2025-08-01 00:00:00+00'
  ),

  -- Chainsaw Chain Group (b30e8400...0031) identifiers
  (
    'b40e8400-e29b-41d4-a716-446655440090'::uuid,
    '660e8400-e29b-41d4-a716-446655440002'::uuid,
    'oem'::part_identifier_type,
    'STL-3639-005-0072',
    'stl-3639-005-0072',
    NULL,
    'Stihl',
    'Stihl 20 inch chain - 72 drive links',
    'bb0e8400-e29b-41d4-a716-446655440006'::uuid,
    '2026-01-05 00:00:00+00'
  ),
  (
    'b40e8400-e29b-41d4-a716-446655440091'::uuid,
    '660e8400-e29b-41d4-a716-446655440002'::uuid,
    'aftermarket'::part_identifier_type,
    'ORE-72LGX072G',
    'ore-72lgx072g',
    NULL,
    'Oregon',
    'Oregon super guard chain - same specs',
    'bb0e8400-e29b-41d4-a716-446655440006'::uuid,
    '2026-01-05 00:00:00+00'
  ),
  (
    'b40e8400-e29b-41d4-a716-446655440092'::uuid,
    '660e8400-e29b-41d4-a716-446655440002'::uuid,
    'sku'::part_identifier_type,
    'CHAIN-STL-20',
    'chain-stl-20',
    'a20e8400-e29b-41d4-a716-446655440021'::uuid,  -- Links to Chainsaw Chain - 20 inch
    NULL,
    'Internal SKU',
    'bb0e8400-e29b-41d4-a716-446655440006'::uuid,
    '2026-01-05 00:00:00+00'
  )
ON CONFLICT (id) DO NOTHING;


-- =====================================================
-- PART 3: LINK IDENTIFIERS TO GROUPS
-- =====================================================
-- Also links inventory items directly where applicable
-- UUID prefix: b50e8400 for group members

INSERT INTO public.part_alternate_group_members (
  id,
  group_id,
  part_identifier_id,
  inventory_item_id,
  is_primary,
  notes,
  created_at
) VALUES
  -- =====================================================
  -- APEX: Oil Filter Group (b30e8400...0001)
  -- =====================================================
  (
    'b50e8400-e29b-41d4-a716-446655440001'::uuid,
    'b30e8400-e29b-41d4-a716-446655440001'::uuid,
    'b40e8400-e29b-41d4-a716-446655440001'::uuid,  -- CAT-1R-0750
    NULL,
    TRUE,  -- Primary (OEM part)
    'OEM part number - use as reference',
    '2025-10-01 00:00:00+00'
  ),
  (
    'b50e8400-e29b-41d4-a716-446655440002'::uuid,
    'b30e8400-e29b-41d4-a716-446655440001'::uuid,
    'b40e8400-e29b-41d4-a716-446655440002'::uuid,  -- KMT-6742-01-4540
    NULL,
    FALSE,
    'Komatsu OEM equivalent',
    '2025-10-01 00:00:00+00'
  ),
  (
    'b50e8400-e29b-41d4-a716-446655440003'::uuid,
    'b30e8400-e29b-41d4-a716-446655440001'::uuid,
    'b40e8400-e29b-41d4-a716-446655440003'::uuid,  -- WIX-57090
    NULL,
    FALSE,
    'Good aftermarket option',
    '2025-10-01 00:00:00+00'
  ),
  (
    'b50e8400-e29b-41d4-a716-446655440004'::uuid,
    'b30e8400-e29b-41d4-a716-446655440001'::uuid,
    'b40e8400-e29b-41d4-a716-446655440004'::uuid,  -- BF7679-D
    NULL,
    FALSE,
    'Baldwin alternative',
    '2025-10-01 00:00:00+00'
  ),
  (
    'b50e8400-e29b-41d4-a716-446655440005'::uuid,
    'b30e8400-e29b-41d4-a716-446655440001'::uuid,
    'b40e8400-e29b-41d4-a716-446655440005'::uuid,  -- HYD-OIL-15W40-5G (linked to inventory)
    'a20e8400-e29b-41d4-a716-446655440001'::uuid,  -- Also link inventory directly
    FALSE,
    'In stock - Hydraulic Oil 15W-40',
    '2025-10-01 00:00:00+00'
  ),

  -- =====================================================
  -- APEX: Air Filter Group (b30e8400...0002)
  -- =====================================================
  (
    'b50e8400-e29b-41d4-a716-446655440010'::uuid,
    'b30e8400-e29b-41d4-a716-446655440002'::uuid,
    'b40e8400-e29b-41d4-a716-446655440010'::uuid,  -- CAT-142-1339
    NULL,
    TRUE,  -- Primary (OEM)
    'OEM primary air filter',
    '2025-11-01 00:00:00+00'
  ),
  (
    'b50e8400-e29b-41d4-a716-446655440011'::uuid,
    'b30e8400-e29b-41d4-a716-446655440002'::uuid,
    'b40e8400-e29b-41d4-a716-446655440011'::uuid,  -- P532503
    NULL,
    FALSE,
    'Donaldson - proven quality',
    '2025-11-01 00:00:00+00'
  ),
  (
    'b50e8400-e29b-41d4-a716-446655440012'::uuid,
    'b30e8400-e29b-41d4-a716-446655440002'::uuid,
    'b40e8400-e29b-41d4-a716-446655440012'::uuid,  -- AF-HVY-CAT320 (linked to inventory)
    'a20e8400-e29b-41d4-a716-446655440002'::uuid,
    FALSE,
    'In stock - Air Filter Heavy Equipment',
    '2025-11-01 00:00:00+00'
  ),

  -- =====================================================
  -- APEX: Fuel Filter Group (b30e8400...0003)
  -- =====================================================
  (
    'b50e8400-e29b-41d4-a716-446655440020'::uuid,
    'b30e8400-e29b-41d4-a716-446655440003'::uuid,
    'b40e8400-e29b-41d4-a716-446655440020'::uuid,  -- FF-DIESEL-UNI
    'a20e8400-e29b-41d4-a716-446655440004'::uuid,
    TRUE,
    'In stock - Universal Diesel Filter',
    '2025-12-15 00:00:00+00'
  ),
  (
    'b50e8400-e29b-41d4-a716-446655440021'::uuid,
    'b30e8400-e29b-41d4-a716-446655440003'::uuid,
    'b40e8400-e29b-41d4-a716-446655440021'::uuid,  -- NAPA-3355
    NULL,
    FALSE,
    'NAPA alternative - unverified',
    '2025-12-15 00:00:00+00'
  ),

  -- =====================================================
  -- METRO: JLG Seal Kit Group (b30e8400...0010)
  -- =====================================================
  (
    'b50e8400-e29b-41d4-a716-446655440030'::uuid,
    'b30e8400-e29b-41d4-a716-446655440010'::uuid,
    'b40e8400-e29b-41d4-a716-446655440030'::uuid,  -- JLG-7024359
    NULL,
    TRUE,
    'OEM seal kit',
    '2025-09-15 00:00:00+00'
  ),
  (
    'b50e8400-e29b-41d4-a716-446655440031'::uuid,
    'b30e8400-e29b-41d4-a716-446655440010'::uuid,
    'b40e8400-e29b-41d4-a716-446655440031'::uuid,  -- HERC-SK7024359
    NULL,
    FALSE,
    'Hercules aftermarket - same quality',
    '2025-09-15 00:00:00+00'
  ),
  (
    'b50e8400-e29b-41d4-a716-446655440032'::uuid,
    'b30e8400-e29b-41d4-a716-446655440010'::uuid,
    'b40e8400-e29b-41d4-a716-446655440032'::uuid,  -- HSK-JLG-450AJ
    'a20e8400-e29b-41d4-a716-446655440010'::uuid,
    FALSE,
    'In stock - Hydraulic Seal Kit',
    '2025-09-15 00:00:00+00'
  ),

  -- =====================================================
  -- METRO: Genie Battery Group (b30e8400...0011)
  -- =====================================================
  (
    'b50e8400-e29b-41d4-a716-446655440040'::uuid,
    'b30e8400-e29b-41d4-a716-446655440011'::uuid,
    'b40e8400-e29b-41d4-a716-446655440040'::uuid,  -- GN-105295
    NULL,
    TRUE,
    'Genie OEM specification',
    '2025-10-01 00:00:00+00'
  ),
  (
    'b50e8400-e29b-41d4-a716-446655440041'::uuid,
    'b30e8400-e29b-41d4-a716-446655440011'::uuid,
    'b40e8400-e29b-41d4-a716-446655440041'::uuid,  -- US-2200XC
    NULL,
    FALSE,
    'US Battery - good quality',
    '2025-10-01 00:00:00+00'
  ),
  (
    'b50e8400-e29b-41d4-a716-446655440042'::uuid,
    'b30e8400-e29b-41d4-a716-446655440011'::uuid,
    'b40e8400-e29b-41d4-a716-446655440042'::uuid,  -- TROJ-T-105
    NULL,
    FALSE,
    'Trojan - industry standard',
    '2025-10-01 00:00:00+00'
  ),
  (
    'b50e8400-e29b-41d4-a716-446655440043'::uuid,
    'b30e8400-e29b-41d4-a716-446655440011'::uuid,
    'b40e8400-e29b-41d4-a716-446655440043'::uuid,  -- BATT-GEN-6V
    'a20e8400-e29b-41d4-a716-446655440051'::uuid,
    FALSE,
    'In stock - Genie Scissor Lift Battery',
    '2025-10-01 00:00:00+00'
  ),

  -- =====================================================
  -- METRO: Bobcat Hydraulic Filter Group (b30e8400...0012)
  -- =====================================================
  (
    'b50e8400-e29b-41d4-a716-446655440050'::uuid,
    'b30e8400-e29b-41d4-a716-446655440012'::uuid,
    'b40e8400-e29b-41d4-a716-446655440050'::uuid,  -- BOB-6661248
    NULL,
    TRUE,
    'Bobcat OEM filter',
    '2026-01-02 00:00:00+00'
  ),
  (
    'b50e8400-e29b-41d4-a716-446655440051'::uuid,
    'b30e8400-e29b-41d4-a716-446655440012'::uuid,
    'b40e8400-e29b-41d4-a716-446655440051'::uuid,  -- HF-BOB-S770
    'a20e8400-e29b-41d4-a716-446655440050'::uuid,
    FALSE,
    'In stock - Bobcat S770 Hydraulic Filter',
    '2026-01-02 00:00:00+00'
  ),

  -- =====================================================
  -- INDUSTRIAL: Forklift Battery Group (b30e8400...0020)
  -- =====================================================
  (
    'b50e8400-e29b-41d4-a716-446655440060'::uuid,
    'b30e8400-e29b-41d4-a716-446655440020'::uuid,
    'b40e8400-e29b-41d4-a716-446655440060'::uuid,  -- TOY-7FB25-BATT
    NULL,
    TRUE,
    'Toyota OEM spec',
    '2025-07-01 00:00:00+00'
  ),
  (
    'b50e8400-e29b-41d4-a716-446655440061'::uuid,
    'b30e8400-e29b-41d4-a716-446655440020'::uuid,
    'b40e8400-e29b-41d4-a716-446655440061'::uuid,  -- DEKA-D125
    NULL,
    FALSE,
    'Deka heavy duty',
    '2025-07-01 00:00:00+00'
  ),
  (
    'b50e8400-e29b-41d4-a716-446655440062'::uuid,
    'b30e8400-e29b-41d4-a716-446655440020'::uuid,
    'b40e8400-e29b-41d4-a716-446655440062'::uuid,  -- BATT-IND-48V-TOY
    'a20e8400-e29b-41d4-a716-446655440030'::uuid,
    FALSE,
    'In stock - Forklift Battery Industrial',
    '2025-07-01 00:00:00+00'
  ),

  -- =====================================================
  -- INDUSTRIAL: Compressor Air Filter Group (b30e8400...0021)
  -- =====================================================
  (
    'b50e8400-e29b-41d4-a716-446655440070'::uuid,
    'b30e8400-e29b-41d4-a716-446655440021'::uuid,
    'b40e8400-e29b-41d4-a716-446655440070'::uuid,  -- IR-39708466
    NULL,
    TRUE,
    'Ingersoll Rand OEM',
    '2025-11-20 00:00:00+00'
  ),
  (
    'b50e8400-e29b-41d4-a716-446655440071'::uuid,
    'b30e8400-e29b-41d4-a716-446655440021'::uuid,
    'b40e8400-e29b-41d4-a716-446655440071'::uuid,  -- DON-P526509
    NULL,
    FALSE,
    'Donaldson compatible',
    '2025-11-20 00:00:00+00'
  ),
  (
    'b50e8400-e29b-41d4-a716-446655440072'::uuid,
    'b30e8400-e29b-41d4-a716-446655440021'::uuid,
    'b40e8400-e29b-41d4-a716-446655440072'::uuid,  -- AF-IR-P185
    'a20e8400-e29b-41d4-a716-446655440032'::uuid,
    FALSE,
    'In stock - Compressor Air Filter',
    '2025-11-20 00:00:00+00'
  ),

  -- =====================================================
  -- VALLEY: Kubota Oil Filter Group (b30e8400...0030)
  -- =====================================================
  (
    'b50e8400-e29b-41d4-a716-446655440080'::uuid,
    'b30e8400-e29b-41d4-a716-446655440030'::uuid,
    'b40e8400-e29b-41d4-a716-446655440080'::uuid,  -- KUB-HH150-32094
    NULL,
    TRUE,
    'Kubota OEM filter',
    '2025-08-01 00:00:00+00'
  ),
  (
    'b50e8400-e29b-41d4-a716-446655440081'::uuid,
    'b30e8400-e29b-41d4-a716-446655440030'::uuid,
    'b40e8400-e29b-41d4-a716-446655440081'::uuid,  -- WIX-51394
    NULL,
    FALSE,
    'WIX alternative',
    '2025-08-01 00:00:00+00'
  ),
  (
    'b50e8400-e29b-41d4-a716-446655440082'::uuid,
    'b30e8400-e29b-41d4-a716-446655440030'::uuid,
    'b40e8400-e29b-41d4-a716-446655440082'::uuid,  -- FRAM-PH3614
    NULL,
    FALSE,
    'Fram alternative',
    '2025-08-01 00:00:00+00'
  ),
  (
    'b50e8400-e29b-41d4-a716-446655440083'::uuid,
    'b30e8400-e29b-41d4-a716-446655440030'::uuid,
    'b40e8400-e29b-41d4-a716-446655440083'::uuid,  -- OF-KUB-RTV
    'a20e8400-e29b-41d4-a716-446655440060'::uuid,
    FALSE,
    'In stock - Kubota RTV Oil Filter',
    '2025-08-01 00:00:00+00'
  ),

  -- =====================================================
  -- VALLEY: Chainsaw Chain Group (b30e8400...0031)
  -- =====================================================
  (
    'b50e8400-e29b-41d4-a716-446655440090'::uuid,
    'b30e8400-e29b-41d4-a716-446655440031'::uuid,
    'b40e8400-e29b-41d4-a716-446655440090'::uuid,  -- STL-3639-005-0072
    NULL,
    TRUE,
    'Stihl OEM chain',
    '2026-01-05 00:00:00+00'
  ),
  (
    'b50e8400-e29b-41d4-a716-446655440091'::uuid,
    'b30e8400-e29b-41d4-a716-446655440031'::uuid,
    'b40e8400-e29b-41d4-a716-446655440091'::uuid,  -- ORE-72LGX072G
    NULL,
    FALSE,
    'Oregon alternative - good quality',
    '2026-01-05 00:00:00+00'
  ),
  (
    'b50e8400-e29b-41d4-a716-446655440092'::uuid,
    'b30e8400-e29b-41d4-a716-446655440031'::uuid,
    'b40e8400-e29b-41d4-a716-446655440092'::uuid,  -- CHAIN-STL-20
    'a20e8400-e29b-41d4-a716-446655440021'::uuid,
    FALSE,
    'In stock - Chainsaw Chain 20 inch',
    '2026-01-05 00:00:00+00'
  )
ON CONFLICT (id) DO NOTHING;
