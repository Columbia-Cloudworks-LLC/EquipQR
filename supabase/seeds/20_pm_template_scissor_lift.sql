-- =====================================================
-- EquipQR Seed Data - Scissor Lift PM Template (Global)
-- =====================================================
-- This seed creates the global Scissor Lift PM checklist template.
-- Global templates have organization_id = NULL and is_protected = true.
--
-- Template: Scissor Lift PM
-- Items: 74 checklist items across 10 sections
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
  'cc0e8400-e29b-41d4-a716-446655440004'::uuid,
  NULL,
  'Scissor Lift PM',
  'Comprehensive preventative maintenance checklist for scissor lifts. Covers visual inspection, battery & charger, engine & fuel system, electrical system, hydraulic system, lift mechanism, platform & safety systems, controls & indicators, drive & steering, and final inspection.',
  '[
    {"id": "visual-inspection-1", "title": "General Condition and Leaks", "description": "Walk around the scissor lift and inspect for any obvious damage or deformities in the structure. Look underneath for any oil or hydraulic fluid leaks on the ground or dripping from the machine (hydraulic hoses, motors, or cylinder areas). Ensure the machine is relatively clean so that components are visible.", "required": true, "section": "Visual Inspection"},
    {"id": "visual-inspection-2", "title": "Decals and Operational Labels", "description": "Verify that all safety decals, warning labels, and operational instruction placards (including capacity charts) are present and legible. Replace any missing or illegible decals to maintain safety information on the lift.", "required": true, "section": "Visual Inspection"},
    {"id": "visual-inspection-3", "title": "Guardrails and Structure", "description": "Check that all guardrails are in place, properly secured with pins or fasteners, and not bent or damaged. Ensure the scissor stack (lifting arms) is straight and free of obvious cracks or excessive wear at pivot points. Inspect the base frame for any cracks, particularly near welds or high-stress areas.", "required": true, "section": "Visual Inspection"},
    {"id": "visual-inspection-4", "title": "Battery and Fluid Trays", "description": "If the unit is battery powered, open the battery compartment tray and ensure there are no spilled electrolytes or corrosion buildup outside the batteries. If engine-powered, inspect the engine tray or compartment for accumulated debris, oil, or fuel residue.", "required": true, "section": "Visual Inspection"},
    {"id": "visual-inspection-5", "title": "Wheels and Casters (Initial Check)", "description": "Visually inspect the wheels and tires for any cuts, chunks missing, or signs of flat spots. Ensure that all wheel nuts are present. Note if tires are pneumatic (check for proper inflation later) or solid rubber; they should not be excessively worn or damaged.", "required": true, "section": "Visual Inspection"},
    {"id": "visual-inspection-6", "title": "Outriggers or Pothole Protection (if equipped)", "description": "If the lift has outriggers or stabilizers, ensure they are properly stowed and not damaged. For slab scissors with automatic pothole protection bars, make sure these bars are retracted (flush with chassis) when the machine is lowered and not bent or obstructed.", "required": true, "section": "Visual Inspection"},
    {"id": "battery-charger-7", "title": "Battery Electrolyte Level and Condition", "description": "(Electric models) Open the battery compartment and check each battery cell''s electrolyte level (if flooded lead-acid batteries). It should cover the plates adequately. Top up with distilled water as needed. Skip if batteries are AGM/maintenance-free.", "required": true, "section": "Battery & Charger"},
    {"id": "battery-charger-8", "title": "Battery Terminals and Cables", "description": "Inspect all battery terminals for corrosion and tight connections. Clean any corrosion found. Ensure cable lugs are secure and wires undamaged.", "required": true, "section": "Battery & Charger"},
    {"id": "battery-charger-9", "title": "Battery Restraints and Case", "description": "Ensure batteries are properly secured with hold-downs. Check cases for cracks or swelling.", "required": true, "section": "Battery & Charger"},
    {"id": "battery-charger-10", "title": "Charger Operation and Cords", "description": "Plug in the charger and confirm indicators illuminate. Check AC cord for damage and verify charger fan (if equipped) operates.", "required": true, "section": "Battery & Charger"},
    {"id": "battery-charger-11", "title": "Charger Output and Indicators", "description": "Verify charger is delivering power by monitoring voltage increase or indicator behavior. Ensure all charge stages function as designed.", "required": true, "section": "Battery & Charger"},
    {"id": "battery-charger-12", "title": "Battery Disconnect Switch", "description": "Test battery master disconnect or emergency power cutoff. Ensure proper labeling and reliable operation.", "required": true, "section": "Battery & Charger"},
    {"id": "engine-fuel-system-if-equipped--13", "title": "Engine Oil Level", "description": "Check oil via dipstick before starting. Fill as necessary and change oil/filter if due.", "required": true, "section": "Engine & Fuel System (if equipped)"},
    {"id": "engine-fuel-system-if-equipped--14", "title": "Fuel Level and Quality", "description": "Ensure adequate fuel. Inspect for contamination and drain water separator if present.", "required": true, "section": "Engine & Fuel System (if equipped)"},
    {"id": "engine-fuel-system-if-equipped--15", "title": "Fuel Filter and Carburetor/Injection", "description": "Inspect and replace fuel filter if needed. For carbureted engines, verify choke/throttle linkage movement. For diesel, check injector area for leaks.", "required": true, "section": "Engine & Fuel System (if equipped)"},
    {"id": "engine-fuel-system-if-equipped--16", "title": "Engine Coolant and Radiator", "description": "Verify coolant level and inspect hoses for cracks or leaks. Clean radiator fins if blocked.", "required": true, "section": "Engine & Fuel System (if equipped)"},
    {"id": "engine-fuel-system-if-equipped--17", "title": "Air Filter and Spark Arrestor", "description": "Inspect and clean/replace air filter. Check spark arrestor for carbon buildup and clean if needed.", "required": true, "section": "Engine & Fuel System (if equipped)"},
    {"id": "engine-fuel-system-if-equipped--18", "title": "Belts and Engine Wiring", "description": "Inspect belts for wear and tension. Inspect wiring for fraying or loose connections.", "required": true, "section": "Engine & Fuel System (if equipped)"},
    {"id": "engine-fuel-system-if-equipped--19", "title": "Engine Start and Idle (Pre-test)", "description": "Start engine briefly to verify easy starting and smooth idle. Shut down to proceed with inspection.", "required": true, "section": "Engine & Fuel System (if equipped)"},
    {"id": "engine-fuel-system-if-equipped--20", "title": "Fuel System Leaks", "description": "While engine is running, inspect lines for leaks. Address any leaks immediately.", "required": true, "section": "Engine & Fuel System (if equipped)"},
    {"id": "electrical-system-21", "title": "Control Wiring and Harnesses", "description": "Inspect wiring from platform and ground control boxes. Look for abrasion, pinched sections, and loose plugs.", "required": true, "section": "Electrical System"},
    {"id": "electrical-system-22", "title": "Fuses and Circuit Breakers", "description": "Check all fuses and breakers. Verify none are blown or sticking.", "required": true, "section": "Electrical System"},
    {"id": "electrical-system-23", "title": "Lights and Alarms", "description": "Test beacon, work lights, motion alarm, and descent alarm.", "required": true, "section": "Electrical System"},
    {"id": "electrical-system-24", "title": "Horn and Warning Buzzer", "description": "Verify horn works and test any overload or tilt warning buzzers if available.", "required": true, "section": "Electrical System"},
    {"id": "electrical-system-25", "title": "Battery Indicator and Gauges", "description": "Power system on and check battery indicators, engine gauges, and service lights.", "required": true, "section": "Electrical System"},
    {"id": "electrical-system-26", "title": "Ground Control Panel Function", "description": "Test ground-level lift and engine controls. Confirm key switch transfers control between stations.", "required": true, "section": "Electrical System"},
    {"id": "hydraulic-system-27", "title": "Hydraulic Oil Level", "description": "Check sight glass or dipstick with lift fully lowered. Fill as necessary.", "required": true, "section": "Hydraulic System"},
    {"id": "hydraulic-system-28", "title": "Hydraulic Oil Condition", "description": "Inspect oil condition for cloudiness, contamination, or burnt odor.", "required": true, "section": "Hydraulic System"},
    {"id": "hydraulic-system-29", "title": "Hydraulic Pump and Motor", "description": "Inspect pump/motor for leaks or unusual noises. Ensure secure mounting.", "required": true, "section": "Hydraulic System"},
    {"id": "hydraulic-system-30", "title": "Valves and Manifolds", "description": "Inspect valve block and solenoids for leaks or loose connectors.", "required": true, "section": "Hydraulic System"},
    {"id": "hydraulic-system-31", "title": "Hydraulic Cylinders", "description": "Inspect lift cylinders for rod pitting, scratches, or seal leakage.", "required": true, "section": "Hydraulic System"},
    {"id": "hydraulic-system-32", "title": "Hoses and Fittings", "description": "Inspect all hoses for cracks, abrasion, and leaks. Check fitting tightness.", "required": true, "section": "Hydraulic System"},
    {"id": "hydraulic-system-33", "title": "Auxiliary Hydraulics (if applicable)", "description": "Inspect additional hydraulic functions or cylinders.", "required": true, "section": "Hydraulic System"},
    {"id": "hydraulic-system-34", "title": "Drip Pans and Containment", "description": "Clean any accumulated fluid in belly pans or trays.", "required": true, "section": "Hydraulic System"},
    {"id": "lift-mechanism-scissor-assembly--35", "title": "Scissor Pins and Bushings", "description": "Check for excessive movement, metal dust, or missing retainers.", "required": true, "section": "Lift Mechanism (Scissor Assembly)"},
    {"id": "lift-mechanism-scissor-assembly--36", "title": "Scissor Arms and Welds", "description": "Inspect arms and welds for cracks or distortion.", "required": true, "section": "Lift Mechanism (Scissor Assembly)"},
    {"id": "lift-mechanism-scissor-assembly--37", "title": "Slide Blocks/Wear Pads", "description": "Inspect wear pads for cracks or thinning. Replace if worn to metal.", "required": true, "section": "Lift Mechanism (Scissor Assembly)"},
    {"id": "lift-mechanism-scissor-assembly--38", "title": "Lift Cylinder Mounts", "description": "Inspect cylinder mount pins and surrounding metal for cracks.", "required": true, "section": "Lift Mechanism (Scissor Assembly)"},
    {"id": "lift-mechanism-scissor-assembly--39", "title": "Limit Switches or Sensors", "description": "Verify function and mounting of height limit switches.", "required": true, "section": "Lift Mechanism (Scissor Assembly)"},
    {"id": "lift-mechanism-scissor-assembly--40", "title": "Maintenance Prop Rod", "description": "Inspect maintenance prop for bending and verify proper deployment.", "required": true, "section": "Lift Mechanism (Scissor Assembly)"},
    {"id": "lift-mechanism-scissor-assembly--41", "title": "Lubrication of Pivot Points", "description": "Grease all scissor pivot points and linkage zerks.", "required": true, "section": "Lift Mechanism (Scissor Assembly)"},
    {"id": "platform-safety-systems-42", "title": "Platform Entry Gate/Chain", "description": "Ensure gate or chain closes securely and operates smoothly.", "required": true, "section": "Platform & Safety Systems"},
    {"id": "platform-safety-systems-43", "title": "Guardrails and Toe Boards", "description": "Inspect for damage and ensure all fasteners are tight.", "required": true, "section": "Platform & Safety Systems"},
    {"id": "platform-safety-systems-44", "title": "Lanyard Anchor Points", "description": "Verify proper labeling and secure mounting of anchor points.", "required": true, "section": "Platform & Safety Systems"},
    {"id": "platform-safety-systems-45", "title": "Platform Floor and Extension", "description": "Clean platform surface. Inspect sliding deck for smooth travel and secure locking.", "required": true, "section": "Platform & Safety Systems"},
    {"id": "platform-safety-systems-46", "title": "Load Sensing System (if applicable)", "description": "Inspect overload sensor pads or pressure sensors for damage.", "required": true, "section": "Platform & Safety Systems"},
    {"id": "platform-safety-systems-47", "title": "Descent Alarm and Tilt Sensor", "description": "Test descent alarm and tilt sensor operation.", "required": true, "section": "Platform & Safety Systems"},
    {"id": "platform-safety-systems-48", "title": "Fire Extinguisher (if required)", "description": "Ensure extinguisher is present, charged, and secured.", "required": true, "section": "Platform & Safety Systems"},
    {"id": "controls-indicators-49", "title": "Ground Control Station", "description": "Test all switches, including emergency stop and key operations.", "required": true, "section": "Controls & Indicators"},
    {"id": "controls-indicators-50", "title": "Platform Control Console", "description": "Inspect controller mounting and labeling. Test emergency stop.", "required": true, "section": "Controls & Indicators"},
    {"id": "controls-indicators-51", "title": "Function Controls Operation", "description": "Test lift, drive, and other hydraulic functions for solenoid activation and proper interlock behavior.", "required": true, "section": "Controls & Indicators"},
    {"id": "controls-indicators-52", "title": "Steering and Drive Controls", "description": "Test steering cylinder movement and drive motor response.", "required": true, "section": "Controls & Indicators"},
    {"id": "controls-indicators-53", "title": "Control Interlocks", "description": "Verify all safety interlocks prevent movement when expected (e.g., drive disabled when elevated).", "required": true, "section": "Controls & Indicators"},
    {"id": "controls-indicators-54", "title": "Indicator Lights and Displays", "description": "Confirm proper function of battery gauge, tilt warning, and other indicators.", "required": true, "section": "Controls & Indicators"},
    {"id": "controls-indicators-55", "title": "Backup/Travel Alarm", "description": "Test travel alarm once machine is in motion.", "required": true, "section": "Controls & Indicators"},
    {"id": "controls-indicators-56", "title": "Communication Devices (if any)", "description": "Test optional alarm or communication equipment.", "required": true, "section": "Controls & Indicators"},
    {"id": "drive-steering-57", "title": "Tire Pressure and Condition", "description": "Check inflation for pneumatic tires or inspect solid tires for wear/damage.", "required": true, "section": "Drive & Steering"},
    {"id": "drive-steering-58", "title": "Wheel Lug Nuts", "description": "Check lug nuts for proper torque.", "required": true, "section": "Drive & Steering"},
    {"id": "drive-steering-59", "title": "Wheel Bearings and Hubs", "description": "Spin wheels to check for bearing noise; inspect for play.", "required": true, "section": "Drive & Steering"},
    {"id": "drive-steering-60", "title": "Drive Motors/Transaxle", "description": "Inspect hydraulic or electric drive motors for leaks or loose fasteners.", "required": true, "section": "Drive & Steering"},
    {"id": "drive-steering-61", "title": "Service and Parking Brakes", "description": "Test braking function and verify parking brake or automatic brake operation.", "required": true, "section": "Drive & Steering"},
    {"id": "drive-steering-62", "title": "Steering Cylinder and Linkages", "description": "Inspect cylinder and linkage joints for wear or leaks.", "required": true, "section": "Drive & Steering"},
    {"id": "drive-steering-63", "title": "Alignment and Toe (Observation)", "description": "Inspect visually for misalignment or uneven tire wear.", "required": true, "section": "Drive & Steering"},
    {"id": "drive-steering-64", "title": "Caster Wheels (if applicable)", "description": "Inspect casters for free spinning and secure mounting.", "required": true, "section": "Drive & Steering"},
    {"id": "final-inspection-65", "title": "Raising and Lowering Test", "description": "Fully raise platform, observing lift speed and listening for abnormal noises. Lower smoothly; verify descent alarm works.", "required": true, "section": "Final Inspection"},
    {"id": "final-inspection-66", "title": "Emergency Lowering Function", "description": "Test ground-level emergency lowering valve for smooth operation.", "required": true, "section": "Final Inspection"},
    {"id": "final-inspection-67", "title": "Drive Function and Braking Test", "description": "Test drive forward/reverse and braking in an open area.", "required": true, "section": "Final Inspection"},
    {"id": "final-inspection-68", "title": "Steering Function Test", "description": "Test steering under low-speed movement.", "required": true, "section": "Final Inspection"},
    {"id": "final-inspection-69", "title": "Elevated Drive Cutout Test", "description": "Verify machine limits drive speed or disables drive when elevated.", "required": true, "section": "Final Inspection"},
    {"id": "final-inspection-70", "title": "Tilt Sensor Activation", "description": "Simulate slight tilt to verify alarm and lift-disable function.", "required": true, "section": "Final Inspection"},
    {"id": "final-inspection-71", "title": "Engine Performance under Load (Engine models)", "description": "Observe engine behavior during lifting/driving; verify no stalling or surging.", "required": true, "section": "Final Inspection"},
    {"id": "final-inspection-72", "title": "Post-Operation Leak Inspection", "description": "Inspect hydraulic and engine components for new leaks after operation.", "required": true, "section": "Final Inspection"},
    {"id": "final-inspection-73", "title": "Secure and Stow", "description": "Power down machine, close gate/chain, secure accessories, and plug into charger if electric.", "required": true, "section": "Final Inspection"},
    {"id": "final-inspection-74", "title": "Documentation and PM Sticker", "description": "Record PM, update service sticker, and note any follow-up repairs.", "required": true, "section": "Final Inspection"}
  ]'::jsonb,
  true,
  'bb0e8400-e29b-41d4-a716-446655440001'::uuid,
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "public"."pm_checklist_templates"
  WHERE "id" = 'cc0e8400-e29b-41d4-a716-446655440004'::uuid
)
ON CONFLICT (id) DO NOTHING;
