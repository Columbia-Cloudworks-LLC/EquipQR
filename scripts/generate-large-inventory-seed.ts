#!/usr/bin/env tsx
/**
 * Generate Large-Scale Inventory Seed Data
 * 
 * Creates realistic inventory items and part alternate groups for load testing.
 * Generates ~200-300 parts per organization with corresponding alternate groups.
 * 
 * Usage:
 *   npx tsx scripts/generate-large-inventory-seed.ts > supabase/seeds/26_large_inventory.sql
 *   
 * Or run directly against database:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/generate-large-inventory-seed.ts --direct
 */

// ============================================================================
// Configuration
// ============================================================================

const CONFIG = {
  // Target: ~200-300 items per org, totaling 800-1200 items across all orgs
  itemsPerOrg: {
    apex: 300,      // Large construction company
    metro: 250,     // Equipment rental
    valley: 150,    // Smaller landscaping
    industrial: 200 // Warehouse/forklift focus
  },
  // Alternate groups: ~30-50 per org
  groupsPerOrg: {
    apex: 50,
    metro: 40,
    valley: 25,
    industrial: 35
  },
  // Parts per alternate group (2-6 alternates)
  partsPerGroup: { min: 2, max: 6 }
};

// ============================================================================
// Reference Data - Organizations & Users
// ============================================================================

const ORGS = {
  apex: {
    id: '660e8400-e29b-41d4-a716-446655440000',
    name: 'Apex Construction',
    users: [
      'bb0e8400-e29b-41d4-a716-446655440001', // owner
      'bb0e8400-e29b-41d4-a716-446655440002'  // admin
    ]
  },
  metro: {
    id: '660e8400-e29b-41d4-a716-446655440001',
    name: 'Metro Equipment',
    users: [
      'bb0e8400-e29b-41d4-a716-446655440004', // owner
      'bb0e8400-e29b-41d4-a716-446655440005'  // tech
    ]
  },
  valley: {
    id: '660e8400-e29b-41d4-a716-446655440002',
    name: 'Valley Landscaping',
    users: ['bb0e8400-e29b-41d4-a716-446655440006']
  },
  industrial: {
    id: '660e8400-e29b-41d4-a716-446655440003',
    name: 'Industrial Rentals',
    users: [
      'bb0e8400-e29b-41d4-a716-446655440007',
      'bb0e8400-e29b-41d4-a716-446655440008'
    ]
  }
};

// ============================================================================
// Realistic Parts Catalog - Categories and Templates
// ============================================================================

interface PartTemplate {
  category: string;
  nameTemplate: string;
  skuPrefix: string;
  brands: string[];
  priceRange: { min: number; max: number };
  variations?: string[];
}

