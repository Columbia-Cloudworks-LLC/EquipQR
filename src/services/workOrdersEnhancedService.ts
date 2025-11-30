/**
 * @deprecated This service is deprecated. Use WorkOrderService instead.
 * This file is maintained for backward compatibility only.
 * 
 * Migration guide:
 * - Replace `getEnhancedWorkOrdersByOrganization` with `new WorkOrderService(orgId).getAll()`
 * - Replace `EnhancedWorkOrder` type with `WorkOrder` from WorkOrderService
 */
import { logger } from '../utils/logger';
import { WorkOrderService, WorkOrder } from './WorkOrderService';

/**
 * @deprecated Use WorkOrder from WorkOrderService instead.
 * This interface provides backward compatibility with camelCase properties.
 */
export interface EnhancedWorkOrder {
  id: string;
  title: string;
  description: string;
  equipmentId: string;
  organizationId: string;
  priority: 'low' | 'medium' | 'high';
  status: 'submitted' | 'accepted' | 'assigned' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';
  assigneeId?: string;
  assigneeName?: string;
  teamId?: string;
  teamName?: string;
  createdDate: string;
  created_date: string;
  dueDate?: string;
  due_date?: string;
  estimatedHours?: number;
  estimated_hours?: number;
  completedDate?: string;
  completed_date?: string;
  equipmentName?: string;
  equipmentTeamId?: string;
  equipmentTeamName?: string;
  createdByName?: string;
  // Additional fields from WorkOrder for compatibility
  equipment_id?: string;
  organization_id?: string;
  assignee_id?: string;
  team_id?: string;
  has_pm?: boolean;
  pm_required?: boolean;
  is_historical?: boolean;
  // Assignment object for mobile card compatibility
  assignedTo?: { id: string; name: string } | null;
}

/**
 * Converts WorkOrder (snake_case) to EnhancedWorkOrder (camelCase) for backward compatibility
 */
function toEnhancedWorkOrder(wo: WorkOrder): EnhancedWorkOrder {
  return {
    id: wo.id,
    title: wo.title,
    description: wo.description,
    equipmentId: wo.equipment_id,
    equipment_id: wo.equipment_id,
    organizationId: wo.organization_id,
    organization_id: wo.organization_id,
    priority: wo.priority,
    status: wo.status,
    assigneeId: wo.assignee_id ?? undefined,
    assignee_id: wo.assignee_id ?? undefined,
    assigneeName: wo.assigneeName ?? wo.assignee_name ?? undefined,
    teamId: wo.team_id ?? undefined,
    team_id: wo.team_id ?? undefined,
    teamName: wo.teamName ?? wo.equipmentTeamName ?? undefined,
    createdDate: wo.created_date,
    created_date: wo.created_date,
    dueDate: wo.due_date ?? undefined,
    due_date: wo.due_date ?? undefined,
    estimatedHours: wo.estimated_hours ?? undefined,
    estimated_hours: wo.estimated_hours ?? undefined,
    completedDate: wo.completed_date ?? undefined,
    completed_date: wo.completed_date ?? undefined,
    equipmentName: wo.equipmentName,
    equipmentTeamId: wo.equipmentTeamId,
    equipmentTeamName: wo.equipmentTeamName,
    createdByName: wo.createdByName ?? wo.created_by_name ?? undefined,
    has_pm: wo.has_pm,
    pm_required: wo.pm_required,
    is_historical: wo.is_historical,
    // Construct assignedTo object for mobile card compatibility
    assignedTo: wo.assignee_id ? { 
      id: wo.assignee_id, 
      name: wo.assigneeName ?? wo.assignee_name ?? 'Unknown' 
    } : null
  };
}

/**
 * @deprecated Use WorkOrderService.getAll() instead.
 * This function is maintained for backward compatibility.
 */
export const getEnhancedWorkOrdersByOrganization = async (organizationId: string): Promise<EnhancedWorkOrder[]> => {
  try {
    const service = new WorkOrderService(organizationId);
    const response = await service.getAll();
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch work orders');
    }
    
    return (response.data || []).map(toEnhancedWorkOrder);
  } catch (error) {
    logger.error('Error fetching enhanced work orders:', error);
    throw error;
  }
};
