/**
 * Work Order Types - Consolidated type definitions
 * 
 * This file serves as the single source of truth for work order types.
 * Import from here instead of defining types locally in components/hooks.
 */

// ============================================
// Core Status and Priority Types
// ============================================

export type WorkOrderStatus = 'submitted' | 'accepted' | 'assigned' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';
export type WorkOrderPriority = 'low' | 'medium' | 'high';

// ============================================
// Filter Types (UI Layer)
// ============================================

export interface WorkOrderFilters {
  searchQuery: string;
  statusFilter: string;
  assigneeFilter: string;
  teamFilter: string;
  priorityFilter: string;
  dueDateFilter: string;
}

// ============================================
// Work Order Data Types
// ============================================

/**
 * Normalized work order data for UI components
 * Uses camelCase for consistency with React conventions
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

/**
 * Work order data as returned from Supabase (snake_case)
 * Use this when working directly with database responses
 */
export interface WorkOrderRow {
  id: string;
  title: string;
  description: string;
  equipment_id: string;
  organization_id: string;
  priority: WorkOrderPriority;
  status: WorkOrderStatus;
  assignee_id: string | null;
  assignee_name: string | null;
  team_id: string | null;
  created_by: string;
  created_by_admin: string | null;
  created_by_name: string | null;
  created_date: string;
  due_date: string | null;
  estimated_hours: number | null;
  completed_date: string | null;
  acceptance_date: string | null;
  updated_at: string;
  is_historical: boolean;
  historical_start_date: string | null;
  historical_notes: string | null;
  has_pm: boolean;
  pm_required: boolean;
}

/**
 * Enhanced work order with computed fields from joins
 * Used in list views and detail pages
 */
export interface EnhancedWorkOrderData extends WorkOrderRow {
  // Computed fields from joins
  assigneeName?: string;
  teamName?: string;
  equipmentName?: string;
  equipmentTeamId?: string;
  equipmentTeamName?: string;
  createdByName?: string;
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
 * Converts database row format to UI data format
 */
export function toWorkOrderData(row: EnhancedWorkOrderData): WorkOrderData {
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