const PART_TEMPLATES: PartTemplate[] = [
  // Filters
  {
    category: 'Filters',
    nameTemplate: '{brand} {type} Filter',
    skuPrefix: 'FLT',
    brands: ['WIX', 'Baldwin', 'Donaldson', 'Fleetguard', 'CAT', 'John Deere', 'Kubota'],
    priceRange: { min: 15, max: 150 },
    variations: ['Oil', 'Air', 'Fuel', 'Hydraulic', 'Transmission', 'Cabin Air', 'Water Separator']
  },
  // Hydraulic Components
  {
    category: 'Hydraulics',
    nameTemplate: '{brand} Hydraulic {type}',
    skuPrefix: 'HYD',
    brands: ['Parker', 'Eaton', 'Bosch Rexroth', 'Danfoss', 'Sun Hydraulics'],
    priceRange: { min: 50, max: 800 },
    variations: ['Pump', 'Cylinder Seal Kit', 'Hose Assembly', 'Valve', 'Motor', 'Filter Element', 'Coupler']
  },
  // Engine Parts
  {
    category: 'Engine',
    nameTemplate: '{brand} Engine {type}',
    skuPrefix: 'ENG',
    brands: ['Cummins', 'Caterpillar', 'John Deere', 'Kubota', 'Yanmar', 'Perkins'],
    priceRange: { min: 25, max: 1500 },
    variations: ['Gasket Set', 'Injector', 'Turbo', 'Water Pump', 'Thermostat', 'Belt', 'Alternator', 'Starter']
  },
  // Undercarriage
  {
    category: 'Undercarriage',
    nameTemplate: '{brand} {type}',
    skuPrefix: 'UND',
    brands: ['ITR', 'Berco', 'CAT', 'Komatsu', 'Hitachi'],
    priceRange: { min: 100, max: 2500 },
    variations: ['Track Shoe', 'Track Roller', 'Carrier Roller', 'Idler', 'Sprocket', 'Track Chain', 'Track Pad']
  },
  // Electrical
  {
    category: 'Electrical',
    nameTemplate: '{brand} {type}',
    skuPrefix: 'ELC',
    brands: ['Denso', 'Bosch', 'Delco Remy', 'Prestolite', 'Leece-Neville'],
    priceRange: { min: 30, max: 600 },
    variations: ['Alternator', 'Starter Motor', 'Solenoid', 'Relay', 'Sensor', 'Switch', 'Wiring Harness']
  },
  // Batteries
  {
    category: 'Batteries',
    nameTemplate: '{brand} {type} Battery',
    skuPrefix: 'BAT',
    brands: ['Interstate', 'Trojan', 'Crown', 'Deka', 'Exide', 'Optima'],
    priceRange: { min: 100, max: 3000 },
    variations: ['Starting', 'Deep Cycle', 'AGM', 'Lithium', 'Forklift', 'Golf Cart']
  },
  // Tires & Wheels
  {
    category: 'Tires & Wheels',
    nameTemplate: '{brand} {type}',
    skuPrefix: 'TIR',
    brands: ['Michelin', 'Bridgestone', 'Goodyear', 'Continental', 'Solideal', 'Camso'],
    priceRange: { min: 150, max: 2000 },
    variations: ['Pneumatic Tire', 'Solid Tire', 'Foam Fill Tire', 'Wheel Assembly', 'Rim', 'Tube']
  },
  // Brakes
  {
    category: 'Brakes',
    nameTemplate: '{brand} Brake {type}',
    skuPrefix: 'BRK',
    brands: ['Mico', 'Carlisle', 'Wabco', 'Bendix', 'Meritor'],
    priceRange: { min: 40, max: 500 },
    variations: ['Pad Set', 'Disc', 'Drum', 'Caliper', 'Master Cylinder', 'Wheel Cylinder', 'Brake Line']
  },
  // Fluids & Lubricants
  {
    category: 'Fluids',
    nameTemplate: '{brand} {type}',
    skuPrefix: 'FLD',
    brands: ['Shell', 'Mobil', 'Chevron', 'CAT', 'John Deere', 'Valvoline'],
    priceRange: { min: 20, max: 200 },
    variations: ['Engine Oil 15W-40', 'Hydraulic Oil', 'Transmission Fluid', 'Gear Oil', 'Grease Cartridge', 'Coolant', 'DEF']
  },
  // Ground Engaging Tools
  {
    category: 'Ground Engaging',
    nameTemplate: '{brand} {type}',
    skuPrefix: 'GET',
    brands: ['ESCO', 'Hensley', 'CAT', 'Komatsu', 'Black Cat'],
    priceRange: { min: 25, max: 400 },
    variations: ['Bucket Tooth', 'Cutting Edge', 'Side Cutter', 'Wear Plate', 'Adapter', 'Pin & Retainer']
  },
  // Seals & Gaskets
  {
    category: 'Seals',
    nameTemplate: '{brand} {type} Seal',
    skuPrefix: 'SEL',
    brands: ['NOK', 'Hallite', 'Trelleborg', 'SKF', 'Parker'],
    priceRange: { min: 10, max: 300 },
    variations: ['Cylinder', 'Shaft', 'Piston', 'Rod', 'Dust', 'O-Ring Kit', 'Gasket Set']
  },
  // Boom & Attachments
  {
    category: 'Attachments',
    nameTemplate: '{brand} {type}',
    skuPrefix: 'ATT',
    brands: ['JRB', 'Werk-Brau', 'Pemberton', 'Craig', 'Rockland'],
    priceRange: { min: 200, max: 5000 },
    variations: ['Quick Coupler', 'Bucket Pin', 'Bushing', 'Bucket Cylinder', 'Thumb', 'Grapple']
  },
  // Lift Equipment Parts
  {
    category: 'Lift Parts',
    nameTemplate: '{brand} {type}',
    skuPrefix: 'LFT',
    brands: ['JLG', 'Genie', 'Skyjack', 'Snorkel', 'Haulotte'],
    priceRange: { min: 50, max: 1200 },
    variations: ['Platform Control Box', 'Limit Switch', 'Pothole Guard', 'Outrigger Pad', 'Joystick', 'Charger']
  },
  // Forklift Parts
  {
    category: 'Forklift',
    nameTemplate: '{brand} Forklift {type}',
    skuPrefix: 'FRK',
    brands: ['Toyota', 'Hyster', 'Yale', 'Crown', 'Raymond', 'Caterpillar'],
    priceRange: { min: 40, max: 800 },
    variations: ['Fork', 'Mast Chain', 'Carriage Roller', 'Load Wheel', 'Steer Wheel', 'Seat', 'Propane Regulator']
  },
  // Safety Equipment
  {
    category: 'Safety',
    nameTemplate: '{brand} {type}',
    skuPrefix: 'SAF',
    brands: ['Ecco', 'Grote', 'Federal Signal', 'Whelen', '3M'],
    priceRange: { min: 20, max: 400 },
    variations: ['Backup Alarm', 'Strobe Light', 'Mirror', 'Fire Extinguisher', 'First Aid Kit', 'Safety Decal Set']
  },
  // HVAC / Cab
  {
    category: 'Cab & HVAC',
    nameTemplate: '{brand} {type}',
    skuPrefix: 'CAB',
    brands: ['Red Dot', 'Sanden', 'Denso', 'Bergstrom'],
    priceRange: { min: 50, max: 600 },
    variations: ['A/C Compressor', 'Evaporator', 'Condenser', 'Blower Motor', 'Heater Core', 'Cab Filter']
  },
  // Landscaping Equipment
  {
    category: 'Landscaping',
    nameTemplate: '{brand} {type}',
    skuPrefix: 'LND',
    brands: ['Stihl', 'Husqvarna', 'Oregon', 'John Deere', 'Kubota'],
    priceRange: { min: 15, max: 350 },
    variations: ['Mower Blade', 'Chainsaw Chain', 'Chainsaw Bar', 'Trimmer Line', 'Spindle Assembly', 'Belt']
  },
  // Compressor Parts
  {
    category: 'Compressor',
    nameTemplate: '{brand} Compressor {type}',
    skuPrefix: 'CMP',
    brands: ['Atlas Copco', 'Ingersoll Rand', 'Sullair', 'Doosan', 'Kaeser'],
    priceRange: { min: 30, max: 800 },
    variations: ['Air/Oil Separator', 'Inlet Valve', 'Minimum Pressure Valve', 'Scavenge Line', 'Control Board']
  }
];

