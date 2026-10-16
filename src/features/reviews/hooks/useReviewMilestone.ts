import { useQuery, type QueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  REVIEW_MILESTONE_COMPLETED_WORK_ORDERS,
  hasReachedReviewMilestone,
} from '@/features/reviews/lib/googleReviewPrompt';

export const REVIEW_MILESTONE_QUERY_KEY_ROOT = 'google-review-milestone' as const;

export function reviewMilestoneQueryKey(organizationId: string | undefined) {
  return [REVIEW_MILESTONE_QUERY_KEY_ROOT, organizationId] as const;
}

export function invalidateReviewMilestone(
  queryClient: QueryClient,
  organizationId?: string,
): Promise<void> {
  return queryClient.invalidateQueries({
    queryKey: organizationId
      ? reviewMilestoneQueryKey(organizationId)
      : [REVIEW_MILESTONE_QUERY_KEY_ROOT],
  });
}

async function fetchReviewMilestone(organizationId: string): Promise<boolean> {
  const { count: completedWorkOrders, error: workOrderError } = await supabase
    .from('work_orders')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .eq('status', 'completed');
  if (workOrderError) throw workOrderError;

  // Skip the second count when the first milestone is already met.
  if ((completedWorkOrders ?? 0) >= REVIEW_MILESTONE_COMPLETED_WORK_ORDERS) return true;

  // RLS limits export logs to QuickBooks managers (owners, and admins with the
  // QuickBooks permission). Other admins count zero and qualify through work orders.
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
    queryKey: reviewMilestoneQueryKey(organizationId),
    queryFn: () => fetchReviewMilestone(organizationId ?? ''),
    enabled: enabled && Boolean(organizationId),
    staleTime: 30 * 60 * 1000,
    retry: false,
  });
}
