/**
 * Entity Fixtures for Testing
 * 
 * These fixtures provide realistic test data for organizations, teams,
 * equipment, work orders, and other entities. They are designed to
 * work together as a cohesive test dataset.
 */

import type { WorkOrder, WorkOrderStatus, WorkOrderPriority } from '@/features/work-orders/types/workOrder';
import type { EquipmentStatus } from '@/features/equipment/types/equipment';
import { personas } from './personas';

// ============================================
// Organization Fixtures
// ============================================

export interface TestOrganization {
  id: string;
  name: string;
  plan: 'free' | 'professional' | 'enterprise';
  memberCount: number;
  maxMembers: number;
  features: string[];
}

export const organizations = {
  acme: {
    id: 'org-acme',
    name: 'Acme Equipment Co',
    plan: 'professional' as const,
    memberCount: 12,
    maxMembers: 50,
    features: ['custom_pm_templates', 'fleet_map', 'advanced_analytics']
  },
  freeOrg: {
    id: 'org-free',
    name: 'Small Shop LLC',
    plan: 'free' as const,
    memberCount: 2,
    maxMembers: 3,
    features: []
  },
  enterprise: {
    id: 'org-enterprise',
    name: 'Global Industries Inc',
    plan: 'enterprise' as const,
    memberCount: 150,
    maxMembers: 500,
    features: ['custom_pm_templates', 'fleet_map', 'advanced_analytics', 'sso', 'api_access']
  }
} as const;

// ============================================
// Team Fixtures
// ============================================

export interface TestTeam {
  id: string;
  name: string;
  organization_id: string;
  description?: string;
}

export const teams = {
  maintenance: {
    id: 'team-maintenance',
    name: 'Maintenance Crew',
    organization_id: 'org-acme',
    description: 'Handles all preventive and corrective maintenance'
  },
  field: {
    id: 'team-field',
    name: 'Field Operations',
    organization_id: 'org-acme',
    description: 'On-site equipment servicing and repairs'
  },
  warehouse: {
    id: 'team-warehouse',
    name: 'Warehouse Team',
    organization_id: 'org-acme',
    description: 'Warehouse equipment and inventory management'
  }
} as const;

// ============================================
// Equipment Fixtures
// ============================================

export interface TestEquipment {
  id: string;
  name: string;
  manufacturer: string;
  model: string;
  serial_number: string;
  status: EquipmentStatus;
  location?: string;
  team_id: string | null;
  organization_id: string;
  default_pm_template_id?: string | null;
  notes?: string;
  custom_attributes?: Record<string, string | number | boolean | null>;
}

export const equipment = {
  forklift1: {
    id: 'eq-forklift-1',
    name: 'Forklift #1',
    manufacturer: 'Toyota',
    model: '8FGU25',
    serial_number: 'TY-2024-001',
    status: 'active' as EquipmentStatus,
    location: 'Warehouse A',
    team_id: 'team-maintenance',
    organization_id: 'org-acme',
    default_pm_template_id: 'template-forklift',
    notes: 'Primary warehouse forklift',
    custom_attributes: { 'Fuel Type': 'Propane', 'Capacity (lbs)': 5000 }
  },
  forklift2: {
    id: 'eq-forklift-2',
    name: 'Forklift #2',
    manufacturer: 'Toyota',
    model: '8FGU25',
    serial_number: 'TY-2024-002',
    status: 'maintenance' as EquipmentStatus,
    location: 'Warehouse A',
    team_id: 'team-maintenance',
    organization_id: 'org-acme',
    default_pm_template_id: 'template-forklift',
    notes: 'Needs new tires'
  },
  crane: {
    id: 'eq-crane-1',
    name: 'Overhead Crane #1',
    manufacturer: 'Konecranes',
    model: 'CXT-10',
    serial_number: 'KC-2023-050',
    status: 'active' as EquipmentStatus,
    location: 'Bay 3',
    team_id: 'team-field',
    organization_id: 'org-acme',
    default_pm_template_id: 'template-crane',
    custom_attributes: { 'Max Load (tons)': 10, 'Span (ft)': 60 }
  },
  compressor: {
    id: 'eq-compressor-1',
    name: 'Air Compressor',
    manufacturer: 'Ingersoll Rand',
    model: 'R-Series 37',
    serial_number: 'IR-2022-100',
    status: 'active' as EquipmentStatus,
    location: 'Utility Room',
    team_id: 'team-warehouse',
    organization_id: 'org-acme',
    default_pm_template_id: null
  },
  unassigned: {
    id: 'eq-unassigned-1',
    name: 'Portable Generator',
    manufacturer: 'Caterpillar',
    model: 'RP3600',
    serial_number: 'CAT-2024-010',
    status: 'inactive' as EquipmentStatus,
    location: 'Storage',
    team_id: null,
    organization_id: 'org-acme',
    default_pm_template_id: null
  }
} as const;