// Equipment models for realistic descriptions
const EQUIPMENT_MODELS = {
  excavators: ['CAT 320', 'CAT 336', 'Komatsu PC210', 'Komatsu PC360', 'Hitachi ZX200', 'John Deere 350G'],
  dozers: ['CAT D6', 'CAT D8', 'John Deere 700K', 'John Deere 850L', 'Komatsu D65'],
  loaders: ['CAT 950', 'CAT 966', 'John Deere 644', 'Komatsu WA380', 'Volvo L120'],
  skidSteers: ['Bobcat S650', 'Bobcat S770', 'CAT 262D', 'John Deere 332G', 'Kubota SVL95'],
  lifts: ['JLG 450AJ', 'JLG 600S', 'Genie S-65', 'Genie GS-2669', 'Skyjack SJ6832'],
  forklifts: ['Toyota 8FGU25', 'Hyster H50FT', 'Crown FC4500', 'Raymond 8210', 'Yale GLP050'],
  mowers: ['John Deere Z930M', 'John Deere Z950M', 'Kubota Z726X', 'Husqvarna MZ61'],
  chainsaws: ['Stihl MS 500i', 'Husqvarna 572 XP', 'Stihl MS 462']
};

// Storage locations per org type
const LOCATIONS = {
  apex: ['Warehouse A - Shelf 1', 'Warehouse A - Shelf 2', 'Warehouse A - Shelf 3', 'Warehouse B - Heavy Parts', 'Warehouse B - Ground Level', 'Field Trailer 1', 'Field Trailer 2'],
  metro: ['Bay 1 - Parts Cabinet', 'Bay 2 - Ground Level', 'Bay 2 - Battery Storage', 'Bay 3 - Parts Cabinet', 'Bay 3 - Hydraulics', 'Rental Counter'],
  valley: ['Tool Room - Cabinet', 'Tool Room - Wall Rack', 'Tool Room - Parts Shelf', 'Shop Floor', 'Truck Stock'],
  industrial: ['Dock A - Parts Shelf', 'Dock A - Battery Storage', 'Dock A - Charging Station', 'Dock B - Parts Shelf', 'Dock C - Parts Shelf', 'Staging Area - Rack 1', 'Staging Area - Rack 2']
};

