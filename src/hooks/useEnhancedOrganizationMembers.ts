/**
 * Enhanced Organization Members Hooks
 * 
 * These hooks wrap the canonical organization members hooks with background sync.
 * They are provided for backward compatibility - prefer using the canonical hooks directly.
 */

import { useEffect } from 'react';
import { 
  useOrganizationMembersQuery, 
  useOrganizationMemberStats, 
  useUpdateMemberRole, 
  useRemoveMember 
} from './useOrganizationMembers';
import { useBackgroundSync } from './useCacheInvalidation';
import { performanceMonitor } from '@/utils/performanceMonitoring';

/**
 * Hook for fetching organization members with background sync
 */
export const useEnhancedOrganizationMembers = (organizationId?: string) => {
  const query = useOrganizationMembersQuery(organizationId || '');
  const { subscribeToOrganization } = useBackgroundSync();
  
  useEffect(() => {
    if (organizationId) {
      subscribeToOrganization(organizationId);
      performanceMonitor.recordMetric('enhanced-query-members-init', 1);
    }
  }, [organizationId, subscribeToOrganization]);

  return query;
};

/**
 * Hook for organization member stats with background sync
 */
export const useEnhancedOrganizationMemberStats = (organizationId?: string) => {
  const query = useOrganizationMemberStats(organizationId || '');
  const { subscribeToOrganization } = useBackgroundSync();
  
  useEffect(() => {
    if (organizationId) {
      subscribeToOrganization(organizationId);
      performanceMonitor.recordMetric('enhanced-query-member-stats-init', 1);
    }
  }, [organizationId, subscribeToOrganization]);

  return query;
};

/**
 * @deprecated Use useUpdateMemberRole from useOrganizationMembers instead
 */
export const useEnhancedUpdateMemberRole = (organizationId: string) => {
  return useUpdateMemberRole(organizationId);
};

/**
 * @deprecated Use useRemoveMember from useOrganizationMembers instead
 */
export const useEnhancedRemoveMember = (organizationId: string) => {
  return useRemoveMember(organizationId);
};

// Re-export types for convenience
export type { RealOrganizationMember } from './useOrganizationMembers';