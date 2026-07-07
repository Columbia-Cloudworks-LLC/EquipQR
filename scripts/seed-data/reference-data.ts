/**
 * Durable-core references for generated seed data.
 *
 * These UUIDs are the stable contract shared with the committed SQL seeds in
 * supabase/seeds/ and the Playwright constants in e2e/user/shared/seed-data.ts.
 * Generators may only reference this durable core — never redefine it.
 */

export interface OrgUser {
  id: string;
  name: string;
}

export interface OrgTeam {
  id: string;
  name: string;
  /**
   * Users the work_orders assignee trigger accepts for this team:
   * manager/technician team members (is_valid_work_order_assignee).
   * Org owners/admins are additionally valid on any equipment.
   */
  assignees: OrgUser[];
}

export interface OrgRef {
  key: OrgKey;
  id: string;
  name: string;
  /** Members allowed to appear as created_by on generated records. */
  staff: OrgUser[];
  /** Org owners/admins — valid work-order assignees regardless of team. */
  admins: OrgUser[];
  teams: OrgTeam[];
  /** "City, ST" labels matching each org's regional cluster in 07_equipment.sql. */
  cities: string[];
  storageLocations: string[];
}

export type OrgKey = 'apex' | 'metro' | 'valley' | 'industrial';

// Durable-core people (01_auth_users.sql / 04_organization_members.sql / 06_team_members.sql).
const ALEX = { id: 'bb0e8400-e29b-41d4-a716-446655440001', name: 'Alex Apex' };
const AMANDA = { id: 'bb0e8400-e29b-41d4-a716-446655440002', name: 'Amanda Admin' };
const TOM = { id: 'bb0e8400-e29b-41d4-a716-446655440003', name: 'Tom Technician' };
const MARCUS = { id: 'bb0e8400-e29b-41d4-a716-446655440004', name: 'Marcus Metro' };
const MIKE = { id: 'bb0e8400-e29b-41d4-a716-446655440005', name: 'Mike Mechanic' };
const VICTOR = { id: 'bb0e8400-e29b-41d4-a716-446655440006', name: 'Victor Valley' };
const IRENE = { id: 'bb0e8400-e29b-41d4-a716-446655440007', name: 'Irene Industrial' };
const MULTI = { id: 'bb0e8400-e29b-41d4-a716-446655440008', name: 'Multi Org User' };

export const ORGS: Record<OrgKey, OrgRef> = {
  apex: {
    key: 'apex',
    id: '660e8400-e29b-41d4-a716-446655440000',
    name: 'Apex Construction',
    staff: [ALEX, AMANDA, TOM],
    admins: [ALEX, AMANDA],
    teams: [
      { id: '880e8400-e29b-41d4-a716-446655440000', name: 'Heavy Equipment Team', assignees: [ALEX, TOM] },
      { id: '880e8400-e29b-41d4-a716-446655440001', name: 'Site Operations Team', assignees: [AMANDA, TOM] },
    ],
    cities: ['Dallas, TX', 'Fort Worth, TX', 'Houston, TX', 'Austin, TX', 'San Antonio, TX'],
    storageLocations: [
      'Warehouse A - Shelf 1',
      'Warehouse A - Shelf 2',
      'Warehouse A - Shelf 3',
      'Warehouse B - Heavy Parts',
      'Warehouse B - Ground Level',
      'Field Trailer 1',
      'Field Trailer 2',
    ],
  },
  metro: {
    key: 'metro',
    id: '660e8400-e29b-41d4-a716-446655440001',
    name: 'Metro Equipment',
    staff: [MARCUS, MIKE],
    admins: [MARCUS],
    teams: [
      { id: '880e8400-e29b-41d4-a716-446655440002', name: 'Rental Fleet Team', assignees: [MARCUS, MIKE] },
      { id: '880e8400-e29b-41d4-a716-446655440003', name: 'Customer Service Team', assignees: [MARCUS] },
    ],
    cities: ['Los Angeles, CA', 'San Francisco, CA', 'San Diego, CA', 'Sacramento, CA', 'Long Beach, CA'],
    storageLocations: [
      'Bay 1 - Parts Cabinet',
      'Bay 2 - Ground Level',
      'Bay 2 - Battery Storage',
      'Bay 3 - Parts Cabinet',
      'Bay 3 - Hydraulics',
      'Rental Counter',
    ],
  },
  valley: {
    key: 'valley',
    id: '660e8400-e29b-41d4-a716-446655440002',
    name: 'Valley Landscaping',
    staff: [VICTOR],
    admins: [VICTOR],
    teams: [{ id: '880e8400-e29b-41d4-a716-446655440004', name: 'Grounds Crew', assignees: [VICTOR, AMANDA] }],
    cities: ['Denver, CO', 'Boulder, CO', 'Colorado Springs, CO'],
    storageLocations: [
      'Tool Room - Cabinet',
      'Tool Room - Wall Rack',
      'Tool Room - Parts Shelf',
      'Shop Floor',
      'Truck Stock',
    ],
  },
  industrial: {
    key: 'industrial',
    id: '660e8400-e29b-41d4-a716-446655440003',
    name: 'Industrial Rentals',
    staff: [IRENE, MULTI],
    admins: [IRENE],
    teams: [
      { id: '880e8400-e29b-41d4-a716-446655440005', name: 'Warehouse Team', assignees: [IRENE, MARCUS, MULTI] },
    ],
    cities: ['Chicago, IL', 'Detroit, MI', 'Atlanta, GA', 'New York, NY'],
    storageLocations: [
      'Dock A - Parts Shelf',
      'Dock A - Battery Storage',
      'Dock A - Charging Station',
      'Dock B - Parts Shelf',
      'Dock C - Parts Shelf',
      'Staging Area - Rack 1',
      'Staging Area - Rack 2',
    ],
  },
};

