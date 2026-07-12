import { useEffect } from 'react';
import { useBackgroundSync } from '@/hooks/useCacheInvalidation';
import { performanceMonitor } from '@/utils/performanceMonitoring';

const DEFAULT_EQUIPMENT_STALE_MS = 5 * 60 * 1000;

export type EquipmentQuerySyncOptions = {
  enableBackgroundSync?: boolean;
  staleTime?: number;
};

export function resolveEquipmentQuerySyncOptions(options?: EquipmentQuerySyncOptions) {
  const enableSync = options?.enableBackgroundSync ?? false;
  const staleTime = options?.staleTime ?? DEFAULT_EQUIPMENT_STALE_MS;
  return { enableSync, staleTime, gcTime: staleTime * 2 };
}

export function useEquipmentOrgBackgroundSync(
  organizationId: string | undefined,
  enableSync: boolean,
  recordMetric = true,
) {
  const { subscribeToOrganization, unsubscribeFromOrganization } = useBackgroundSync();

  useEffect(() => {
    if (!organizationId || !enableSync) {
      return;
    }

    subscribeToOrganization(organizationId);
    if (recordMetric) {
      performanceMonitor.recordMetric('equipment-query-init', 1);
    }

    return () => {
      unsubscribeFromOrganization(organizationId);
    };
  }, [organizationId, enableSync, subscribeToOrganization, unsubscribeFromOrganization, recordMetric]);
}
