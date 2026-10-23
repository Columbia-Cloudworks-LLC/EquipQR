/**
 * Offline Reference Data Cache (`cached_reference_data`)
 *
 * Persists read-only snapshots of organization-scoped reference catalogs
 * (customers, PM templates, teams, and equipment categories) in IndexedDB
 * so intake forms and dropdowns remain populated when cellular or Wi-Fi
 * connectivity drops in metal repair bays or rural job sites.
 */

import { get, set, del } from 'idb-keyval';
import { logger } from '@/utils/logger';
import { isNetworkError } from '@/utils/errorHandling';

const REFERENCE_CACHE_PREFIX = 'equipqr-offline-ref';
const memoryReferenceFallback = new Map<string, CachedReferenceEntry<unknown>>();

export type OfflineReferenceKind = 'customers' | 'pm_templates' | 'teams' | 'categories';

export interface CachedReferenceEntry<TData> {
  organizationId: string;
  kind: OfflineReferenceKind;
  updatedAt: number;
  data: TData;
}

function buildReferenceKey(organizationId: string, kind: OfflineReferenceKind): string {
  return `${REFERENCE_CACHE_PREFIX}:${organizationId}:${kind}`;
}

/**
 * Persist a reference catalog snapshot for an organization in IndexedDB.
 */
export async function saveCachedReferenceData<TData>(
  organizationId: string,
  kind: OfflineReferenceKind,
  data: TData,
): Promise<void> {
  if (!organizationId) return;
  const key = buildReferenceKey(organizationId, kind);
  const entry: CachedReferenceEntry<TData> = {
    organizationId,
    kind,
    updatedAt: Date.now(),
    data,
  };
  memoryReferenceFallback.set(key, entry as CachedReferenceEntry<unknown>);
  if (typeof indexedDB === 'undefined') {
    return;
  }
  try {
    await set(key, entry);
  } catch (error) {
    logger.warn('Failed to persist offline reference data cache', {
      organizationId,
      kind,
      error,
    });
  }
}

/**
 * Read a cached reference catalog snapshot from IndexedDB.
 */
export async function getCachedReferenceData<TData>(
  organizationId: string,
  kind: OfflineReferenceKind,
): Promise<CachedReferenceEntry<TData> | null> {
  if (!organizationId) return null;
  const key = buildReferenceKey(organizationId, kind);
  if (typeof indexedDB === 'undefined') {
    return (memoryReferenceFallback.get(key) as CachedReferenceEntry<TData> | undefined) ?? null;
  }
  try {
    const entry = await get<CachedReferenceEntry<TData>>(key);
    return (
      entry ??
      (memoryReferenceFallback.get(key) as CachedReferenceEntry<TData> | undefined) ??
      null
    );
  } catch (error) {
    logger.warn('Failed to read offline reference data cache', {
      organizationId,
      kind,
      error,
    });
    return (memoryReferenceFallback.get(key) as CachedReferenceEntry<TData> | undefined) ?? null;
  }
}

/**
 * Clear a cached reference catalog entry for an organization.
 */
export async function clearCachedReferenceData(
  organizationId: string,
  kind: OfflineReferenceKind,
): Promise<void> {
  if (!organizationId) return;
  const key = buildReferenceKey(organizationId, kind);
  memoryReferenceFallback.delete(key);
  if (typeof indexedDB === 'undefined') {
    return;
  }
  try {
    await del(key);
  } catch {
    // best-effort
  }
}

/**
 * Execute a fetcher with Stale-While-Revalidate / offline fallback semantics:
 * - When online: fetches fresh data and updates the IndexedDB cache; if a
 *   network error occurs, falls back to the cached snapshot.
 * - When offline (`!navigator.onLine`): returns the cached snapshot immediately
 *   when present, or falls back to `fallbackValue`.
 */
export async function withOfflineReferenceFallback<TData>(options: {
  organizationId: string;
  kind: OfflineReferenceKind;
  fetcher: () => Promise<TData>;
  fallbackValue: TData;
}): Promise<TData> {
  const { organizationId, kind, fetcher, fallbackValue } = options;

  if (!navigator.onLine) {
    const cached = await getCachedReferenceData<TData>(organizationId, kind);
    return cached ? cached.data : fallbackValue;
  }

  try {
    const fresh = await fetcher();
    void saveCachedReferenceData(organizationId, kind, fresh);
    return fresh;
  } catch (error) {
    if (isNetworkError(error)) {
      const cached = await getCachedReferenceData<TData>(organizationId, kind);
      if (cached) {
        return cached.data;
      }
    }
    throw error;
  }
}
