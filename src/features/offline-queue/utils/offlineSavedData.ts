/**
 * Full copies of the lists a technician works from, saved on the device by
 * the background download (see useOfflineEquipmentDownload) so the list
 * screens still work with no signal.
 *
 * The list screens normally ask the server for one filtered page at a time,
 * and each filter/page combination is its own cache entry. Offline that
 * means only the exact pages opened before are available. These keys hold
 * the whole list instead; the screens filter and page it on the device when
 * the server cannot be reached.
 *
 * Every key starts with a prefix the offline read cache is allowed to save
 * (src/lib/queryPersistence.ts) and names the organization, so the copy is
 * stored per user and organization like every other saved read.
 */
import { skipToken, useQuery } from '@tanstack/react-query';
import { useBrowserOnline } from '@/hooks/useBrowserOnline';

export const offlineSavedKeys = {
  equipmentList: (organizationId: string, teamScope: string) =>
    ['equipment', organizationId, 'offline-list', teamScope] as const,
  workOrderList: (organizationId: string, teamScope: string) =>
    ['work-orders', organizationId, 'offline-list', teamScope] as const,
  inventoryList: (organizationId: string) => ['inventory', organizationId, 'offline-list'] as const,
};

/**
 * The saved copy of a list, but only while there is no connection (online
 * the server is the source). Never fetches: the offline read cache restores
 * it from the device, and the background download refreshes it.
 */
export function useOfflineSavedList<T>(queryKey: readonly unknown[] | undefined): T[] | undefined {
  const isOnline = useBrowserOnline();
  const { data } = useQuery<T[]>({
    queryKey: queryKey ?? ['equipment', 'offline-list', 'none'],
    queryFn: skipToken,
    enabled: false,
    staleTime: Infinity,
  });
  return !isOnline && queryKey ? data : undefined;
}

/** One page of a list that has already been filtered and sorted on the device. */
export function pageOf<T>(rows: readonly T[], page: number, pageSize: number): T[] {
  const start = Math.max(0, (page - 1) * pageSize);
  return rows.slice(start, start + pageSize);
}