// ============================================
// Work Order Fixtures
// ============================================

export interface TestWorkOrder extends Partial<WorkOrder> {
  id: string;
  title: string;
  description: string;
  status: WorkOrderStatus;
  priority: WorkOrderPriority;
  equipment_id: string;
  organization_id: string;
  team_id?: string | null;
  assignee_id?: string | null;
  assignee_name?: string | null;
  created_by?: string;
  created_date: string;
  due_date?: string | null;
  has_pm: boolean;
  pm_required: boolean;
}

export const workOrders = {
  submitted: {
    id: 'wo-submitted-1',
    title: 'Oil Change - Forklift #1',
    description: 'Routine oil change and filter replacement',
    status: 'submitted' as WorkOrderStatus,
    priority: 'medium' as WorkOrderPriority,
    equipment_id: 'eq-forklift-1',
    organization_id: 'org-acme',
    team_id: 'team-maintenance',
    assignee_id: null,
    assignee_name: null,
    created_by: personas.teamManager.id,
    created_date: '2024-01-10T09:00:00Z',
    due_date: '2024-01-15T17:00:00Z',
    has_pm: true,
    pm_required: true,
    equipmentName: 'Forklift #1',
    teamName: 'Maintenance Crew'
  },
  assigned: {
    id: 'wo-assigned-1',
    title: 'Brake Inspection',
    description: 'Inspect and adjust brakes per PM schedule',
    status: 'assigned' as WorkOrderStatus,
    priority: 'high' as WorkOrderPriority,
    equipment_id: 'eq-forklift-2',
    organization_id: 'org-acme',
    team_id: 'team-maintenance',
    assignee_id: personas.technician.id,
    assignee_name: personas.technician.name,
    created_by: personas.admin.id,
    created_date: '2024-01-08T10:00:00Z',
    due_date: '2024-01-12T17:00:00Z',
    has_pm: true,
    pm_required: true,
    equipmentName: 'Forklift #2',
    teamName: 'Maintenance Crew',
    assigneeName: personas.technician.name
  },
  inProgress: {
    id: 'wo-inprogress-1',
    title: 'Hydraulic System Repair',
    description: 'Repair hydraulic leak on crane',
    status: 'in_progress' as WorkOrderStatus,
    priority: 'high' as WorkOrderPriority,
    equipment_id: 'eq-crane-1',
    organization_id: 'org-acme',
    team_id: 'team-field',
    assignee_id: personas.multiTeamTechnician.id,
    assignee_name: personas.multiTeamTechnician.name,
    created_by: personas.teamManager.id,
    created_date: '2024-01-05T08:00:00Z',
    due_date: '2024-01-10T17:00:00Z',
    has_pm: false,
    pm_required: false,
    equipmentName: 'Overhead Crane #1',
    teamName: 'Field Operations',
    assigneeName: personas.multiTeamTechnician.name
  },
  completed: {
    id: 'wo-completed-1',
    title: 'Annual Inspection',
    description: 'Complete annual safety inspection',
    status: 'completed' as WorkOrderStatus,
    priority: 'medium' as WorkOrderPriority,
    equipment_id: 'eq-compressor-1',
    organization_id: 'org-acme',
    team_id: 'team-warehouse',
    assignee_id: personas.technician.id,
    assignee_name: personas.technician.name,
    created_by: personas.admin.id,
    created_date: '2024-01-01T09:00:00Z',
    due_date: '2024-01-05T17:00:00Z',
    completed_date: '2024-01-04T15:30:00Z',
    has_pm: true,
    pm_required: true,
    equipmentName: 'Air Compressor',
    teamName: 'Warehouse Team',
    assigneeName: personas.technician.name
  },
  overdue: {
    id: 'wo-overdue-1',
    title: 'Filter Replacement',
    description: 'Replace air filters - overdue',
    status: 'in_progress' as WorkOrderStatus,
    priority: 'low' as WorkOrderPriority,
    equipment_id: 'eq-compressor-1',
    organization_id: 'org-acme',
    team_id: 'team-warehouse',
    assignee_id: personas.technician.id,
    assignee_name: personas.technician.name,
    created_by: personas.teamManager.id,
    created_date: '2023-12-01T09:00:00Z',
    due_date: '2023-12-15T17:00:00Z', // Past due
    has_pm: false,
    pm_required: false,
    equipmentName: 'Air Compressor',
    teamName: 'Warehouse Team',
    assigneeName: personas.technician.name
  },
  cancelled: {
    id: 'wo-cancelled-1',
    title: 'Generator Service',
    description: 'Cancelled - equipment decommissioned',
    status: 'cancelled' as WorkOrderStatus,
    priority: 'low' as WorkOrderPriority,
    equipment_id: 'eq-unassigned-1',
    organization_id: 'org-acme',
    team_id: null,
    assignee_id: null,
    assignee_name: null,
    created_by: personas.admin.id,
    created_date: '2024-01-02T09:00:00Z',
    due_date: null,
    has_pm: false,
    pm_required: false,
    equipmentName: 'Portable Generator'
  }
} as const;

