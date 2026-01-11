-- =====================================================
-- EquipQR Seed Data - Pull Trailer PM Template (Global)
-- =====================================================
-- This seed creates the global Pull Trailer PM checklist template.
-- Global templates have organization_id = NULL and is_protected = true.
--
-- Template: Pull Trailer PM
-- Items: 51 checklist items across 8 sections
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
  'cc0e8400-e29b-41d4-a716-446655440002'::uuid,
  NULL,
  'Pull Trailer PM',
  'Comprehensive preventative maintenance checklist for pull trailers. Covers visual inspection, frame & structure, axle & suspension, wheels & tires, brake system, coupler & jack, lights & electrical, deck & body, and final inspection.',
  '[
    {"id": "visual-inspection-1", "title": "Overall Condition", "description": "Walk around the trailer and inspect the overall condition. Look for bent beams, cracked welds, or structural deformities. Note any significant rust, especially on critical components. Ensure trailer is clean enough for a proper inspection.", "required": true, "section": "Visual Inspection"},
    {"id": "visual-inspection-2", "title": "Underside and Components", "description": "Inspect the underside for hanging wires, loose brackets, debris, or damaged frame sections. Verify no mounting hardware is missing.", "required": true, "section": "Visual Inspection"},
    {"id": "visual-inspection-3", "title": "Attachments and Accessories", "description": "Inspect spare tire carriers, toolboxes, and other attachments. Ensure accessories are securely mounted.", "required": true, "section": "Visual Inspection"},
    {"id": "visual-inspection-4", "title": "Cleanliness and Corrosion", "description": "Identify areas with corrosion or peeling paint. Remove dirt and grime that may hide cracks or damage.", "required": true, "section": "Visual Inspection"},
    {"id": "frame-structure-5", "title": "Main Frame Rails", "description": "Inspect the main rails for cracks, bends, or structural weakness. Pay special attention to welded areas and where the tongue joins the frame.", "required": true, "section": "Frame & Structure"},
    {"id": "frame-structure-6", "title": "Crossmembers and Floor Supports", "description": "Inspect crossmembers for cracks, loose fasteners, or rot (if wood deck). Look for corrosion at frame joints.", "required": true, "section": "Frame & Structure"},
    {"id": "frame-structure-7", "title": "Welds and Fasteners", "description": "Inspect all welds for cracks and verify bolts/latches are tight and not missing.", "required": true, "section": "Frame & Structure"},
    {"id": "frame-structure-8", "title": "Tie-Down Points", "description": "Inspect D-rings, stake pockets, rub rails, and anchor points. Ensure they are securely attached and undamaged.", "required": true, "section": "Frame & Structure"},
    {"id": "frame-structure-9", "title": "Fenders and Body Panels", "description": "Inspect fenders for cracks, loose bolts, or sharp edges. For enclosed trailers, inspect walls, roof, and seams for structural integrity.", "required": true, "section": "Frame & Structure"},
    {"id": "axle-suspension-10", "title": "Springs and Spring Hangers", "description": "Inspect leaf springs for cracks or broken leaves. Check spring hangers for deformation or cracked welds.", "required": true, "section": "Axle & Suspension"},
    {"id": "axle-suspension-11", "title": "Shackles and Equalizers", "description": "Inspect shackle links and equalizers for wear (oval holes or worn bolts). Grease if zerks are present.", "required": true, "section": "Axle & Suspension"},
    {"id": "axle-suspension-12", "title": "Axle Beams", "description": "Inspect axles for bends, cracks, and rust thinning. Check U-bolts for proper torque.", "required": true, "section": "Axle & Suspension"},
    {"id": "axle-suspension-13", "title": "Torsion Axle Components", "description": "Inspect torsion arms for cracks and verify axle height symmetry.", "required": true, "section": "Axle & Suspension"},
    {"id": "axle-suspension-14", "title": "Suspension Lubrication", "description": "Lubricate any greasable components and purge old grease.", "required": true, "section": "Axle & Suspension"},
    {"id": "wheels-tires-15", "title": "Tire Tread and Sidewalls", "description": "Inspect tread depth and even wear. Check for sidewall cracks, bulges, or cuts.", "required": true, "section": "Wheels & Tires"},
    {"id": "wheels-tires-16", "title": "Tire Pressure", "description": "Check tire inflation when cold and fill to recommended PSI.", "required": true, "section": "Wheels & Tires"},
    {"id": "wheels-tires-17", "title": "Wheel Lug Nuts", "description": "Verify all lug nuts are present and torqued to spec.", "required": true, "section": "Wheels & Tires"},
    {"id": "wheels-tires-18", "title": "Wheel Bearings", "description": "Jack up wheels and spin by hand. Listen for grinding and check for play.", "required": true, "section": "Wheels & Tires"},
    {"id": "wheels-tires-19", "title": "Bearing Grease and Seals", "description": "Inspect for grease leakage at seals. Add grease or plan for repack if needed.", "required": true, "section": "Wheels & Tires"},
    {"id": "brake-system-20", "title": "Brake Type Verification", "description": "Determine whether the trailer has electric, hydraulic surge, EOH, or no brakes.", "required": true, "section": "Brake System"},
    {"id": "brake-system-21", "title": "Electric Brake Wiring", "description": "Inspect wiring to backing plates for fraying or loose connections.", "required": true, "section": "Brake System"},
    {"id": "brake-system-22", "title": "Brake Linings and Magnets", "description": "Inspect brake shoe linings and brake magnets for wear or scoring.", "required": true, "section": "Brake System"},
    {"id": "brake-system-23", "title": "Brake Adjustment", "description": "Adjust drum brakes to proper drag and back off slightly.", "required": true, "section": "Brake System"},
    {"id": "brake-system-24", "title": "Surge Brake Actuator and Fluid", "description": "For surge brakes, inspect actuator, brake fluid level, and condition.", "required": true, "section": "Brake System"},
    {"id": "brake-system-25", "title": "Hydraulic Lines and Cylinders", "description": "Inspect hydraulic brake lines for corrosion, leaks, or damage.", "required": true, "section": "Brake System"},
    {"id": "brake-system-26", "title": "Breakaway Brake System", "description": "Test electric breakaway system, pull pin test, and verify battery charge level.", "required": true, "section": "Brake System"},
    {"id": "coupler-jack-27", "title": "Coupler Condition", "description": "Inspect coupler latch for cracks, wear, or deformation. Verify proper ball size compatibility.", "required": true, "section": "Coupler & Jack"},
    {"id": "coupler-jack-28", "title": "Coupler Bolts/Welds", "description": "Inspect attachment bolts or welds for structural integrity.", "required": true, "section": "Coupler & Jack"},
    {"id": "coupler-jack-29", "title": "Safety Chains", "description": "Inspect chains for wear, cracks, and functional safety latches.", "required": true, "section": "Coupler & Jack"},
    {"id": "coupler-jack-30", "title": "Tongue Jack Operation", "description": "Test jack raising/lowering and inspect for smooth operation.", "required": true, "section": "Coupler & Jack"},
    {"id": "coupler-jack-31", "title": "Tongue Jack Support and Foot", "description": "Inspect jack footplate or wheel for secure mounting and wear.", "required": true, "section": "Coupler & Jack"},
    {"id": "coupler-jack-32", "title": "Hitch Ball & Mount (if available)", "description": "Verify tow vehicle ball size matches coupler and ensure ball mount is secure.", "required": true, "section": "Coupler & Jack"},
    {"id": "lights-electrical-33", "title": "Wiring Harness and Connector", "description": "Inspect harness for cuts, abrasions, or corrosion. Check plug pins for damage.", "required": true, "section": "Lights & Electrical"},
    {"id": "lights-electrical-34", "title": "Trailer Plug Junction Box", "description": "Inspect junction box for water ingress, corrosion, and loose terminals.", "required": true, "section": "Lights & Electrical"},
    {"id": "lights-electrical-35", "title": "Tail Lights and Markers", "description": "Test tail, brake, and turn signals. Inspect marker and clearance lights.", "required": true, "section": "Lights & Electrical"},
    {"id": "lights-electrical-36", "title": "License Plate Light", "description": "Verify plate light illuminates properly.", "required": true, "section": "Lights & Electrical"},
    {"id": "lights-electrical-37", "title": "Reflectors and Reflective Tape", "description": "Ensure all DOT reflectors and tape are present and clean.", "required": true, "section": "Lights & Electrical"},
    {"id": "lights-electrical-38", "title": "Breakaway Battery Charge (if applicable)", "description": "Test breakaway battery charge level and confirm charging from tow vehicle.", "required": true, "section": "Lights & Electrical"},
    {"id": "deck-body-39", "title": "Deck Surface", "description": "Inspect wooden or steel deck for rot, cracks, dents, or corrosion.", "required": true, "section": "Deck & Body"},
    {"id": "deck-body-40", "title": "Deck Fastening", "description": "Check deck bolts/screws for tightness or missing hardware.", "required": true, "section": "Deck & Body"},
    {"id": "deck-body-41", "title": "Ramps or Tailgate", "description": "Inspect ramp hinges, latch pins, and structural condition. Verify smooth deployment.", "required": true, "section": "Deck & Body"},
    {"id": "deck-body-42", "title": "Ramp/Gate Springs and Pins", "description": "Inspect springs, torsion tubes, and locking pins for wear.", "required": true, "section": "Deck & Body"},
    {"id": "deck-body-43", "title": "Enclosed Trailer Features (if applicable)", "description": "Inspect doors, hinges, seals, interior panels, vents, and interior lighting.", "required": true, "section": "Deck & Body"},
    {"id": "deck-body-44", "title": "Cargo Securement Points", "description": "Inspect D-rings, E-track, or hooks for structural integrity.", "required": true, "section": "Deck & Body"},
    {"id": "final-inspection-45", "title": "Hitching and Alignment", "description": "Attach to tow vehicle and ensure proper coupler seating, pinning, and chain crossing.", "required": true, "section": "Final Inspection"},
    {"id": "final-inspection-46", "title": "Light and Brake Function Test", "description": "Test all lighting functions again and verify brake controller output (if equipped).", "required": true, "section": "Final Inspection"},
    {"id": "final-inspection-47", "title": "Initial Road Feel", "description": "Tow trailer briefly and observe tracking, noise, braking, and sway.", "required": true, "section": "Final Inspection"},
    {"id": "final-inspection-48", "title": "Wheel Lug Re-Torque", "description": "Re-check lug nut torque after initial road test.", "required": true, "section": "Final Inspection"},
    {"id": "final-inspection-49", "title": "Post-Trip Touch Test", "description": "Carefully touch hubs and brake drums to check for overheating.", "required": true, "section": "Final Inspection"},
    {"id": "final-inspection-50", "title": "Security and Storage", "description": "Park trailer, chock wheels, and secure ramps and accessories.", "required": true, "section": "Final Inspection"},
    {"id": "final-inspection-51", "title": "Documentation", "description": "Record maintenance actions, torque specs, tire pressures, brake adjustments, and future follow-up needs.", "required": true, "section": "Final Inspection"}
  ]'::jsonb,
  true,
  'bb0e8400-e29b-41d4-a716-446655440001'::uuid,
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "public"."pm_checklist_templates"
  WHERE "id" = 'cc0e8400-e29b-41d4-a716-446655440002'::uuid
)
ON CONFLICT (id) DO NOTHING;
