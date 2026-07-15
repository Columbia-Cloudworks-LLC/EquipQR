import { logger } from '@/utils/logger';
import { supabase } from '@/integrations/supabase/client';

export type WorkOrderStatusHistoryRow = {
  id: string;
  work_order_id: string;
  old_status: string | null;
  new_status: string;
  changed_by: string;
  changed_at: string;
  reason: string | null;
  metadata: Record<string, unknown> | null;
  is_historical_creation: boolean | null;
  profiles?: {
    name?: string;
    email?: string;
  } | null;
};

export async function fetchWorkOrderStatusHistory(
  workOrderId: string,
  organizationId: string,
) {
  try {
    const { data, error } = await supabase
      .from('work_order_status_history')
      .select(`
        id,
        work_order_id,
        old_status,
        new_status,
        changed_by,
        changed_at,
        reason,
        metadata,
        is_historical_creation,
        profiles!changed_by (
          name,
          email
        ),
        work_orders!inner (
          organization_id
        )
      `)
      .eq('work_order_id', workOrderId)
      .eq('work_orders.organization_id', organizationId)
      .order('changed_at', { ascending: false });

    if (error) throw error;
    return { data: data as WorkOrderStatusHistoryRow[] | null, error: null };
  } catch (error) {
    logger.error('Error fetching work order status history:', error);
    return { data: null, error };
  }
}
