import { useCallback, useEffect } from 'react';
import { useQueryClient, type QueryKey } from '@tanstack/react-query';
import { cacheManager } from '@/services/cacheManager';
import { backgroundSync } from '@/services/backgroundSync';
import { performanceMonitor } from '@/utils/performanceMonitoring';

// PHASE 3: Cache invalidation hooks with smart patterns
export const useCacheInvalidation = () => {
  const queryClient = useQueryClient();

  // Initialize cache manager with query client
  useEffect(() => {
    cacheManager.setQueryClient(queryClient);
  }, [queryClient]);

  const invalidateOrganizationData = useCallback((organizationId: string) => {
    const timer = performanceMonitor.startTimer('cache-invalidation-org');
    cacheManager.invalidateOrganizationData(organizationId);
    timer();
  }, []);

  const invalidateEquipmentRelated = useCallback((organizationId: string, equipmentId: string) => {
    const timer = performanceMonitor.startTimer('cache-invalidation-equipment');
    cacheManager.invalidateEquipmentRelated(organizationId, equipmentId);
    timer();
  }, []);

  const invalidateWorkOrderRelated = useCallback((
    organizationId: string, 
    workOrderId: string, 
    equipmentId?: string
  ) => {
    const timer = performanceMonitor.startTimer('cache-invalidation-workorder');
    cacheManager.invalidateWorkOrderRelated(organizationId, workOrderId, equipmentId);
    timer();
  }, []);

  const invalidateTeamRelated = useCallback((organizationId: string, teamId: string) => {
    const timer = performanceMonitor.startTimer('cache-invalidation-team');
    cacheManager.invalidateTeamRelated(organizationId, teamId);
    timer();
  }, []);

  const batchInvalidate = useCallback((organizationId: string, operations: Array<{
    type: 'equipment' | 'workOrder' | 'team' | 'organization';
    id?: string;
    equipmentId?: string;
  }>) => {
    const timer = performanceMonitor.startTimer('cache-invalidation-batch');
    cacheManager.batchInvalidate(organizationId, operations);
    timer();
  }, []);

  return {
    invalidateOrganizationData,
    invalidateEquipmentRelated,
    invalidateWorkOrderRelated,
    invalidateTeamRelated,
    batchInvalidate
  };
};

// Hook for optimistic updates with automatic rollback
export const useOptimisticUpdates = () => {
  const optimisticUpdate = useCallback(async <T>(
    queryKey: QueryKey,
    updater: (old: T | undefined) => T,
    mutationFn: () => Promise<unknown>
  ) => {
    const timer = performanceMonitor.startTimer('optimistic-update');
    
    try {
      await cacheManager.optimisticUpdate(queryKey, updater, mutationFn);
      performanceMonitor.recordMetric('optimistic-update-success', 1);
    } catch (error) {
      performanceMonitor.recordMetric('optimistic-update-error', 1);
      throw error;
    } finally {
      timer();
    }
  }, []);

  return { optimisticUpdate };
};

// Hook for background sync management
export const useBackgroundSync = () => {
  const subscribeToOrganization = useCallback((organizationId: string) => {
    backgroundSync.subscribeToOrganization(organizationId);
  }, []);

  const unsubscribeFromOrganization = useCallback((organizationId: string) => {
    backgroundSync.unsubscribeFromOrganization(organizationId);
  }, []);

  const startPeriodicSync = useCallback((organizationId: string, intervalMs?: number) => {
    backgroundSync.startPeriodicSync(organizationId, intervalMs);
  }, []);

  const getSyncStatus = useCallback(() => {
    return backgroundSync.getSyncStatus();
  }, []);

  return {
    subscribeToOrganization,
    unsubscribeFromOrganization,
    startPeriodicSync,
    getSyncStatus
  };
};

// Hook for cache management and statistics
export const useCacheManagement = () => {
  const getCacheStats = useCallback(() => {
    return cacheManager.getCacheStats();
  }, []);

  const clearCache = useCallback((pattern?: string) => {
    cacheManager.clearCache(pattern);
  }, []);

  const preloadRelatedData = useCallback((
    organizationId: string, 
    type: 'equipment' | 'workOrder', 
    id: string
  ) => {
    cacheManager.preloadRelatedData(organizationId, type, id);
  }, []);

  return {
    getCacheStats,
    clearCache,
    preloadRelatedData
  };
};