export const ORG_KEYS: OrgKey[] = ['apex', 'metro', 'valley', 'industrial'];

/**
 * UUID prefixes reserved for generated data. Must stay disjoint from the
 * committed seed prefixes (aa0e/a00e/a20e/a30e/bb0e/660e/880e/cc0e/b00e/f00e)
 * and from the E2E fixture ranges in 29/30_e2e_*.sql.
 */
export const UUID_PREFIXES = {
  // Ported from the retired generate-large-inventory-seed.ts (same ranges).
  inventoryItem: 'c10e8400',
  partIdentifier: 'c20e8400',
  alternateGroup: 'c30e8400',
  groupMember: 'c40e8400',
  // New generated domains.
  equipment: 'd10e8400',
  workOrder: 'd20e8400',
  workOrderNote: 'd30e8400',
  workOrderCost: 'd40e8400',
  inventoryTransaction: 'd50e8400',
  operatorTemplate: 'd60e8400',
  operatorSetting: 'd70e8400',
  operatorSubmission: 'd80e8400',
} as const;

// ============================================================================
// Parts catalog (ported from generate-large-inventory-seed.ts)
// ============================================================================

export interface PartTemplate {
  category: string;
  nameTemplate: string;
  skuPrefix: string;
  brands: string[];
  priceRange: { min: number; max: number };
  variations?: string[];
}