// ============================================
// PM Template Fixtures
// ============================================

export interface TestPMTemplate {
  id: string;
  name: string;
  description: string;
  organization_id: string | null;
  is_protected: boolean;
  sections: Array<{ name: string; count: number }>;
  itemCount: number;
}

export const pmTemplates = {
  forklift: {
    id: 'template-forklift',
    name: 'Forklift PM Checklist',
    description: 'Standard forklift preventive maintenance',
    organization_id: null, // Global template
    is_protected: true,
    sections: [
      { name: 'Engine & Fluids', count: 5 },
      { name: 'Hydraulics', count: 4 },
      { name: 'Safety Equipment', count: 6 },
      { name: 'Tires & Brakes', count: 4 }
    ],
    itemCount: 19
  },
  crane: {
    id: 'template-crane',
    name: 'Overhead Crane Inspection',
    description: 'Crane safety and operational inspection',
    organization_id: null,
    is_protected: true,
    sections: [
      { name: 'Structural', count: 8 },
      { name: 'Electrical', count: 5 },
      { name: 'Controls', count: 6 },
      { name: 'Load Testing', count: 3 }
    ],
    itemCount: 22
  },
  customOrgTemplate: {
    id: 'template-custom-1',
    name: 'Acme Custom Checklist',
    description: 'Organization-specific PM checklist',
    organization_id: 'org-acme',
    is_protected: false,
    sections: [
      { name: 'Pre-Operation', count: 4 },
      { name: 'Post-Operation', count: 3 }
    ],
    itemCount: 7
  }
} as const;

// ============================================
// Inventory Item Fixtures
// ============================================

export interface TestInventoryItem {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  sku: string | null;
  external_id: string | null;
  quantity_on_hand: number;
  low_stock_threshold: number;
  image_url: string | null;
  location: string | null;
  default_unit_cost: number | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  isLowStock?: boolean;
}

