/**
 * Work Order domain types
 * Consolidated from 38+ scattered WorkOrder interfaces
 * Following SOLID principles with clear inheritance hierarchy
 */

import { BaseEntity, AuditableEntity, BaseNote, BaseImage, Priority, EntityStatus } from '@/shared/types/common';

/**
 * Core Work Order entity
 */
export interface WorkOrder extends AuditableEntity {
  title: string;
  description: string;
  equipment_id: string;
  organization_id: string;
  priority: Priority;
  status: WorkOrderStatus;
  assignee_id?: string;
  team_id?: string;
  created_date: string;
  due_date?: string;
  estimated_hours?: number;
  completed_date?: string;
  is_historical: boolean;
  pm_template_id?: string;
  pm_checklist_id?: string;
  
  // Computed fields
  assignee_name?: string;
  team_name?: string;
  equipment_name?: string;
  days_overdue?: number;
  is_overdue?: boolean;
}

/**
 * Work Order status enum
 */
export enum WorkOrderStatus {
  SUBMITTED = 'submitted',
  ACCEPTED = 'accepted',
  ASSIGNED = 'assigned',
  IN_PROGRESS = 'in_progress',
  ON_HOLD = 'on_hold',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

/**
 * Work Order filters for queries
 */
export interface WorkOrderFilters {
  status?: WorkOrderStatus | 'all';
  assigneeId?: string;
  teamId?: string;
  priority?: Priority | 'all';
  equipmentId?: string;
  dueDateFilter?: 'overdue' | 'today' | 'this_week' | 'this_month';
  search?: string;
  isHistorical?: boolean;
  pmTemplateId?: string;
  createdBy?: string;
  dateRange?: {
    start: string;
    end: string;
  };
}

/**
 * Work Order creation data
 */
export interface CreateWorkOrderData {
  title: string;
  description: string;
  equipment_id: string;
  priority: Priority;
  assignee_id?: string;
  team_id?: string;
  due_date?: string;
  estimated_hours?: number;
  is_historical?: boolean;
  pm_template_id?: string;
}

/**
 * Work Order update data
 */
export interface UpdateWorkOrderData {
  title?: string;
  description?: string;
  priority?: Priority;
  status?: WorkOrderStatus;
  assignee_id?: string;
  team_id?: string;
  due_date?: string;
  estimated_hours?: number;
  completed_date?: string;
  pm_template_id?: string;
}

/**
 * Enhanced Work Order with related data
 */
export interface EnhancedWorkOrder extends WorkOrder {
  equipment: {
    id: string;
    name: string;
    team_id?: string;
    teams?: {
      name: string;
    };
  };
  assignee?: {
    id: string;
    name: string;
  };
  creator: {
    id: string;
    name: string;
  };
  team?: {
    id: string;
    name: string;
  };
  costs?: any[]; // Will be properly typed when WorkOrderCosts types are imported
  notes?: any[]; // Will be properly typed when WorkOrderNotes types are imported
  images?: any[]; // Will be properly typed when WorkOrderImages types are imported
  pm_checklist?: any[]; // Will be properly typed when PMChecklist types are imported
}

/**
 * Work Order assignment data
 */
export interface WorkOrderAssignmentData {
  work_order_id: string;
  assignee_id?: string;
  team_id?: string;
  assigned_by: string;
  assignment_reason?: string;
}

/**
 * Work Order acceptance data
 */
export interface WorkOrderAcceptanceData {
  work_order_id: string;
  accepted_by: string;
  acceptance_notes?: string;
  estimated_completion_date?: string;
}

/**
 * Work Order status update data
 */
export interface WorkOrderStatusUpdateData {
  work_order_id: string;
  status: WorkOrderStatus;
  updated_by: string;
  status_notes?: string;
  completion_notes?: string;
  actual_hours?: number;
}

/**
 * Work Order bulk operations
 */
export interface WorkOrderBulkUpdateData {
  work_order_ids: string[];
  updates: Partial<UpdateWorkOrderData>;
  updated_by: string;
}

/**
 * Work Order statistics
 */
export interface WorkOrderStats {
  total: number;
  by_status: Record<WorkOrderStatus, number>;
  by_priority: Record<Priority, number>;
  overdue_count: number;
  completed_this_week: number;
  avg_completion_time_hours: number;
  total_estimated_hours: number;
  total_actual_hours: number;
}

/**
 * Work Order export data
 */
export interface WorkOrderExportData {
  work_orders: EnhancedWorkOrder[];
  export_date: string;
  filters_applied: WorkOrderFilters;
  total_count: number;
}
