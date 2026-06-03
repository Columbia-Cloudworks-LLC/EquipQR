
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { showErrorToast } from '@/utils/errorHandling';
import { logger } from '@/utils/logger';
import { organizations as organizationQueryKeys } from '@/lib/queryKeys';
import { mapOrganizationRowsToSessionOrganizations } from '@/utils/mapOrganizationToSession';
import type { SessionOrganization } from '@/types/session';

export type Organization = SessionOrganization;

export const useUserOrganizations = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: organizationQueryKeys.byUser(user?.id ?? ''),
    queryFn: async (): Promise<Organization[]> => {
      if (!user) return [];

      // Get user's organization memberships
      const { data: membershipData, error: membershipError } = await supabase
        .from('organization_members')
        .select('organization_id, role, status')
        .eq('user_id', user.id)
        .eq('status', 'active');

      if (membershipError) {
        logger.error('Error fetching memberships:', membershipError);
        showErrorToast(membershipError, 'Loading Organization Memberships');
        throw membershipError;
      }

      if (!membershipData || membershipData.length === 0) {
        return [];
      }

      // Get organization details
      const orgIds = membershipData.map(m => m.organization_id);
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .in('id', orgIds);

      if (orgError) {
        logger.error('Error fetching organizations:', orgError);
        showErrorToast(orgError, 'Loading Organizations');
        throw orgError;
      }

      return mapOrganizationRowsToSessionOrganizations(orgData || [], membershipData);
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useCurrentOrganization = (organizationId?: string) => {
  const { data: organizations } = useUserOrganizations();
  
  if (!organizationId || !organizations) return null;
  
  return organizations.find(org => org.id === organizationId) || null;
};
