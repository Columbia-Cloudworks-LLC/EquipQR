import { logger } from '../utils/logger';

import { supabase } from '@/integrations/supabase/client';
import { Tables, Database, Json } from '@/integrations/supabase/types';

export type PreventativeMaintenance = Tables<'preventative_maintenance'>;

export interface PMChecklistItem {
  id: string;
  title: string;
  description?: string;
  condition: 1 | 2 | 3 | 4 | 5 | null | undefined;
  required: boolean;
  notes?: string;
  section: string;
}

export interface CreatePMData {
  workOrderId: string;
  equipmentId: string;
  organizationId: string;
  checklistData: PMChecklistItem[];
  notes?: string;
  templateId?: string;
}

export interface UpdatePMData {
  checklistData: PMChecklistItem[];
  notes?: string;
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
}

// Comprehensive forklift PM checklist with undefined conditions (unrated)
export const defaultForkliftChecklist: PMChecklistItem[] = [
  // 1. Visual Inspection
  {
    id: 'visual-1',
    title: 'Oil/Coolant Leaks',
    description: 'Inspect under and around the forklift for signs of oil or coolant leaks.',
    condition: undefined,
    required: true,
    section: 'Visual Inspection'
  },
  {
    id: 'visual-2',
    title: 'Carriage, Mast & LBR Assembly',
    description: 'Examine the carriage, mast, and load backrest for damage, cracks, or deformation.',
    condition: undefined,
    required: true,
    section: 'Visual Inspection'
  },
  {
    id: 'visaul-3',
    title: 'Forks and Fork Pins',
    description: 'Check that forks and fork pins are straight, undamaged, and securely attached.',
    condition: undefined,
    required: true,
    section: 'Visual Inspection'
  },
  {
    id: 'visual-4',
    title: 'Mast Chains, Rollers & Hoses',
    description: 'Inspect mast chains, rollers, and hoses for wear, proper tension, and leaks.',
    condition: undefined,
    required: true,
    section: 'Visual Inspection'
  },
  {
    id: 'visaul-5',
    title: 'Tire & Wheel Condition',
    description: 'Inspect tires and wheels for cuts, excessive wear, or missing lug nuts.',
    condition: undefined,
    required: true,
    section: 'Visual Inspection'
  },
  {
    id: 'visual-6',
    title: 'Seat & Seat Belt Condition',
    description: 'Ensure seat and seat belt are present, undamaged, and functioning properly.',
    condition: undefined,
    required: true,
    section: 'Visual Inspection'
  },
  {
    id: 'visual-7',
    title: 'Decals & Capacity Plates',
    description: 'Verify that all safety decals and capacity plates are present and legible.',
    condition: undefined,
    required: true,
    section: 'Visual Inspection'
  },
    {
    id: 'visual-8',
    title: 'Overhead Guard Condition',
    description: 'Check the overhead guard for bends, cracks, or missing hardware.',
    condition: undefined,
    required: true,
    section: 'Visual Inspection'
  },
    {
    id: 'visual-9',
    title: 'Check Cylinders for Leaks',
    description: 'Inspect all visible hydraulic cylinders for leaks or damage.',
    condition: undefined,
    required: true,
    section: 'Visual Inspection'
  },

  // 2. Engine Compartment
  {
    id: 'engine-compartment-1',
    title: 'Blow Out Engine Compartment',
    description: 'Use compressed air to clean debris and dust from the engine compartment.',
    condition: undefined,
    required: true,
    section: 'Engine Compartment'
  },
  {
    id: 'engine-compartment-2',
    title: 'Check Condition of Air Filter',
    description: 'Inspect and replace the air filter if dirty or clogged.',
    condition: undefined,
    required: true,
    section: 'Engine Compartment'
  },
  {
    id: 'engine-compartment-3',
    title: 'Change Engine Oil & Filter',
    description: 'Drain engine oil, replace with new oil, and install a new oil filter as specified.',
    condition: undefined,
    required: true,
    section: 'Engine Compartment'
  },
  {
    id: 'engine-compartment-4',
    title: 'Check hood Latch, Hinges & Hood Strut',
    description: 'Confirm hood latch, hinges, and strut function smoothly and securely.',
    condition: undefined,
    required: true,
    section: 'Engine Compartment'
  },
  {
    id: 'engine-compartment-5',
    title: 'Inspect Air Intake Hoses & Clamps',
    description: 'Examine air intake hoses and clamps for cracks, leaks, or loose fittings.',
    condition: undefined,
    required: true,
    section: 'Engine Compartment'
  },
  {
    id: 'engine-compartment-6',
    title: 'Check Ring Gear Condition',
    description: 'Inspect ring gear for visible damage or abnormal wear.',
    condition: undefined,
    required: true,
    section: 'Engine Compartment'
  },
  {
    id: 'engine-compartment-7',
    title: 'Check Hood Insulation & Hood Condition',
    description: 'Ensure hood insulation is intact and hood is free of damage.',
    condition: undefined,
    required: true,
    section: 'Engine Compartment'
  },
  {
    id: 'engine-compartment-8',
    title: 'Engine Noise / Smoke / Idle RPMs',
    description: 'Start the engine and check for abnormal noises, smoke, or incorrect idle speed.',
    condition: undefined,
    required: true,
    section: 'Engine Compartment'
  },
  {
    id: 'engine-compartment-9',
    title: 'Exhaust System / Muffler / Catalyst',
    description: 'Examine the exhaust system, muffler, and catalyst for leaks, noise, or damage.',
    condition: undefined,
    required: true,
    section: 'Engine Compartment'
  },
  {
    id: 'engine-compartment-10',
    title: 'Check for Engine Oil Leaks',
    description: 'Look for evidence of engine oil leaks under and around the engine.',
    condition: undefined,
    required: true,
    section: 'Engine Compartment'
  },
  {
    id: 'engine-compartment-11',
    title: 'Check Vacuum Lines / PCV Valve',
    description: 'Inspect vacuum lines and PCV valve for cracks, leaks, or blockages.',
    condition: undefined,
    required: true,
    section: 'Engine Compartment'
  },

  // 3. Electrical Inspection
  {
    id: 'electrical-1',
    title: 'Check Headlights, Strobe, Taillights',
    description: 'Verify all headlights, taillights, and strobe lights operate correctly.',
    condition: undefined,
    required: true,
    section: 'Electrical Inspection'
  },
  {
    id: 'electrical-2',
    title: 'Clean Battery Terminals / Load Test',
    description: 'Clean corrosion from battery terminals and perform a battery load test.',
    condition: undefined,
    required: true,
    section: 'Electrical Inspection'
  },
  {
    id: 'electrical-3',
    title: 'Inspect Wire Harness / Connections',
    description: 'Check wire harnesses and electrical connections for wear or loose fittings.',
    condition: undefined,
    required: true,
    section: 'Electrical Inspection'
  },
  {
    id: 'electrical-4',
    title: 'Check Neutral Safety Switch',
    description: 'Test the neutral safety switch for correct operation.',
    condition: undefined,
    required: true,
    section: 'Electrical Inspection'
  },
  {
    id: 'electrical-5',
    title: 'Check All Gauges & Hour Meter',
    description: 'Ensure all dashboard gauges and the hour meter function accurately.',
    condition: undefined,
    required: true,
    section: 'Electrical Inspection'
  },
  {
    id: 'electrical-6',
    title: 'Condition of Fuse Panel / Relay Box',
    description: 'Open and inspect the fuse panel and relay box for corrosion, damage, or missing fuses.',
    condition: undefined,
    required: true,
    section: 'Electrical Inspection'
  },
  {
    id: 'electrical-7',
    title: 'Inspect Alternator / Record Voltage',
    description: 'Inspect the alternator for damage and record operating voltage output.',
    condition: undefined,
    required: true,
    section: 'Electrical Inspection'
  },

  // 4. Hydraulic Inspection
  {
    id: 'hydraulic-1',
    title: 'Inspect Fluid Level & Quality',
    description: 'Check hydraulic fluid level and assess fluid for contamination or discoloration.',
    condition: undefined,
    required: true,
    section: 'Hydraulic Inspection'
  },
  {
    id: 'hydraulic-2',
    title: 'Inspect Pump / Control Valve',
    description: 'Visually inspect pump and control valve for leaks or damage.',
    condition: undefined,
    required: true,
    section: 'Hydraulic Inspection'
  },
  {
    id: 'hydraulic-3',
    title: 'Check Hydraulic Valve Levers',
    description: 'Operate all hydraulic levers to ensure smooth and proper function.',
    condition: undefined,
    required: true,
    section: 'Hydraulic Inspection'
  },
  {
    id: 'hydraulic-4',
    title: 'Check Pump Drive Shaft & U-Joints',
    description: 'Inspect the pump drive shaft and U-joints for wear or looseness.',
    condition: undefined,
    required: true,
    section: 'Hydraulic Inspection'
  },
  {
    id: 'hydraulic-5',
    title: 'Remove & Clean / Replace Tank Breather',
    description: 'Remove the tank breather, clean or replace as needed.',
    condition: undefined,
    required: true,
    section: 'Hydraulic Inspection'
  },
  {
    id: 'hydraulic-6',
    title: 'Inspect All Hoses & Fittings',
    description: 'Examine all hydraulic hoses and fittings for cracks, leaks, or abrasion.',
    condition: undefined,
    required: true,
    section: 'Hydraulic Inspection'
  },
  {
    id: 'hydraulic-7',
    title: 'Inspect Cylinders for Leaks',
    description: 'Check hydraulic cylinders for oil leaks or physical damage.',
    condition: undefined,
    required: true,
    section: 'Hydraulic Inspection'
  },

  // 5. Brakes
  {
    id: 'brakes-1',
    title: 'Check Fluid Level & Quality',
    description: 'Inspect the brake fluid reservoir for proper level and clear, uncontaminated fluid.',
    condition: undefined,
    required: true,
    section: 'Brake'
  },
  {
    id: 'brakes-2',
    title: 'Test PB Operation, Check Cables',
    description: 'Test parking brake operation and inspect cables for wear or binding.',
    condition: undefined,
    required: true,
    section: 'Brake'
  },
  {
    id: 'brakes-3',
    title: 'Test Service Brake Operation',
    description: 'Depress the service brake and confirm the forklift stops smoothly and promptly.',
    condition: undefined,
    required: true,
    section: 'Brake'
  },
  {
    id: 'brakes-4',
    title: 'Check Pedal Pads & Inching Pedal Cables',
    description: 'Inspect pedal pads for wear and inching pedal cables for proper function.',
    condition: undefined,
    required: true,
    section: 'Brake'
  },
  {
    id: 'brakes-5',
    title: 'Check Wheels & Cylinder for Leaks',
    description: 'Look for brake fluid leaks around wheel cylinders and brake assemblies.',
    condition: undefined,
    required: true,
    section: 'Brake'
  },
  {
    id: 'brakes-6',
    title: 'Check Brake / Inching Pedal Linkage',
    description: 'Inspect brake and inching pedal linkage for looseness or damage.',
    condition: undefined,
    required: true,
    section: 'Brake'
  },
  {
    id: 'brakes-7',
    title: 'Check Brake / Inching Pedal Free Play',
    description: 'Verify correct amount of free play in brake and inching pedals.',
    condition: undefined,
    required: true,
    section: 'Brake'
  },

  // 6. Steering
  {
    id: 'steering-1',
    title: 'Inspect Steering Cylinder for Leaks',
    description: 'Check steering cylinder for hydraulic leaks or visible damage.',
    condition: undefined,
    required: true,
    section: 'Steering'
  },
  {
    id: 'steering-2',
    title: 'Inspect Gear Box & Steer Column',
    description: 'Inspect the steering gear box and column for proper operation and leaks.',
    condition: undefined,
    required: true,
    section: 'Steering'
  },
  {
    id: 'steering-3',
    title: 'Check King Pins & Spindles',
    description: 'Check king pins and spindles for excessive play or wear.',
    condition: undefined,
    required: true,
    section: 'Steering'
  },
  {
    id: 'steering-4',
    title: 'Test Steer Wheel Bearings',
    description: 'Spin and rock steer wheels to check for noisy or loose bearings.',
    condition: undefined,
    required: true,
    section: 'Steering'
  },
  {
    id: 'steering-5',
    title: 'Check Steer Axle Mounts & Stops',
    description: 'Ensure steer axle mounts and stops are secure and undamaged.',
    condition: undefined,
    required: true,
    section: 'Steering'
  },
  {
    id: 'steering-6',
    title: 'Check Steering tie Rods & Pings',
    description: 'Inspect tie rods and pins for looseness or excessive wear.',
    condition: undefined,
    required: true,
    section: 'Steering'
  },
  {
    id: 'steering-7',
    title: 'Check Steer Wheel Bearings',
    description: 'Verify steer wheel bearings turn smoothly without noise or resistance.',
    condition: undefined,
    required: true,
    section: 'Steering'
  },
  {
    id: 'steering-8',
    title: 'Inspect Steer Wheel Lug Nuts / Rim / Cap',
    description: 'Check steer wheel lug nuts for tightness and inspect rim/cap for damage.',
    condition: undefined,
    required: true,
    section: 'Steering'
  },
  {
    id: 'steering-9',
    title: 'Check Steering Hoses at Cylinder & Box',
    description: 'Inspect steering hoses at both the cylinder and box for leaks or wear.',
    condition: undefined,
    required: true,
    section: 'Steering'
  },

  // 7. Differential & Transmission
  {
    id: 'differential-transmission-1',
    title: 'Check Fluid Levels & Condition',
    description: 'Inspect differential and transmission fluid levels and assess for contamination.',
    condition: undefined,
    required: true,
    section: 'Differential & Transmission'
  },
  {
    id: 'differential-transmission-2',
    title: 'Check for Abnormal Noise',
    description: 'Listen for unusual noises from differential or transmission during operation.',
    condition: undefined,
    required: true,
    section: 'Differential & Transmission'
  },
  {
    id: 'differential-transmission-3',
    title: 'Check Drive Wheel Bearings & Lug Nuts',
    description: 'Inspect drive wheel bearings for play and verify lug nuts are tight.',
    condition: undefined,
    required: true,
    section: 'Differential & Transmission'
  },
  {
    id: 'differential-transmission-4',
    title: 'Check Mounts & Bolts',
    description: 'Check that all mounts and bolts are secure and undamaged.',
    condition: undefined,
    required: true,
    section: 'Differential & Transmission'
  },
  {
    id: 'differential-transmission-5',
    title: 'Check for Leaks',
    description: 'Inspect the differential and transmission for signs of oil leaks.',
    condition: undefined,
    required: true,
    section: 'Differential & Transmission'
  },
  {
    id: 'differential-transmission-6',
    title: 'Check Drive Shaft & U-Joints',
    description: 'Examine drive shaft and U-joints for excessive play or wear.',
    condition: undefined,
    required: true,
    section: 'Differential & Transmission'
  },
  {
    id: 'differential-transmission-7',
    title: 'Check Shift Lever Linkage / Cables',
    description: 'Test shift lever linkage and cables for proper adjustment and smooth operation.',
    condition: undefined,
    required: true,
    section: 'Differential & Transmission'
  },
  {
    id: 'differential-transmission-8',
    title: 'Replace Fluid & Filters per OEM Spec',
    description: 'Replace differential and transmission fluids and filters according to manufacturer specification.',
    condition: undefined,
    required: true,
    section: 'Differential & Transmission'
  },

  // 8. Ignition System
  {
    id: 'ignition-1',
    title: 'Test Ignition Switch',
    description: 'Turn the ignition switch to verify smooth operation and proper start.',
    condition: undefined,
    required: true,
    section: 'Ignition System'
  },
  {
    id: 'ignition-2',
    title: 'Check Coil / Coil Packs',
    description: 'Inspect ignition coil or coil packs for damage or signs of arcing.',
    condition: undefined,
    required: true,
    section: 'Ignition System'
  },
  {
    id: 'ignition-3',
    title: 'Check Distributor Cap & Rotor',
    description: 'Remove and check distributor cap and rotor for wear or corrosion.',
    condition: undefined,
    required: true,
    section: 'Ignition System'
  },
  {
    id: 'ignition-4',
    title: 'Check Spark Plug Condition & Wires',
    description: 'Remove and inspect spark plugs and wires for fouling or damage.',
    condition: undefined,
    required: true,
    section: 'Ignition System'
  },

  // 9. Mast & Carriage
  {
    id: 'mast-carriage-1',
    title: 'Check Lift Chains & Anchors',
    description: 'Inspect lift chains and anchors for wear, proper lubrication, and correct tension.',
    condition: undefined,
    required: true,
    section: 'Mast & Carriage'
  },
  {
    id: 'mast-carriage-2',
    title: 'Check Cylinders for Leaks',
    description: 'Examine all mast cylinders for hydraulic leaks or damage.',
    condition: undefined,
    required: true,
    section: 'Mast & Carriage'
  },
  {
    id: 'mast-carriage-3',
    title: 'Check Cylinder Brackets',
    description: 'Inspect cylinder brackets for secure attachment and absence of cracks.',
    condition: undefined,
    required: true,
    section: 'Mast & Carriage'
  },
  {
    id: 'mast-carriage-4',
    title: 'Check Hose Pulleys & Chain / Hose Guards',
    description: 'Check that hose pulleys, chain guards, and hose guards are intact and functional.',
    condition: undefined,
    required: true,
    section: 'Mast & Carriage'
  },
  {
    id: 'mast-carriage-5',
    title: 'Check Tilt Cylinder Mounts & Pins',
    description: 'Verify tilt cylinder mounts and pins are secure and show no excessive wear.',
    condition: undefined,
    required: true,
    section: 'Mast & Carriage'
  },
  {
    id: 'mast-carriage-6',
    title: 'Check Trunion Bushings / Mounts',
    description: 'Inspect trunion bushings and mounts for wear or looseness.',
    condition: undefined,
    required: true,
    section: 'Mast & Carriage'
  },
  {
    id: 'mast-carriage-7',
    title: 'Check Forks, Pins & Carriage Condition',
    description: 'Examine forks, pins, and carriage for cracks, bending, or other defects.',
    condition: undefined,
    required: true,
    section: 'Mast & Carriage'
  },
  {
    id: 'mast-carriage-8',
    title: 'Check Hoses for Leaks',
    description: 'Inspect hydraulic hoses on mast and carriage for leaks, abrasion, or damage.',
    condition: undefined,
    required: true,
    section: 'Mast & Carriage'
  },
  {
    id: 'mast-carriage-9',
    title: 'Check Mast Shims & Side Play',
    description: 'Check mast shims for tightness and look for excessive side play in mast.',
    condition: undefined,
    required: true,
    section: 'Mast & Carriage'
  },
  {
    id: 'mast-carriage-10',
    title: 'Check Carriage & Mast Rollers',
    description: 'Inspect rollers for flat spots, wear, or improper rotation.',
    condition: undefined,
    required: true,
    section: 'Mast & Carriage'
  },
  {
    id: 'mast-carriage-11',
    title: 'Check Mast Rails for Wear',
    description: 'Look for wear, cracks, or bending along mast rails.',
    condition: undefined,
    required: true,
    section: 'Mast & Carriage'
  },
  {
    id: 'mast-carriage-12',
    title: 'Check Side Shift Bushings',
    description: 'Inspect side shift bushings for excessive wear or movement.',
    condition: undefined,
    required: true,
    section: 'Mast & Carriage'
  },

  // 10. Cooling System
  {
    id: 'cooling-1',
    title: 'Blow Out Radiator',
    description: 'Use compressed air to remove dust and debris from the radiator fins.',
    condition: undefined,
    required: true,
    section: 'Cooling System'
  },
  {
    id: 'cooling-2',
    title: 'Coolant Level, Condition & Leaks',
    description: 'Check coolant level, ensure coolant is clean, and inspect for leaks.',
    condition: undefined,
    required: true,
    section: 'Cooling System'
  },
  {
    id: 'cooling-3',
    title: 'Check Radiator Condition & Shroud',
    description: 'Inspect radiator and fan shroud for damage or obstructions.',
    condition: undefined,
    required: true,
    section: 'Cooling System'
  },
  {
    id: 'cooling-4',
    title: 'Check Water Pump for Leaks & Play',
    description: 'Check water pump for coolant leaks or excessive shaft play.',
    condition: undefined,
    required: true,
    section: 'Cooling System'
  },
  {
    id: 'cooling-5',
    title: 'Check Belt Condition & Tension',
    description: 'Inspect all drive belts for cracks, fraying, and correct tension.',
    condition: undefined,
    required: true,
    section: 'Cooling System'
  },
  {
    id: 'cooling-6',
    title: 'Check Fan Blade Condition',
    description: 'Examine fan blades for cracks, chips, or loose mounting.',
    condition: undefined,
    required: true,
    section: 'Cooling System'
  },
  {
    id: 'cooling-7',
    title: 'Cooland Good To (°F)',
    description: 'Verify coolant protection is adequate for expected low temperatures using a tester.',
    condition: undefined,
    required: true,
    section: 'Cooling System'
  },

  // 11. Fuel System
  {
    id: 'fuel-1',
    title: 'Check LP Tank, Hoses & Fittings',
    description: 'Inspect LP tank, hoses, and fittings for leaks, damage, or loose connections.',
    condition: undefined,
    required: true,
    section: 'Fuel System'
  },
  {
    id: 'fuel-2',
    title: 'Drain LPG Regulator',
    description: 'Drain condensation from the LPG regulator per manufacturer instructions.',
    condition: undefined,
    required: true,
    section: 'Fuel System'
  },
  {
    id: 'fuel-3',
    title: 'Check LP System for Leaks',
    description: 'Use leak detector solution or sniffer to check LP system for leaks.',
    condition: undefined,
    required: true,
    section: 'Fuel System'
  },
  {
    id: 'fuel-4',
    title: 'Check LPG Lockoff Operation',
    description: 'Test LPG lockoff valve for proper engagement and operation.',
    condition: undefined,
    required: true,
    section: 'Fuel System'
  },
  {
    id: 'fuel-5',
    title: 'Check Carburetor & Linkages',
    description: 'Inspect carburetor and throttle/choke linkages for smooth movement and secure attachment.',
    condition: undefined,
    required: true,
    section: 'Fuel System'
  },
  {
    id: 'fuel-6',
    title: 'Check throttle Pedal Linkages / Cable',
    description: 'Check throttle pedal linkages and cable for free movement and secure connections.',
    condition: undefined,
    required: true,
    section: 'Fuel System'
  },
  {
    id: 'fuel-7',
    title: 'Check Governor for Proper Operation',
    description: 'Inspect and test governor for correct operation and smooth throttle response.',
    condition: undefined,
    required: true,
    section: 'Fuel System'
  },
  {
    id: 'fuel-8',
    title: 'Change Diesel Fuel Filters',
    description: 'Replace diesel fuel filters according to the service schedule.',
    condition: undefined,
    required: true,
    section: 'Fuel System'
  },
  {
    id: 'fuel-9',
    title: 'Drain Water Separator / Sediment Filter',
    description: 'Drain water separator and sediment filter of any collected water or contaminants.',
    condition: undefined,
    required: true,
    section: 'Fuel System'
  },

  // 12. Final Inspection
  {
    id: 'final-inspection-1',
    title: 'Test Horn Operation',
    description: 'Press horn button to verify loud, consistent sound.',
    condition: undefined,
    required: true,
    section: 'Final Inspection'
  },
  {
    id: 'final-inspection-2',
    title: 'Does Back Up Alarm Sound in Reverse',
    description: 'Shift into reverse and confirm the backup alarm activates.',
    condition: undefined,
    required: true,
    section: 'Final Inspection'
  },
  {
    id: 'final-inspection-3',
    title: 'Test Brake Lights / Turn Signals / BU Lights',
    description: 'Check that all brake lights, turn signals, and backup lights function properly.',
    condition: undefined,
    required: true,
    section: 'Final Inspection'
  },
  {
    id: 'final-inspection-4',
    title: 'Test Strobe Light for Proper Operation',
    description: 'Activate the strobe light and ensure it flashes correctly.',
    condition: undefined,
    required: true,
    section: 'Final Inspection'
  },
  {
    id: 'final-inspection-5',
    title: 'Test Seat Belt',
    description: 'Buckle and unbuckle seat belt to confirm proper latching and release.',
    condition: undefined,
    required: true,
    section: 'Final Inspection'
  },
  {
    id: 'final-inspection-6',
    title: 'Test Operator Presence System',
    description: 'Confirm that the operator presence system disables movement when the seat is unoccupied.',
    condition: undefined,
    required: true,
    section: 'Final Inspection'
  },
  {
    id: 'final-inspection-7',
    title: 'Check All Work Lights',
    description: 'Turn on all work lights and confirm they illuminate properly.',
    condition: undefined,
    required: true,
    section: 'Final Inspection'
  },
  {
    id: 'final-inspection-8',
    title: 'Test Both Service & Parking Brake',
    description: 'Apply both brakes and ensure they hold the forklift stationary.',
    condition: undefined,
    required: true,
    section: 'Final Inspection'
  },
  {
    id: 'final-inspection-9',
    title: 'Test Forward & Reverse Travel',
    description: 'Drive forklift forward and in reverse to confirm smooth operation.',
    condition: undefined,
    required: true,
    section: 'Final Inspection'
  },
  {
    id: 'final-inspection-10',
    title: 'Test All Hydraulic Functions',
    description: 'Operate all hydraulic controls and ensure smooth, correct response.',
    condition: undefined,
    required: true,
    section: 'Final Inspection'
  },
  {
    id: 'final-inspection-11',
    title: 'Test Seat Belt Alarm',
    description: 'Confirm seat belt alarm sounds if the seat belt is not engaged during operation.',
    condition: undefined,
    required: true,
    section: 'Final Inspection'
  },
  {
    id: 'final-inspection-12',
    title: 'Wipe Down Forklift, Dash Area',
    description: 'Clean the forklift and dashboard area of dirt and debris.',
    condition: undefined,
    required: true,
    section: 'Final Inspection'
  },
  {
    id: 'final-inspection-13',
    title: 'Install PM Sticker',
    description: 'Place the preventative maintenance sticker in the designated area to indicate service is complete.',
    condition: undefined,
    required: true,
    section: 'Final Inspection'
  }
];

