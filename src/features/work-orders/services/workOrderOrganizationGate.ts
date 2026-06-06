import { logger } from '@/utils/logger';
import { fetchWorkOrderInOrganization } from '@/features/work-orders/services/workOrderServiceAccess';

/** Failsafe org scoping before work-order child queries; returns false when WO is out of scope. */
export async function verifyWorkOrderOrganizationScope(
  workOrderId: string,
  organizationId: string,
): Promise<boolean> {
  const workOrder = await fetchWorkOrderInOrganization(organizationId, workOrderId);
  if (!workOrder) {
    logger.warn('Work order not found or organization mismatch', {
      workOrderId,
      organizationId,
    });
    return false;
  }
  return true;
}
