import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { quickBooks } from '@/lib/queryKeys/integrations';
import { invalidateWorkOrderCaches } from '@/features/work-orders/utils/invalidateWorkOrderQueries';

/**
 * Persists the "Historical Only / Do Not Sync" QuickBooks flag for one work order.
 * Scoped by organization so a stale id can never touch another tenant's row.
 */
export async function setWorkOrderQuickBooksSyncExcluded(
  organizationId: string,
  workOrderId: string,
  excluded: boolean,
): Promise<void> {
  const { error } = await supabase
    .from('work_orders')
    .update({ quickbooks_sync_excluded: excluded })
    .eq('id', workOrderId)
    .eq('organization_id', organizationId);

  if (error) {
    throw error;
  }
}

/**
 * Whether a work order is flagged "Historical Only / Do Not Sync" for QuickBooks,
 * plus a mutation to flip it. Every QuickBooks export control reads this so
 * already-billed paper records cannot be invoiced twice.
 */
export function useWorkOrderQuickBooksSyncExclusion(workOrderId: string, enabled = true) {
  const { currentOrganization } = useOrganization();
  const queryClient = useQueryClient();
  const organizationId = currentOrganization?.id;
  const queryKey = quickBooks.syncExclusion(organizationId ?? '', workOrderId);

  const { data: syncExcluded = false, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!organizationId) {
        throw new Error('Organization is required for QuickBooks sync status');
      }
      const { data, error } = await supabase
        .from('work_orders')
        .select('quickbooks_sync_excluded')
        .eq('id', workOrderId)
        .eq('organization_id', organizationId)
        .maybeSingle();
      if (error) {
        throw error;
      }
      return data?.quickbooks_sync_excluded === true;
    },
    enabled: enabled && !!organizationId && !!workOrderId,
    staleTime: 60 * 1000,
  });

  const mutation = useMutation({
    mutationFn: async (excluded: boolean) => {
      if (!organizationId) {
        throw new Error('No organization selected');
      }
      await setWorkOrderQuickBooksSyncExcluded(organizationId, workOrderId, excluded);
      return excluded;
    },
    onSuccess: (excluded) => {
      queryClient.setQueryData(queryKey, excluded);
      if (organizationId) {
        invalidateWorkOrderCaches(queryClient, organizationId, workOrderId);
      }
      toast.success(
        excluded
          ? 'Marked Historical Only. This work order will not sync to QuickBooks.'
          : 'Ready to sync. This work order can now be billed in QuickBooks.',
      );
    },
    onError: () => {
      toast.error('Could not update the QuickBooks sync setting');
    },
  });

  return {
    syncExcluded,
    isLoading,
    setSyncExcluded: mutation.mutate,
    isUpdating: mutation.isPending,
  };
}