// Create a new PM record
export const createPM = async (data: CreatePMData): Promise<PreventativeMaintenance | null> => {
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      logger.error('User not authenticated');
      return null;
    }

    const { data: pm, error } = await supabase
      .from('preventative_maintenance')
      .insert({
        work_order_id: data.workOrderId,
        equipment_id: data.equipmentId,
        organization_id: data.organizationId,
        created_by: userData.user.id,
        checklist_data: data.checklistData as unknown as Json,
        notes: data.notes,
        template_id: data.templateId,
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      logger.error('Error creating PM:', error);
      return null;
    }

    return pm;
  } catch (error) {
    logger.error('Error in createPM:', error);
    return null;
  }
};

// Get PM by work order ID
export const getPMByWorkOrderId = async (workOrderId: string): Promise<PreventativeMaintenance | null> => {
  try {
    const { data, error } = await supabase
      .from('preventative_maintenance')
      .select('*')
      .eq('work_order_id', workOrderId)
      .single();

    if (error && error.code !== 'PGRST116') {
      logger.error('Error fetching PM:', error);
      return null;
    }

    return data || null;
  } catch (error) {
    logger.error('Error in getPMByWorkOrderId:', error);
    return null;
  }
};

// Update PM record
export const updatePM = async (pmId: string, data: UpdatePMData): Promise<PreventativeMaintenance | null> => {
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      logger.error('User not authenticated');
      return null;
    }

    const updateData: Database['public']['Tables']['preventative_maintenance']['Update'] = {
      checklist_data: data.checklistData as unknown as Json,
      notes: data.notes,
    };

    if (data.status) {
      updateData.status = data.status;
      
      if (data.status === 'completed') {
        updateData.completed_at = new Date().toISOString();
        updateData.completed_by = userData.user.id;
      }
    }

    const { data: pm, error } = await supabase
      .from('preventative_maintenance')
      .update(updateData)
      .eq('id', pmId)
      .select()
      .single();

    if (error) {
      logger.error('Error updating PM:', error);
      return null;
    }

    return pm;
  } catch (error) {
    logger.error('Error in updatePM:', error);
    return null;
  }
};

// Get latest completed PM for equipment
export const getLatestCompletedPM = async (equipmentId: string) => {
  try {
    const { data, error } = await supabase
      .rpc('get_latest_completed_pm', { equipment_uuid: equipmentId });

    if (error) {
      logger.error('Error fetching latest PM:', error);
      return null;
    }

    return data?.[0] || null;
  } catch (error) {
    logger.error('Error in getLatestCompletedPM:', error);
    return null;
  }
};

// Delete PM record
export const deletePM = async (pmId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('preventative_maintenance')
      .delete()
      .eq('id', pmId);

    if (error) {
      logger.error('Error deleting PM:', error);
      return false;
    }

    return true;
  } catch (error) {
    logger.error('Error in deletePM:', error);
    return false;
  }
};
