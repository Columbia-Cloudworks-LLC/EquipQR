
import { useOrganization as useOrganizationFromContext } from '@/contexts/OrganizationContext';

// Backward compatibility layer for existing organization hooks
// @deprecated Use useOrganization from '@/contexts/OrganizationContext' directly
export const useSupabaseOrganization = () => {
  const { currentOrganization, userOrganizations, switchOrganization, isLoading, error, refetch } = useOrganizationFromContext();

  return {
    currentOrganization,
    userOrganizations,
    switchOrganization,
    isLoading,
    error,
    refetch: refetch || (() => Promise.resolve()) // Use refetch from context if available
  };
};

// Re-export useOrganization from context for backward compatibility
// @deprecated Import directly from '@/contexts/OrganizationContext' instead
export { useOrganizationFromContext as useOrganization };
