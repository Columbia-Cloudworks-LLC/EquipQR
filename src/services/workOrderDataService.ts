/**
 * @deprecated This service is deprecated. Use WorkOrderService instead.
 * This file is maintained for backward compatibility only.
 * 
 * Migration guide:
 * - Replace `getWorkOrderByIdWithAssignee(orgId, woId)` with:
 *   `new WorkOrderService(orgId).getById(woId)`
 * - Replace `EnhancedWorkOrder` type with `WorkOrder` from '@/types/workOrder'
 */
import { logger } from '../utils/logger';
import { WorkOrderService } from './WorkOrderService';
import type { WorkOrder } from '@/types/workOrder';

/**
 * @deprecated Use WorkOrder from '@/types/workOrder' instead.
 */
export type EnhancedWorkOrder = WorkOrder;

/**
 * @deprecated Use WorkOrderService.getById() instead.
 * 
 * Fetches a work order by ID with assignee information.
 * This is a backward compatibility wrapper around WorkOrderService.getById()
 */
export const getWorkOrderByIdWithAssignee = async (
  organizationId: string, 
  workOrderId: string
): Promise<EnhancedWorkOrder | null> => {
  try {
    const service = new WorkOrderService(organizationId);
    const response = await service.getById(workOrderId);

    if (!response.success || !response.data) {
      logger.error('Error fetching work order with assignee:', response.error);
      return null;
    }

    return response.data;
  } catch (error) {
    logger.error('Error in getWorkOrderByIdWithAssignee:', error);
    return null;
  }
};
