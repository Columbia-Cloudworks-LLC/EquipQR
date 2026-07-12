import { supabase } from '@/integrations/supabase/client';

export async function fetchWorkOrderInOrganization(
  organizationId: string,
  workOrderId: string,
): Promise<{ id: string } | null> {
  const { data: workOrder, error: woError } = await supabase
    .from('work_orders')
    .select('id')
    .eq('id', workOrderId)
    .eq('organization_id', organizationId)
    .single();

  if (woError || !workOrder) {
    return null;
  }
  return workOrder;
}
