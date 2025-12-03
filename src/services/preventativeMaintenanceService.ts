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
  checklistData?: PMChecklistItem[];
  notes?: string;
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  templateId?: string;
  completedAt?: string | null;
  completedBy?: string | null;
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

// Pull Trailer PM (Default)
export const defaultPullTrailerChecklist: PMChecklistItem[] = [
  {
    id: 'visual-inspection-1',
    title: 'Overall Condition',
    description: 'Walk around the trailer and inspect the overall condition. Look for bent beams, cracked welds, or structural deformities. Note any significant rust, especially on critical components. Ensure trailer is clean enough for a proper inspection.',
    condition: undefined,
    required: true,
    section: 'Visual Inspection'
  },
  {
    id: 'visual-inspection-2',
    title: 'Underside and Components',
    description: 'Inspect the underside for hanging wires, loose brackets, debris, or damaged frame sections. Verify no mounting hardware is missing.',
    condition: undefined,
    required: true,
    section: 'Visual Inspection'
  },
  {
    id: 'visual-inspection-3',
    title: 'Attachments and Accessories',
    description: 'Inspect spare tire carriers, toolboxes, and other attachments. Ensure accessories are securely mounted.',
    condition: undefined,
    required: true,
    section: 'Visual Inspection'
  },
  {
    id: 'visual-inspection-4',
    title: 'Cleanliness and Corrosion',
    description: 'Identify areas with corrosion or peeling paint. Remove dirt and grime that may hide cracks or damage.',
    condition: undefined,
    required: true,
    section: 'Visual Inspection'
  },
  {
    id: 'frame-structure-5',
    title: 'Main Frame Rails',
    description: 'Inspect the main rails for cracks, bends, or structural weakness. Pay special attention to welded areas and where the tongue joins the frame.',
    condition: undefined,
    required: true,
    section: 'Frame & Structure'
  },
  {
    id: 'frame-structure-6',
    title: 'Crossmembers and Floor Supports',
    description: 'Inspect crossmembers for cracks, loose fasteners, or rot (if wood deck). Look for corrosion at frame joints.',
    condition: undefined,
    required: true,
    section: 'Frame & Structure'
  },
  {
    id: 'frame-structure-7',
    title: 'Welds and Fasteners',
    description: 'Inspect all welds for cracks and verify bolts/latches are tight and not missing.',
    condition: undefined,
    required: true,
    section: 'Frame & Structure'
  },
  {
    id: 'frame-structure-8',
    title: 'Tie-Down Points',
    description: 'Inspect D-rings, stake pockets, rub rails, and anchor points. Ensure they are securely attached and undamaged.',
    condition: undefined,
    required: true,
    section: 'Frame & Structure'
  },
  {
    id: 'frame-structure-9',
    title: 'Fenders and Body Panels',
    description: 'Inspect fenders for cracks, loose bolts, or sharp edges. For enclosed trailers, inspect walls, roof, and seams for structural integrity.',
    condition: undefined,
    required: true,
    section: 'Frame & Structure'
  },
  {
    id: 'axle-suspension-10',
    title: 'Springs and Spring Hangers',
    description: 'Inspect leaf springs for cracks or broken leaves. Check spring hangers for deformation or cracked welds.',
    condition: undefined,
    required: true,
    section: 'Axle & Suspension'
  },
  {
    id: 'axle-suspension-11',
    title: 'Shackles and Equalizers',
    description: 'Inspect shackle links and equalizers for wear (oval holes or worn bolts). Grease if zerks are present.',
    condition: undefined,
    required: true,
    section: 'Axle & Suspension'
  },
  {
    id: 'axle-suspension-12',
    title: 'Axle Beams',
    description: 'Inspect axles for bends, cracks, and rust thinning. Check U-bolts for proper torque.',
    condition: undefined,
    required: true,
    section: 'Axle & Suspension'
  },
  {
    id: 'axle-suspension-13',
    title: 'Torsion Axle Components',
    description: 'Inspect torsion arms for cracks and verify axle height symmetry.',
    condition: undefined,
    required: true,
    section: 'Axle & Suspension'
  },
  {
    id: 'axle-suspension-14',
    title: 'Suspension Lubrication',
    description: 'Lubricate any greasable components and purge old grease.',
    condition: undefined,
    required: true,
    section: 'Axle & Suspension'
  },
  {
    id: 'wheels-tires-15',
    title: 'Tire Tread and Sidewalls',
    description: 'Inspect tread depth and even wear. Check for sidewall cracks, bulges, or cuts.',
    condition: undefined,
    required: true,
    section: 'Wheels & Tires'
  },
  {
    id: 'wheels-tires-16',
    title: 'Tire Pressure',
    description: 'Check tire inflation when cold and fill to recommended PSI.',
    condition: undefined,
    required: true,
    section: 'Wheels & Tires'
  },
  {
    id: 'wheels-tires-17',
    title: 'Wheel Lug Nuts',
    description: 'Verify all lug nuts are present and torqued to spec.',
    condition: undefined,
    required: true,
    section: 'Wheels & Tires'
  },
  {
    id: 'wheels-tires-18',
    title: 'Wheel Bearings',
    description: 'Jack up wheels and spin by hand. Listen for grinding and check for play.',
    condition: undefined,
    required: true,
    section: 'Wheels & Tires'
  },
  {
    id: 'wheels-tires-19',
    title: 'Bearing Grease and Seals',
    description: 'Inspect for grease leakage at seals. Add grease or plan for repack if needed.',
    condition: undefined,
    required: true,
    section: 'Wheels & Tires'
  },
  {
    id: 'brake-system-20',
    title: 'Brake Type Verification',
    description: 'Determine whether the trailer has electric, hydraulic surge, EOH, or no brakes.',
    condition: undefined,
    required: true,
    section: 'Brake System'
  },
  {
    id: 'brake-system-21',
    title: 'Electric Brake Wiring',
    description: 'Inspect wiring to backing plates for fraying or loose connections.',
    condition: undefined,
    required: true,
    section: 'Brake System'
  },
  {
    id: 'brake-system-22',
    title: 'Brake Linings and Magnets',
    description: 'Inspect brake shoe linings and brake magnets for wear or scoring.',
    condition: undefined,
    required: true,
    section: 'Brake System'
  },
  {
    id: 'brake-system-23',
    title: 'Brake Adjustment',
    description: 'Adjust drum brakes to proper drag and back off slightly.',
    condition: undefined,
    required: true,
    section: 'Brake System'
  },
  {
    id: 'brake-system-24',
    title: 'Surge Brake Actuator and Fluid',
    description: 'For surge brakes, inspect actuator, brake fluid level, and condition.',
    condition: undefined,
    required: true,
    section: 'Brake System'
  },
  {
    id: 'brake-system-25',
    title: 'Hydraulic Lines and Cylinders',
    description: 'Inspect hydraulic brake lines for corrosion, leaks, or damage.',
    condition: undefined,
    required: true,
    section: 'Brake System'
  },
  {
    id: 'brake-system-26',
    title: 'Breakaway Brake System',
    description: 'Test electric breakaway system, pull pin test, and verify battery charge level.',
    condition: undefined,
    required: true,
    section: 'Brake System'
  },
  {
    id: 'coupler-jack-27',
    title: 'Coupler Condition',
    description: 'Inspect coupler latch for cracks, wear, or deformation. Verify proper ball size compatibility.',
    condition: undefined,
    required: true,
    section: 'Coupler & Jack'
  },
  {
    id: 'coupler-jack-28',
    title: 'Coupler Bolts/Welds',
    description: 'Inspect attachment bolts or welds for structural integrity.',
    condition: undefined,
    required: true,
    section: 'Coupler & Jack'
  },
  {
    id: 'coupler-jack-29',
    title: 'Safety Chains',
    description: 'Inspect chains for wear, cracks, and functional safety latches.',
    condition: undefined,
    required: true,
    section: 'Coupler & Jack'
  },
  {
    id: 'coupler-jack-30',
    title: 'Tongue Jack Operation',
    description: 'Test jack raising/lowering and inspect for smooth operation.',
    condition: undefined,
    required: true,
    section: 'Coupler & Jack'
  },
  {
    id: 'coupler-jack-31',
    title: 'Tongue Jack Support and Foot',
    description: 'Inspect jack footplate or wheel for secure mounting and wear.',
    condition: undefined,
    required: true,
    section: 'Coupler & Jack'
  },
  {
    id: 'coupler-jack-32',
    title: 'Hitch Ball & Mount (if available)',
    description: 'Verify tow vehicle ball size matches coupler and ensure ball mount is secure.',
    condition: undefined,
    required: true,
    section: 'Coupler & Jack'
  },
  {
    id: 'lights-electrical-33',
    title: 'Wiring Harness and Connector',
    description: 'Inspect harness for cuts, abrasions, or corrosion. Check plug pins for damage.',
    condition: undefined,
    required: true,
    section: 'Lights & Electrical'
  },
  {
    id: 'lights-electrical-34',
    title: 'Trailer Plug Junction Box',
    description: 'Inspect junction box for water ingress, corrosion, and loose terminals.',
    condition: undefined,
    required: true,
    section: 'Lights & Electrical'
  },
  {
    id: 'lights-electrical-35',
    title: 'Tail Lights and Markers',
    description: 'Test tail, brake, and turn signals. Inspect marker and clearance lights.',
    condition: undefined,
    required: true,
    section: 'Lights & Electrical'
  },
  {
    id: 'lights-electrical-36',
    title: 'License Plate Light',
    description: 'Verify plate light illuminates properly.',
    condition: undefined,
    required: true,
    section: 'Lights & Electrical'
  },
  {
    id: 'lights-electrical-37',
    title: 'Reflectors and Reflective Tape',
    description: 'Ensure all DOT reflectors and tape are present and clean.',
    condition: undefined,
    required: true,
    section: 'Lights & Electrical'
  },
  {
    id: 'lights-electrical-38',
    title: 'Breakaway Battery Charge (if applicable)',
    description: 'Test breakaway battery charge level and confirm charging from tow vehicle.',
    condition: undefined,
    required: true,
    section: 'Lights & Electrical'
  },
  {
    id: 'deck-body-39',
    title: 'Deck Surface',
    description: 'Inspect wooden or steel deck for rot, cracks, dents, or corrosion.',
    condition: undefined,
    required: true,
    section: 'Deck & Body'
  },
  {
    id: 'deck-body-40',
    title: 'Deck Fastening',
    description: 'Check deck bolts/screws for tightness or missing hardware.',
    condition: undefined,
    required: true,
    section: 'Deck & Body'
  },
  {
    id: 'deck-body-41',
    title: 'Ramps or Tailgate',
    description: 'Inspect ramp hinges, latch pins, and structural condition. Verify smooth deployment.',
    condition: undefined,
    required: true,
    section: 'Deck & Body'
  },
  {
    id: 'deck-body-42',
    title: 'Ramp/Gate Springs and Pins',
    description: 'Inspect springs, torsion tubes, and locking pins for wear.',
    condition: undefined,
    required: true,
    section: 'Deck & Body'
  },
  {
    id: 'deck-body-43',
    title: 'Enclosed Trailer Features (if applicable)',
    description: 'Inspect doors, hinges, seals, interior panels, vents, and interior lighting.',
    condition: undefined,
    required: true,
    section: 'Deck & Body'
  },
  {
    id: 'deck-body-44',
    title: 'Cargo Securement Points',
    description: 'Inspect D-rings, E-track, or hooks for structural integrity.',
    condition: undefined,
    required: true,
    section: 'Deck & Body'
  },
  {
    id: 'final-inspection-45',
    title: 'Hitching and Alignment',
    description: 'Attach to tow vehicle and ensure proper coupler seating, pinning, and chain crossing.',
    condition: undefined,
    required: true,
    section: 'Final Inspection'
  },
  {
    id: 'final-inspection-46',
    title: 'Light and Brake Function Test',
    description: 'Test all lighting functions again and verify brake controller output (if equipped).',
    condition: undefined,
    required: true,
    section: 'Final Inspection'
  },
  {
    id: 'final-inspection-47',
    title: 'Initial Road Feel',
    description: 'Tow trailer briefly and observe tracking, noise, braking, and sway.',
    condition: undefined,
    required: true,
    section: 'Final Inspection'
  },
  {
    id: 'final-inspection-48',
    title: 'Wheel Lug Re-Torque',
    description: 'Re-check lug nut torque after initial road test.',
    condition: undefined,
    required: true,
    section: 'Final Inspection'
  },
  {
    id: 'final-inspection-49',
    title: 'Post-Trip Touch Test',
    description: 'Carefully touch hubs and brake drums to check for overheating.',
    condition: undefined,
    required: true,
    section: 'Final Inspection'
  },
  {
    id: 'final-inspection-50',
    title: 'Security and Storage',
    description: 'Park trailer, chock wheels, and secure ramps and accessories.',
    condition: undefined,
    required: true,
    section: 'Final Inspection'
  },
  {
    id: 'final-inspection-51',
    title: 'Documentation',
    description: 'Record maintenance actions, torque specs, tire pressures, brake adjustments, and future follow-up needs.',
    condition: undefined,
    required: true,
    section: 'Final Inspection'
  }
];

