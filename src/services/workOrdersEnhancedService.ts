/**
 * @deprecated This service is deprecated. Use WorkOrderService instead.
 * This file is maintained for backward compatibility only.
 * 
 * Migration guide:
 * - Replace `getEnhancedWorkOrdersByOrganization(orgId)` with:
 *   `new WorkOrderService(orgId).getAll()`
 * - Replace `EnhancedWorkOrder` type with `WorkOrder` from '@/types/workOrder'
 */
import { logger } from '../utils/logger';
import { WorkOrderService } from './WorkOrderService';
import type { WorkOrder } from '@/types/workOrder';

/**
 * @deprecated Use WorkOrder from '@/types/workOrder' instead.
 * This interface provides backward compatibility with existing code.
 */
export type EnhancedWorkOrder = WorkOrder & {
  // Backward compatibility aliases (camelCase versions)
  equipmentId?: string;
  organizationId?: string;
  assigneeId?: string;
  teamId?: string;
  createdDate?: string;
  dueDate?: string;
  estimatedHours?: number;
  completedDate?: string;
  // Assignment object for mobile card compatibility
  assignedTo?: { id: string; name: string } | null;
};

/**
 * Converts WorkOrder to EnhancedWorkOrder for backward compatibility
 */
function toEnhancedWorkOrder(wo: WorkOrder): EnhancedWorkOrder {
  return {
    ...wo,
    // Add camelCase aliases for backward compatibility
    equipmentId: wo.equipment_id,
    organizationId: wo.organization_id,
    assigneeId: wo.assignee_id ?? undefined,
    teamId: wo.team_id ?? undefined,
    createdDate: wo.created_date,
    dueDate: wo.due_date ?? undefined,
    estimatedHours: wo.estimated_hours ?? undefined,
    completedDate: wo.completed_date ?? undefined,
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
export const getEnhancedWorkOrdersByOrganization = async (
  organizationId: string
): Promise<EnhancedWorkOrder[]> => {
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
