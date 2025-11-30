/**
 * Enhanced Query Hooks - Hooks with background sync and smart invalidation
 * 
 * These hooks wrap the canonical query hooks with background sync capabilities.
 * They are provided for backward compatibility - prefer using canonical hooks directly.
 */

import { useEffect } from 'react';
import { useTeams, useCachedEquipment, useDashboard } from './useQueries';
import { useWorkOrders } from './useWorkOrders';
import { useBackgroundSync, useCacheInvalidation } from './useCacheInvalidation';
import { performanceMonitor } from '@/utils/performanceMonitoring';

/**
 * Hook for teams with background sync
 */
export const useEnhancedOptimizedTeams = (organizationId?: string) => {
  const query = useTeams(organizationId);
  const { subscribeToOrganization } = useBackgroundSync();
  
  useEffect(() => {
    if (organizationId) {
      subscribeToOrganization(organizationId);
      performanceMonitor.recordMetric('enhanced-query-teams-init', 1);
    }
  }, [organizationId, subscribeToOrganization]);

  return query;
};

export const useEnhancedOptimizedWorkOrders = (organizationId?: string) => {
  const query = useWorkOrders(organizationId, {
    staleTime: 2 * 60 * 1000, // 2 minutes - consistent with previous optimized behavior
    refetchOnWindowFocus: false, // Avoid excessive refetching
  });
  const { subscribeToOrganization } = useBackgroundSync();
  
  useEffect(() => {
    if (organizationId) {
      subscribeToOrganization(organizationId);
      performanceMonitor.recordMetric('enhanced-query-workorders-init', 1);
    }
  }, [organizationId, subscribeToOrganization]);

  return query;
};

// @deprecated Use useEquipment from '@/components/equipment/hooks/useEquipment' with enableBackgroundSync option instead. Will be removed in Phase 2.
export const useEnhancedOptimizedEquipment = (organizationId?: string) => {
  const query = useCachedEquipment(organizationId);
  const { subscribeToOrganization } = useBackgroundSync();
  
  useEffect(() => {
    if (organizationId) {
      subscribeToOrganization(organizationId);
      performanceMonitor.recordMetric('enhanced-query-equipment-init', 1);
    }
  }, [organizationId, subscribeToOrganization]);

  return query;
};

export const useEnhancedOptimizedDashboard = (organizationId?: string) => {
  const query = useDashboard(organizationId);
  const { subscribeToOrganization, startPeriodicSync } = useBackgroundSync();
  
  useEffect(() => {
    if (organizationId) {
      subscribeToOrganization(organizationId);
      startPeriodicSync(organizationId, 2 * 60 * 1000); // Sync every 2 minutes for dashboard
      performanceMonitor.recordMetric('enhanced-query-dashboard-init', 1);
    }
  }, [organizationId, subscribeToOrganization, startPeriodicSync]);

  return query;
};

// Combined hook for full organization data with background sync
export const useEnhancedOrganizationData = (organizationId?: string) => {
  const teams = useEnhancedOptimizedTeams(organizationId);
  const workOrders = useEnhancedOptimizedWorkOrders(organizationId);
  const equipment = useEnhancedOptimizedEquipment(organizationId);
  const dashboard = useEnhancedOptimizedDashboard(organizationId);
  
  // Use enhanced organization hooks for real-time updates
  // Note: These are imported dynamically to avoid circular dependencies
  // Components should use the specific hooks directly for better performance
  
  const { invalidateOrganizationData } = useCacheInvalidation();

  // Cleanup subscriptions on unmount
  useEffect(() => {
    return () => {
      // Cleanup handled by background sync service
    };
  }, []);

  const refetchAll = () => {
    if (organizationId) {
      invalidateOrganizationData(organizationId);
    }
  };

  return {
    teams,
    workOrders,
    equipment,
    dashboard,
    refetchAll,
    isLoading: teams.isLoading || workOrders.isLoading || equipment.isLoading || dashboard.isLoading,
    isError: teams.isError || workOrders.isError || equipment.isError || dashboard.isError
  };
};