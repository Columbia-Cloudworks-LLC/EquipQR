import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { equipment as equipmentKeys } from '@/lib/queryKeys/equipment';
import {
  getEquipmentLocationHistory,
  getLatestScanCoordinateFromHistory,
  type EquipmentLocationHistoryRow,
} from '@/features/equipment/services/equipmentLocationHistoryService';

export function useEquipmentLocationHistory(
  organizationId: string | undefined,
  equipmentId: string | undefined,
  options?: { staleTime?: number; limit?: number; enabled?: boolean },
) {
  const staleTime = options?.staleTime ?? 10 * 60 * 1000;
  const limit = options?.limit ?? 50;
  const enabled = (options?.enabled ?? true) && !!organizationId && !!equipmentId;

  return useQuery<EquipmentLocationHistoryRow[]>({
    queryKey:
      organizationId && equipmentId
        ? equipmentKeys.locationHistory(organizationId, equipmentId, limit)
        : ['equipment', organizationId, equipmentId, 'location-history', limit],
    queryFn: async () => {
      if (!equipmentId) {
        return [];
      }
      return getEquipmentLocationHistory(equipmentId, limit);
    },
    enabled,
    staleTime,
  });
}

export function useLatestScanCoordinateFromHistory(
  organizationId: string | undefined,
  equipmentId: string | undefined,
  options?: { enabled?: boolean },
) {
  const query = useEquipmentLocationHistory(organizationId, equipmentId, options);
  const latestScan = useMemo(
    () => getLatestScanCoordinateFromHistory(query.data ?? []),
    [query.data],
  );

  return {
    ...query,
    latestScan,
  };
}