export const inventoryItems = {
  oilFilter: {
    id: 'inv-oil-filter',
    organization_id: 'org-acme',
    name: 'Oil Filter - Toyota Forklift',
    description: 'OEM oil filter for Toyota 8FGU25 forklifts',
    sku: 'OF-TY-001',
    external_id: 'VENDOR-12345',
    quantity_on_hand: 50,
    low_stock_threshold: 10,
    image_url: null,
    location: 'Warehouse A - Shelf B3',
    default_unit_cost: 24.99,
    created_by: personas.admin.id,
    created_at: '2024-01-01T10:00:00Z',
    updated_at: '2024-01-10T14:30:00Z',
    isLowStock: false
  },
  hydraulicHose: {
    id: 'inv-hydraulic-hose',
    organization_id: 'org-acme',
    name: 'Hydraulic Hose 6ft',
    description: 'High-pressure hydraulic hose, 6 foot length',
    sku: 'HH-6FT-HP',
    external_id: null,
    quantity_on_hand: 3,
    low_stock_threshold: 5,
    image_url: null,
    location: 'Warehouse A - Shelf C1',
    default_unit_cost: 89.50,
    created_by: personas.admin.id,
    created_at: '2024-01-02T09:00:00Z',
    updated_at: '2024-01-08T11:00:00Z',
    isLowStock: true // Below threshold
  },
  brakePads: {
    id: 'inv-brake-pads',
    organization_id: 'org-acme',
    name: 'Forklift Brake Pads',
    description: 'Universal brake pads for warehouse forklifts',
    sku: 'BP-UNIV-001',
    external_id: 'BP-SUPPLIER-789',
    quantity_on_hand: 20,
    low_stock_threshold: 8,
    image_url: null,
    location: 'Parts Room',
    default_unit_cost: 45.00,
    created_by: personas.teamManager.id,
    created_at: '2024-01-03T08:30:00Z',
    updated_at: '2024-01-09T16:00:00Z',
    isLowStock: false
  },
  craneWireRope: {
    id: 'inv-crane-wire-rope',
    organization_id: 'org-acme',
    name: 'Wire Rope - Crane',
    description: 'Steel wire rope for overhead cranes, 50ft spool',
    sku: 'WR-CR-50',
    external_id: null,
    quantity_on_hand: 0, // Out of stock
    low_stock_threshold: 2,
    image_url: null,
    location: 'Bay 3 Storage',
    default_unit_cost: 275.00,
    created_by: personas.admin.id,
    created_at: '2024-01-04T11:00:00Z',
    updated_at: '2024-01-11T09:00:00Z',
    isLowStock: true
  },
  airFilter: {
    id: 'inv-air-filter',
    organization_id: 'org-acme',
    name: 'Air Filter - Compressor',
    description: 'Replacement air filter for Ingersoll Rand R-Series',
    sku: 'AF-IR-37',
    external_id: 'IR-PART-AF001',
    quantity_on_hand: 15,
    low_stock_threshold: 5,
    image_url: null,
    location: 'Utility Room Cabinet',
    default_unit_cost: 35.00,
    created_by: personas.admin.id,
    created_at: '2024-01-05T14:00:00Z',
    updated_at: '2024-01-10T10:00:00Z',
    isLowStock: false
  }
} as const;

export interface TestInventoryTransaction {
  id: string;
  inventory_item_id: string;
  organization_id: string;
  user_id: string;
  previous_quantity: number;
  new_quantity: number;
  change_amount: number;
  transaction_type: 'usage' | 'restock' | 'adjustment' | 'initial' | 'work_order';
  notes: string | null;
  work_order_id: string | null;
  created_at: string;
  userName?: string;
  inventoryItemName?: string;
}