// Compressor PM (Default)
export const defaultCompressorChecklist: PMChecklistItem[] = [
  {
    id: 'visual-inspection-1',
    title: 'Overall Condition and Leaks',
    description: 'Walk around the compressor unit and look underneath for any signs of oil, coolant, or fuel leaks. Observe the exterior and frame for damage, loose panels, or missing bolts. Ensure the unit is clean enough to inspect.',
    condition: undefined,
    required: true,
    section: 'Visual Inspection'
  },
  {
    id: 'visual-inspection-2',
    title: 'Safety Decals and Labels',
    description: 'Verify all safety and operational decals are in place and legible.',
    condition: undefined,
    required: true,
    section: 'Visual Inspection'
  },
  {
    id: 'visual-inspection-3',
    title: 'Gauges and Control Panel',
    description: 'Inspect pressure gauges, hour meters, switches, and the emergency stop button for condition and clarity.',
    condition: undefined,
    required: true,
    section: 'Visual Inspection'
  },
  {
    id: 'visual-inspection-4',
    title: 'Hoses and Connections',
    description: 'Inspect discharge hoses, coupling points, outlet valves, and quick couplers for cracks, leaks, or wear.',
    condition: undefined,
    required: true,
    section: 'Visual Inspection'
  },
  {
    id: 'visual-inspection-5',
    title: 'Mounting and Vibration Pads',
    description: 'Check that engine and compressor mounts, bolts, and vibration isolators are secure and undamaged.',
    condition: undefined,
    required: true,
    section: 'Visual Inspection'
  },
  {
    id: 'visual-inspection-6',
    title: 'Lifting Eye or Points',
    description: 'Inspect lifting eyes or hoisting points for cracks, bends, or loose bolts.',
    condition: undefined,
    required: true,
    section: 'Visual Inspection'
  },
  {
    id: 'engine-compartment-7',
    title: 'Engine Oil Level and Condition',
    description: 'Check oil with dipstick. Top off or change oil and filter per schedule.',
    condition: undefined,
    required: true,
    section: 'Engine Compartment'
  },
  {
    id: 'engine-compartment-8',
    title: 'Air Filter Element',
    description: 'Inspect engine air filter and housing; clean or replace as needed.',
    condition: undefined,
    required: true,
    section: 'Engine Compartment'
  },
  {
    id: 'engine-compartment-9',
    title: 'Fuel Filter and Water Separator',
    description: 'Check for water or contaminants. Drain separator and replace fuel filter if required.',
    condition: undefined,
    required: true,
    section: 'Engine Compartment'
  },
  {
    id: 'engine-compartment-10',
    title: 'Coolant Level and Hoses',
    description: 'Inspect coolant level, radiator cap, hoses, and clamps for leaks or deterioration.',
    condition: undefined,
    required: true,
    section: 'Engine Compartment'
  },
  {
    id: 'engine-compartment-11',
    title: 'Belts and Pulley Alignment',
    description: 'Inspect drive belts for cracks or fraying. Check tension and pulley alignment.',
    condition: undefined,
    required: true,
    section: 'Engine Compartment'
  },
  {
    id: 'engine-compartment-12',
    title: 'Battery and Electrical Connections',
    description: 'Inspect battery, terminals, grounding straps, and wiring for corrosion or damage.',
    condition: undefined,
    required: true,
    section: 'Engine Compartment'
  },
  {
    id: 'engine-compartment-13',
    title: 'Exhaust System and Muffler',
    description: 'Inspect exhaust system for cracks, leaks, and secure mounting.',
    condition: undefined,
    required: true,
    section: 'Engine Compartment'
  },
  {
    id: 'engine-compartment-14',
    title: 'Engine Fluids and Leaks',
    description: 'Inspect engine area for leaks (oil, fuel, coolant) around major components.',
    condition: undefined,
    required: true,
    section: 'Engine Compartment'
  },
  {
    id: 'electrical-system-15',
    title: 'Battery Load Test',
    description: 'Perform voltage and load test to confirm battery health.',
    condition: undefined,
    required: true,
    section: 'Electrical System'
  },
  {
    id: 'electrical-system-16',
    title: 'Alternator Output',
    description: 'With engine running, measure charging voltage and listen for alternator noise.',
    condition: undefined,
    required: true,
    section: 'Electrical System'
  },
  {
    id: 'electrical-system-17',
    title: 'Starter and Ignition Circuit',
    description: 'Inspect starter motor, ignition switch, and glow plug/preheat circuits for proper function.',
    condition: undefined,
    required: true,
    section: 'Electrical System'
  },
  {
    id: 'electrical-system-18',
    title: 'Engine Control Panel Wiring',
    description: 'Check wiring behind the control panel for tight, undamaged connections.',
    condition: undefined,
    required: true,
    section: 'Electrical System'
  },
  {
    id: 'electrical-system-19',
    title: 'Operational Lights and Indicators',
    description: 'Test indicator lights, shutdown alarms, and trailer lighting (if equipped).',
    condition: undefined,
    required: true,
    section: 'Electrical System'
  },
  {
    id: 'electrical-system-20',
    title: 'Emergency Shutdown System',
    description: 'Test the emergency stop button and verify safety shutdown systems are operational.',
    condition: undefined,
    required: true,
    section: 'Electrical System'
  },
  {
    id: 'compressor-air-system-21',
    title: 'Compressor Oil Level',
    description: 'Check compressor airend oil level via sight glass or dipstick. Add or change oil as needed.',
    condition: undefined,
    required: true,
    section: 'Compressor & Air System'
  },
  {
    id: 'compressor-air-system-22',
    title: 'Air Intake Filter (Compressor)',
    description: 'Inspect and clean/replace compressor air filter.',
    condition: undefined,
    required: true,
    section: 'Compressor & Air System'
  },
  {
    id: 'compressor-air-system-23',
    title: 'Compressor Drive Coupling/Belt',
    description: 'Inspect coupling or belt tension/condition and ensure secure mounting.',
    condition: undefined,
    required: true,
    section: 'Compressor & Air System'
  },
  {
    id: 'compressor-air-system-24',
    title: 'Pressure Relief Valve',
    description: 'Inspect safety valve for corrosion or leaks. Observe valve behavior during pressurization.',
    condition: undefined,
    required: true,
    section: 'Compressor & Air System'
  },
  {
    id: 'compressor-air-system-25',
    title: 'System Pressure Gauge and Controls',
    description: 'Monitor pressure gauge during operation, confirming cut-out and unloader operation.',
    condition: undefined,
    required: true,
    section: 'Compressor & Air System'
  },
  {
    id: 'compressor-air-system-26',
    title: 'Moisture Separator and Drain',
    description: 'Inspect separator and drain accumulated water. Verify drain valve seals properly.',
    condition: undefined,
    required: true,
    section: 'Compressor & Air System'
  },
  {
    id: 'compressor-air-system-27',
    title: 'Air Hoses and Outlet Valves',
    description: 'Inspect hoses and outlet valves for leaks, cracks, or damage.',
    condition: undefined,
    required: true,
    section: 'Compressor & Air System'
  },
  {
    id: 'compressor-air-system-28',
    title: 'Compressor Thermal Shutoff',
    description: 'Check temperature sensors and monitor temperature during operation to ensure protection functions correctly.',
    condition: undefined,
    required: true,
    section: 'Compressor & Air System'
  },
  {
    id: 'cooling-system-29',
    title: 'Radiator and Oil Cooler Fins',
    description: 'Clean radiator and cooler fins using low-pressure air or soft brush.',
    condition: undefined,
    required: true,
    section: 'Cooling System'
  },
  {
    id: 'cooling-system-30',
    title: 'Coolant Quality and Cap',
    description: 'Inspect coolant inside radiator or tank. Check radiator cap seal and pressure.',
    condition: undefined,
    required: true,
    section: 'Cooling System'
  },
  {
    id: 'cooling-system-31',
    title: 'Cooling Hoses and Connections',
    description: 'Inspect all coolant hoses and clamps for wear or leakage.',
    condition: undefined,
    required: true,
    section: 'Cooling System'
  },
  {
    id: 'cooling-system-32',
    title: 'Engine Fan and Shroud',
    description: 'Verify fan spins freely, blades are intact, and shroud is secure.',
    condition: undefined,
    required: true,
    section: 'Cooling System'
  },
  {
    id: 'cooling-system-33',
    title: 'Temperature Controls',
    description: 'Test thermostat and verify fan engagement at proper temperature.',
    condition: undefined,
    required: true,
    section: 'Cooling System'
  },
  {
    id: 'fuel-system-34',
    title: 'Fuel Tank and Lines',
    description: 'Inspect tank for leaks, corrosion, and proper venting. Check fuel lines for chafing, cracks, and leaks.',
    condition: undefined,
    required: true,
    section: 'Fuel System'
  },
  {
    id: 'fuel-system-35',
    title: 'Fuel Level and Quality',
    description: 'Ensure clean fuel is present and sample for sediment or water if needed.',
    condition: undefined,
    required: true,
    section: 'Fuel System'
  },
  {
    id: 'fuel-system-36',
    title: 'Injector Pump and Injectors',
    description: 'Inspect around injectors and pump for leaks, tightening fittings if needed.',
    condition: undefined,
    required: true,
    section: 'Fuel System'
  },
  {
    id: 'fuel-system-37',
    title: 'Fuel Filter Change (if due)',
    description: 'Change filter and properly bleed system to prevent air lock.',
    condition: undefined,
    required: true,
    section: 'Fuel System'
  },
  {
    id: 'fuel-system-38',
    title: 'Throttle and Governor Linkage',
    description: 'Inspect linkages/cables for free movement and correct throttle response.',
    condition: undefined,
    required: true,
    section: 'Fuel System'
  },
  {
    id: 'chassis-frame-39',
    title: 'Trailer Frame and Mounts',
    description: 'Inspect frame, crossmembers, fenders, toolboxes, and mounting hardware for cracks or looseness.',
    condition: undefined,
    required: true,
    section: 'Chassis & Frame'
  },
  {
    id: 'chassis-frame-40',
    title: 'Tires and Wheels',
    description: 'Inspect tire condition and check tire pressure. Inspect wheel rims for damage and torque lug nuts.',
    condition: undefined,
    required: true,
    section: 'Chassis & Frame'
  },
  {
    id: 'chassis-frame-41',
    title: 'Axle and Suspension',
    description: 'Inspect leaf springs or torsion axles for wear or breakage. Check hub bearings and grease if applicable.',
    condition: undefined,
    required: true,
    section: 'Chassis & Frame'
  },
  {
    id: 'chassis-frame-42',
    title: 'Trailer Coupler and Safety Chains',
    description: 'Inspect coupler engagement, latch integrity, chain condition, and hook latches.',
    condition: undefined,
    required: true,
    section: 'Chassis & Frame'
  },
  {
    id: 'chassis-frame-43',
    title: 'Tongue Jack and Supports',
    description: 'Test jack for smooth raising/lowering and inspect mounting hardware.',
    condition: undefined,
    required: true,
    section: 'Chassis & Frame'
  },
  {
    id: 'chassis-frame-44',
    title: 'Lighting and Wiring Harness',
    description: 'Test tail, brake, and turn lights. Inspect wiring for abrasion or corrosion.',
    condition: undefined,
    required: true,
    section: 'Chassis & Frame'
  },
  {
    id: 'chassis-frame-45',
    title: 'Parking Brake or Wheel Chocks',
    description: 'Verify parking brake function (if equipped) or availability of chocks.',
    condition: undefined,
    required: true,
    section: 'Chassis & Frame'
  },
  {
    id: 'final-inspection-46',
    title: 'Operational Warm-Up',
    description: 'Start the engine and allow unit to warm up. Verify smooth idle and no warning indicators.',
    condition: undefined,
    required: true,
    section: 'Final Inspection'
  },
  {
    id: 'final-inspection-47',
    title: 'Full Pressure Test',
    description: 'Build system pressure and monitor cut-out behavior. Verify safety valve does not open prematurely.',
    condition: undefined,
    required: true,
    section: 'Final Inspection'
  },
  {
    id: 'final-inspection-48',
    title: 'Load Test and Engine Performance',
    description: 'Apply load by opening service valve. Verify engine increases RPM and holds pressure.',
    condition: undefined,
    required: true,
    section: 'Final Inspection'
  },
  {
    id: 'final-inspection-49',
    title: 'Leak Check During Operation',
    description: 'Inspect hoses/fittings for leaks using visual inspection or soapy water.',
    condition: undefined,
    required: true,
    section: 'Final Inspection'
  },
  {
    id: 'final-inspection-50',
    title: 'Safety Shutdown Test',
    description: 'Test shutdown systems (manual or simulated) and confirm proper operation.',
    condition: undefined,
    required: true,
    section: 'Final Inspection'
  },
  {
    id: 'final-inspection-51',
    title: 'Trailer Function Test (if applicable)',
    description: 'Connect to tow vehicle and verify coupler fit, safety chains, and trailer light function.',
    condition: undefined,
    required: true,
    section: 'Final Inspection'
  },
  {
    id: 'final-inspection-52',
    title: 'Final Walk-Around and Securing',
    description: 'Shut down unit, inspect for leaks, close all access panels, and secure hoses.',
    condition: undefined,
    required: true,
    section: 'Final Inspection'
  },
  {
    id: 'final-inspection-53',
    title: 'Documentation and Clean-Up',
    description: 'Record all PM actions, update service sticker, and clean any grease or oil smudges.',
    condition: undefined,
    required: true,
    section: 'Final Inspection'
  }
];