// ============================================================================
// UUID Generation
// ============================================================================

// Use deterministic UUIDs based on prefix + counter for reproducibility
function generateUUID(prefix: string, counter: number): string {
  // Format: prefix (8 chars) + standard UUID format
  // e.g., c10e8400-e29b-41d4-a716-446655440100
  // Last segment must be 12 hex chars: 446655 + 6-digit counter
  const paddedCounter = counter.toString().padStart(6, '0');
  return `${prefix}-e29b-41d4-a716-446655${paddedCounter}`;
}

// UUID prefixes for new seed data
const UUID_PREFIXES = {
  inventoryItem: 'c10e8400',    // Inventory items
  partIdentifier: 'c20e8400',  // Part identifiers
  alternateGroup: 'c30e8400',  // Alternate groups
  groupMember: 'c40e8400'      // Group members
};

// ============================================================================
// Random Utilities
// ============================================================================

// Seeded random for reproducibility
let seed = 12345;
function seededRandom(): number {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
}

function randomInt(min: number, max: number): number {
  return Math.floor(seededRandom() * (max - min + 1)) + min;
}

function randomChoice<T>(arr: T[]): T {
  return arr[randomInt(0, arr.length - 1)];
}

function randomPrice(min: number, max: number): number {
  const price = min + seededRandom() * (max - min);
  return Math.round(price * 100) / 100;
}

function shuffleArray<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInt(0, i);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// ============================================================================
// Data Generation
// ============================================================================

interface GeneratedInventoryItem {
  id: string;
  organization_id: string;
  name: string;
  description: string;
  sku: string | null;
  quantity_on_hand: number;
  low_stock_threshold: number;
  location: string;
  default_unit_cost: number;
  created_by: string;
}

interface GeneratedPartIdentifier {
  id: string;
  organization_id: string;
  identifier_type: 'oem' | 'aftermarket' | 'sku' | 'cross_ref';
  raw_value: string;
  norm_value: string;
  inventory_item_id: string | null;
  manufacturer: string | null;
  notes: string | null;
  created_by: string;
}

interface GeneratedAlternateGroup {
  id: string;
  organization_id: string;
  name: string;
  description: string;
  status: 'verified' | 'unverified' | 'deprecated';
  notes: string | null;
  evidence_url: string | null;
  created_by: string;
  verified_by: string | null;
}

interface GeneratedGroupMember {
  id: string;
  group_id: string;
  part_identifier_id: string | null;
  inventory_item_id: string | null;
  is_primary: boolean;
  notes: string | null;
}

