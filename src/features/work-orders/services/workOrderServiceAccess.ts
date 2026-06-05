import { supabase } from '@/integrations/supabase/client';
import { getAuthClaims } from '@/lib/authClaims';

export async function requireAuthenticatedClaims(): Promise<
  { sub: string } | { error: Error }
> {
  const claims = await getAuthClaims();
  if (!claims) {
    return { error: new Error('User not authenticated') };
  }
  return claims;
}

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
