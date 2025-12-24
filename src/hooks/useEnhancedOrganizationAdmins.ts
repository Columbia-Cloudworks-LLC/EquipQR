import { useEffect } from 'react';
import { useOrganizationAdmins, type OrganizationAdmin } from '@/features/organization/hooks/useOrganizationAdmins';
import { useBackgroundSync } from './useCacheInvalidation';
import { performanceMonitor } from '@/utils/performanceMonitoring';

// Enhanced hook with background sync for organization admins
export const useEnhancedOrganizationAdmins = (organizationId?: string) => {
  const query = useOrganizationAdmins(organizationId || '');
  const { subscribeToOrganization } = useBackgroundSync();
  
  useEffect(() => {
    if (organizationId) {
      subscribeToOrganization(organizationId);
      performanceMonitor.recordMetric('enhanced-query-admins-init', 1);
    }
  }, [organizationId, subscribeToOrganization]);

  return query;
};

// Re-export types for convenience
export type { OrganizationAdmin };