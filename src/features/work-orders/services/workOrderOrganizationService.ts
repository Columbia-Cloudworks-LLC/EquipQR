import { supabase } from '@/integrations/supabase/client';
import { getAuthClaims } from '@/lib/authClaims';
import { logger } from '@/utils/logger';
import { resolveOrganizationAccess } from '@/features/organization/services/organizationMembershipAccess';

export interface WorkOrderOrganizationInfo {
  workOrderId: string;
  organizationId: string;
  organizationName: string;
  userHasAccess: boolean;
  userRole?: string;
}

/**
 * Returns the provided organization ID or loads it from the work order row.
 */
export async function resolveWorkOrderOrganizationId(
  workOrderId: string,
  organizationId?: string,
): Promise<string> {
  if (organizationId) {
    return organizationId;
  }

  const { data: workOrder } = await supabase
    .from('work_orders')
    .select('organization_id')
    .eq('id', workOrderId)
    .single();

  if (!workOrder) {
    throw new Error('Work order not found');
  }

  return workOrder.organization_id;
}

export async function getWorkOrderOrganization(
  workOrderId: string,
): Promise<WorkOrderOrganizationInfo | null> {
  try {
    const claims = await getAuthClaims();
    if (!claims) {
      return null;
    }

    const { data: workOrder, error: workOrderError } = await supabase
      .from('work_orders')
      .select(`
        id,
        organization_id,
        organizations!inner (
          id,
          name
        )
      `)
      .eq('id', workOrderId)
      .single();

    if (workOrderError || !workOrder) {
      logger.error('Error fetching work order organization:', workOrderError);
      return null;
    }

    const access = await resolveOrganizationAccess(workOrder, claims.sub);
    if (!access) {
      return null;
    }

    return {
      workOrderId: workOrder.id,
      ...access,
    };
  } catch (error) {
    logger.error('Error in getWorkOrderOrganization:', error);
    return null;
  }
}
