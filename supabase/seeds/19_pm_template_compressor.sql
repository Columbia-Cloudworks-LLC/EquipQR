-- =====================================================
-- EquipQR Seed Data - Compressor PM Template (Global)
-- =====================================================
-- This seed creates the global Compressor PM checklist template.
-- Global templates have organization_id = NULL and is_protected = true.
--
-- Template: Compressor PM
-- Items: 53 checklist items across 9 sections
-- =====================================================

INSERT INTO "public"."pm_checklist_templates" (
  "id",
  "organization_id",
  "name",
  "description",
  "template_data",
  "is_protected",
  "created_by",
  "created_at",
  "updated_at"
)
SELECT
  'cc0e8400-e29b-41d4-a716-446655440003'::uuid,
  NULL,
  'Compressor PM',
  'Comprehensive preventative maintenance checklist for air compressors. Covers visual inspection, engine compartment, electrical system, compressor & air system, cooling system, fuel system, chassis & frame, and final inspection.',
  '[
    {"id": "visual-inspection-1", "title": "Overall Condition and Leaks", "description": "Walk around the compressor unit and look underneath for any signs of oil, coolant, or fuel leaks. Observe the exterior and frame for damage, loose panels, or missing bolts. Ensure the unit is clean enough to inspect.", "required": true, "section": "Visual Inspection"},
    {"id": "visual-inspection-2", "title": "Safety Decals and Labels", "description": "Verify all safety and operational decals are in place and legible.", "required": true, "section": "Visual Inspection"},
    {"id": "visual-inspection-3", "title": "Gauges and Control Panel", "description": "Inspect pressure gauges, hour meters, switches, and the emergency stop button for condition and clarity.", "required": true, "section": "Visual Inspection"},
    {"id": "visual-inspection-4", "title": "Hoses and Connections", "description": "Inspect discharge hoses, coupling points, outlet valves, and quick couplers for cracks, leaks, or wear.", "required": true, "section": "Visual Inspection"},
    {"id": "visual-inspection-5", "title": "Mounting and Vibration Pads", "description": "Check that engine and compressor mounts, bolts, and vibration isolators are secure and undamaged.", "required": true, "section": "Visual Inspection"},
    {"id": "visual-inspection-6", "title": "Lifting Eye or Points", "description": "Inspect lifting eyes or hoisting points for cracks, bends, or loose bolts.", "required": true, "section": "Visual Inspection"},
    {"id": "engine-compartment-7", "title": "Engine Oil Level and Condition", "description": "Check oil with dipstick. Top off or change oil and filter per schedule.", "required": true, "section": "Engine Compartment"},
    {"id": "engine-compartment-8", "title": "Air Filter Element", "description": "Inspect engine air filter and housing; clean or replace as needed.", "required": true, "section": "Engine Compartment"},
    {"id": "engine-compartment-9", "title": "Fuel Filter and Water Separator", "description": "Check for water or contaminants. Drain separator and replace fuel filter if required.", "required": true, "section": "Engine Compartment"},
    {"id": "engine-compartment-10", "title": "Coolant Level and Hoses", "description": "Inspect coolant level, radiator cap, hoses, and clamps for leaks or deterioration.", "required": true, "section": "Engine Compartment"},
    {"id": "engine-compartment-11", "title": "Belts and Pulley Alignment", "description": "Inspect drive belts for cracks or fraying. Check tension and pulley alignment.", "required": true, "section": "Engine Compartment"},
    {"id": "engine-compartment-12", "title": "Battery and Electrical Connections", "description": "Inspect battery, terminals, grounding straps, and wiring for corrosion or damage.", "required": true, "section": "Engine Compartment"},
    {"id": "engine-compartment-13", "title": "Exhaust System and Muffler", "description": "Inspect exhaust system for cracks, leaks, and secure mounting.", "required": true, "section": "Engine Compartment"},
    {"id": "engine-compartment-14", "title": "Engine Fluids and Leaks", "description": "Inspect engine area for leaks (oil, fuel, coolant) around major components.", "required": true, "section": "Engine Compartment"},
    {"id": "electrical-system-15", "title": "Battery Load Test", "description": "Perform voltage and load test to confirm battery health.", "required": true, "section": "Electrical System"},
    {"id": "electrical-system-16", "title": "Alternator Output", "description": "With engine running, measure charging voltage and listen for alternator noise.", "required": true, "section": "Electrical System"},
    {"id": "electrical-system-17", "title": "Starter and Ignition Circuit", "description": "Inspect starter motor, ignition switch, and glow plug/preheat circuits for proper function.", "required": true, "section": "Electrical System"},
    {"id": "electrical-system-18", "title": "Engine Control Panel Wiring", "description": "Check wiring behind the control panel for tight, undamaged connections.", "required": true, "section": "Electrical System"},
    {"id": "electrical-system-19", "title": "Operational Lights and Indicators", "description": "Test indicator lights, shutdown alarms, and trailer lighting (if equipped).", "required": true, "section": "Electrical System"},
    {"id": "electrical-system-20", "title": "Emergency Shutdown System", "description": "Test the emergency stop button and verify safety shutdown systems are operational.", "required": true, "section": "Electrical System"},
    {"id": "compressor-air-system-21", "title": "Compressor Oil Level", "description": "Check compressor airend oil level via sight glass or dipstick. Add or change oil as needed.", "required": true, "section": "Compressor & Air System"},
    {"id": "compressor-air-system-22", "title": "Air Intake Filter (Compressor)", "description": "Inspect and clean/replace compressor air filter.", "required": true, "section": "Compressor & Air System"},
    {"id": "compressor-air-system-23", "title": "Compressor Drive Coupling/Belt", "description": "Inspect coupling or belt tension/condition and ensure secure mounting.", "required": true, "section": "Compressor & Air System"},
    {"id": "compressor-air-system-24", "title": "Pressure Relief Valve", "description": "Inspect safety valve for corrosion or leaks. Observe valve behavior during pressurization.", "required": true, "section": "Compressor & Air System"},
    {"id": "compressor-air-system-25", "title": "System Pressure Gauge and Controls", "description": "Monitor pressure gauge during operation, confirming cut-out and unloader operation.", "required": true, "section": "Compressor & Air System"},
    {"id": "compressor-air-system-26", "title": "Moisture Separator and Drain", "description": "Inspect separator and drain accumulated water. Verify drain valve seals properly.", "required": true, "section": "Compressor & Air System"},
    {"id": "compressor-air-system-27", "title": "Air Hoses and Outlet Valves", "description": "Inspect hoses and outlet valves for leaks, cracks, or damage.", "required": true, "section": "Compressor & Air System"},
    {"id": "compressor-air-system-28", "title": "Compressor Thermal Shutoff", "description": "Check temperature sensors and monitor temperature during operation to ensure protection functions correctly.", "required": true, "section": "Compressor & Air System"},
    {"id": "cooling-system-29", "title": "Radiator and Oil Cooler Fins", "description": "Clean radiator and cooler fins using low-pressure air or soft brush.", "required": true, "section": "Cooling System"},
    {"id": "cooling-system-30", "title": "Coolant Quality and Cap", "description": "Inspect coolant inside radiator or tank. Check radiator cap seal and pressure.", "required": true, "section": "Cooling System"},
    {"id": "cooling-system-31", "title": "Cooling Hoses and Connections", "description": "Inspect all coolant hoses and clamps for wear or leakage.", "required": true, "section": "Cooling System"},
    {"id": "cooling-system-32", "title": "Engine Fan and Shroud", "description": "Verify fan spins freely, blades are intact, and shroud is secure.", "required": true, "section": "Cooling System"},
    {"id": "cooling-system-33", "title": "Temperature Controls", "description": "Test thermostat and verify fan engagement at proper temperature.", "required": true, "section": "Cooling System"},
    {"id": "fuel-system-34", "title": "Fuel Tank and Lines", "description": "Inspect tank for leaks, corrosion, and proper venting. Check fuel lines for chafing, cracks, and leaks.", "required": true, "section": "Fuel System"},
    {"id": "fuel-system-35", "title": "Fuel Level and Quality", "description": "Ensure clean fuel is present and sample for sediment or water if needed.", "required": true, "section": "Fuel System"},
    {"id": "fuel-system-36", "title": "Injector Pump and Injectors", "description": "Inspect around injectors and pump for leaks, tightening fittings if needed.", "required": true, "section": "Fuel System"},
    {"id": "fuel-system-37", "title": "Fuel Filter Change (if due)", "description": "Change filter and properly bleed system to prevent air lock.", "required": true, "section": "Fuel System"},
    {"id": "fuel-system-38", "title": "Throttle and Governor Linkage", "description": "Inspect linkages/cables for free movement and correct throttle response.", "required": true, "section": "Fuel System"},
    {"id": "chassis-frame-39", "title": "Trailer Frame and Mounts", "description": "Inspect frame, crossmembers, fenders, toolboxes, and mounting hardware for cracks or looseness.", "required": true, "section": "Chassis & Frame"},
    {"id": "chassis-frame-40", "title": "Tires and Wheels", "description": "Inspect tire condition and check tire pressure. Inspect wheel rims for damage and torque lug nuts.", "required": true, "section": "Chassis & Frame"},
    {"id": "chassis-frame-41", "title": "Axle and Suspension", "description": "Inspect leaf springs or torsion axles for wear or breakage. Check hub bearings and grease if applicable.", "required": true, "section": "Chassis & Frame"},
    {"id": "chassis-frame-42", "title": "Trailer Coupler and Safety Chains", "description": "Inspect coupler engagement, latch integrity, chain condition, and hook latches.", "required": true, "section": "Chassis & Frame"},
    {"id": "chassis-frame-43", "title": "Tongue Jack and Supports", "description": "Test jack for smooth raising/lowering and inspect mounting hardware.", "required": true, "section": "Chassis & Frame"},
    {"id": "chassis-frame-44", "title": "Lighting and Wiring Harness", "description": "Test tail, brake, and turn lights. Inspect wiring for abrasion or corrosion.", "required": true, "section": "Chassis & Frame"},
    {"id": "chassis-frame-45", "title": "Parking Brake or Wheel Chocks", "description": "Verify parking brake function (if equipped) or availability of chocks.", "required": true, "section": "Chassis & Frame"},
    {"id": "final-inspection-46", "title": "Operational Warm-Up", "description": "Start the engine and allow unit to warm up. Verify smooth idle and no warning indicators.", "required": true, "section": "Final Inspection"},
    {"id": "final-inspection-47", "title": "Full Pressure Test", "description": "Build system pressure and monitor cut-out behavior. Verify safety valve does not open prematurely.", "required": true, "section": "Final Inspection"},
    {"id": "final-inspection-48", "title": "Load Test and Engine Performance", "description": "Apply load by opening service valve. Verify engine increases RPM and holds pressure.", "required": true, "section": "Final Inspection"},
    {"id": "final-inspection-49", "title": "Leak Check During Operation", "description": "Inspect hoses/fittings for leaks using visual inspection or soapy water.", "required": true, "section": "Final Inspection"},
    {"id": "final-inspection-50", "title": "Safety Shutdown Test", "description": "Test shutdown systems (manual or simulated) and confirm proper operation.", "required": true, "section": "Final Inspection"},
    {"id": "final-inspection-51", "title": "Trailer Function Test (if applicable)", "description": "Connect to tow vehicle and verify coupler fit, safety chains, and trailer light function.", "required": true, "section": "Final Inspection"},
    {"id": "final-inspection-52", "title": "Final Walk-Around and Securing", "description": "Shut down unit, inspect for leaks, close all access panels, and secure hoses.", "required": true, "section": "Final Inspection"},
    {"id": "final-inspection-53", "title": "Documentation and Clean-Up", "description": "Record all PM actions, update service sticker, and clean any grease or oil smudges.", "required": true, "section": "Final Inspection"}
  ]'::jsonb,
  true,
  'bb0e8400-e29b-41d4-a716-446655440001'::uuid,
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "public"."pm_checklist_templates"
  WHERE "id" = 'cc0e8400-e29b-41d4-a716-446655440003'::uuid
)
ON CONFLICT (id) DO NOTHING;
