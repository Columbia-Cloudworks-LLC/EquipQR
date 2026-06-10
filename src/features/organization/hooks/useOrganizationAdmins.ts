/**
 * Organization Admins Hook
 * 
 * This hook fetches organization admins (owners and admins).
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import type { OrganizationAdmin } from '@/features/organization/types/organization';

type OrganizationAdminMemberRow = {
  user_id: string;
  role: string;
  profiles: {
    id: string;
    name: string;
    email: string;
  } | null;
};

/**
 * Hook for fetching organization admins (owners and admins)
 */
export const useOrganizationAdmins = (organizationId: string) => {
  return useQuery({
    queryKey: ['organization-admins', organizationId],
    queryFn: async (): Promise<OrganizationAdmin[]> => {
      if (!organizationId) return [];

      const { data, error } = await supabase
        .from('organization_members')
        .select(`
          user_id,
          role,
          profiles:user_id (
            id,
            name,
            email
          )
        `)
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .in('role', ['owner', 'admin']);

      if (error) {
        logger.error('Error fetching organization admins', error);
        return [];
      }

      return ((data || []) as OrganizationAdminMemberRow[]).map((member) => ({
        id: member.user_id,
        name: member.profiles?.name ?? 'Unknown',
        email: member.profiles?.email ?? '',
        role: member.role
      }));
    },
    enabled: !!organizationId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};
