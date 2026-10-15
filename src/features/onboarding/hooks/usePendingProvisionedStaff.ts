import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

export type PendingProvisionedStaff = Pick<
  Tables<'organization_provisioned_members'>,
  'id' | 'email' | 'role' | 'created_at' | 'last_claim_error'
>;

const pendingStaffKey = (organizationId: string | undefined) =>
  ['provisioned-staff', 'pending', organizationId] as const;

/**
 * Done-For-You staged people who have not signed in yet (issue #1648). RLS
 * returns rows only to the organization's owners and admins.
 */
export function usePendingProvisionedStaff(organizationId: string | undefined) {
  return useQuery({
    queryKey: pendingStaffKey(organizationId),
    queryFn: async (): Promise<PendingProvisionedStaff[]> => {
      const { data, error } = await supabase
        .from('organization_provisioned_members')
        .select('id, email, role, created_at, last_claim_error')
        .eq('organization_id', organizationId ?? '')
        .eq('status', 'pending')
        .order('created_at');
      if (error) throw error;
      return data ?? [];
    },
    enabled: Boolean(organizationId),
    staleTime: 60 * 1000,
  });
}

export function useRevokePendingProvisionedStaff(organizationId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (stagedMemberId: string) => {
      const { error } = await supabase.rpc('revoke_provisioned_member', {
        p_staged_member_id: stagedMemberId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Removed. That email can no longer join this organization automatically.');
      void queryClient.invalidateQueries({ queryKey: pendingStaffKey(organizationId) });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Could not remove that person');
    },
  });
}
