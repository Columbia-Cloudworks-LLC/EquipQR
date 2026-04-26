import { supabase } from '@/integrations/supabase/client';
import { getAuthClaims } from '@/lib/authClaims';
import { logger } from '@/utils/logger';

export interface WorkOrderOrganizationInfo {
  workOrderId: string;
  organizationId: string;
  organizationName: string;
  userHasAccess: boolean;
  userRole?: string;
}

export const getWorkOrderOrganization = async (
  workOrderId: string
): Promise<WorkOrderOrganizationInfo | null> => {
  try {
    const claims = await getAuthClaims();
    if (!claims) {
      return null;
    }

    const { data: workOrder, error: woError } = await supabase
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

    if (woError || !workOrder) {
      logger.error('Error fetching work order for QR redirect:', woError);
      return null;
    }

    const organization = workOrder.organizations as { id: string; name: string } | null;
    if (!organization) {
      return null;
    }

    const { data: membership, error: membershipError } = await supabase
      .from('organization_members')
      .select('role, status')
      .eq('organization_id', organization.id)
      .eq('user_id', claims.sub)
      .eq('status', 'active')
      .single();

    const userHasAccess = !membershipError && !!membership;

    return {
      workOrderId: workOrder.id,
      organizationId: organization.id,
      organizationName: organization.name,
      userHasAccess,
      userRole: membership?.role,
    };
  } catch (error) {
    logger.error('Error in getWorkOrderOrganization:', error);
    return null;
  }
};