export const PART_TEMPLATES: PartTemplate[] = [
  {
    category: 'Filters',
    nameTemplate: '{brand} {type} Filter',
    skuPrefix: 'FLT',
    brands: ['WIX', 'Baldwin', 'Donaldson', 'Fleetguard', 'CAT', 'John Deere', 'Kubota'],
    priceRange: { min: 15, max: 150 },
    variations: ['Oil', 'Air', 'Fuel', 'Hydraulic', 'Transmission', 'Cabin Air', 'Water Separator'],
  },
  {
    category: 'Hydraulics',
    nameTemplate: '{brand} Hydraulic {type}',
    skuPrefix: 'HYD',
    brands: ['Parker', 'Eaton', 'Bosch Rexroth', 'Danfoss', 'Sun Hydraulics'],
    priceRange: { min: 50, max: 800 },
    variations: ['Pump', 'Cylinder Seal Kit', 'Hose Assembly', 'Valve', 'Motor', 'Filter Element', 'Coupler'],
  },
  {
    category: 'Engine',
    nameTemplate: '{brand} Engine {type}',
    skuPrefix: 'ENG',
    brands: ['Cummins', 'Caterpillar', 'John Deere', 'Kubota', 'Yanmar', 'Perkins'],
    priceRange: { min: 25, max: 1500 },
    variations: ['Gasket Set', 'Injector', 'Turbo', 'Water Pump', 'Thermostat', 'Belt', 'Alternator', 'Starter'],
  },
  {
    category: 'Undercarriage',
    nameTemplate: '{brand} {type}',
    skuPrefix: 'UND',
    brands: ['ITR', 'Berco', 'CAT', 'Komatsu', 'Hitachi'],
    priceRange: { min: 100, max: 2500 },
    variations: ['Track Shoe', 'Track Roller', 'Carrier Roller', 'Idler', 'Sprocket', 'Track Chain', 'Track Pad'],
  },
  {
    category: 'Electrical',
    nameTemplate: '{brand} {type}',
    skuPrefix: 'ELC',
    brands: ['Denso', 'Bosch', 'Delco Remy', 'Prestolite', 'Leece-Neville'],
    priceRange: { min: 30, max: 600 },
    variations: ['Alternator', 'Starter Motor', 'Solenoid', 'Relay', 'Sensor', 'Switch', 'Wiring Harness'],
  },
  {
    category: 'Batteries',
    nameTemplate: '{brand} {type} Battery',
    skuPrefix: 'BAT',
    brands: ['Interstate', 'Trojan', 'Crown', 'Deka', 'Exide', 'Optima'],
    priceRange: { min: 100, max: 3000 },
    variations: ['Starting', 'Deep Cycle', 'AGM', 'Lithium', 'Forklift', 'Golf Cart'],
  },
  {
    category: 'Tires & Wheels',
    nameTemplate: '{brand} {type}',
    skuPrefix: 'TIR',
    brands: ['Michelin', 'Bridgestone', 'Goodyear', 'Continental', 'Solideal', 'Camso'],
    priceRange: { min: 150, max: 2000 },
    variations: ['Pneumatic Tire', 'Solid Tire', 'Foam Fill Tire', 'Wheel Assembly', 'Rim', 'Tube'],
  },
  {
    category: 'Brakes',
    nameTemplate: '{brand} Brake {type}',
    skuPrefix: 'BRK',
    brands: ['Mico', 'Carlisle', 'Wabco', 'Bendix', 'Meritor'],
    priceRange: { min: 40, max: 500 },
    variations: ['Pad Set', 'Disc', 'Drum', 'Caliper', 'Master Cylinder', 'Wheel Cylinder', 'Brake Line'],
  },
  {
    category: 'Fluids',
    nameTemplate: '{brand} {type}',
    skuPrefix: 'FLD',
    brands: ['Shell', 'Mobil', 'Chevron', 'CAT', 'John Deere', 'Valvoline'],
    priceRange: { min: 20, max: 200 },
    variations: ['Engine Oil 15W-40', 'Hydraulic Oil', 'Transmission Fluid', 'Gear Oil', 'Grease Cartridge', 'Coolant', 'DEF'],
  },
  {
    category: 'Ground Engaging',
    nameTemplate: '{brand} {type}',
    skuPrefix: 'GET',
    brands: ['ESCO', 'Hensley', 'CAT', 'Komatsu', 'Black Cat'],
    priceRange: { min: 25, max: 400 },
    variations: ['Bucket Tooth', 'Cutting Edge', 'Side Cutter', 'Wear Plate', 'Adapter', 'Pin & Retainer'],
  },
  {
    category: 'Seals',
    nameTemplate: '{brand} {type} Seal',
    skuPrefix: 'SEL',
    brands: ['NOK', 'Hallite', 'Trelleborg', 'SKF', 'Parker'],
    priceRange: { min: 10, max: 300 },
    variations: ['Cylinder', 'Shaft', 'Piston', 'Rod', 'Dust', 'O-Ring Kit', 'Gasket Set'],
  },
  {
    category: 'Attachments',
    nameTemplate: '{brand} {type}',
    skuPrefix: 'ATT',
    brands: ['JRB', 'Werk-Brau', 'Pemberton', 'Craig', 'Rockland'],
    priceRange: { min: 200, max: 5000 },
    variations: ['Quick Coupler', 'Bucket Pin', 'Bushing', 'Bucket Cylinder', 'Thumb', 'Grapple'],
  },
  {
    category: 'Lift Parts',
    nameTemplate: '{brand} {type}',
    skuPrefix: 'LFT',
    brands: ['JLG', 'Genie', 'Skyjack', 'Snorkel', 'Haulotte'],
    priceRange: { min: 50, max: 1200 },
    variations: ['Platform Control Box', 'Limit Switch', 'Pothole Guard', 'Outrigger Pad', 'Joystick', 'Charger'],
  },
  {
    category: 'Forklift',
    nameTemplate: '{brand} Forklift {type}',
    skuPrefix: 'FRK',
    brands: ['Toyota', 'Hyster', 'Yale', 'Crown', 'Raymond', 'Caterpillar'],
    priceRange: { min: 40, max: 800 },
    variations: ['Fork', 'Mast Chain', 'Carriage Roller', 'Load Wheel', 'Steer Wheel', 'Seat', 'Propane Regulator'],
  },
  {
    category: 'Safety',
    nameTemplate: '{brand} {type}',
    skuPrefix: 'SAF',
    brands: ['Ecco', 'Grote', 'Federal Signal', 'Whelen', '3M'],
    priceRange: { min: 20, max: 400 },
    variations: ['Backup Alarm', 'Strobe Light', 'Mirror', 'Fire Extinguisher', 'First Aid Kit', 'Safety Decal Set'],
  },
  {
    category: 'Cab & HVAC',
    nameTemplate: '{brand} {type}',
    skuPrefix: 'CAB',
    brands: ['Red Dot', 'Sanden', 'Denso', 'Bergstrom'],
    priceRange: { min: 50, max: 600 },
    variations: ['A/C Compressor', 'Evaporator', 'Condenser', 'Blower Motor', 'Heater Core', 'Cab Filter'],
  },
  {
    category: 'Landscaping',
    nameTemplate: '{brand} {type}',
    skuPrefix: 'LND',
    brands: ['Stihl', 'Husqvarna', 'Oregon', 'John Deere', 'Kubota'],
    priceRange: { min: 15, max: 350 },
    variations: ['Mower Blade', 'Chainsaw Chain', 'Chainsaw Bar', 'Trimmer Line', 'Spindle Assembly', 'Belt'],
  },
  {
    category: 'Compressor',
    nameTemplate: '{brand} Compressor {type}',
    skuPrefix: 'CMP',
    brands: ['Atlas Copco', 'Ingersoll Rand', 'Sullair', 'Doosan', 'Kaeser'],
    priceRange: { min: 30, max: 800 },
    variations: ['Air/Oil Separator', 'Inlet Valve', 'Minimum Pressure Valve', 'Scavenge Line', 'Control Board'],
  },
];

