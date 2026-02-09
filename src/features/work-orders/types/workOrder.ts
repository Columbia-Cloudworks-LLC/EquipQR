/**
 * Work Order Types - Consolidated type definitions
 * 
 * This file serves as the single source of truth for work order types.
 * Import from here instead of defining types locally in components/hooks.
 */

import { Tables } from '@/integrations/supabase/types';
import type { EffectiveLocation } from '@/utils/effectiveLocation';

// ============================================
// Core Status and Priority Types
// ============================================

export type WorkOrderStatus = 'submitted' | 'accepted' | 'assigned' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';
export type WorkOrderPriority = 'low' | 'medium' | 'high';

// ============================================
// Base Database Type
// ============================================

/**
 * Work order row as stored in the database (snake_case)
 * This is the raw Supabase table type.
 */
export type WorkOrderRow = Tables<'work_orders'>;

// ============================================
// Primary Work Order Type (Unified)
// ============================================

/**
 * WorkOrder - The primary unified type for work orders.
 * 
 * Extends the database row type with computed fields from joins.
 * Use this type throughout the application for work order data.
 * 
 * Base fields (snake_case from database):
 * - id, title, description, equipment_id, organization_id
 * - priority, status, assignee_id, assignee_name, team_id
 * - created_by, created_by_admin, created_by_name, created_date
 * - due_date, estimated_hours, completed_date, acceptance_date
 * - updated_at, is_historical, historical_start_date, historical_notes
 * - has_pm, pm_required
 * 
 * Computed fields (camelCase from joins):
 * - assigneeName, teamName, equipmentName
 * - equipmentTeamId, equipmentTeamName, createdByName
 */
export interface WorkOrder extends WorkOrderRow {
  // Computed fields from joins (camelCase for React conventions)
  assigneeName?: string;
  teamName?: string;
  equipmentName?: string;
  equipmentTeamId?: string;
  equipmentTeamName?: string;
  createdByName?: string;
  // Assignment object for component compatibility
  assignedTo?: { id: string; name: string } | null;
  // Resolved location from hierarchy (team override > manual assignment > last scan)
  effectiveLocation?: EffectiveLocation | null;
}

/**
 * @deprecated Use WorkOrder instead
 * Alias for backward compatibility with components using EnhancedWorkOrder
 */
export type EnhancedWorkOrder = WorkOrder;

/**
 * @deprecated Use WorkOrder instead
 * Alias for backward compatibility
 */
export type EnhancedWorkOrderData = WorkOrder;

// ============================================
// Filter Types (Service Layer)
// ============================================

/**
 * Filters for querying work orders via WorkOrderService
 */
export interface WorkOrderServiceFilters {
  status?: WorkOrder['status'] | 'all';
  priority?: WorkOrder['priority'] | 'all';
  assigneeId?: string | 'unassigned' | 'all';
  teamId?: string | 'all';
  equipmentId?: string;
  dueDateFilter?: 'overdue' | 'today' | 'this_week';
  search?: string;
  // Team-based access control
  userTeamIds?: string[];
  isOrgAdmin?: boolean;
}

// ============================================
// Filter Types (UI Layer)
// ============================================

/**
 * UI filter state for work order list components
 */
export interface WorkOrderFilters {
  searchQuery: string;
  statusFilter: string;
  assigneeFilter: string;
  teamFilter: string;
  priorityFilter: string;
  dueDateFilter: string;
}

// ============================================
// Work Order Data Types (UI-Normalized)
// ============================================

/**
 * Normalized work order data for UI components
 * Uses camelCase for consistency with React conventions
 * 
 * Use this when you need a camelCase-only representation,
 * otherwise prefer using WorkOrder directly.
 */
export interface WorkOrderData {
  id: string;
  title: string;
  description: string;
  equipmentId: string;
  organizationId: string;
  priority: WorkOrderPriority;
  status: WorkOrderStatus;
  assigneeId?: string;
  assigneeName?: string;
  teamId?: string;
  teamName?: string;
  createdDate: string;
  /** @deprecated Use createdDate instead */
  created_date: string;
  dueDate?: string;
  estimatedHours?: number;
  completedDate?: string;
  equipmentName?: string;
  createdByName?: string;
  equipmentTeamId?: string;
  equipmentTeamName?: string;
  hasPM?: boolean;
  pmRequired?: boolean;
  isHistorical?: boolean;
}

