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
 * Returns the trusted organization ID from caller context.
 */
export async function resolveWorkOrderOrganizationId(
  _workOrderId: string,
  organizationId?: string,
): Promise<string> {
  if (!organizationId) {
    throw new Error('Organization ID required');
  }

  return organizationId;
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
