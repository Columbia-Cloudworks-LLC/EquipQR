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
