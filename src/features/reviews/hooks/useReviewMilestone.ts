import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  REVIEW_MILESTONE_COMPLETED_WORK_ORDERS,
  hasReachedReviewMilestone,
} from '@/features/reviews/lib/googleReviewPrompt';

async function fetchReviewMilestone(organizationId: string): Promise<boolean> {
  const { count: completedWorkOrders, error: workOrderError } = await supabase
    .from('work_orders')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .eq('status', 'completed');
  if (workOrderError) throw workOrderError;

  // Skip the second count when the first milestone is already met.
  if ((completedWorkOrders ?? 0) >= REVIEW_MILESTONE_COMPLETED_WORK_ORDERS) return true;

  // RLS limits export logs to QuickBooks managers; others simply count zero.
  const { count: exportedInvoices, error: exportError } = await supabase
    .from('quickbooks_export_logs')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .eq('status', 'success');
  if (exportError) throw exportError;

  return hasReachedReviewMilestone({
    completedWorkOrders: completedWorkOrders ?? 0,
    exportedInvoices: exportedInvoices ?? 0,
  });
}

/** Whether the organization has reached the Google review prompt milestone. */
export function useReviewMilestone(organizationId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['google-review-milestone', organizationId],
    queryFn: () => fetchReviewMilestone(organizationId ?? ''),
    enabled: enabled && Boolean(organizationId),
    staleTime: 30 * 60 * 1000,
    retry: false,
  });
}