// Scissor Lift PM (Default)
export const defaultScissorLiftChecklist: PMChecklistItem[] = [
  {
    id: 'visual-inspection-1',
    title: 'General Condition and Leaks',
    description: 'Walk around the scissor lift and inspect for any obvious damage or deformities in the structure. Look underneath for any oil or hydraulic fluid leaks on the ground or dripping from the machine (hydraulic hoses, motors, or cylinder areas). Ensure the machine is relatively clean so that components are visible.',
    condition: undefined,
    required: true,
    section: 'Visual Inspection'
  },
  {
    id: 'visual-inspection-2',
    title: 'Decals and Operational Labels',
    description: 'Verify that all safety decals, warning labels, and operational instruction placards (including capacity charts) are present and legible. Replace any missing or illegible decals to maintain safety information on the lift.',
    condition: undefined,
    required: true,
    section: 'Visual Inspection'
  },
  {
    id: 'visual-inspection-3',
    title: 'Guardrails and Structure',
    description: 'Check that all guardrails are in place, properly secured with pins or fasteners, and not bent or damaged. Ensure the scissor stack (lifting arms) is straight and free of obvious cracks or excessive wear at pivot points. Inspect the base frame for any cracks, particularly near welds or high-stress areas.',
    condition: undefined,
    required: true,
    section: 'Visual Inspection'
  },
  {
    id: 'visual-inspection-4',
    title: 'Battery and Fluid Trays',
    description: 'If the unit is battery powered, open the battery compartment tray and ensure there are no spilled electrolytes or corrosion buildup outside the batteries. If engine-powered, inspect the engine tray or compartment for accumulated debris, oil, or fuel residue.',
    condition: undefined,
    required: true,
    section: 'Visual Inspection'
  },
  {
    id: 'visual-inspection-5',
    title: 'Wheels and Casters (Initial Check)',
    description: 'Visually inspect the wheels and tires for any cuts, chunks missing, or signs of flat spots. Ensure that all wheel nuts are present. Note if tires are pneumatic (check for proper inflation later) or solid rubber; they should not be excessively worn or damaged.',
    condition: undefined,
    required: true,
    section: 'Visual Inspection'
  },
  {
    id: 'visual-inspection-6',
    title: 'Outriggers or Pothole Protection (if equipped)',
    description: 'If the lift has outriggers or stabilizers, ensure they are properly stowed and not damaged. For slab scissors with automatic pothole protection bars, make sure these bars are retracted (flush with chassis) when the machine is lowered and not bent or obstructed.',
    condition: undefined,
    required: true,
    section: 'Visual Inspection'
  },
  {
    id: 'battery-charger-7',
    title: 'Battery Electrolyte Level and Condition',
    description: '(Electric models) Open the battery compartment and check each battery cell\'s electrolyte level (if flooded lead-acid batteries). It should cover the plates adequately. Top up with distilled water as needed. Skip if batteries are AGM/maintenance-free.',
    condition: undefined,
    required: true,
    section: 'Battery & Charger'
  },
  {
    id: 'battery-charger-8',
    title: 'Battery Terminals and Cables',
    description: 'Inspect all battery terminals for corrosion and tight connections. Clean any corrosion found. Ensure cable lugs are secure and wires undamaged.',
    condition: undefined,
    required: true,
    section: 'Battery & Charger'
  },
  {
    id: 'battery-charger-9',
    title: 'Battery Restraints and Case',
    description: 'Ensure batteries are properly secured with hold-downs. Check cases for cracks or swelling.',
    condition: undefined,
    required: true,
    section: 'Battery & Charger'
  },
  {
    id: 'battery-charger-10',
    title: 'Charger Operation and Cords',
    description: 'Plug in the charger and confirm indicators illuminate. Check AC cord for damage and verify charger fan (if equipped) operates.',
    condition: undefined,
    required: true,
    section: 'Battery & Charger'
  },
  {
    id: 'battery-charger-11',
    title: 'Charger Output and Indicators',
    description: 'Verify charger is delivering power by monitoring voltage increase or indicator behavior. Ensure all charge stages function as designed.',
    condition: undefined,
    required: true,
    section: 'Battery & Charger'
  },
  {
    id: 'battery-charger-12',
    title: 'Battery Disconnect Switch',
    description: 'Test battery master disconnect or emergency power cutoff. Ensure proper labeling and reliable operation.',
    condition: undefined,
    required: true,
    section: 'Battery & Charger'
  },
  {
    id: 'engine-fuel-system-if-equipped--13',
    title: 'Engine Oil Level',
    description: 'Check oil via dipstick before starting. Fill as necessary and change oil/filter if due.',
    condition: undefined,
    required: true,
    section: 'Engine & Fuel System (if equipped)'
  },
  {
    id: 'engine-fuel-system-if-equipped--14',
    title: 'Fuel Level and Quality',
    description: 'Ensure adequate fuel. Inspect for contamination and drain water separator if present.',
    condition: undefined,
    required: true,
    section: 'Engine & Fuel System (if equipped)'
  },
  {
    id: 'engine-fuel-system-if-equipped--15',
    title: 'Fuel Filter and Carburetor/Injection',
    description: 'Inspect and replace fuel filter if needed. For carbureted engines, verify choke/throttle linkage movement. For diesel, check injector area for leaks.',
    condition: undefined,
    required: true,
    section: 'Engine & Fuel System (if equipped)'
  },
  {
    id: 'engine-fuel-system-if-equipped--16',
    title: 'Engine Coolant and Radiator',
    description: 'Verify coolant level and inspect hoses for cracks or leaks. Clean radiator fins if blocked.',
    condition: undefined,
    required: true,
    section: 'Engine & Fuel System (if equipped)'
  },
  {
    id: 'engine-fuel-system-if-equipped--17',
    title: 'Air Filter and Spark Arrestor',
    description: 'Inspect and clean/replace air filter. Check spark arrestor for carbon buildup and clean if needed.',
    condition: undefined,
    required: true,
    section: 'Engine & Fuel System (if equipped)'
  },
  {
    id: 'engine-fuel-system-if-equipped--18',
    title: 'Belts and Engine Wiring',
    description: 'Inspect belts for wear and tension. Inspect wiring for fraying or loose connections.',
    condition: undefined,
    required: true,
    section: 'Engine & Fuel System (if equipped)'
  },
  {
    id: 'engine-fuel-system-if-equipped--19',
    title: 'Engine Start and Idle (Pre-test)',
    description: 'Start engine briefly to verify easy starting and smooth idle. Shut down to proceed with inspection.',
    condition: undefined,
    required: true,
    section: 'Engine & Fuel System (if equipped)'
  },
  {
    id: 'engine-fuel-system-if-equipped--20',
    title: 'Fuel System Leaks',
    description: 'While engine is running, inspect lines for leaks. Address any leaks immediately.',
    condition: undefined,
    required: true,
    section: 'Engine & Fuel System (if equipped)'
  },
  {
    id: 'electrical-system-21',
    title: 'Control Wiring and Harnesses',
    description: 'Inspect wiring from platform and ground control boxes. Look for abrasion, pinched sections, and loose plugs.',
    condition: undefined,
    required: true,
    section: 'Electrical System'
  },
  {
    id: 'electrical-system-22',
    title: 'Fuses and Circuit Breakers',
    description: 'Check all fuses and breakers. Verify none are blown or sticking.',
    condition: undefined,
    required: true,
    section: 'Electrical System'
  },
  {
    id: 'electrical-system-23',
    title: 'Lights and Alarms',
    description: 'Test beacon, work lights, motion alarm, and descent alarm.',
    condition: undefined,
    required: true,
    section: 'Electrical System'
  },
  {
    id: 'electrical-system-24',
    title: 'Horn and Warning Buzzer',
    description: 'Verify horn works and test any overload or tilt warning buzzers if available.',
    condition: undefined,
    required: true,
    section: 'Electrical System'
  },
  {
    id: 'electrical-system-25',
    title: 'Battery Indicator and Gauges',
    description: 'Power system on and check battery indicators, engine gauges, and service lights.',
    condition: undefined,
    required: true,
    section: 'Electrical System'
  },
  {
    id: 'electrical-system-26',
    title: 'Ground Control Panel Function',
    description: 'Test ground-level lift and engine controls. Confirm key switch transfers control between stations.',
    condition: undefined,
    required: true,
    section: 'Electrical System'
  },
  {
    id: 'hydraulic-system-27',
    title: 'Hydraulic Oil Level',
    description: 'Check sight glass or dipstick with lift fully lowered. Fill as necessary.',
    condition: undefined,
    required: true,
    section: 'Hydraulic System'
  },
  {
    id: 'hydraulic-system-28',
    title: 'Hydraulic Oil Condition',
    description: 'Inspect oil condition for cloudiness, contamination, or burnt odor.',
    condition: undefined,
    required: true,
    section: 'Hydraulic System'
  },
  {
    id: 'hydraulic-system-29',
    title: 'Hydraulic Pump and Motor',
    description: 'Inspect pump/motor for leaks or unusual noises. Ensure secure mounting.',
    condition: undefined,
    required: true,
    section: 'Hydraulic System'
  },
  {
    id: 'hydraulic-system-30',
    title: 'Valves and Manifolds',
    description: 'Inspect valve block and solenoids for leaks or loose connectors.',
    condition: undefined,
    required: true,
    section: 'Hydraulic System'
  },
  {
    id: 'hydraulic-system-31',
    title: 'Hydraulic Cylinders',
    description: 'Inspect lift cylinders for rod pitting, scratches, or seal leakage.',
    condition: undefined,
    required: true,
    section: 'Hydraulic System'
  },
  {
    id: 'hydraulic-system-32',
    title: 'Hoses and Fittings',
    description: 'Inspect all hoses for cracks, abrasion, and leaks. Check fitting tightness.',
    condition: undefined,
    required: true,
    section: 'Hydraulic System'
  },
  {
    id: 'hydraulic-system-33',
    title: 'Auxiliary Hydraulics (if applicable)',
    description: 'Inspect additional hydraulic functions or cylinders.',
    condition: undefined,
    required: true,
    section: 'Hydraulic System'
  },
  {
    id: 'hydraulic-system-34',
    title: 'Drip Pans and Containment',
    description: 'Clean any accumulated fluid in belly pans or trays.',
    condition: undefined,
    required: true,
    section: 'Hydraulic System'
  },
  {
    id: 'lift-mechanism-scissor-assembly--35',
    title: 'Scissor Pins and Bushings',
    description: 'Check for excessive movement, metal dust, or missing retainers.',
    condition: undefined,
    required: true,
    section: 'Lift Mechanism (Scissor Assembly)'
  },
  {
    id: 'lift-mechanism-scissor-assembly--36',
    title: 'Scissor Arms and Welds',
    description: 'Inspect arms and welds for cracks or distortion.',
    condition: undefined,
    required: true,
    section: 'Lift Mechanism (Scissor Assembly)'
  },
  {
    id: 'lift-mechanism-scissor-assembly--37',
    title: 'Slide Blocks/Wear Pads',
    description: 'Inspect wear pads for cracks or thinning. Replace if worn to metal.',
    condition: undefined,
    required: true,
    section: 'Lift Mechanism (Scissor Assembly)'
  },
  {
    id: 'lift-mechanism-scissor-assembly--38',
    title: 'Lift Cylinder Mounts',
    description: 'Inspect cylinder mount pins and surrounding metal for cracks.',
    condition: undefined,
    required: true,
    section: 'Lift Mechanism (Scissor Assembly)'
  },
  {
    id: 'lift-mechanism-scissor-assembly--39',
    title: 'Limit Switches or Sensors',
    description: 'Verify function and mounting of height limit switches.',
    condition: undefined,
    required: true,
    section: 'Lift Mechanism (Scissor Assembly)'
  },
  {
    id: 'lift-mechanism-scissor-assembly--40',
    title: 'Maintenance Prop Rod',
    description: 'Inspect maintenance prop for bending and verify proper deployment.',
    condition: undefined,
    required: true,
    section: 'Lift Mechanism (Scissor Assembly)'
  },
  {
    id: 'lift-mechanism-scissor-assembly--41',
    title: 'Lubrication of Pivot Points',
    description: 'Grease all scissor pivot points and linkage zerks.',
    condition: undefined,
    required: true,
    section: 'Lift Mechanism (Scissor Assembly)'
  },
  {
    id: 'platform-safety-systems-42',
    title: 'Platform Entry Gate/Chain',
    description: 'Ensure gate or chain closes securely and operates smoothly.',
    condition: undefined,
    required: true,
    section: 'Platform & Safety Systems'
  },
  {
    id: 'platform-safety-systems-43',
    title: 'Guardrails and Toe Boards',
    description: 'Inspect for damage and ensure all fasteners are tight.',
    condition: undefined,
    required: true,
    section: 'Platform & Safety Systems'
  },
  {
    id: 'platform-safety-systems-44',
    title: 'Lanyard Anchor Points',
    description: 'Verify proper labeling and secure mounting of anchor points.',
    condition: undefined,
    required: true,
    section: 'Platform & Safety Systems'
  },
  {
    id: 'platform-safety-systems-45',
    title: 'Platform Floor and Extension',
    description: 'Clean platform surface. Inspect sliding deck for smooth travel and secure locking.',
    condition: undefined,
    required: true,
    section: 'Platform & Safety Systems'
  },
  {
    id: 'platform-safety-systems-46',
    title: 'Load Sensing System (if applicable)',
    description: 'Inspect overload sensor pads or pressure sensors for damage.',
    condition: undefined,
    required: true,
    section: 'Platform & Safety Systems'
  },
  {
    id: 'platform-safety-systems-47',
    title: 'Descent Alarm and Tilt Sensor',
    description: 'Test descent alarm and tilt sensor operation.',
    condition: undefined,
    required: true,
    section: 'Platform & Safety Systems'
  },
  {
    id: 'platform-safety-systems-48',
    title: 'Fire Extinguisher (if required)',
    description: 'Ensure extinguisher is present, charged, and secured.',
    condition: undefined,
    required: true,
    section: 'Platform & Safety Systems'
  },
  {
    id: 'controls-indicators-49',
    title: 'Ground Control Station',
    description: 'Test all switches, including emergency stop and key operations.',
    condition: undefined,
    required: true,
    section: 'Controls & Indicators'
  },
  {
    id: 'controls-indicators-50',
    title: 'Platform Control Console',
    description: 'Inspect controller mounting and labeling. Test emergency stop.',
    condition: undefined,
    required: true,
    section: 'Controls & Indicators'
  },
  {
    id: 'controls-indicators-51',
    title: 'Function Controls Operation',
    description: 'Test lift, drive, and other hydraulic functions for solenoid activation and proper interlock behavior.',
    condition: undefined,
    required: true,
    section: 'Controls & Indicators'
  },
  {
    id: 'controls-indicators-52',
    title: 'Steering and Drive Controls',
    description: 'Test steering cylinder movement and drive motor response.',
    condition: undefined,
    required: true,
    section: 'Controls & Indicators'
  },
  {
    id: 'controls-indicators-53',
    title: 'Control Interlocks',
    description: 'Verify all safety interlocks prevent movement when expected (e.g., drive disabled when elevated).',
    condition: undefined,
    required: true,
    section: 'Controls & Indicators'
  },
  {
    id: 'controls-indicators-54',
    title: 'Indicator Lights and Displays',
    description: 'Confirm proper function of battery gauge, tilt warning, and other indicators.',
    condition: undefined,
    required: true,
    section: 'Controls & Indicators'
  },
  {
    id: 'controls-indicators-55',
    title: 'Backup/Travel Alarm',
    description: 'Test travel alarm once machine is in motion.',
    condition: undefined,
    required: true,
    section: 'Controls & Indicators'
  },
  {
    id: 'controls-indicators-56',
    title: 'Communication Devices (if any)',
    description: 'Test optional alarm or communication equipment.',
    condition: undefined,
    required: true,
    section: 'Controls & Indicators'
  },
  {
    id: 'drive-steering-57',
    title: 'Tire Pressure and Condition',
    description: 'Check inflation for pneumatic tires or inspect solid tires for wear/damage.',
    condition: undefined,
    required: true,
    section: 'Drive & Steering'
  },
  {
    id: 'drive-steering-58',
    title: 'Wheel Lug Nuts',
    description: 'Check lug nuts for proper torque.',
    condition: undefined,
    required: true,
    section: 'Drive & Steering'
  },
  {
    id: 'drive-steering-59',
    title: 'Wheel Bearings and Hubs',
    description: 'Spin wheels to check for bearing noise; inspect for play.',
    condition: undefined,
    required: true,
    section: 'Drive & Steering'
  },
  {
    id: 'drive-steering-60',
    title: 'Drive Motors/Transaxle',
    description: 'Inspect hydraulic or electric drive motors for leaks or loose fasteners.',
    condition: undefined,
    required: true,
    section: 'Drive & Steering'
  },
  {
    id: 'drive-steering-61',
    title: 'Service and Parking Brakes',
    description: 'Test braking function and verify parking brake or automatic brake operation.',
    condition: undefined,
    required: true,
    section: 'Drive & Steering'
  },
  {
    id: 'drive-steering-62',
    title: 'Steering Cylinder and Linkages',
    description: 'Inspect cylinder and linkage joints for wear or leaks.',
    condition: undefined,
    required: true,
    section: 'Drive & Steering'
  },
  {
    id: 'drive-steering-63',
    title: 'Alignment and Toe (Observation)',
    description: 'Inspect visually for misalignment or uneven tire wear.',
    condition: undefined,
    required: true,
    section: 'Drive & Steering'
  },
  {
    id: 'drive-steering-64',
    title: 'Caster Wheels (if applicable)',
    description: 'Inspect casters for free spinning and secure mounting.',
    condition: undefined,
    required: true,
    section: 'Drive & Steering'
  },
  {
    id: 'final-inspection-65',
    title: 'Raising and Lowering Test',
    description: 'Fully raise platform, observing lift speed and listening for abnormal noises. Lower smoothly; verify descent alarm works.',
    condition: undefined,
    required: true,
    section: 'Final Inspection'
  },
  {
    id: 'final-inspection-66',
    title: 'Emergency Lowering Function',
    description: 'Test ground-level emergency lowering valve for smooth operation.',
    condition: undefined,
    required: true,
    section: 'Final Inspection'
  },
  {
    id: 'final-inspection-67',
    title: 'Drive Function and Braking Test',
    description: 'Test drive forward/reverse and braking in an open area.',
    condition: undefined,
    required: true,
    section: 'Final Inspection'
  },
  {
    id: 'final-inspection-68',
    title: 'Steering Function Test',
    description: 'Test steering under low-speed movement.',
    condition: undefined,
    required: true,
    section: 'Final Inspection'
  },
  {
    id: 'final-inspection-69',
    title: 'Elevated Drive Cutout Test',
    description: 'Verify machine limits drive speed or disables drive when elevated.',
    condition: undefined,
    required: true,
    section: 'Final Inspection'
  },
  {
    id: 'final-inspection-70',
    title: 'Tilt Sensor Activation',
    description: 'Simulate slight tilt to verify alarm and lift-disable function.',
    condition: undefined,
    required: true,
    section: 'Final Inspection'
  },
  {
    id: 'final-inspection-71',
    title: 'Engine Performance under Load (Engine models)',
    description: 'Observe engine behavior during lifting/driving; verify no stalling or surging.',
    condition: undefined,
    required: true,
    section: 'Final Inspection'
  },
  {
    id: 'final-inspection-72',
    title: 'Post-Operation Leak Inspection',
    description: 'Inspect hydraulic and engine components for new leaks after operation.',
    condition: undefined,
    required: true,
    section: 'Final Inspection'
  },
  {
    id: 'final-inspection-73',
    title: 'Secure and Stow',
    description: 'Power down machine, close gate/chain, secure accessories, and plug into charger if electric.',
    condition: undefined,
    required: true,
    section: 'Final Inspection'
  },
  {
    id: 'final-inspection-74',
    title: 'Documentation and PM Sticker',
    description: 'Record PM, update service sticker, and note any follow-up repairs.',
    condition: undefined,
    required: true,
    section: 'Final Inspection'
  }
];