function generateInventoryItems(orgKey: keyof typeof ORGS, count: number, startCounter: number): GeneratedInventoryItem[] {
  const org = ORGS[orgKey];
  const locations = LOCATIONS[orgKey];
  const items: GeneratedInventoryItem[] = [];
  
  // Focus categories based on org type
  const categoryWeights: Record<string, number> = {
    apex: { 'Undercarriage': 3, 'Hydraulics': 3, 'Engine': 2, 'Ground Engaging': 3, 'Filters': 2 } as Record<string, number>,
    metro: { 'Lift Parts': 4, 'Batteries': 3, 'Hydraulics': 2, 'Safety': 2, 'Tires & Wheels': 2 } as Record<string, number>,
    valley: { 'Landscaping': 5, 'Filters': 2, 'Fluids': 2, 'Engine': 1 } as Record<string, number>,
    industrial: { 'Forklift': 5, 'Batteries': 3, 'Tires & Wheels': 2, 'Safety': 2 } as Record<string, number>
  };
  
  const weights = categoryWeights[orgKey] || {};
  
  // Build weighted template list
  const weightedTemplates: PartTemplate[] = [];
  for (const template of PART_TEMPLATES) {
    const weight = weights[template.category] || 1;
    for (let i = 0; i < weight; i++) {
      weightedTemplates.push(template);
    }
  }
  
  for (let i = 0; i < count; i++) {
    const template = randomChoice(weightedTemplates);
    const brand = randomChoice(template.brands);
    const variation = template.variations ? randomChoice(template.variations) : '';
    
    const name = template.nameTemplate
      .replace('{brand}', brand)
      .replace('{type}', variation);
    
    // Generate realistic description
    const equipmentList = [
      ...EQUIPMENT_MODELS.excavators,
      ...EQUIPMENT_MODELS.loaders,
      ...EQUIPMENT_MODELS.lifts,
      ...EQUIPMENT_MODELS.forklifts
    ];
    const equipment = randomChoice(equipmentList);
    const description = `${variation} for ${equipment} and similar models`;
    
    // SKU generation (10% chance of no SKU)
    const hasSku = seededRandom() > 0.1;
    const skuCounter = (startCounter + i).toString().padStart(4, '0');
    const sku = hasSku ? `${template.skuPrefix}-${brand.substring(0, 3).toUpperCase()}-${skuCounter}` : null;
    
    // Quantity distribution: 60% normal, 25% low stock, 15% out of stock
    const stockRoll = seededRandom();
    let quantity: number;
    let threshold: number;
    
    if (stockRoll < 0.15) {
      quantity = 0; // Out of stock
      threshold = randomInt(2, 5);
    } else if (stockRoll < 0.40) {
      threshold = randomInt(3, 8);
      quantity = randomInt(1, threshold - 1); // Low stock
    } else {
      threshold = randomInt(2, 10);
      quantity = randomInt(threshold + 1, threshold + 30); // Normal stock
    }
    
    items.push({
      id: generateUUID(UUID_PREFIXES.inventoryItem, startCounter + i),
      organization_id: org.id,
      name,
      description,
      sku,
      quantity_on_hand: quantity,
      low_stock_threshold: threshold,
      location: randomChoice(locations),
      default_unit_cost: randomPrice(template.priceRange.min, template.priceRange.max),
      created_by: randomChoice(org.users)
    });
  }
  
  return items;
}

function generatePartIdentifiersAndGroups(
  orgKey: keyof typeof ORGS,
  items: GeneratedInventoryItem[],
  groupCount: number,
  identifierStartCounter: number,
  groupStartCounter: number,
  memberStartCounter: number
): {
  identifiers: GeneratedPartIdentifier[];
  groups: GeneratedAlternateGroup[];
  members: GeneratedGroupMember[];
} {
  const org = ORGS[orgKey];
  const identifiers: GeneratedPartIdentifier[] = [];
  const groups: GeneratedAlternateGroup[] = [];
  const members: GeneratedGroupMember[] = [];
  
  let identifierCounter = identifierStartCounter;
  let memberCounter = memberStartCounter;
  
  // Create groups with associated identifiers
  for (let g = 0; g < groupCount; g++) {
    const groupId = generateUUID(UUID_PREFIXES.alternateGroup, groupStartCounter + g);
    
    // Pick a random category for this group
    const template = randomChoice(PART_TEMPLATES);
    const variation = template.variations ? randomChoice(template.variations) : template.category;
    
    // Determine verification status (60% verified, 30% unverified, 10% deprecated)
    const statusRoll = seededRandom();
    let status: 'verified' | 'unverified' | 'deprecated';
    let verifiedBy: string | null = null;
    
    if (statusRoll < 0.60) {
      status = 'verified';
      verifiedBy = randomChoice(org.users);
    } else if (statusRoll < 0.90) {
      status = 'unverified';
    } else {
      status = 'deprecated';
    }
    
    // Group name
    const equipment = randomChoice([
      ...EQUIPMENT_MODELS.excavators,
      ...EQUIPMENT_MODELS.loaders,
      ...EQUIPMENT_MODELS.lifts,
      ...EQUIPMENT_MODELS.forklifts,
      ...EQUIPMENT_MODELS.mowers
    ]);
    
    const groupName = `${variation} - ${equipment.split(' ')[0]} Compatible`;
    const groupDescription = `Interchangeable ${variation.toLowerCase()}s verified for ${equipment} and similar models.`;
    
    groups.push({
      id: groupId,
      organization_id: org.id,
      name: groupName,
      description: groupDescription,
      status,
      notes: status === 'verified' ? 'Cross-referenced with OEM parts catalog.' : null,
      evidence_url: status === 'verified' && seededRandom() > 0.5 ? 'https://example.com/parts-catalog' : null,
      created_by: randomChoice(org.users),
      verified_by: verifiedBy
    });
    
    // Generate 2-6 part identifiers for this group
    const partsInGroup = randomInt(CONFIG.partsPerGroup.min, CONFIG.partsPerGroup.max);
    const brands = shuffleArray([...template.brands]).slice(0, partsInGroup);
    
    // Maybe link one to an inventory item
    const linkedItem = seededRandom() > 0.3 ? randomChoice(items) : null;
    
    for (let p = 0; p < partsInGroup; p++) {
      const brand = brands[p] || randomChoice(template.brands);
      const isPrimary = p === 0;
      const isOEM = p < 2;
      
      // Generate part number
      const partNumber = `${brand.substring(0, 3).toUpperCase()}-${randomInt(1000, 9999)}-${randomInt(10, 99)}`;
      
      const identifierId = generateUUID(UUID_PREFIXES.partIdentifier, identifierCounter++);
      
      // Link to inventory item for first identifier if available
      const inventoryItemId = (p === 0 && linkedItem) ? linkedItem.id : null;
      
      identifiers.push({
        id: identifierId,
        organization_id: org.id,
        identifier_type: isOEM ? 'oem' : 'aftermarket',
        raw_value: partNumber,
        norm_value: partNumber.toLowerCase(),
        inventory_item_id: inventoryItemId,
        manufacturer: brand,
        notes: isPrimary ? 'Primary OEM part number' : `${brand} aftermarket alternative`,
        created_by: randomChoice(org.users)
      });
      
      // Create group member
      members.push({
        id: generateUUID(UUID_PREFIXES.groupMember, memberCounter++),
        group_id: groupId,
        part_identifier_id: identifierId,
        inventory_item_id: inventoryItemId,
        is_primary: isPrimary,
        notes: isPrimary ? 'OEM reference' : 'Verified alternative'
      });
    }
  }
  
  return { identifiers, groups, members };
}