export const EQUIPMENT_MODELS = {
  excavators: ['CAT 320', 'CAT 336', 'Komatsu PC210', 'Komatsu PC360', 'Hitachi ZX200', 'John Deere 350G'],
  dozers: ['CAT D6', 'CAT D8', 'John Deere 700K', 'John Deere 850L', 'Komatsu D65'],
  loaders: ['CAT 950', 'CAT 966', 'John Deere 644', 'Komatsu WA380', 'Volvo L120'],
  skidSteers: ['Bobcat S650', 'Bobcat S770', 'CAT 262D', 'John Deere 332G', 'Kubota SVL95'],
  lifts: ['JLG 450AJ', 'JLG 600S', 'Genie S-65', 'Genie GS-2669', 'Skyjack SJ6832'],
  forklifts: ['Toyota 8FGU25', 'Hyster H50FT', 'Crown FC4500', 'Raymond 8210', 'Yale GLP050'],
  mowers: ['John Deere Z930M', 'John Deere Z950M', 'Kubota Z726X', 'Husqvarna MZ61'],
  chainsaws: ['Stihl MS 500i', 'Husqvarna 572 XP', 'Stihl MS 462'],
} as const;

/** Category emphasis per org (weights used when picking part templates). */
export const ORG_CATEGORY_WEIGHTS: Record<OrgKey, Record<string, number>> = {
  apex: { Undercarriage: 3, Hydraulics: 3, Engine: 2, 'Ground Engaging': 3, Filters: 2 },
  metro: { 'Lift Parts': 4, Batteries: 3, Hydraulics: 2, Safety: 2, 'Tires & Wheels': 2 },
  valley: { Landscaping: 5, Filters: 2, Fluids: 2, Engine: 1 },
  industrial: { Forklift: 5, Batteries: 3, 'Tires & Wheels': 2, Safety: 2 },
};

/** Equipment fleet flavor per org used by the equipment generator. */
export const ORG_FLEET_MODELS: Record<OrgKey, readonly (readonly string[])[]> = {
  apex: [EQUIPMENT_MODELS.excavators, EQUIPMENT_MODELS.dozers, EQUIPMENT_MODELS.loaders, EQUIPMENT_MODELS.skidSteers],
  metro: [EQUIPMENT_MODELS.lifts, EQUIPMENT_MODELS.skidSteers, EQUIPMENT_MODELS.loaders],
  valley: [EQUIPMENT_MODELS.mowers, EQUIPMENT_MODELS.chainsaws, EQUIPMENT_MODELS.skidSteers],
  industrial: [EQUIPMENT_MODELS.forklifts, EQUIPMENT_MODELS.lifts],
};