// ============================================
// Create/Update Data Types
// ============================================

export interface WorkOrderCreateData {
  title: string;
  description: string;
  equipment_id: string;
  priority: WorkOrder['priority'];
  status?: WorkOrder['status'];
  assignee_id?: string;
  team_id?: string;
  due_date?: string;
  estimated_hours?: number;
  created_by: string;
  is_historical?: boolean;
  historical_start_date?: string;
  historical_notes?: string;
  has_pm?: boolean;
}

export interface WorkOrderUpdateData {
  title?: string;
  description?: string;
  equipment_id?: string;
  priority?: WorkOrder['priority'];
  status?: WorkOrder['status'];
  assignee_id?: string | null;
  team_id?: string | null;
  due_date?: string | null;
  estimated_hours?: number | null;
  completed_date?: string | null;
}

// ============================================
// UI State Types
// ============================================

export interface WorkOrderAcceptanceModalState {
  open: boolean;
  workOrder: WorkOrderData | null;
}

// ============================================
// Note Types
// ============================================

export interface WorkOrderNote {
  id: string;
  work_order_id: string;
  author_id: string;
  content: string;
  hours_worked: number;
  is_private: boolean;
  created_at: string;
  updated_at: string;
  author_name?: string;
  images?: WorkOrderImage[];
}

export interface WorkOrderNoteCreateData {
  content: string;
  hours_worked?: number;
  is_private?: boolean;
}

// ============================================
// Image Types
// ============================================

export interface WorkOrderImage {
  id: string;
  work_order_id: string;
  note_id?: string | null;
  file_name: string;
  file_url: string;
  file_size?: number | null;
  mime_type?: string | null;
  description?: string | null;
  uploaded_by: string;
  created_at: string;
  uploaded_by_name?: string;
}

// ============================================
// Utility Type Converters
// ============================================

/**
 * Converts WorkOrder (database format) to WorkOrderData (UI format)
 */
export function toWorkOrderData(row: WorkOrder): WorkOrderData {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    equipmentId: row.equipment_id,
    organizationId: row.organization_id,
    priority: row.priority,
    status: row.status,
    assigneeId: row.assignee_id ?? undefined,
    assigneeName: row.assigneeName ?? row.assignee_name ?? undefined,
    teamId: row.team_id ?? undefined,
    teamName: row.teamName ?? undefined,
    createdDate: row.created_date,
    created_date: row.created_date,
    dueDate: row.due_date ?? undefined,
    estimatedHours: row.estimated_hours ?? undefined,
    completedDate: row.completed_date ?? undefined,
    equipmentName: row.equipmentName ?? undefined,
    createdByName: row.createdByName ?? row.created_by_name ?? undefined,
    equipmentTeamId: row.equipmentTeamId ?? undefined,
    equipmentTeamName: row.equipmentTeamName ?? undefined,
    hasPM: row.has_pm,
    pmRequired: row.pm_required,
    isHistorical: row.is_historical
  };
}

/**
 * Converts WorkOrderData (UI format) back to partial WorkOrder format
 * Useful for update operations
 */
export function fromWorkOrderData(data: Partial<WorkOrderData>): Partial<WorkOrderUpdateData> {
  const result: Partial<WorkOrderUpdateData> = {};
  
  if (data.title !== undefined) result.title = data.title;
  if (data.description !== undefined) result.description = data.description;
  if (data.equipmentId !== undefined) result.equipment_id = data.equipmentId;
  if (data.priority !== undefined) result.priority = data.priority;
  if (data.status !== undefined) result.status = data.status;
  if (data.assigneeId !== undefined) result.assignee_id = data.assigneeId || null;
  if (data.teamId !== undefined) result.team_id = data.teamId || null;
  if (data.dueDate !== undefined) result.due_date = data.dueDate || null;
  if (data.estimatedHours !== undefined) result.estimated_hours = data.estimatedHours || null;
  if (data.completedDate !== undefined) result.completed_date = data.completedDate || null;
  
  return result;
}


