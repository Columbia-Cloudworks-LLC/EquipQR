-- =====================================================
-- EquipQR Seed Data - Equipment Part Compatibility (Direct Links)
-- =====================================================
-- Links inventory items to specific equipment pieces

INSERT INTO public.equipment_part_compatibility (
  equipment_id,
  inventory_item_id
) VALUES
  -- CAT 320 Excavator compatible parts
  ('aa0e8400-e29b-41d4-a716-446655440000'::uuid, 'a20e8400-e29b-41d4-a716-446655440001'::uuid),  -- Hydraulic Oil
  ('aa0e8400-e29b-41d4-a716-446655440000'::uuid, 'a20e8400-e29b-41d4-a716-446655440002'::uuid),  -- Air Filter
  ('aa0e8400-e29b-41d4-a716-446655440000'::uuid, 'a20e8400-e29b-41d4-a716-446655440003'::uuid),  -- Track Shoes
  ('aa0e8400-e29b-41d4-a716-446655440000'::uuid, 'a20e8400-e29b-41d4-a716-446655440004'::uuid),  -- Fuel Filter
  
  -- John Deere Dozer compatible parts
  ('aa0e8400-e29b-41d4-a716-446655440001'::uuid, 'a20e8400-e29b-41d4-a716-446655440001'::uuid),  -- Hydraulic Oil
  ('aa0e8400-e29b-41d4-a716-446655440001'::uuid, 'a20e8400-e29b-41d4-a716-446655440002'::uuid),  -- Air Filter
  ('aa0e8400-e29b-41d4-a716-446655440001'::uuid, 'a20e8400-e29b-41d4-a716-446655440004'::uuid),  -- Fuel Filter
  
  -- Generator parts
  ('aa0e8400-e29b-41d4-a716-446655440002'::uuid, 'a20e8400-e29b-41d4-a716-446655440004'::uuid),  -- Fuel Filter
  
  -- Light Tower parts
  ('aa0e8400-e29b-41d4-a716-446655440003'::uuid, 'a20e8400-e29b-41d4-a716-446655440005'::uuid),  -- LED Panel
  
  -- Metro: Boom Lift parts
  ('aa0e8400-e29b-41d4-a716-446655440011'::uuid, 'a20e8400-e29b-41d4-a716-446655440010'::uuid),  -- Hydraulic Seal Kit
  
  -- Metro: Scissor Lift parts
  ('aa0e8400-e29b-41d4-a716-446655440012'::uuid, 'a20e8400-e29b-41d4-a716-446655440011'::uuid),  -- Cylinder Seal
  
  -- Metro: Skid Steer parts
  ('aa0e8400-e29b-41d4-a716-446655440010'::uuid, 'a20e8400-e29b-41d4-a716-446655440012'::uuid),  -- Bucket Teeth
  
  -- Valley: Mower parts
  ('aa0e8400-e29b-41d4-a716-446655440020'::uuid, 'a20e8400-e29b-41d4-a716-446655440020'::uuid),  -- Blade Set
  
  -- Valley: Chainsaw parts
  ('aa0e8400-e29b-41d4-a716-446655440021'::uuid, 'a20e8400-e29b-41d4-a716-446655440021'::uuid),  -- Chain
  
  -- Industrial: Forklift parts
  ('aa0e8400-e29b-41d4-a716-446655440030'::uuid, 'a20e8400-e29b-41d4-a716-446655440030'::uuid),  -- Battery
  
  -- Industrial: Pallet Jack parts
  ('aa0e8400-e29b-41d4-a716-446655440031'::uuid, 'a20e8400-e29b-41d4-a716-446655440031'::uuid),  -- Wheels
  
  -- Industrial: Compressor parts
  ('aa0e8400-e29b-41d4-a716-446655440032'::uuid, 'a20e8400-e29b-41d4-a716-446655440032'::uuid)   -- Air Filter
ON CONFLICT DO NOTHING;