export const inventoryTransactions = {
  initialStock: {
    id: 'txn-initial-1',
    inventory_item_id: 'inv-oil-filter',
    organization_id: 'org-acme',
    user_id: personas.admin.id,
    previous_quantity: 0,
    new_quantity: 50,
    change_amount: 50,
    transaction_type: 'initial' as const,
    notes: 'Initial stock',
    work_order_id: null,
    created_at: '2024-01-01T10:00:00Z',
    userName: personas.admin.name,
    inventoryItemName: 'Oil Filter - Toyota Forklift'
  },
  usageForWorkOrder: {
    id: 'txn-usage-1',
    inventory_item_id: 'inv-hydraulic-hose',
    organization_id: 'org-acme',
    user_id: personas.technician.id,
    previous_quantity: 5,
    new_quantity: 3,
    change_amount: -2,
    transaction_type: 'work_order' as const,
    notes: 'Used for hydraulic repair',
    work_order_id: 'wo-inprogress-1',
    created_at: '2024-01-08T11:00:00Z',
    userName: personas.technician.name,
    inventoryItemName: 'Hydraulic Hose 6ft'
  },
  restock: {
    id: 'txn-restock-1',
    inventory_item_id: 'inv-brake-pads',
    organization_id: 'org-acme',
    user_id: personas.teamManager.id,
    previous_quantity: 10,
    new_quantity: 20,
    change_amount: 10,
    transaction_type: 'restock' as const,
    notes: 'Restocked from supplier order #PO-2024-015',
    work_order_id: null,
    created_at: '2024-01-09T16:00:00Z',
    userName: personas.teamManager.name,
    inventoryItemName: 'Forklift Brake Pads'
  },
  adjustment: {
    id: 'txn-adjust-1',
    inventory_item_id: 'inv-crane-wire-rope',
    organization_id: 'org-acme',
    user_id: personas.admin.id,
    previous_quantity: 2,
    new_quantity: 0,
    change_amount: -2,
    transaction_type: 'adjustment' as const,
    notes: 'Physical count correction - damaged inventory',
    work_order_id: null,
    created_at: '2024-01-11T09:00:00Z',
    userName: personas.admin.name,
    inventoryItemName: 'Wire Rope - Crane'
  }
} as const;

export type ModelMatchType = 'any' | 'exact' | 'prefix' | 'wildcard';
export type VerificationStatus = 'unverified' | 'verified' | 'deprecated';

