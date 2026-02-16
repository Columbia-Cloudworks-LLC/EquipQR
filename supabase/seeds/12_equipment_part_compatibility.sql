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
  ('aa0e8400-e29b-41d4-a716-446655440032'::uuid, 'a20e8400-e29b-41d4-a716-446655440032'::uuid),   -- Air Filter

  -- =====================================================
  -- EXPANDED COMPATIBILITY - New Equipment & Parts Links
  -- =====================================================

  -- Apex: CAT 320 Excavator #2 (shares parts with original CAT 320)
  ('aa0e8400-e29b-41d4-a716-446655440040'::uuid, 'a20e8400-e29b-41d4-a716-446655440001'::uuid),  -- Hydraulic Oil
  ('aa0e8400-e29b-41d4-a716-446655440040'::uuid, 'a20e8400-e29b-41d4-a716-446655440002'::uuid),  -- Air Filter (CAT)
  ('aa0e8400-e29b-41d4-a716-446655440040'::uuid, 'a20e8400-e29b-41d4-a716-446655440003'::uuid),  -- Track Shoes
  ('aa0e8400-e29b-41d4-a716-446655440040'::uuid, 'a20e8400-e29b-41d4-a716-446655440004'::uuid),  -- Fuel Filter
  ('aa0e8400-e29b-41d4-a716-446655440040'::uuid, 'a20e8400-e29b-41d4-a716-446655440041'::uuid),  -- Hydraulic Pump Seal Kit

  -- Apex: Komatsu PC210 Excavator
  ('aa0e8400-e29b-41d4-a716-446655440041'::uuid, 'a20e8400-e29b-41d4-a716-446655440001'::uuid),  -- Hydraulic Oil (universal)
  ('aa0e8400-e29b-41d4-a716-446655440041'::uuid, 'a20e8400-e29b-41d4-a716-446655440040'::uuid),  -- Komatsu Air Filter
  ('aa0e8400-e29b-41d4-a716-446655440041'::uuid, 'a20e8400-e29b-41d4-a716-446655440041'::uuid),  -- Hydraulic Pump Seal Kit
  ('aa0e8400-e29b-41d4-a716-446655440041'::uuid, 'a20e8400-e29b-41d4-a716-446655440004'::uuid),  -- Fuel Filter

  -- Apex: John Deere 700K Dozer
  ('aa0e8400-e29b-41d4-a716-446655440042'::uuid, 'a20e8400-e29b-41d4-a716-446655440001'::uuid),  -- Hydraulic Oil
  ('aa0e8400-e29b-41d4-a716-446655440042'::uuid, 'a20e8400-e29b-41d4-a716-446655440002'::uuid),  -- Air Filter
  ('aa0e8400-e29b-41d4-a716-446655440042'::uuid, 'a20e8400-e29b-41d4-a716-446655440004'::uuid),  -- Fuel Filter
  ('aa0e8400-e29b-41d4-a716-446655440042'::uuid, 'a20e8400-e29b-41d4-a716-446655440042'::uuid),  -- Track Roller

  -- Apex: Original JD 850L Dozer also uses Track Roller
  ('aa0e8400-e29b-41d4-a716-446655440001'::uuid, 'a20e8400-e29b-41d4-a716-446655440042'::uuid),  -- Track Roller

  -- Apex: Generac XG7500E Generator (shares fuel filter)
  ('aa0e8400-e29b-41d4-a716-446655440043'::uuid, 'a20e8400-e29b-41d4-a716-446655440004'::uuid),  -- Fuel Filter

  -- Metro: Bobcat S650 #2 (shares parts with original)
  ('aa0e8400-e29b-41d4-a716-446655440050'::uuid, 'a20e8400-e29b-41d4-a716-446655440012'::uuid),  -- Bucket Teeth
  ('aa0e8400-e29b-41d4-a716-446655440050'::uuid, 'a20e8400-e29b-41d4-a716-446655440050'::uuid),  -- Hydraulic Filter

  -- Metro: Bobcat S770 Skid Steer
  ('aa0e8400-e29b-41d4-a716-446655440051'::uuid, 'a20e8400-e29b-41d4-a716-446655440012'::uuid),  -- Bucket Teeth
  ('aa0e8400-e29b-41d4-a716-446655440051'::uuid, 'a20e8400-e29b-41d4-a716-446655440050'::uuid),  -- Hydraulic Filter

  -- Metro: Original Bobcat S650 also uses Hydraulic Filter
  ('aa0e8400-e29b-41d4-a716-446655440010'::uuid, 'a20e8400-e29b-41d4-a716-446655440050'::uuid),  -- Hydraulic Filter

  -- Metro: Genie GS-1930 Scissor Lift
  ('aa0e8400-e29b-41d4-a716-446655440052'::uuid, 'a20e8400-e29b-41d4-a716-446655440051'::uuid),  -- Battery

  -- Metro: Original Genie GS-2669 also uses same battery
  ('aa0e8400-e29b-41d4-a716-446655440012'::uuid, 'a20e8400-e29b-41d4-a716-446655440051'::uuid),  -- Battery

  -- Metro: JLG 600S Boom Lift
  ('aa0e8400-e29b-41d4-a716-446655440053'::uuid, 'a20e8400-e29b-41d4-a716-446655440010'::uuid),  -- Hydraulic Seal Kit
  ('aa0e8400-e29b-41d4-a716-446655440053'::uuid, 'a20e8400-e29b-41d4-a716-446655440052'::uuid),  -- Hydraulic Hose

  -- Metro: Original JLG 450AJ also uses Hydraulic Hose
  ('aa0e8400-e29b-41d4-a716-446655440011'::uuid, 'a20e8400-e29b-41d4-a716-446655440052'::uuid),  -- Hydraulic Hose

  -- Metro: Snorkel TB42J Boom Lift
  ('aa0e8400-e29b-41d4-a716-446655440054'::uuid, 'a20e8400-e29b-41d4-a716-446655440053'::uuid),  -- Control Cable

  -- Valley: John Deere Z930M Mower #2
  ('aa0e8400-e29b-41d4-a716-446655440060'::uuid, 'a20e8400-e29b-41d4-a716-446655440020'::uuid),  -- Blade Set
  ('aa0e8400-e29b-41d4-a716-446655440060'::uuid, 'a20e8400-e29b-41d4-a716-446655440062'::uuid),  -- Spindle Assembly

  -- Valley: Original Z930M also uses Spindle Assembly
  ('aa0e8400-e29b-41d4-a716-446655440020'::uuid, 'a20e8400-e29b-41d4-a716-446655440062'::uuid),  -- Spindle Assembly

  -- Valley: Kubota RTV-X1140 Utility Vehicle
  ('aa0e8400-e29b-41d4-a716-446655440061'::uuid, 'a20e8400-e29b-41d4-a716-446655440060'::uuid),  -- Oil Filter

  -- Valley: Original Kubota B2650 also uses same Oil Filter
  ('aa0e8400-e29b-41d4-a716-446655440022'::uuid, 'a20e8400-e29b-41d4-a716-446655440060'::uuid),  -- Oil Filter

  -- Valley: Husqvarna 572 XP Chainsaw
  ('aa0e8400-e29b-41d4-a716-446655440062'::uuid, 'a20e8400-e29b-41d4-a716-446655440061'::uuid),  -- Bar & Chain

  -- Industrial: Toyota 8FGU25 Forklift #2 (shares parts)
  ('aa0e8400-e29b-41d4-a716-446655440070'::uuid, 'a20e8400-e29b-41d4-a716-446655440030'::uuid),  -- Battery
  ('aa0e8400-e29b-41d4-a716-446655440070'::uuid, 'a20e8400-e29b-41d4-a716-446655440072'::uuid),  -- Mast Chain
  ('aa0e8400-e29b-41d4-a716-446655440070'::uuid, 'a20e8400-e29b-41d4-a716-446655440073'::uuid),  -- Seat Cushion

  -- Industrial: Toyota 8FGU25 Forklift #3
  ('aa0e8400-e29b-41d4-a716-446655440071'::uuid, 'a20e8400-e29b-41d4-a716-446655440030'::uuid),  -- Battery
  ('aa0e8400-e29b-41d4-a716-446655440071'::uuid, 'a20e8400-e29b-41d4-a716-446655440072'::uuid),  -- Mast Chain
  ('aa0e8400-e29b-41d4-a716-446655440071'::uuid, 'a20e8400-e29b-41d4-a716-446655440073'::uuid),  -- Seat Cushion

  -- Industrial: Original Toyota also uses new parts
  ('aa0e8400-e29b-41d4-a716-446655440030'::uuid, 'a20e8400-e29b-41d4-a716-446655440072'::uuid),  -- Mast Chain
  ('aa0e8400-e29b-41d4-a716-446655440030'::uuid, 'a20e8400-e29b-41d4-a716-446655440073'::uuid),  -- Seat Cushion

  -- Industrial: Hyster H50FT Forklift
  ('aa0e8400-e29b-41d4-a716-446655440072'::uuid, 'a20e8400-e29b-41d4-a716-446655440070'::uuid),  -- Propane Regulator
  ('aa0e8400-e29b-41d4-a716-446655440072'::uuid, 'a20e8400-e29b-41d4-a716-446655440072'::uuid),  -- Mast Chain
  ('aa0e8400-e29b-41d4-a716-446655440072'::uuid, 'a20e8400-e29b-41d4-a716-446655440073'::uuid),  -- Seat Cushion

  -- Industrial: Crown FC5245 Electric Forklift
  ('aa0e8400-e29b-41d4-a716-446655440073'::uuid, 'a20e8400-e29b-41d4-a716-446655440071'::uuid),  -- Charger
  ('aa0e8400-e29b-41d4-a716-446655440073'::uuid, 'a20e8400-e29b-41d4-a716-446655440073'::uuid),  -- Seat Cushion

  -- Industrial: Original Crown WP 3000 also uses Seat Cushion
  ('aa0e8400-e29b-41d4-a716-446655440031'::uuid, 'a20e8400-e29b-41d4-a716-446655440073'::uuid),  -- Seat Cushion

  -- Mike's Repair Shop: Sullair 185 Compressor
  ('aa0e8400-e29b-41d4-a716-446655440080'::uuid, 'a20e8400-e29b-41d4-a716-446655440080'::uuid),  -- Compressor Oil

  -- Mike's Repair Shop: Lincoln Ranger 225 Welder
  ('aa0e8400-e29b-41d4-a716-446655440081'::uuid, 'a20e8400-e29b-41d4-a716-446655440081'::uuid),  -- Electrode Holder

  -- Mike's Repair Shop: Milwaukee MX FUEL Saw
  ('aa0e8400-e29b-41d4-a716-446655440082'::uuid, 'a20e8400-e29b-41d4-a716-446655440082'::uuid),  -- Diamond Blade

  -- Tom's Field Services: Doosan P185 Compressor
  ('aa0e8400-e29b-41d4-a716-446655440090'::uuid, 'a20e8400-e29b-41d4-a716-446655440090'::uuid),  -- Separator Element

  -- Tom's Field Services: Vermeer S800TX Mini Skid Steer
  ('aa0e8400-e29b-41d4-a716-446655440091'::uuid, 'a20e8400-e29b-41d4-a716-446655440091'::uuid)   -- Rubber Tracks
ON CONFLICT DO NOTHING;
