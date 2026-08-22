import { useCallback } from 'react';
import { backgroundSync } from '@/services/backgroundSync';

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
