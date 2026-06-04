import { supabase } from '@/integrations/supabase/client';

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