export interface TestPartCompatibilityRule {
  id: string;
  inventory_item_id: string;
  manufacturer: string;
  model: string | null;
  manufacturer_norm: string;
  model_norm: string | null;
  match_type: ModelMatchType;
  model_pattern_raw: string | null;
  model_pattern_norm: string | null;
  status: VerificationStatus;
  notes: string | null;
  evidence_url: string | null;
  created_by: string | null;
  verified_by: string | null;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export const partCompatibilityRules = {
  oilFilterToyota: {
    id: 'rule-oil-toyota',
    inventory_item_id: 'inv-oil-filter',
    manufacturer: 'Toyota',
    model: '8FGU25',
    manufacturer_norm: 'toyota',
    model_norm: '8fgu25',
    match_type: 'exact' as ModelMatchType,
    model_pattern_raw: null,
    model_pattern_norm: null,
    status: 'verified' as VerificationStatus,
    notes: 'Verified on job #12345',
    evidence_url: null,
    created_by: 'user-admin',
    verified_by: 'user-admin',
    verified_at: '2024-01-02T10:00:00Z',
    created_at: '2024-01-01T10:00:00Z',
    updated_at: '2024-01-02T10:00:00Z'
  },
  brakePadsUniversal: {
    id: 'rule-brake-universal',
    inventory_item_id: 'inv-brake-pads',
    manufacturer: 'Toyota',
    model: null, // Any Toyota model
    manufacturer_norm: 'toyota',
    model_norm: null,
    match_type: 'any' as ModelMatchType,
    model_pattern_raw: null,
    model_pattern_norm: null,
    status: 'unverified' as VerificationStatus,
    notes: null,
    evidence_url: null,
    created_by: 'user-admin',
    verified_by: null,
    verified_at: null,
    created_at: '2024-01-03T08:30:00Z',
    updated_at: '2024-01-03T08:30:00Z'
  },
  wireRopeKonecranes: {
    id: 'rule-wire-konecranes',
    inventory_item_id: 'inv-crane-wire-rope',
    manufacturer: 'Konecranes',
    model: null, // Any Konecranes model
    manufacturer_norm: 'konecranes',
    model_norm: null,
    match_type: 'any' as ModelMatchType,
    model_pattern_raw: null,
    model_pattern_norm: null,
    status: 'verified' as VerificationStatus,
    notes: 'Cross-referenced with Konecranes parts catalog',
    evidence_url: 'https://parts.konecranes.com/catalog',
    created_by: 'user-admin',
    verified_by: 'user-owner',
    verified_at: '2024-01-05T11:00:00Z',
    created_at: '2024-01-04T11:00:00Z',
    updated_at: '2024-01-05T11:00:00Z'
  },
  airFilterIngersoll: {
    id: 'rule-air-ingersoll',
    inventory_item_id: 'inv-air-filter',
    manufacturer: 'Ingersoll Rand',
    model: 'R-Series 37',
    manufacturer_norm: 'ingersoll rand',
    model_norm: 'r-series 37',
    match_type: 'exact' as ModelMatchType,
    model_pattern_raw: null,
    model_pattern_norm: null,
    status: 'unverified' as VerificationStatus,
    notes: null,
    evidence_url: null,
    created_by: 'user-admin',
    verified_by: null,
    verified_at: null,
    created_at: '2024-01-05T14:00:00Z',
    updated_at: '2024-01-05T14:00:00Z'
  },
  // New fixtures for pattern matching
  caterpillarDSeriesPrefix: {
    id: 'rule-cat-d-series',
    inventory_item_id: 'inv-hydraulic-hose',
    manufacturer: 'Caterpillar',
    model: 'D',
    manufacturer_norm: 'caterpillar',
    model_norm: null,
    match_type: 'prefix' as ModelMatchType,
    model_pattern_raw: 'D',
    model_pattern_norm: 'd',
    status: 'verified' as VerificationStatus,
    notes: 'Fits all Caterpillar D-series dozers',
    evidence_url: null,
    created_by: 'user-admin',
    verified_by: 'user-owner',
    verified_at: '2024-01-06T10:00:00Z',
    created_at: '2024-01-06T09:00:00Z',
    updated_at: '2024-01-06T10:00:00Z'
  },
  jlgWildcard: {
    id: 'rule-jlg-wildcard',
    inventory_item_id: 'inv-air-filter',
    manufacturer: 'JLG',
    model: '*-100',
    manufacturer_norm: 'jlg',
    model_norm: null,
    match_type: 'wildcard' as ModelMatchType,
    model_pattern_raw: '*-100',
    model_pattern_norm: '%-100',
    status: 'unverified' as VerificationStatus,
    notes: null,
    evidence_url: null,
    created_by: 'user-team-manager',
    verified_by: null,
    verified_at: null,
    created_at: '2024-01-07T09:00:00Z',
    updated_at: '2024-01-07T09:00:00Z'
  }
} as const;

// ============================================
// Part Alternate Groups (for interchangeable parts)
// ============================================

export type PartIdentifierType = 'oem' | 'aftermarket' | 'sku' | 'mpn' | 'upc' | 'cross_ref';

export interface TestPartAlternateGroup {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  status: VerificationStatus;
  notes: string | null;
  evidence_url: string | null;
  created_by: string;
  verified_by: string | null;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TestPartIdentifier {
  id: string;
  organization_id: string;
  identifier_type: PartIdentifierType;
  raw_value: string;
  norm_value: string;
  inventory_item_id: string | null;
  manufacturer: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
}

export const partAlternateGroups: Record<string, TestPartAlternateGroup> = {
  oilFilterGroup: {
    id: 'group-oil-filter',
    organization_id: 'org-acme',
    name: 'Oil Filter - Toyota/CAT Compatible',
    description: 'Interchangeable oil filters for Toyota and Caterpillar equipment',
    status: 'verified',
    notes: 'Cross-referenced with WIX and Baldwin catalogs',
    evidence_url: 'https://wixfilters.com/catalog',
    created_by: 'user-admin',
    verified_by: 'user-owner',
    verified_at: '2024-01-10T10:00:00Z',
    created_at: '2024-01-08T09:00:00Z',
    updated_at: '2024-01-10T10:00:00Z'
  },
  airFilterGroup: {
    id: 'group-air-filter',
    organization_id: 'org-acme',
    name: 'Air Filter - Industrial',
    description: 'Industrial equipment air filters',
    status: 'unverified',
    notes: null,
    evidence_url: null,
    created_by: 'user-admin',
    verified_by: null,
    verified_at: null,
    created_at: '2024-01-09T09:00:00Z',
    updated_at: '2024-01-09T09:00:00Z'
  }
};

export const partIdentifiers: Record<string, TestPartIdentifier> = {
  catOilFilter: {
    id: 'ident-cat-oil',
    organization_id: 'org-acme',
    identifier_type: 'oem',
    raw_value: 'CAT-1R-0750',
    norm_value: 'cat-1r-0750',
    inventory_item_id: 'inv-oil-filter',
    manufacturer: 'Caterpillar',
    notes: 'OEM part number',
    created_by: 'user-admin',
    created_at: '2024-01-08T09:00:00Z'
  },
  wixOilFilter: {
    id: 'ident-wix-oil',
    organization_id: 'org-acme',
    identifier_type: 'aftermarket',
    raw_value: 'WIX-51773',
    norm_value: 'wix-51773',
    inventory_item_id: null, // Not in our inventory
    manufacturer: 'WIX',
    notes: 'Aftermarket alternative',
    created_by: 'user-admin',
    created_at: '2024-01-08T09:05:00Z'
  },
  baldwinOilFilter: {
    id: 'ident-baldwin-oil',
    organization_id: 'org-acme',
    identifier_type: 'aftermarket',
    raw_value: 'B7299',
    norm_value: 'b7299',
    inventory_item_id: null, // Not in our inventory
    manufacturer: 'Baldwin',
    notes: 'Aftermarket alternative - cheaper option',
    created_by: 'user-admin',
    created_at: '2024-01-08T09:10:00Z'
  }
};

// ============================================
// Utility Functions
// ============================================

/**
 * Get all work orders for a specific team
 */
export const getWorkOrdersForTeam = (teamId: string): TestWorkOrder[] => {
  return Object.values(workOrders).filter(wo => wo.team_id === teamId);
};

/**
 * Get all work orders assigned to a specific user
 */
export const getWorkOrdersForAssignee = (assigneeId: string): TestWorkOrder[] => {
  return Object.values(workOrders).filter(wo => wo.assignee_id === assigneeId);
};

/**
 * Get all equipment for a specific team
 */
export const getEquipmentForTeam = (teamId: string): TestEquipment[] => {
  return Object.values(equipment).filter(eq => eq.team_id === teamId);
};

/**
 * Get work orders by status
 */
export const getWorkOrdersByStatus = (status: WorkOrderStatus): TestWorkOrder[] => {
  return Object.values(workOrders).filter(wo => wo.status === status);
};

/**
 * Create a custom work order for edge case testing
 */
export const createCustomWorkOrder = (
  overrides: Partial<TestWorkOrder> & { id: string; title: string }
): TestWorkOrder => ({
  description: '',
  status: 'submitted',
  priority: 'medium',
  equipment_id: equipment.forklift1.id,
  organization_id: organizations.acme.id,
  created_date: new Date().toISOString(),
  has_pm: false,
  pm_required: false,
  ...overrides
});

/**
 * Get all inventory items that are low on stock
 */
export const getLowStockInventoryItems = (): TestInventoryItem[] => {
  return Object.values(inventoryItems).filter(item => item.isLowStock);
};

/**
 * Get inventory transactions for a specific item
 */
export const getTransactionsForItem = (itemId: string): TestInventoryTransaction[] => {
  return Object.values(inventoryTransactions).filter(txn => txn.inventory_item_id === itemId);
};

/**
 * Get compatibility rules for a specific inventory item
 */
export const getCompatibilityRulesForItem = (itemId: string): TestPartCompatibilityRule[] => {
  return Object.values(partCompatibilityRules).filter(rule => rule.inventory_item_id === itemId);
};

/**
 * Create a custom inventory item for edge case testing
 */
export const createCustomInventoryItem = (
  overrides: Partial<TestInventoryItem> & { id: string; name: string }
): TestInventoryItem => ({
  organization_id: organizations.acme.id,
  description: null,
  sku: null,
  external_id: null,
  quantity_on_hand: 0,
  low_stock_threshold: 5,
  image_url: null,
  location: null,
  default_unit_cost: null,
  created_by: personas.admin.id,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  isLowStock: false,
  ...overrides
});
