import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

export type ProvisionedYardClaim = Pick<
  Tables<'organization_provisioned_members'>,
  'id' | 'role' | 'claimed_at'
>;

/**
 * The current user's claimed Done-For-You staged membership in an organization
 * (issue #1648), or null when they joined some other way. RLS limits the rows to
 * the user's own claims and the org admins' roster view, so the user filter is
 * required here.
 */
export function useProvisionedYardClaim(organizationId: string | undefined, userId: string | undefined) {
  return useQuery({
    queryKey: ['provisioned-yard-claim', organizationId, userId],
    queryFn: async (): Promise<ProvisionedYardClaim | null> => {
      const { data, error } = await supabase
        .from('organization_provisioned_members')
        .select('id, role, claimed_at')
        .eq('organization_id', organizationId ?? '')
        .eq('claimed_user_id', userId ?? '')
        .eq('status', 'claimed')
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: Boolean(organizationId && userId),
    staleTime: 30 * 60 * 1000,
    retry: false,
  });
}
