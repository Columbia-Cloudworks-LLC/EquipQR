-- =====================================================
-- EquipQR Seed Data - PM Template Compatibility Rules
-- =====================================================
-- Links PM templates to equipment types by manufacturer/model
-- These rules determine which PM templates are suggested for equipment
-- Rules are organization-scoped - each org can define which templates apply to their equipment
--
-- Organization IDs:
--   Apex Construction: 660e8400-e29b-41d4-a716-446655440000
--   Metro Equipment:   660e8400-e29b-41d4-a716-446655440001
--   Valley Services:   660e8400-e29b-41d4-a716-446655440002
--   Industrial:        660e8400-e29b-41d4-a716-446655440003
--
-- PM Template IDs:
--   Forklift PM:       cc0e8400-e29b-41d4-a716-446655440001
--   Pull Trailer PM:   cc0e8400-e29b-41d4-a716-446655440002
--   Compressor PM:     cc0e8400-e29b-41d4-a716-446655440003
--   Scissor Lift PM:   cc0e8400-e29b-41d4-a716-446655440004
--   Excavator PM:      cc0e8400-e29b-41d4-a716-446655440005
--   Skid Steer PM:     cc0e8400-e29b-41d4-a716-446655440006
-- =====================================================

INSERT INTO public.pm_template_compatibility_rules (
  pm_template_id,
  organization_id,
  manufacturer,
  model,
  manufacturer_norm,
  model_norm
) VALUES
  -- =====================================================
  -- Apex Construction Company Rules
  -- =====================================================
  
  -- Excavator PM applies to all Caterpillar excavators
  (
    'cc0e8400-e29b-41d4-a716-446655440005'::uuid,
    '660e8400-e29b-41d4-a716-446655440000'::uuid,
    'Caterpillar',
    NULL,  -- Any model
    'caterpillar',
    NULL
  ),
  
  -- Excavator PM also applies to Komatsu excavators
  (
    'cc0e8400-e29b-41d4-a716-446655440005'::uuid,
    '660e8400-e29b-41d4-a716-446655440000'::uuid,
    'Komatsu',
    NULL,
    'komatsu',
    NULL
  ),
  
  -- =====================================================
  -- Metro Equipment Rental Rules
  -- =====================================================
  
  -- Scissor Lift PM applies to JLG scissor lifts
  (
    'cc0e8400-e29b-41d4-a716-446655440004'::uuid,
    '660e8400-e29b-41d4-a716-446655440001'::uuid,
    'JLG',
    NULL,
    'jlg',
    NULL
  ),
  
  -- Skid Steer PM applies to Bobcat skid steers
  (
    'cc0e8400-e29b-41d4-a716-446655440006'::uuid,
    '660e8400-e29b-41d4-a716-446655440001'::uuid,
    'Bobcat',
    NULL,
    'bobcat',
    NULL
  ),
  
  -- =====================================================
  -- Industrial Facility Rules
  -- =====================================================
  
  -- Forklift PM applies to Toyota forklifts
  (
    'cc0e8400-e29b-41d4-a716-446655440001'::uuid,
    '660e8400-e29b-41d4-a716-446655440003'::uuid,
    'Toyota',
    NULL,
    'toyota',
    NULL
  ),
  
  -- Compressor PM applies to Ingersoll Rand compressors
  (
    'cc0e8400-e29b-41d4-a716-446655440003'::uuid,
    '660e8400-e29b-41d4-a716-446655440003'::uuid,
    'Ingersoll Rand',
    NULL,
    'ingersoll rand',
    NULL
  )
ON CONFLICT DO NOTHING;
