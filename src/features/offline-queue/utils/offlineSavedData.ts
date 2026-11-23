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

export interface OfflineSavedList<T> {
  rows: T[];
  /** When the background download saved this copy (ms since epoch). */
  savedAt: number;
}

/**
 * The saved copy of a list, but only while there is no connection (online
 * the server is the source). Never fetches: the offline read cache restores
 * it from the device, and the background download refreshes it.
 */
export function useOfflineSavedList<T>(
  queryKey: readonly unknown[] | undefined,
): OfflineSavedList<T> | undefined {
  const isOnline = useBrowserOnline();
  const { data, dataUpdatedAt } = useQuery<T[]>({
    queryKey: queryKey ?? ['equipment', 'offline-list', 'none'],
    queryFn: skipToken,
    enabled: false,
    staleTime: Infinity,
  });
  return !isOnline && queryKey && data ? { rows: data, savedAt: dataUpdatedAt } : undefined;
}

/** What a list screen already holds for the filters and page on screen. */
interface LoadedList {
  data: unknown;
  isPlaceholderData: boolean;
  dataUpdatedAt: number;
}

/**
 * Whether the saved copy should be shown instead of what the screen already
 * loaded. A page fetched after the copy was saved is newer (it can hold a
 * work order created or updated since) and must not be replaced by the older
 * copy just because the signal dropped. The saved copy is for everything
 * else: filters and pages that were never loaded, or were loaded earlier.
 */
export function shouldUseSavedList<T>(
  saved: OfflineSavedList<T> | undefined,
  loaded: LoadedList,
): saved is OfflineSavedList<T> {
  if (!saved) return false;
  if (loaded.data === undefined || loaded.isPlaceholderData) return true;
  return loaded.dataUpdatedAt < saved.savedAt;
}

/** One page of a list that has already been filtered and sorted on the device. */
export function pageOf<T>(rows: readonly T[], page: number, pageSize: number): T[] {
  const start = Math.max(0, (page - 1) * pageSize);
  return rows.slice(start, start + pageSize);
}