// ============================================================================
// SQL Generation
// ============================================================================

function escapeSQL(str: string | null): string {
  if (str === null) return 'NULL';
  return `'${str.replace(/'/g, "''")}'`;
}

function generateSQL(): string {
  const lines: string[] = [];
  
  lines.push(`-- =====================================================`);
  lines.push(`-- EquipQR Seed Data - Large Scale Inventory & Part Alternates`);
  lines.push(`-- =====================================================`);
  lines.push(`-- Auto-generated by scripts/generate-large-inventory-seed.ts`);
  lines.push(`-- Generated: ${new Date().toISOString()}`);
  lines.push(`--`);
  lines.push(`-- ⚠️  FOREIGN KEY DEPENDENCY WARNING ⚠️`);
  lines.push(`-- =====================================================`);
  lines.push(`-- This seed file has hardcoded organization and user IDs that reference`);
  lines.push(`-- existing seed data from earlier migration/seed files.`);
  lines.push(`--`);
  lines.push(`-- PREREQUISITES:`);
  lines.push(`--   - Organizations must exist (e.g., from 01_organizations.sql or similar)`);
  lines.push(`--   - Users must exist (referenced by created_by and verified_by columns)`);
  lines.push(`--`);
  lines.push(`-- DEPENDENCIES:`);
  lines.push(`--   - organization_id references: 660e8400-e29b-41d4-a716-446655440000 (Apex)`);
  lines.push(`--                                  660e8400-e29b-41d4-a716-446655440001 (Metro)`);
  lines.push(`--                                  660e8400-e29b-41d4-a716-446655440002 (Valley)`);
  lines.push(`--                                  660e8400-e29b-41d4-a716-446655440003 (Industrial)`);
  lines.push(`--   - created_by/verified_by references: bb0e8400-e29b-41d4-a716-446655440001-008`);
  lines.push(`--`);
  lines.push(`-- IF FOREIGN KEY VIOLATIONS OCCUR:`);
  lines.push(`--   1. Ensure prerequisite seed files have been run first`);
  lines.push(`--   2. Verify the referenced organizations and users exist in the database`);
  lines.push(`--   3. Check the seed file execution order matches dependencies`);
  lines.push(`--`);
  lines.push(`-- This file contains realistic test data for load testing:`);
  lines.push(`--   - ~900 inventory items across 4 organizations`);
  lines.push(`--   - ~150 alternate part groups`);
  lines.push(`--   - ~600 part identifiers with group memberships`);
  lines.push(`-- =====================================================`);
  lines.push(``);
  
  // Track counters across orgs
  let itemCounter = 100;  // Start at 100 to avoid conflicts with existing data
  let identifierCounter = 100;
  let groupCounter = 100;
  let memberCounter = 100;
  
  const allItems: GeneratedInventoryItem[] = [];
  const allIdentifiers: GeneratedPartIdentifier[] = [];
  const allGroups: GeneratedAlternateGroup[] = [];
  const allMembers: GeneratedGroupMember[] = [];
  
  // Generate data for each org
  for (const [orgKey, itemCount] of Object.entries(CONFIG.itemsPerOrg)) {
    const org = ORGS[orgKey as keyof typeof ORGS];
    const groupCount = CONFIG.groupsPerOrg[orgKey as keyof typeof CONFIG.groupsPerOrg];
    
    // Generate inventory items
    const items = generateInventoryItems(orgKey as keyof typeof ORGS, itemCount, itemCounter);
    allItems.push(...items);
    itemCounter += itemCount;
    
    // Generate identifiers and groups
    const { identifiers, groups, members } = generatePartIdentifiersAndGroups(
      orgKey as keyof typeof ORGS,
      items,
      groupCount,
      identifierCounter,
      groupCounter,
      memberCounter
    );
    
    allIdentifiers.push(...identifiers);
    allGroups.push(...groups);
    allMembers.push(...members);
    
    identifierCounter += identifiers.length;
    groupCounter += groups.length;
    memberCounter += members.length;
  }
  
  // Generate inventory items INSERT
  lines.push(`-- =====================================================`);
  lines.push(`-- INVENTORY ITEMS (${allItems.length} total)`);
  lines.push(`-- =====================================================`);
  lines.push(``);
  lines.push(`INSERT INTO public.inventory_items (`);
  lines.push(`  id, organization_id, name, description, sku,`);
  lines.push(`  quantity_on_hand, low_stock_threshold, location,`);
  lines.push(`  default_unit_cost, created_by, created_at, updated_at`);
  lines.push(`) VALUES`);
  
  const itemValues = allItems.map((item, idx) => {
    const comma = idx < allItems.length - 1 ? ',' : '';
    return `  (
    '${item.id}'::uuid,
    '${item.organization_id}'::uuid,
    ${escapeSQL(item.name)},
    ${escapeSQL(item.description)},
    ${escapeSQL(item.sku)},
    ${item.quantity_on_hand},
    ${item.low_stock_threshold},
    ${escapeSQL(item.location)},
    ${item.default_unit_cost},
    '${item.created_by}'::uuid,
    NOW() - INTERVAL '${randomInt(1, 180)} days',
    NOW() - INTERVAL '${randomInt(0, 30)} days'
  )${comma}`;
  });
  
  lines.push(itemValues.join('\n'));
  lines.push(`ON CONFLICT (id) DO NOTHING;`);
  lines.push(``);
  
  // Generate alternate groups INSERT
  lines.push(`-- =====================================================`);
  lines.push(`-- PART ALTERNATE GROUPS (${allGroups.length} total)`);
  lines.push(`-- =====================================================`);
  lines.push(``);
  lines.push(`INSERT INTO public.part_alternate_groups (`);
  lines.push(`  id, organization_id, name, description, status,`);
  lines.push(`  notes, evidence_url, created_by, verified_by, verified_at, created_at`);
  lines.push(`) VALUES`);
  
  const groupValues = allGroups.map((group, idx) => {
    const comma = idx < allGroups.length - 1 ? ',' : '';
    const verifiedAt = group.verified_by ? `NOW() - INTERVAL '${randomInt(1, 90)} days'` : 'NULL';
    return `  (
    '${group.id}'::uuid,
    '${group.organization_id}'::uuid,
    ${escapeSQL(group.name)},
    ${escapeSQL(group.description)},
    '${group.status}'::verification_status,
    ${escapeSQL(group.notes)},
    ${escapeSQL(group.evidence_url)},
    '${group.created_by}'::uuid,
    ${group.verified_by ? `'${group.verified_by}'::uuid` : 'NULL'},
    ${verifiedAt},
    NOW() - INTERVAL '${randomInt(30, 180)} days'
  )${comma}`;
  });
  
  lines.push(groupValues.join('\n'));
  lines.push(`ON CONFLICT (id) DO NOTHING;`);
  lines.push(``);
  
  // Generate part identifiers INSERT
  lines.push(`-- =====================================================`);
  lines.push(`-- PART IDENTIFIERS (${allIdentifiers.length} total)`);
  lines.push(`-- =====================================================`);
  lines.push(``);
  lines.push(`INSERT INTO public.part_identifiers (`);
  lines.push(`  id, organization_id, identifier_type, raw_value, norm_value,`);
  lines.push(`  inventory_item_id, manufacturer, notes, created_by, created_at`);
  lines.push(`) VALUES`);
  
  const identifierValues = allIdentifiers.map((ident, idx) => {
    const comma = idx < allIdentifiers.length - 1 ? ',' : '';
    return `  (
    '${ident.id}'::uuid,
    '${ident.organization_id}'::uuid,
    '${ident.identifier_type}'::part_identifier_type,
    ${escapeSQL(ident.raw_value)},
    ${escapeSQL(ident.norm_value)},
    ${ident.inventory_item_id ? `'${ident.inventory_item_id}'::uuid` : 'NULL'},
    ${escapeSQL(ident.manufacturer)},
    ${escapeSQL(ident.notes)},
    '${ident.created_by}'::uuid,
    NOW() - INTERVAL '${randomInt(1, 120)} days'
  )${comma}`;
  });
  
  lines.push(identifierValues.join('\n'));
  lines.push(`ON CONFLICT (id) DO NOTHING;`);
  lines.push(``);
  
  // Generate group members INSERT
  lines.push(`-- =====================================================`);
  lines.push(`-- PART ALTERNATE GROUP MEMBERS (${allMembers.length} total)`);
  lines.push(`-- =====================================================`);
  lines.push(``);
  lines.push(`INSERT INTO public.part_alternate_group_members (`);
  lines.push(`  id, group_id, part_identifier_id, inventory_item_id, is_primary, notes, created_at`);
  lines.push(`) VALUES`);
  
  const memberValues = allMembers.map((member, idx) => {
    const comma = idx < allMembers.length - 1 ? ',' : '';
    return `  (
    '${member.id}'::uuid,
    '${member.group_id}'::uuid,
    ${member.part_identifier_id ? `'${member.part_identifier_id}'::uuid` : 'NULL'},
    ${member.inventory_item_id ? `'${member.inventory_item_id}'::uuid` : 'NULL'},
    ${member.is_primary},
    ${escapeSQL(member.notes)},
    NOW() - INTERVAL '${randomInt(1, 90)} days'
  )${comma}`;
  });
  
  lines.push(memberValues.join('\n'));
  lines.push(`ON CONFLICT (id) DO NOTHING;`);
  lines.push(``);
  
  // Summary
  lines.push(`-- =====================================================`);
  lines.push(`-- SUMMARY`);
  lines.push(`-- =====================================================`);
  lines.push(`-- Inventory Items: ${allItems.length}`);
  lines.push(`--   - Apex Construction: ${CONFIG.itemsPerOrg.apex}`);
  lines.push(`--   - Metro Equipment: ${CONFIG.itemsPerOrg.metro}`);
  lines.push(`--   - Valley Landscaping: ${CONFIG.itemsPerOrg.valley}`);
  lines.push(`--   - Industrial Rentals: ${CONFIG.itemsPerOrg.industrial}`);
  lines.push(`-- Part Alternate Groups: ${allGroups.length}`);
  lines.push(`-- Part Identifiers: ${allIdentifiers.length}`);
  lines.push(`-- Group Members: ${allMembers.length}`);
  lines.push(`-- =====================================================`);
  
  return lines.join('\n');
}

// ============================================================================
// Main
// ============================================================================

function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Generate Large-Scale Inventory Seed Data

Usage:
  npx tsx scripts/generate-large-inventory-seed.ts > supabase/seeds/26_large_inventory.sql
  
Options:
  --help, -h    Show this help message
  
Configuration (edit script to customize):
  - Items per org: Apex=${CONFIG.itemsPerOrg.apex}, Metro=${CONFIG.itemsPerOrg.metro}, Valley=${CONFIG.itemsPerOrg.valley}, Industrial=${CONFIG.itemsPerOrg.industrial}
  - Groups per org: Apex=${CONFIG.groupsPerOrg.apex}, Metro=${CONFIG.groupsPerOrg.metro}, Valley=${CONFIG.groupsPerOrg.valley}, Industrial=${CONFIG.groupsPerOrg.industrial}
  - Parts per group: ${CONFIG.partsPerGroup.min}-${CONFIG.partsPerGroup.max}
`);
    process.exit(0);
  }
  
  const sql = generateSQL();
  console.log(sql);
}

main();
