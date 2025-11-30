/**
 * Organization Admins Hook
 * 
 * This hook fetches organization admins (owners and admins).
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { logger } from '@/utils/logger';
import type { OrganizationAdmin } from '@/types/organization';

// Re-export the type for backward compatibility
export type { OrganizationAdmin };

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
        .select<(Database['public']['Tables']['organization_members']['Row'] & {
          profiles: Pick<Database['public']['Tables']['profiles']['Row'], 'id' | 'name' | 'email'> | null;
        })>(`
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

      return (data || []).map((member) => ({
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