// Excavator PM (Default)
export const defaultExcavatorChecklist: PMChecklistItem[] = [
  {
    id: 'visual-inspection-1',
    title: 'Exterior and Undercarriage Overview',
    description: 'Walk around the excavator and visually inspect for any obvious damage, loose components, or fluid leaks (oil, hydraulic fluid, coolant). Check that the undercarriage is clear of excessive mud or debris that could hide issues or impede movement.',
    condition: undefined,
    required: true,
    section: 'Visual Inspection'
  },
  {
    id: 'visual-inspection-2',
    title: 'Safety Decals and Labels',
    description: 'Ensure all safety decals, operational labels, and warning signs are present and legible, including load charts (if applicable) and instructional placards.',
    condition: undefined,
    required: true,
    section: 'Visual Inspection'
  },
  {
    id: 'visual-inspection-3',
    title: 'Swing Bearing and House Swing Area',
    description: 'Visually inspect the swing bearing area (where the upper structure meets the undercarriage) for excess grease purging, metal shavings, or debris. Check that the slew ring guard (if present) is secure. Look for any indication of abnormal movement or gaps in the swing bearing.',
    condition: undefined,
    required: true,
    section: 'Visual Inspection'
  },
  {
    id: 'visual-inspection-4',
    title: 'Boom, Stick, and Attachment Condition',
    description: 'Examine the boom and stick (arm) for cracks, dents, or structural damage, especially around welds and connection points. Check the attachment (bucket or other tool) for cracked welds, worn or missing teeth, or damaged cutting edges.',
    condition: undefined,
    required: true,
    section: 'Visual Inspection'
  },
  {
    id: 'visual-inspection-5',
    title: 'Cylinders and Hoses (External)',
    description: 'Inspect all visible hydraulic cylinders (boom lift, arm (stick) cylinder, bucket cylinder, and any auxiliary cylinders) for signs of oil leaks at seals or damage to the rod. Also check exposed hydraulic hoses and tube lines along the boom and stick for cracks, wear, or leaks.',
    condition: undefined,
    required: true,
    section: 'Visual Inspection'
  },
  {
    id: 'visual-inspection-6',
    title: 'Tracks and Ground Contact',
    description: 'Walk around the tracks (or wheels if a wheeled excavator) to check for proper tension and any noticeable damage. Ensure track pads/shoes are secure and not excessively worn or missing bolts. Look for any foreign objects lodged in the tracks or sprockets.',
    condition: undefined,
    required: true,
    section: 'Visual Inspection'
  },
  {
    id: 'visual-inspection-7',
    title: 'Handrails, Steps, and Guards',
    description: 'Verify that all handrails, grab handles, and steps are secure and undamaged. Ensure anti-slip surfaces on steps and the upper structure walkway are in good condition. Check that protective guards and covers (for example, over the swing motor, radiator, etc.) are in place and secure.',
    condition: undefined,
    required: true,
    section: 'Visual Inspection'
  },
  {
    id: 'visual-inspection-8',
    title: 'Counterweight and Carbody',
    description: 'Inspect the counterweight for any damage, cracks, or loose mounting bolts (if removable type). Ensure the carbody (the main lower frame) has no visible structural damage or missing bolts/nuts.',
    condition: undefined,
    required: true,
    section: 'Visual Inspection'
  },
  {
    id: 'visual-inspection-9',
    title: 'House Slew Limit Stop (if equipped)',
    description: 'If the excavator has mechanical swing stops or a house lock (transport pin), verify it is stored properly or engaged only as needed, and check that the mechanism is not damaged.',
    condition: undefined,
    required: true,
    section: 'Visual Inspection'
  },
  {
    id: 'engine-compartment-10',
    title: 'Remove Debris and Clean Compartment',
    description: 'Open the engine hood or covers and clear out any accumulated debris, leaves, or dirt from the engine compartment, especially around the radiator and coolers.',
    condition: undefined,
    required: true,
    section: 'Engine Compartment'
  },
  {
    id: 'engine-compartment-11',
    title: 'Engine Oil Level and Filter',
    description: 'Check the engine oil level using the dipstick and top off if needed with the correct grade. If a scheduled oil change is due, drain the oil and replace the oil filter and oil per manufacturer instructions.',
    condition: undefined,
    required: true,
    section: 'Engine Compartment'
  },
  {
    id: 'engine-compartment-12',
    title: 'Fuel Filters and Water Separator',
    description: 'Inspect the primary and secondary fuel filters for water or sediment. Drain the water separator (bowl or filter drain) of any water and replace fuel filters if due or if poor engine performance is noted.',
    condition: undefined,
    required: true,
    section: 'Engine Compartment'
  },
  {
    id: 'engine-compartment-13',
    title: 'Air Filter and Intake',
    description: 'Check the engine air filter restriction indicator (if equipped) and remove the air filter element. Tap out or blow out dust (if reusable) and replace it if it\'s clogged or according to service interval. Wipe out the inside of the air cleaner housing and ensure the intake piping is secure with no cracks.',
    condition: undefined,
    required: true,
    section: 'Engine Compartment'
  },
  {
    id: 'engine-compartment-14',
    title: 'Belts and Engine Accessories',
    description: 'Inspect all drive belts (fan belt, alternator belt, AC compressor belt if present) for tension and signs of wear (cracks or glazing). Adjust belt tension or replace belts as necessary. Check engine accessory components (alternator, compressor) are securely mounted.',
    condition: undefined,
    required: true,
    section: 'Engine Compartment'
  },
  {
    id: 'engine-compartment-15',
    title: 'Engine Coolant Level',
    description: 'Verify coolant is at the proper level in the radiator or expansion tank (only open cap when engine is cool). Add coolant if low, using the correct type and mixture. Examine visible coolant hoses and connections for leaks or deterioration.',
    condition: undefined,
    required: true,
    section: 'Engine Compartment'
  },
  {
    id: 'engine-compartment-16',
    title: 'Engine Cooling Fan and Shroud',
    description: 'With engine off, inspect the fan for any damage (bent or cracked blades) and test for excessive play indicating a worn bearing. Ensure the fan shroud is properly aligned and secured to prevent contact with the fan.',
    condition: undefined,
    required: true,
    section: 'Engine Compartment'
  },
  {
    id: 'engine-compartment-17',
    title: 'Exhaust System',
    description: 'Inspect the exhaust manifold, turbocharger (if equipped), and muffler for soot marks or carbon buildup that could indicate leaks. Ensure exhaust pipes and mounts are secure and check that the rain cap (if present on the exhaust outlet) opens freely.',
    condition: undefined,
    required: true,
    section: 'Engine Compartment'
  },
  {
    id: 'engine-compartment-18',
    title: 'Engine Leaks and Mounts',
    description: 'Look over the engine block, oil pan, valve cover, and fuel injection pump for any signs of fluid leaks (oil, fuel, coolant). Check engine mounts for any broken bolts or deteriorated rubber, indicating the engine may not be securely seated.',
    condition: undefined,
    required: true,
    section: 'Engine Compartment'
  },
  {
    id: 'engine-compartment-19',
    title: 'Pre-Start Engine Condition',
    description: 'Before starting the engine, check critical fluid levels including engine oil, coolant, and also hydraulic oil (sight gauge) to ensure everything is filled. Verify no tools or rags are left in the compartment and that all caps (oil fill, dipstick, coolant) are secured.',
    condition: undefined,
    required: true,
    section: 'Engine Compartment'
  },
  {
    id: 'electrical-system-20',
    title: 'Battery and Connections',
    description: 'Inspect the battery (or batteries) for secure mounting, clean terminals, and no cracks or bulging in the case. Clean any corrosion from terminals and cables. Check battery electrolyte level (if not maintenance-free) or indicator if present, and top up with distilled water if needed.',
    condition: undefined,
    required: true,
    section: 'Electrical System'
  },
  {
    id: 'electrical-system-21',
    title: 'Battery Load Test',
    description: 'Perform a battery load test or monitor voltage during engine start to ensure the battery can provide sufficient power. Replace the battery if it fails to hold charge or deliver adequate cranking power.',
    condition: undefined,
    required: true,
    section: 'Electrical System'
  },
  {
    id: 'electrical-system-22',
    title: 'Charging and Starting Circuit',
    description: 'With the engine running, measure alternator output to verify the charging system is functioning. Listen for alternator noise. Inspect starter wiring and connections for tightness and check that the starter motor is securely mounted.',
    condition: undefined,
    required: true,
    section: 'Electrical System'
  },
  {
    id: 'electrical-system-23',
    title: 'Fuses, Relays, and Control Modules',
    description: 'Open the electrical control box or fuse panel. Check that all fuses are intact and of correct rating, and that no relays are loose. Look for any signs of overheated wires or components. Ensure control modules (ECU, etc.) are firmly connected and show no fault lights, if visible.',
    condition: undefined,
    required: true,
    section: 'Electrical System'
  },
  {
    id: 'electrical-system-24',
    title: 'Lights and Horn',
    description: 'Activate all exterior lights: check operation of front and rear working lights, travel lights, blinkers/brake lights (if applicable), and beacon or strobe if fitted. Verify the horn works and is loud enough.',
    condition: undefined,
    required: true,
    section: 'Electrical System'
  },
  {
    id: 'electrical-system-25',
    title: 'Operator Display and Gauges',
    description: 'Turn the ignition on and confirm all warning lights on the operator display illuminate during the self-test and go out after engine start (except those that should remain). Check that gauges read normally.',
    condition: undefined,
    required: true,
    section: 'Electrical System'
  },
  {
    id: 'electrical-system-26',
    title: 'Backup Alarm and Camera (if equipped)',
    description: 'Put the excavator in reverse to test that the backup alarm sounds. If a rearview camera or other vision system is installed, verify that it powers on and provides a clear image.',
    condition: undefined,
    required: true,
    section: 'Electrical System'
  },
  {
    id: 'electrical-system-27',
    title: 'Wiring Harness and Connectors',
    description: 'Trace main wiring harnesses for signs of rubbing, loose clamps, exposed wires, or pinched sections through the swing bearing area.',
    condition: undefined,
    required: true,
    section: 'Electrical System'
  },
  {
    id: 'hydraulic-system-28',
    title: 'Hydraulic Oil Level and Temperature',
    description: 'Check the hydraulic oil level via the sight glass or dipstick with the machine on level ground and implements lowered. Ensure the oil is clean and at correct level.',
    condition: undefined,
    required: true,
    section: 'Hydraulic System'
  },
  {
    id: 'hydraulic-system-29',
    title: 'Hydraulic Filters',
    description: 'Replace return, pilot, or case drain filters if due. Inspect removed filters for metal shavings.',
    condition: undefined,
    required: true,
    section: 'Hydraulic System'
  },
  {
    id: 'hydraulic-system-30',
    title: 'Hydraulic Pump and Valves',
    description: 'Inspect the main pump(s) for leaks or loose fittings. Check control valve blocks and solenoids for damage or leakage.',
    condition: undefined,
    required: true,
    section: 'Hydraulic System'
  },
  {
    id: 'hydraulic-system-31',
    title: 'Travel Motors and Swing Motor for Leaks',
    description: 'Inspect travel motors, swing motor, and swivel joint for leaks or damage.',
    condition: undefined,
    required: true,
    section: 'Hydraulic System'
  },
  {
    id: 'hydraulic-system-32',
    title: 'Auxiliary Hydraulic Circuit',
    description: 'Inspect auxiliary lines and connectors. Engage aux control briefly to verify flow and relief operation.',
    condition: undefined,
    required: true,
    section: 'Hydraulic System'
  },
  {
    id: 'hydraulic-system-33',
    title: 'Cylinders and Hoses (Detailed)',
    description: 'Inspect all cylinders for leaks, worn pins, cracked lugs, and damaged hoses.',
    condition: undefined,
    required: true,
    section: 'Hydraulic System'
  },
  {
    id: 'hydraulic-system-34',
    title: 'Hydraulic Tank Cap and Breather',
    description: 'Ensure tank cap is tight and breather element is clean/unclogged.',
    condition: undefined,
    required: true,
    section: 'Hydraulic System'
  },
  {
    id: 'hydraulic-system-35',
    title: 'Operational Test for Hydraulic Functions',
    description: 'Cycle all hydraulic functions without load to confirm smooth, responsive operation.',
    condition: undefined,
    required: true,
    section: 'Hydraulic System'
  },
  {
    id: 'undercarriage-tracks-36',
    title: 'Track Tension and Adjustment',
    description: 'Measure track sag and adjust tension using grease adjuster valve as needed.',
    condition: undefined,
    required: true,
    section: 'Undercarriage & Tracks'
  },
  {
    id: 'undercarriage-tracks-37',
    title: 'Track Shoes and Pads',
    description: 'Inspect shoes/pads for wear, loose bolts, cracks, or damage.',
    condition: undefined,
    required: true,
    section: 'Undercarriage & Tracks'
  },
  {
    id: 'undercarriage-tracks-38',
    title: 'Drive Sprockets',
    description: 'Inspect sprocket teeth for wear or cracks and verify bolt tightness.',
    condition: undefined,
    required: true,
    section: 'Undercarriage & Tracks'
  },
  {
    id: 'undercarriage-tracks-39',
    title: 'Rollers and Idlers',
    description: 'Inspect rollers and idlers for leaks, wear, and free movement.',
    condition: undefined,
    required: true,
    section: 'Undercarriage & Tracks'
  },
  {
    id: 'undercarriage-tracks-40',
    title: 'Track Frame and Guards',
    description: 'Inspect track frame for cracks or loose guards.',
    condition: undefined,
    required: true,
    section: 'Undercarriage & Tracks'
  },
  {
    id: 'undercarriage-tracks-41',
    title: 'Final Drives (Travel Gearboxes)',
    description: 'Check final drive oil level and inspect magnetic plugs for metal.',
    condition: undefined,
    required: true,
    section: 'Undercarriage & Tracks'
  },
  {
    id: 'undercarriage-tracks-42',
    title: 'Swing Bearing Bolts',
    description: 'Visually inspect swing bearing bolts for looseness or missing bolts.',
    condition: undefined,
    required: true,
    section: 'Undercarriage & Tracks'
  },
  {
    id: 'undercarriage-tracks-43',
    title: 'Cleaning and Debris Removal',
    description: 'Remove mud, rocks, or debris from undercarriage components.',
    condition: undefined,
    required: true,
    section: 'Undercarriage & Tracks'
  },
  {
    id: 'swing-system-44',
    title: 'Swing Brake Function',
    description: 'Test swing brake or lock for proper engagement and release.',
    condition: undefined,
    required: true,
    section: 'Swing System'
  },
  {
    id: 'swing-system-45',
    title: 'Swing Gearbox Oil',
    description: 'Check oil level/condition in swing drive gearbox.',
    condition: undefined,
    required: true,
    section: 'Swing System'
  },
  {
    id: 'swing-system-46',
    title: 'Swing Bearing and Grease',
    description: 'Grease swing bearing fittings and inspect gear teeth if visible.',
    condition: undefined,
    required: true,
    section: 'Swing System'
  },
  {
    id: 'swing-system-47',
    title: 'Swing Motor and Relief',
    description: 'Inspect swing motor for leaks and verify smooth swing operation.',
    condition: undefined,
    required: true,
    section: 'Swing System'
  },
  {
    id: 'swing-system-48',
    title: 'Swing Seal Guard',
    description: 'Inspect swing bearing seal integrity and confirm guards are secure.',
    condition: undefined,
    required: true,
    section: 'Swing System'
  },
  {
    id: 'boom-stick-attachment-49',
    title: 'Boom and Stick Structural Check',
    description: 'Inspect for cracks, bends, or stressed welds along boom and stick.',
    condition: undefined,
    required: true,
    section: 'Boom, Stick & Attachment'
  },
  {
    id: 'boom-stick-attachment-50',
    title: 'Pins and Bushings Wear',
    description: 'Check all joints for excessive play, wear particles, or missing retainers.',
    condition: undefined,
    required: true,
    section: 'Boom, Stick & Attachment'
  },
  {
    id: 'boom-stick-attachment-51',
    title: 'Attachment Coupler (if equipped)',
    description: 'Inspect coupler structure, locking mechanism, and safety pins.',
    condition: undefined,
    required: true,
    section: 'Boom, Stick & Attachment'
  },
  {
    id: 'boom-stick-attachment-52',
    title: 'Bucket/Attachment Condition',
    description: 'Inspect bucket teeth, cutting edges, or attachments for wear or cracks.',
    condition: undefined,
    required: true,
    section: 'Boom, Stick & Attachment'
  },
  {
    id: 'boom-stick-attachment-53',
    title: 'Cylinder Attachments',
    description: 'Check cylinder mounting points for cracks or loose hardware.',
    condition: undefined,
    required: true,
    section: 'Boom, Stick & Attachment'
  },
  {
    id: 'boom-stick-attachment-54',
    title: 'Lubrication of Front End',
    description: 'Grease all linkage and pivot points until clean grease extrudes.',
    condition: undefined,
    required: true,
    section: 'Boom, Stick & Attachment'
  },
  {
    id: 'boom-stick-attachment-55',
    title: 'Auxiliary Attachment Hoses',
    description: 'Inspect hoses on thumbs/attachments for leaks or abrasion.',
    condition: undefined,
    required: true,
    section: 'Boom, Stick & Attachment'
  },
  {
    id: 'cooling-system-56',
    title: 'Radiator and Coolers',
    description: 'Clean radiator, oil cooler, and charge air cooler fins.',
    condition: undefined,
    required: true,
    section: 'Cooling System'
  },
  {
    id: 'cooling-system-57',
    title: 'Coolant Strength and Level',
    description: 'Test coolant for freeze/boil protection and proper level.',
    condition: undefined,
    required: true,
    section: 'Cooling System'
  },
  {
    id: 'cooling-system-58',
    title: 'Cooling System Leaks',
    description: 'Inspect radiator, hoses, clamps, thermostat housing, and engine block.',
    condition: undefined,
    required: true,
    section: 'Cooling System'
  },
  {
    id: 'cooling-system-59',
    title: 'Water Pump and Fan Drive',
    description: 'Inspect weep hole for leaks and check for pulley play or belt issues.',
    condition: undefined,
    required: true,
    section: 'Cooling System'
  },
  {
    id: 'cooling-system-60',
    title: 'Engine Temperature Performance',
    description: 'Warm engine and monitor coolant temperature stability.',
    condition: undefined,
    required: true,
    section: 'Cooling System'
  },
  {
    id: 'cooling-system-61',
    title: 'Cab Heater Core (if applicable)',
    description: 'Verify heater produces warm air and hoses are leak-free.',
    condition: undefined,
    required: true,
    section: 'Cooling System'
  },
  {
    id: 'fuel-system-62',
    title: 'Fuel Tank and Cap',
    description: 'Inspect tank integrity and verify cap seals and vents properly.',
    condition: undefined,
    required: true,
    section: 'Fuel System'
  },
  {
    id: 'fuel-system-63',
    title: 'Fuel Lines and Injectors',
    description: 'Check all lines for cracks, leaks, or loose fittings. Inspect injector area.',
    condition: undefined,
    required: true,
    section: 'Fuel System'
  },
  {
    id: 'fuel-system-64',
    title: 'Water Separator Operation',
    description: 'Drain separator and check indicator functionality.',
    condition: undefined,
    required: true,
    section: 'Fuel System'
  },
  {
    id: 'fuel-system-65',
    title: 'Fuel Filter Change (if due)',
    description: 'Replace fuel filters per interval and bleed air from system.',
    condition: undefined,
    required: true,
    section: 'Fuel System'
  },
  {
    id: 'fuel-system-66',
    title: 'Turbocharger & Aftertreatment (if applicable)',
    description: 'Inspect DEF tank/lines, DPF regen status, and turbocharger for leaks.',
    condition: undefined,
    required: true,
    section: 'Fuel System'
  },
  {
    id: 'cab-controls-67',
    title: 'Operator Seat and Seat Belt',
    description: 'Inspect seat/seat belt condition and verify latch/alarm operation.',
    condition: undefined,
    required: true,
    section: 'Cab & Controls'
  },
  {
    id: 'cab-controls-68',
    title: 'Control Levers and Joysticks',
    description: 'Confirm smooth movement and neutral return.',
    condition: undefined,
    required: true,
    section: 'Cab & Controls'
  },
  {
    id: 'cab-controls-69',
    title: 'Pedals and Travel Controls',
    description: 'Clean around pedals and verify proper operation.',
    condition: undefined,
    required: true,
    section: 'Cab & Controls'
  },
  {
    id: 'cab-controls-70',
    title: 'Monitor Panel and Alerts',
    description: 'Verify warning lights, service codes, and maintenance indicators.',
    condition: undefined,
    required: true,
    section: 'Cab & Controls'
  },
  {
    id: 'cab-controls-71',
    title: 'Climate Controls',
    description: 'Test AC/heater, fan speeds, and replace cab air filter if needed.',
    condition: undefined,
    required: true,
    section: 'Cab & Controls'
  },
  {
    id: 'cab-controls-72',
    title: 'Wipers and Washers',
    description: 'Verify wiper/washers operate and replace blades if worn.',
    condition: undefined,
    required: true,
    section: 'Cab & Controls'
  },
  {
    id: 'cab-controls-73',
    title: 'Cab Accessories and Safety',
    description: 'Check fire extinguisher, operator manual, and emergency exits.',
    condition: undefined,
    required: true,
    section: 'Cab & Controls'
  },
  {
    id: 'cab-controls-74',
    title: 'Parking Brake and Hold Function',
    description: 'Verify parking brake or travel lock operates as designed.',
    condition: undefined,
    required: true,
    section: 'Cab & Controls'
  },
  {
    id: 'final-inspection-75',
    title: 'Engine Start and Idle',
    description: 'Start engine and verify warning lights clear and idle is smooth.',
    condition: undefined,
    required: true,
    section: 'Final Inspection'
  },
  {
    id: 'final-inspection-76',
    title: 'Control Function Test',
    description: 'Test boom, stick, bucket, and swing functions for smooth response.',
    condition: undefined,
    required: true,
    section: 'Final Inspection'
  },
  {
    id: 'final-inspection-77',
    title: 'Travel and Brake Test',
    description: 'Drive forward/reverse; verify even tracking and proper braking.',
    condition: undefined,
    required: true,
    section: 'Final Inspection'
  },
  {
    id: 'final-inspection-78',
    title: 'High Speed Travel (if equipped)',
    description: 'Test two-speed travel for smooth shifting and operation.',
    condition: undefined,
    required: true,
    section: 'Final Inspection'
  },
  {
    id: 'final-inspection-79',
    title: 'Attachment Operation Test',
    description: 'Test thumbs, breakers, or other attachments for full function.',
    condition: undefined,
    required: true,
    section: 'Final Inspection'
  },
  {
    id: 'final-inspection-80',
    title: 'Warning Devices Test',
    description: 'Test horn, backup alarm, and other warning devices.',
    condition: undefined,
    required: true,
    section: 'Final Inspection'
  },
  {
    id: 'final-inspection-81',
    title: 'Monitoring During Operation',
    description: 'Observe engine/hydraulic temps, pressure, and gauge behavior.',
    condition: undefined,
    required: true,
    section: 'Final Inspection'
  },
  {
    id: 'final-inspection-82',
    title: 'Leak Check Post-Operation',
    description: 'Inspect machine after shutdown for fresh leaks.',
    condition: undefined,
    required: true,
    section: 'Final Inspection'
  },
  {
    id: 'final-inspection-83',
    title: 'House Swing Parking',
    description: 'Park machine with house aligned and swing lock engaged if needed.',
    condition: undefined,
    required: true,
    section: 'Final Inspection'
  },
  {
    id: 'final-inspection-84',
    title: 'Documentation and Clean-Up',
    description: 'Record service, apply PM sticker, and clean machine surfaces.',
    condition: undefined,
    required: true,
    section: 'Final Inspection'
  }
];

