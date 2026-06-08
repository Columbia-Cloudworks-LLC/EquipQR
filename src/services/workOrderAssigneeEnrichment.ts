import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

type WorkOrderRow = Tables<'work_orders'>;

export async function enrichWorkOrderWithAssigneeName<T extends WorkOrderRow>(
  workOrder: T,
): Promise<T & { assigneeName?: string; teamName?: undefined }> {
  const profilesResult = workOrder.assignee_id
    ? await supabase.from('profiles').select('id, name').eq('id', workOrder.assignee_id).single()
    : { data: null, error: null };

  return {
    ...workOrder,
    assigneeName: profilesResult.data?.name,
    teamName: undefined,
  };
}
