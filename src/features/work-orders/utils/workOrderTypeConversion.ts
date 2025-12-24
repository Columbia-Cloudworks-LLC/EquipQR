/**
 * Work Order Type Conversion Utilities
 * Provides safe conversion between different work order interface formats
 */

import { WorkOrderData } from '@/features/work-orders/types/workOrder';
import { WorkOrderData as WorkOrderDetailsData } from '@/features/work-orders/types/workOrderDetails';

// Base interface for minimal work order data
export interface WorkOrderLike {
  id: string;
  status: 'submitted' | 'accepted' | 'assigned' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';
  has_pm?: boolean;
  title?: string;
  description?: string;
  equipment_id?: string;
  equipmentId?: string;
  organization_id?: string;
  organizationId?: string;
  created_date?: string;
  createdDate?: string;
  assignee_id?: string;
  assigneeId?: string;
  team_id?: string;
  teamId?: string;
  created_by?: string;
  createdByName?: string;
}

// Legacy WorkOrder interface (from services)
export interface LegacyWorkOrder {
  id: string;
  title?: string;
  description?: string;
  equipment_id?: string;
  organization_id?: string;
  status: 'submitted' | 'accepted' | 'assigned' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';
  assignee_id?: string;
  team_id?: string;
  created_date?: string;
  created_by?: string;
  has_pm?: boolean;
}

/**
 * Converts any work order-like object to WorkOrderData format
 */
export const convertToWorkOrderData = (workOrder: WorkOrderLike): WorkOrderData => {
  return {
    id: workOrder.id,
    title: workOrder.title || 'Untitled Work Order',
    description: workOrder.description || '',
    equipmentId: workOrder.equipmentId || workOrder.equipment_id || '',
    organizationId: workOrder.organizationId || workOrder.organization_id || '',
    priority: 'medium', // Default priority if not provided
    status: workOrder.status,
    assigneeId: workOrder.assigneeId || workOrder.assignee_id,
    assigneeName: undefined,
    teamId: workOrder.teamId || workOrder.team_id,
    teamName: undefined,
    createdDate: workOrder.createdDate || workOrder.created_date || new Date().toISOString(),
    created_date: workOrder.created_date || workOrder.createdDate || new Date().toISOString(),
    dueDate: undefined,
    estimatedHours: undefined,
    completedDate: undefined,
    equipmentName: undefined,
    createdByName: workOrder.createdByName
  };
};

/**
 * Converts WorkOrderData to WorkOrderDetailsData format
 */
export const convertToWorkOrderDetailsData = (workOrder: WorkOrderData): WorkOrderDetailsData => {
  return {
    id: workOrder.id,
    title: workOrder.title,
    description: workOrder.description,
    status: workOrder.status,
    priority: workOrder.priority,
    created_date: workOrder.created_date || workOrder.createdDate,
    due_date: workOrder.dueDate,
    completed_date: workOrder.completedDate,
    estimated_hours: workOrder.estimatedHours,
    assignee_id: workOrder.assigneeId,
    assigneeName: workOrder.assigneeName,
    teamName: workOrder.teamName,
    team_id: workOrder.teamId,
    equipment_id: workOrder.equipmentId,
    organization_id: workOrder.organizationId,
    has_pm: false // Default value
  };
};

/**
 * Creates a minimal work order object for permission checks
 */
export const createMinimalWorkOrder = (
  id: string,
  status: WorkOrderLike['status'],
  options: {
    equipmentId?: string;
    teamId?: string;
    assigneeId?: string;
    createdBy?: string;
  } = {}
): WorkOrderData => {
  return {
    id,
    title: 'Work Order',
    description: '',
    equipmentId: options.equipmentId || '',
    organizationId: '',
    priority: 'medium',
    status,
    assigneeId: options.assigneeId,
    teamId: options.teamId,
    createdDate: new Date().toISOString(),
    created_date: new Date().toISOString(),
    createdByName: options.createdBy
  };
};

/**
 * Type guard to check if an object has the required WorkOrderData properties
 */
export const isWorkOrderData = (obj: unknown): obj is WorkOrderData => {
  return obj !== null &&
    typeof obj === 'object' &&
    'id' in obj &&
    'title' in obj &&
    'description' in obj &&
    'equipmentId' in obj &&
    'organizationId' in obj &&
    'status' in obj &&
    typeof (obj as Record<string, unknown>).id === 'string' &&
    typeof (obj as Record<string, unknown>).title === 'string' &&
    typeof (obj as Record<string, unknown>).description === 'string' &&
    typeof (obj as Record<string, unknown>).equipmentId === 'string' &&
    typeof (obj as Record<string, unknown>).organizationId === 'string' &&
    typeof (obj as Record<string, unknown>).status === 'string';
};

/**
 * Safe converter that ensures we always get a valid WorkOrderData object
 */
export const ensureWorkOrderData = (workOrder: unknown): WorkOrderData => {
  if (isWorkOrderData(workOrder)) {
    return workOrder;
  }
  
  // If it's a work order-like object, convert it
  if (workOrder && 
      typeof workOrder === 'object' && 
      'id' in workOrder && 
      'status' in workOrder &&
      typeof (workOrder as Record<string, unknown>).id === 'string' && 
      (workOrder as Record<string, unknown>).status) {
    return convertToWorkOrderData(workOrder as WorkOrderLike);
  }
  
  // Fallback to minimal work order
  throw new Error('Invalid work order data provided');
};