// Skid Steer PM (Default)
export const defaultSkidSteerChecklist: PMChecklistItem[] = [
  {
    id: 'visual-inspection-1',
    title: 'Fluid Leaks and Exterior Condition',
    description: 'Inspect under and around the skid steer for any signs of engine oil, hydraulic fluid, or coolant leaks. Examine the exterior panels and structure for damage, cracks, or excessive corrosion.',
    condition: undefined,
    required: true,
    section: 'Visual Inspection'
  },
  {
    id: 'visual-inspection-2',
    title: 'Safety Decals and Placards',
    description: 'Verify that all safety decals, operating instructions, and warning placards are present and legible on the machine.',
    condition: undefined,
    required: true,
    section: 'Visual Inspection'
  },
  {
    id: 'visual-inspection-3',
    title: 'ROPS/FOPS Structure and Cab',
    description: 'Check the Roll-Over Protective Structure (ROPS) and Falling Object Protective Structure (FOPS) for any bends, cracks, or missing bolts. Ensure all cab components (doors, windows if equipped) open and close properly.',
    condition: undefined,
    required: true,
    section: 'Visual Inspection'
  },
  {
    id: 'visual-inspection-4',
    title: 'Loader Arms and Quick Coupler',
    description: 'Examine the loader lift arms for any cracks, bends, or weld damage. Inspect the quick coupler or attachment mounting device for wear and proper locking function.',
    condition: undefined,
    required: true,
    section: 'Visual Inspection'
  },
  {
    id: 'visual-inspection-5',
    title: 'Bucket or Attachment Condition',
    description: 'If a bucket or other attachment is installed, check it for cracks, broken welds, or excessive wear (including bucket cutting edge or teeth). Ensure it is securely attached.',
    condition: undefined,
    required: true,
    section: 'Visual Inspection'
  },
  {
    id: 'visual-inspection-6',
    title: 'Wheels or Tracks Condition',
    description: 'Visually inspect tires (if wheeled) for cuts, punctures, and adequate tread depth; verify proper inflation. If the skid steer uses tracks, examine the tracks for cuts, abnormal wear, or slack in tension, and inspect sprockets and rollers for damage.',
    condition: undefined,
    required: true,
    section: 'Visual Inspection'
  },
  {
    id: 'visual-inspection-7',
    title: 'Steps, Handholds, and Safety Equipment',
    description: 'Ensure entry steps and grab handles are secure and free of damage, with anti-slip surfaces in good condition. Verify that required safety equipment (e.g., fire extinguisher) is present and properly secured if applicable.',
    condition: undefined,
    required: true,
    section: 'Visual Inspection'
  },
  {
    id: 'visual-inspection-8',
    title: 'Seat and Seat Belt Condition',
    description: 'Inspect the operator\'s seat for damage and ensure the seat belt is present, undamaged, and latches securely.',
    condition: undefined,
    required: true,
    section: 'Visual Inspection'
  },
  {
    id: 'visual-inspection-9',
    title: 'Engine Compartment Covers',
    description: 'Confirm that engine compartment covers, access panels, and hood latches are intact and secure. Open and close latches to verify proper operation.',
    condition: undefined,
    required: true,
    section: 'Visual Inspection'
  },
  {
    id: 'visual-inspection-10',
    title: 'Visibility Aids',
    description: 'If equipped with mirrors or camera systems, ensure they are clean, properly adjusted, and not cracked.',
    condition: undefined,
    required: true,
    section: 'Visual Inspection'
  },
  {
    id: 'engine-compartment-11',
    title: 'Clean Engine Compartment',
    description: 'Remove any accumulated debris, dirt, or dust from the engine compartment and cooling areas using compressed air or a soft brush, taking care not to damage wiring or components.',
    condition: undefined,
    required: true,
    section: 'Engine Compartment'
  },
  {
    id: 'engine-compartment-12',
    title: 'Engine Oil Level and Change',
    description: 'Check the engine oil level with the dipstick and top up if necessary. If due for service, drain the engine oil and replace it with the appropriate oil grade, and install a new oil filter according to manufacturer specifications.',
    condition: undefined,
    required: true,
    section: 'Engine Compartment'
  },
  {
    id: 'engine-compartment-13',
    title: 'Air Filter Inspection',
    description: 'Inspect the engine air filter element for dirt and clogging. Clean the air filter housing and replace the filter if it is dirty or per service interval.',
    condition: undefined,
    required: true,
    section: 'Engine Compartment'
  },
  {
    id: 'engine-compartment-14',
    title: 'Fuel Filter and Water Separator',
    description: 'Check the fuel filter and water separator (if equipped) for contaminants. Drain any water from the separator and replace the fuel filter if due or if poor fuel flow is suspected.',
    condition: undefined,
    required: true,
    section: 'Engine Compartment'
  },
  {
    id: 'engine-compartment-15',
    title: 'Belts and Pulleys',
    description: 'Inspect engine drive belts (fan belt, alternator belt, etc.) for cracks, fraying, or improper tension. Adjust belt tension or replace belts as needed and ensure pulleys are aligned and secure.',
    condition: undefined,
    required: true,
    section: 'Engine Compartment'
  },
  {
    id: 'engine-compartment-16',
    title: 'Engine Coolant Level and Hoses',
    description: 'Verify the coolant level in the radiator or overflow tank is at the correct level. Inspect coolant hoses and clamps for cracks, bulges, or leaks. Top off coolant if low, using the correct coolant type.',
    condition: undefined,
    required: true,
    section: 'Engine Compartment'
  },
  {
    id: 'engine-compartment-17',
    title: 'Intake and Exhaust System',
    description: 'Examine air intake hoses and clamps for tightness and cracks. Inspect the exhaust manifold, muffler, and piping for leaks, damage, or excessive rust, and ensure the exhaust is securely mounted.',
    condition: undefined,
    required: true,
    section: 'Engine Compartment'
  },
  {
    id: 'engine-compartment-18',
    title: 'Engine Mounts and Vibration',
    description: 'Check that engine mounting bolts are tight and the engine mounts are not cracked or excessively worn. Watch the engine while running for abnormal movement or vibration indicating mount issues.',
    condition: undefined,
    required: true,
    section: 'Engine Compartment'
  },
  {
    id: 'engine-compartment-19',
    title: 'Check for Engine Leaks',
    description: 'Look over the engine block, oil pan, valve cover, and around filters for any evidence of oil or coolant leaks, and address any leaks found.',
    condition: undefined,
    required: true,
    section: 'Engine Compartment'
  },
  {
    id: 'engine-compartment-20',
    title: 'Engine Performance and Smoke',
    description: 'Start the engine and listen for any abnormal noises (knocking, ticking). Observe the exhaust for excessive smoke on startup and at idle (blue or black smoke may indicate issues). Ensure the engine idles smoothly at correct RPM.',
    condition: undefined,
    required: true,
    section: 'Engine Compartment'
  },
  {
    id: 'electrical-system-21',
    title: 'Battery Condition and Terminals',
    description: 'Inspect the battery for proper mounting and no external damage. Clean any corrosion from battery terminals and ensure the connections are tight. Perform a battery load test to verify its condition.',
    condition: undefined,
    required: true,
    section: 'Electrical System'
  },
  {
    id: 'electrical-system-22',
    title: 'Charging System Output',
    description: 'With the engine running, check the alternator to ensure it is charging at the correct voltage output. Listen for unusual alternator noises and inspect the alternator belt (or drive) for proper operation.',
    condition: undefined,
    required: true,
    section: 'Electrical System'
  },
  {
    id: 'electrical-system-23',
    title: 'Wiring Harness and Connectors',
    description: 'Examine the machine\'s wiring harnesses and electrical connectors for signs of wear, rubbing, or insulation damage. Ensure all connectors are seated fully and not corroded.',
    condition: undefined,
    required: true,
    section: 'Electrical System'
  },
  {
    id: 'electrical-system-24',
    title: 'Fuses and Relays',
    description: 'Open the fuse box and relay panel to check that fuses are intact (not blown) and that there is no corrosion or water ingress. Verify spare fuses are available as recommended.',
    condition: undefined,
    required: true,
    section: 'Electrical System'
  },
  {
    id: 'electrical-system-25',
    title: 'Lights and Alarms',
    description: 'Verify all lights (work lights, headlights if equipped, tail/brake lights if equipped) are functioning properly. Test the backup alarm and any warning beacons or strobes for proper operation.',
    condition: undefined,
    required: true,
    section: 'Electrical System'
  },
  {
    id: 'electrical-system-26',
    title: 'Horn and Indicator Gauges',
    description: 'Press the horn button to ensure the horn functions and is loud. Check that all indicator lights on the dashboard illuminate as appropriate during startup and that all gauges are operational and reading accurately.',
    condition: undefined,
    required: true,
    section: 'Electrical System'
  },
  {
    id: 'electrical-system-27',
    title: 'Safety Interlock Systems',
    description: 'Test any electrical safety interlocks (seat belt switch, operator presence switch, seat bar interlock) to ensure the machine will only start or operate under safe conditions.',
    condition: undefined,
    required: true,
    section: 'Electrical System'
  },
  {
    id: 'hydraulic-system-28',
    title: 'Hydraulic Fluid Level and Quality',
    description: 'Check the hydraulic reservoir fluid level with the dipstick or sight gauge while the arms are lowered and the engine off. Ensure the level is within the correct range and the fluid appears clean.',
    condition: undefined,
    required: true,
    section: 'Hydraulic System'
  },
  {
    id: 'hydraulic-system-29',
    title: 'Hydraulic Filter Change (if due)',
    description: 'Replace hydraulic filters if service hours require it. Clean around filters before removal.',
    condition: undefined,
    required: true,
    section: 'Hydraulic System'
  },
  {
    id: 'hydraulic-system-30',
    title: 'Hydraulic Pump and Control Valve',
    description: 'Inspect pump and control valve assembly for leaks or damage. Listen for unusual noises during operation.',
    condition: undefined,
    required: true,
    section: 'Hydraulic System'
  },
  {
    id: 'hydraulic-system-31',
    title: 'Auxiliary Hydraulics and Couplers',
    description: 'Inspect auxiliary couplers for leaks or damage. Ensure quick couplers are clean and functional.',
    condition: undefined,
    required: true,
    section: 'Hydraulic System'
  },
  {
    id: 'hydraulic-system-32',
    title: 'Cylinders and Hoses',
    description: 'Inspect all cylinders for shaft pitting, bent rods, or leaking seals. Check hoses for cracks, abrasion, or leaks.',
    condition: undefined,
    required: true,
    section: 'Hydraulic System'
  },
  {
    id: 'hydraulic-system-33',
    title: 'Hydraulic Lines Routing and Clamps',
    description: 'Verify lines are properly routed and secured, preventing chafing or interference.',
    condition: undefined,
    required: true,
    section: 'Hydraulic System'
  },
  {
    id: 'hydraulic-system-34',
    title: 'Relief Valve and Hydraulic Functions',
    description: 'Test hydraulic functions under no-load conditions to verify smooth operation.',
    condition: undefined,
    required: true,
    section: 'Hydraulic System'
  },
  {
    id: 'hydraulic-system-35',
    title: 'Hydraulic Tank Breather Cap',
    description: 'Inspect and clean or replace the breather cap if dirty or clogged.',
    condition: undefined,
    required: true,
    section: 'Hydraulic System'
  },
  {
    id: 'drive-system-undercarriage-36',
    title: 'Chain Case or Final Drive Oil',
    description: 'Check final drive oil or chain case oil level and condition.',
    condition: undefined,
    required: true,
    section: 'Drive System & Undercarriage'
  },
  {
    id: 'drive-system-undercarriage-37',
    title: 'Drive Motors and Pumps',
    description: 'Inspect motors and pumps for leaks, loose bolts, or abnormal noises.',
    condition: undefined,
    required: true,
    section: 'Drive System & Undercarriage'
  },
  {
    id: 'drive-system-undercarriage-38',
    title: 'Tires – Lug Nuts and Bearings',
    description: 'Check wheel lug nuts and inspect wheel bearings for noise or play.',
    condition: undefined,
    required: true,
    section: 'Drive System & Undercarriage'
  },
  {
    id: 'drive-system-undercarriage-39',
    title: 'Tracks, Sprockets & Rollers',
    description: 'Inspect track tension, sprockets, rollers, and adjusters for wear or damage.',
    condition: undefined,
    required: true,
    section: 'Drive System & Undercarriage'
  },
  {
    id: 'drive-system-undercarriage-40',
    title: 'Axle Housings and Drive Chains',
    description: 'Inspect housings for leaks/cracks. Inspect drive chains if accessible.',
    condition: undefined,
    required: true,
    section: 'Drive System & Undercarriage'
  },
  {
    id: 'drive-system-undercarriage-41',
    title: 'Parking Brake or Brake System',
    description: 'Test parking brake and inspect hydraulic brake components if equipped.',
    condition: undefined,
    required: true,
    section: 'Drive System & Undercarriage'
  },
  {
    id: 'drive-system-undercarriage-42',
    title: 'Frame and Underbody',
    description: 'Inspect frame and underside for damage or loose bolts.',
    condition: undefined,
    required: true,
    section: 'Drive System & Undercarriage'
  },
  {
    id: 'lift-arms-attachment-coupler-43',
    title: 'Pivot Pins and Bushings',
    description: 'Inspect pivot pins and bushings for wear or excessive movement.',
    condition: undefined,
    required: true,
    section: 'Lift Arms & Attachment Coupler'
  },
  {
    id: 'lift-arms-attachment-coupler-44',
    title: 'Lift Cylinders and Mounts',
    description: 'Inspect lift cylinder mounts and seals for leaks or damage.',
    condition: undefined,
    required: true,
    section: 'Lift Arms & Attachment Coupler'
  },
  {
    id: 'lift-arms-attachment-coupler-45',
    title: 'Tilt Cylinder and Linkage',
    description: 'Inspect tilt cylinder and linkage for leaks, damage, or wear.',
    condition: undefined,
    required: true,
    section: 'Lift Arms & Attachment Coupler'
  },
  {
    id: 'lift-arms-attachment-coupler-46',
    title: 'Attachment Coupler Locks',
    description: 'Test coupler lock mechanism for full engagement and structural integrity.',
    condition: undefined,
    required: true,
    section: 'Lift Arms & Attachment Coupler'
  },
  {
    id: 'lift-arms-attachment-coupler-47',
    title: 'Grease Points – Loader Frame',
    description: 'Grease all fittings on arms, pivots, and coupler.',
    condition: undefined,
    required: true,
    section: 'Lift Arms & Attachment Coupler'
  },
  {
    id: 'lift-arms-attachment-coupler-48',
    title: 'Loader Arm Stop and Cylinder Stops',
    description: 'Inspect and test loader arm stops and safety supports.',
    condition: undefined,
    required: true,
    section: 'Lift Arms & Attachment Coupler'
  },
  {
    id: 'cooling-system-49',
    title: 'Radiator and Oil Cooler Fins',
    description: 'Clean radiator and coolers with compressed air to ensure airflow.',
    condition: undefined,
    required: true,
    section: 'Cooling System'
  },
  {
    id: 'cooling-system-50',
    title: 'Coolant Condition and Leaks',
    description: 'Inspect coolant for proper condition and check for leaks.',
    condition: undefined,
    required: true,
    section: 'Cooling System'
  },
  {
    id: 'cooling-system-51',
    title: 'Radiator Cap and Pressure',
    description: 'Inspect radiator cap seal and pressure rating.',
    condition: undefined,
    required: true,
    section: 'Cooling System'
  },
  {
    id: 'cooling-system-52',
    title: 'Fan and Shroud',
    description: 'Inspect fan blades and shroud for damage or looseness.',
    condition: undefined,
    required: true,
    section: 'Cooling System'
  },
  {
    id: 'cooling-system-53',
    title: 'Water Pump',
    description: 'Inspect water pump for leaks or bearing wear.',
    condition: undefined,
    required: true,
    section: 'Cooling System'
  },
  {
    id: 'cooling-system-54',
    title: 'Temperature Protection',
    description: 'Test coolant freeze protection level.',
    condition: undefined,
    required: true,
    section: 'Cooling System'
  },
  {
    id: 'cooling-system-55',
    title: 'Heater Core (if equipped)',
    description: 'Test cabin heater for warm airflow and inspect hoses.',
    condition: undefined,
    required: true,
    section: 'Cooling System'
  },
  {
    id: 'fuel-system-56',
    title: 'Fuel Tank and Lines',
    description: 'Inspect tank and lines for leaks or damage.',
    condition: undefined,
    required: true,
    section: 'Fuel System'
  },
  {
    id: 'fuel-system-57',
    title: 'Fuel Level and Quality',
    description: 'Verify adequate fuel and check for contaminants.',
    condition: undefined,
    required: true,
    section: 'Fuel System'
  },
  {
    id: 'fuel-system-58',
    title: 'Primer Bulb or Lift Pump',
    description: 'Test primer bulb or electric lift pump operation.',
    condition: undefined,
    required: true,
    section: 'Fuel System'
  },
  {
    id: 'fuel-system-59',
    title: 'Injectors and Fuel Injection Pump',
    description: 'Inspect for leaks and listen for uneven engine running.',
    condition: undefined,
    required: true,
    section: 'Fuel System'
  },
  {
    id: 'fuel-system-60',
    title: 'Diesel Exhaust Fluid (DEF) System (if applicable)',
    description: 'Inspect DEF tank level, injector system, and look for crystallization or leaks.',
    condition: undefined,
    required: true,
    section: 'Fuel System'
  },
  {
    id: 'cab-operator-controls-61',
    title: 'Operator Presence Seat Switch',
    description: 'Test seat switch for proper safety function.',
    condition: undefined,
    required: true,
    section: 'Cab & Operator Controls'
  },
  {
    id: 'cab-operator-controls-62',
    title: 'Seat Bar and Interlocks',
    description: 'Inspect lap bar operation and verify hydraulic disable function.',
    condition: undefined,
    required: true,
    section: 'Cab & Operator Controls'
  },
  {
    id: 'cab-operator-controls-63',
    title: 'Control Levers/Joy Sticks',
    description: 'Inspect controls for smooth movement and proper operation.',
    condition: undefined,
    required: true,
    section: 'Cab & Operator Controls'
  },
  {
    id: 'cab-operator-controls-64',
    title: 'Pedals and Parking Brake Control',
    description: 'Check pedal operation and parking brake engagement.',
    condition: undefined,
    required: true,
    section: 'Cab & Operator Controls'
  },
  {
    id: 'cab-operator-controls-65',
    title: 'Instrument Panel and Indicators',
    description: 'Verify all gauges, warning lights, and hour meter function.',
    condition: undefined,
    required: true,
    section: 'Cab & Operator Controls'
  },
  {
    id: 'cab-operator-controls-66',
    title: 'Cab Comfort Systems',
    description: 'Test heater, defroster, AC (if equipped), and wipers.',
    condition: undefined,
    required: true,
    section: 'Cab & Operator Controls'
  },
  {
    id: 'cab-operator-controls-67',
    title: 'Visibility and Mirrors',
    description: 'Clean windows/mirrors and verify adjustments.',
    condition: undefined,
    required: true,
    section: 'Cab & Operator Controls'
  },
  {
    id: 'cab-operator-controls-68',
    title: 'Fire Extinguisher & Safety Supplies',
    description: 'Verify extinguisher is charged and other safety supplies are present.',
    condition: undefined,
    required: true,
    section: 'Cab & Operator Controls'
  },
  {
    id: 'final-inspection-69',
    title: 'Engine Start and Idle Test',
    description: 'Start engine and confirm proper idle, sound, and warning lights.',
    condition: undefined,
    required: true,
    section: 'Final Inspection'
  },
  {
    id: 'final-inspection-70',
    title: 'Drive Function Test',
    description: 'Test forward/reverse movement and steering pivot function.',
    condition: undefined,
    required: true,
    section: 'Final Inspection'
  },
  {
    id: 'final-inspection-71',
    title: 'Brake and Park Brake Test',
    description: 'Test service brake and parking brake effectiveness.',
    condition: undefined,
    required: true,
    section: 'Final Inspection'
  },
  {
    id: 'final-inspection-72',
    title: 'Hydraulic Function Test',
    description: 'Operate all hydraulic functions to verify smooth operation.',
    condition: undefined,
    required: true,
    section: 'Final Inspection'
  },
  {
    id: 'final-inspection-73',
    title: 'Auxiliary Hydraulic Test',
    description: 'Test aux hydraulics for proper pressure and no leaks.',
    condition: undefined,
    required: true,
    section: 'Final Inspection'
  },
  {
    id: 'final-inspection-74',
    title: 'Attachment Operation',
    description: 'Test attachment operation and listen for abnormal noise.',
    condition: undefined,
    required: true,
    section: 'Final Inspection'
  },
  {
    id: 'final-inspection-75',
    title: 'Instrument Warning and Indicators',
    description: 'Monitor warning lights and gauges under operation.',
    condition: undefined,
    required: true,
    section: 'Final Inspection'
  },
  {
    id: 'final-inspection-76',
    title: 'Horn and Backup Alarm Test',
    description: 'Test horn and backup alarm volume/function.',
    condition: undefined,
    required: true,
    section: 'Final Inspection'
  },
  {
    id: 'final-inspection-77',
    title: 'Lights and Beacon Test',
    description: 'Verify all lights and beacons function correctly.',
    condition: undefined,
    required: true,
    section: 'Final Inspection'
  },
  {
    id: 'final-inspection-78',
    title: 'Shutdown and Leak Check',
    description: 'Shut off engine and inspect for fresh leaks.',
    condition: undefined,
    required: true,
    section: 'Final Inspection'
  },
  {
    id: 'final-inspection-79',
    title: 'Clean and Secure Machine',
    description: 'Clean dirt/grease and secure all covers and tools.',
    condition: undefined,
    required: true,
    section: 'Final Inspection'
  },
  {
    id: 'final-inspection-80',
    title: 'Documentation and PM Sticker',
    description: 'Record PM, place/update PM sticker, and note issues found.',
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

// Get PM by work order ID (legacy - returns first PM found)
export const getPMByWorkOrderId = async (
  workOrderId: string,
  organizationId: string
): Promise<PreventativeMaintenance | null> => {
  try {
    const { data, error } = await supabase
      .from('preventative_maintenance')
      .select('*')
      .eq('work_order_id', workOrderId)
      .eq('organization_id', organizationId)
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

// Get PM by work order AND equipment (multi-equipment support)
export const getPMByWorkOrderAndEquipment = async (
  workOrderId: string,
  equipmentId: string,
  organizationId: string
): Promise<PreventativeMaintenance | null> => {
  try {
    if (!workOrderId || !equipmentId || !organizationId) {
      logger.error('Missing required parameters for getPMByWorkOrderAndEquipment', {
        workOrderId,
        equipmentId,
        organizationId
      });
      return null;
    }

    // Try querying with .maybeSingle() first to avoid 406 when no rows exist
    // .maybeSingle() returns null instead of error when 0 rows, which is better for RLS
    let { data, error } = await supabase
      .from('preventative_maintenance')
      .select('*')
      .eq('work_order_id', workOrderId)
      .eq('equipment_id', equipmentId)
      .eq('organization_id', organizationId)
      .maybeSingle();
    
    // If maybeSingle fails with 406, try with limit(1) and handle manually
    if (error) {
      const httpStatus = (error as { status?: number }).status || (error as { statusCode?: number }).statusCode;
      if (httpStatus === 406) {
        logger.debug('maybeSingle returned 406, trying limit(1) approach', { workOrderId, equipmentId, organizationId });
        const { data: multiData, error: multiError } = await supabase
          .from('preventative_maintenance')
          .select('*')
          .eq('work_order_id', workOrderId)
          .eq('equipment_id', equipmentId)
          .eq('organization_id', organizationId)
          .limit(1);
        
        if (multiError) {
          error = multiError;
        } else {
          data = multiData && multiData.length > 0 ? multiData[0] : null;
          error = null;
        }
      }
    }

    // Handle errors - treat both PGRST116 and 406 as "no rows found"
    // 406 can occur when RLS blocks the query or when .single() gets 0 rows in certain conditions
    if (error) {
      const httpStatus = (error as { status?: number }).status || (error as { statusCode?: number }).statusCode;
      
      // Both PGRST116 and 406 can mean "no rows found" - treat as acceptable
      if (error.code === 'PGRST116' || httpStatus === 406 || error.message?.includes('406')) {
        if (httpStatus === 406 || error.message?.includes('406')) {
          logger.debug('No PM record found (406) - likely RLS blocked or record missing', { 
            workOrderId, 
            equipmentId, 
            organizationId,
            errorCode: error.code,
            errorMessage: error.message
          });
        } else {
          logger.debug('No PM record found for work order', { workOrderId, equipmentId, organizationId });
        }
        return null;
      }
      
      // Other errors are logged as errors
      logger.error('Error fetching PM by work order and equipment:', {
        error,
        errorCode: error.code,
        httpStatus,
        errorMessage: error.message,
        errorDetails: error.details,
        errorHint: (error as { hint?: string }).hint,
        workOrderId,
        equipmentId,
        organizationId
      });
      return null;
    }

    return data || null;
  } catch (error) {
    logger.error('Error in getPMByWorkOrderAndEquipment:', error);
    return null;
  }
};

// Get all PMs for a work order (all equipment)
export const getPMsByWorkOrderId = async (
  workOrderId: string,
  organizationId: string
): Promise<PreventativeMaintenance[]> => {
  try {
    const { data, error } = await supabase
      .from('preventative_maintenance')
      .select('*')
      .eq('work_order_id', workOrderId)
      .eq('organization_id', organizationId)
      .order('created_at');

    if (error) {
      logger.error('Error fetching PMs for work order:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    logger.error('Error in getPMsByWorkOrderId:', error);
    return [];
  }
};

// Create PM for multiple equipment (multi-equipment work orders)
export const createPMsForEquipment = async (
  workOrderId: string,
  equipmentIds: string[],
  organizationId: string,
  checklistData: PMChecklistItem[],
  notes?: string,
  templateId?: string
): Promise<PreventativeMaintenance[]> => {
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      logger.error('User not authenticated');
      return [];
    }

    // Create PM for each equipment
    const pmRecords = equipmentIds.map((equipmentId) => ({
      work_order_id: workOrderId,
      equipment_id: equipmentId,
      organization_id: organizationId,
      created_by: userData.user.id,
      checklist_data: checklistData as unknown as Json,
      notes,
      template_id: templateId,
      status: 'pending',
    }));

    const { data, error } = await supabase
      .from('preventative_maintenance')
      .insert(pmRecords)
      .select();

    if (error) {
      logger.error('Error creating PMs for equipment:', error);
      return [];
    }

    logger.info(`Created ${data.length} PM records for work order ${workOrderId}`);
    return data;
  } catch (error) {
    logger.error('Error in createPMsForEquipment:', error);
    return [];
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

    const updateData: Database['public']['Tables']['preventative_maintenance']['Update'] = {};
    
    // Only include fields that are provided
    if (data.checklistData !== undefined) {
      updateData.checklist_data = data.checklistData as unknown as Json;
    }
    if (data.notes !== undefined) {
      updateData.notes = data.notes;
    }
    if (data.templateId !== undefined) {
      updateData.template_id = data.templateId;
    }

    if (data.status) {
      updateData.status = data.status;
      
      if (data.status === 'completed') {
        updateData.completed_at = new Date().toISOString();
        updateData.completed_by = userData.user.id;
      }
    }

    // Handle explicit completedAt and completedBy values (e.g., for resetting when template changes)
    if (data.completedAt !== undefined) {
      updateData.completed_at = data.completedAt;
    }
    if (data.completedBy !== undefined) {
      updateData.completed_by = data.completedBy;
    }

    logger.debug('Updating PM', { 
      pmId, 
      checklistDataCount: data.checklistData?.length,
      hasNotes: !!data.notes,
      status: data.status 
    });

    const { data: pm, error } = await supabase
      .from('preventative_maintenance')
      .update(updateData)
      .eq('id', pmId)
      .select()
      .single();

    if (error) {
      logger.error('Error updating PM:', { 
        error, 
        errorCode: error.code, 
        errorMessage: error.message,
        errorDetails: error.details,
        pmId,
        updateData 
      });
      return null;
    }

    if (pm) {
      // Verify the data was actually saved by checking checklist_data
      const savedChecklistCount = Array.isArray(pm.checklist_data) ? pm.checklist_data.length : 0;
      const requestedChecklistCount = Array.isArray(data.checklistData) ? data.checklistData.length : 0;
      
      logger.debug('PM updated successfully', { 
        pmId: pm.id, 
        workOrderId: pm.work_order_id,
        equipmentId: pm.equipment_id,
        organizationId: pm.organization_id,
        savedChecklistCount,
        requestedChecklistCount,
        checklistMatches: savedChecklistCount === requestedChecklistCount,
        status: pm.status,
        firstItemCondition: Array.isArray(pm.checklist_data) && pm.checklist_data.length > 0 
          ? (pm.checklist_data[0] as { condition?: number })?.condition 
          : 'no items'
      });
      
      // Warn if the saved data doesn't match what we sent
      if (savedChecklistCount !== requestedChecklistCount) {
        logger.warn('PM saved but checklist count mismatch', {
          pmId: pm.id,
          savedCount: savedChecklistCount,
          requestedCount: requestedChecklistCount
        });
      }
    } else {
      logger.error('PM update returned null data', { pmId });
    }

    return pm;
  } catch (error) {
    logger.error('Error in updatePM:', { error, pmId, data });
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
