import React, { useEffect, ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { cacheManager } from '@/services/cacheManager';
import { backgroundSync } from '@/services/backgroundSync';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/contexts/OrganizationContext';
import {
  CacheManagerContext,
  type CacheManagerContextType,
} from './cache-manager-context';

interface CacheManagerProviderProps {
  children: ReactNode;
}

export const CacheManagerProvider: React.FC<CacheManagerProviderProps> = ({ children }) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();

  // Initialize cache manager and background sync
  useEffect(() => {
    cacheManager.setQueryClient(queryClient);
  }, [queryClient]);

  // Setup background sync for current organization
  useEffect(() => {
    if (currentOrganization?.id && user) {
      // Subscribe to real-time updates
      backgroundSync.subscribeToOrganization(currentOrganization.id);
      
      // Start periodic sync for critical data
      backgroundSync.startPeriodicSync(currentOrganization.id);

      return () => {
        // Cleanup on organization change
        backgroundSync.unsubscribeFromOrganization(currentOrganization.id);
      };
    }
  }, [currentOrganization?.id, user]);

  // Cleanup all subscriptions on unmount
  useEffect(() => {
    return () => {
      backgroundSync.cleanup();
    };
  }, []);

  const getCacheStats = (): CacheStats => {
    return cacheManager.getCacheStats();
  };

  const clearCache = (pattern?: string) => {
    cacheManager.clearCache(pattern);
  };

  const getSyncStatus = (): SyncStatus => {
    return backgroundSync.getSyncStatus();
  };

  const value: CacheManagerContextType = {
    getCacheStats,
    clearCache,
    getSyncStatus
  };

  return (
    <CacheManagerContext.Provider value={value}>
      {children}
    </CacheManagerContext.Provider>
  );
};