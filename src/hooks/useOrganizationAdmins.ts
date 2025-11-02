
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { logger } from '@/utils/logger';

export interface OrganizationAdmin {
  id: string;
  name: string;
  email: string;
  role: string;
}

export const useOrganizationAdmins = (organizationId: string) => {
  // Note: For real-time updates, use useEnhancedOrganizationAdmins instead
  
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
