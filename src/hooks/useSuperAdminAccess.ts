import { useMemo } from 'react';
import { useSimpleOrganization } from './useSimpleOrganization';

interface SuperAdminAccess {
  isSuperAdmin: boolean;
  isLoading: boolean;
  superAdminOrgId: string | null;
}

/**
 * Hook to check if the current user has super admin access
 * Super admin is defined as being an owner or admin in the organization
 * specified by VITE_SUPER_ADMIN_ORG_ID environment variable
 */
export function useSuperAdminAccess(): SuperAdminAccess {
  const { currentOrganization, isLoading } = useSimpleOrganization();
  
  const superAdminOrgId = import.meta.env.VITE_SUPER_ADMIN_ORG_ID || null;
  
  const isSuperAdmin = useMemo(() => {
    if (!superAdminOrgId || !currentOrganization) {
      return false;
    }
    
    // Check if current org matches super admin org
    const isCorrectOrg = currentOrganization.id === superAdminOrgId;
    
    // Check if user has admin privileges in this org
    const hasAdminRole = ['owner', 'admin'].includes(currentOrganization.userRole || '');
    
    return isCorrectOrg && hasAdminRole;
  }, [currentOrganization, superAdminOrgId]);
  
  return {
    isSuperAdmin,
    isLoading,
    superAdminOrgId,
  };
}

