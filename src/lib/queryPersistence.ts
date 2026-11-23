/**
 * TanStack Query persistence — scoped, field-critical only.
 *
 * Goal: when a technician opens the app while offline (or the connection
 * drops mid-session) the field-critical reads — equipment summaries,
 * equipment by id, work orders, PM records, PM templates, working-hours —
 * are still available from the previous online session.
 *
 * Safety constraints:
 *  - Persistence is scoped to a single `<user-id>:<org-id>` bucket. When the
 *    user signs out, switches accounts, or switches organizations, the
 *    persisted cache for the previous bucket is left in IndexedDB (capped by
 *    `maxAge`) but never re-read into the live cache, so tenant data never
 *    leaks across boundaries.
 *  - Only an explicit allow-list of query-key prefixes is persisted. Auth,
 *    notifications, audit log, integrations, profile, billing, and any
 *    `'admin'` / `'audit'` namespace are excluded by construction.
 *  - The persister has a max age of 14 days (crews can be at a remote site
 *    without signal for several days); anything older is discarded on
 *    hydration.
 *  - `buster` includes the app version so a new deploy invalidates all
 *    persisted state automatically (no risk of replaying queries against a
 *    schema-incompatible build).
 */

import { get, set, del, entries } from 'idb-keyval';
import { experimental_createQueryPersister } from '@tanstack/react-query-persist-client';
import type { Query, QueryClient } from '@tanstack/react-query';

declare const __APP_VERSION__: string;

const APP_VERSION = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev';

/**
 * Saved reads written by a different app version are discarded. Anything that
 * tracks "the saved copy is up to date" must be keyed on this too.
 */
export const OFFLINE_CACHE_VERSION = APP_VERSION;

/** How long cached reads stay usable without a connection. */
const OFFLINE_READ_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

/**
 * Query-key prefixes that are safe to persist for slow-cellular / offline
 * reads. Each entry matches the FIRST element of the query key. Anything
 * not listed here is NEVER written to disk.
 *
 * Keep this list narrow on purpose. If a new field-critical query family
 * needs offline access, add its first key segment here AND verify the
 * cached payload does not include sensitive cross-tenant data.
 */
const PERSISTABLE_KEY_PREFIXES: ReadonlySet<string> = new Set([
  'equipment',
  'equipment-status-counts',
  'equipment-notes-with-images',
  'equipment-images',
  'equipment-working-hours-history',
  'equipment-current-working-hours',
  'equipment-manufacturers-models',
  'work-orders',
  'workOrder',
  'workOrders',
  'enhanced-work-orders',
  'team-based-work-orders',
  'work-order-notes-with-images',
  'work-order-images',
  'work-order-equipment',
  'work-order-equipment-count',
  'work-order-costs-subtotal',
  'preventativeMaintenance',
  'pm-templates',
  'pm-status',
  'team-stats',
  'teams',
  'team-fleet',
  // Lists and detail panels the field screens read (equipment list, work
  // order list, dashboard, team pickers). Without these a technician with no
  // signal sees empty screens instead of what they last loaded.
  'equipment-optimized',
  'equipment-notes',
  'equipment-work-orders',
  'work-orders-optimized',
  'work-orders-filtered-optimized',
  'work-order-notes',
  'work-order-costs',
  'work-order-timeline',
  'work-order-assignment-members',
  'teamBasedWorkOrders',
  'team-based-recent-work-orders',
  'team-based-equipment',
  'team-based-dashboard-stats',
  'team-equipment-for-work-order',
  'team',
  'teams-optimized',
  'dashboardStats',
  'dashboard-stats',
  'dashboard-optimized',
  'pm-interval-policies',
  'pm-template-matching',
  'product-onboarding',
  // Parts are looked up in the field too. Org-scoped like everything above.
  'inventory',
  'inventory-item',
  // The user's own yes/no parts-role answers, which gate the inventory
  // screens. The lists of who holds those roles are not saved.
  'is-parts-manager',
  'is-parts-consumer',
]);

/**
 * Query families that are needed before an organization is known (the list
 * of organizations itself, and the Google Workspace access check). They are
 * stored in a per-user bucket, and only when the key names that user.
 */
const USER_SCOPED_KEY_PREFIXES: ReadonlySet<string> = new Set([
  'simple-organizations',
  'google-workspace',
]);

/** Only this Google Workspace sub-family is user-scoped and safe to keep. */
const GOOGLE_WORKSPACE_PERSISTABLE_SEGMENT = 'onboarding';

/**
 * Query-key segments that, if present anywhere in the key, force exclusion
 * from persistence even when the prefix matches. This catches narrow cases
 * like `['equipment', orgId, 'admin', ...]` if any are ever introduced.
 */
const FORBIDDEN_KEY_SEGMENTS: ReadonlySet<string> = new Set([
  'admin',
  'audit',
  'dsr',
  'billing',
  'invitations',
  'export-artifacts',
  'tickets',
]);

function hasPersistableKey(key: readonly unknown[]): boolean {
  if (!Array.isArray(key) || key.length === 0) return false;

  const head = key[0];
  if (typeof head !== 'string') return false;
  if (!PERSISTABLE_KEY_PREFIXES.has(head)) return false;

  for (const segment of key) {
    if (typeof segment === 'string' && FORBIDDEN_KEY_SEGMENTS.has(segment)) {
      return false;
    }
  }
  return true;
}

function isPersistableQuery(query: Query): boolean {
  if (!hasPersistableKey(query.queryKey)) return false;

  // Skip any query that errored out on the last fetch — we don't want to
  // hydrate a stale error state from disk.
  if (query.state.status === 'error') return false;

  // Skip queries with no data (empty caches add nothing).
  if (query.state.data === undefined) return false;

  return true;
}

interface PersistenceScope {
  userId: string;
  orgId: string;
}

let currentScope: PersistenceScope | null = null;
type ScopedQueryPersister = ReturnType<typeof experimental_createQueryPersister<string>>;

let cachedPersisterKey: string | null = null;
let cachedPersister: ScopedQueryPersister | null = null;

/**
 * Announce the active scope. Called from `OrganizationContext` once both the
 * authenticated user id and the current organization id are known. Switching
 * scope clears the in-memory pointer immediately; the previous bucket on
 * disk ages out via `maxAge`.
 */
export function setActivePersistenceScope(scope: PersistenceScope | null): void {
  const changed =
    currentScope?.userId !== scope?.userId || currentScope?.orgId !== scope?.orgId;
  currentScope = scope;
  if (changed) notifyScopeListeners();
}

let currentUserId: string | null = null;

/**
 * Announce the signed-in user. This is known before an organization is, and
 * unlocks the per-user bucket that holds the organization list — without it
 * an offline start can never work out which organization to open.
 */
export function setActivePersistenceUser(userId: string | null): void {
  if (currentUserId === userId) return;
  currentUserId = userId;
  notifyScopeListeners();
}

const scopeListeners = new Set<() => void>();

function notifyScopeListeners(): void {
  for (const listener of scopeListeners) listener();
}

const STORAGE_NAMESPACE = 'equipqr:tq:';

/**
 * Storage bucket for a query key under the current scope, or null when the
 * key must not be kept or its scope is not known yet.
 */
function bucketPrefixForKey(key: readonly unknown[]): string | null {
  const head = key[0];
  if (typeof head === 'string' && USER_SCOPED_KEY_PREFIXES.has(head)) {
    if (!currentUserId || !key.includes(currentUserId)) return null;
    if (head === 'google-workspace' && key[1] !== GOOGLE_WORKSPACE_PERSISTABLE_SEGMENT) {
      return null;
    }
    return `${STORAGE_NAMESPACE}${currentUserId}:user`;
  }
  if (!currentScope || !hasPersistableKey(key)) return null;
  return `${STORAGE_NAMESPACE}${currentScope.userId}:${currentScope.orgId}`;
}

/** Same on-disk shape `experimental_createQueryPersister` writes. */
interface PersistedQueryRecord {
  buster: string;
  queryHash: string;
  queryKey: readonly unknown[];
  state: { data?: unknown; dataUpdatedAt?: number };
}

function isFreshRecord(record: PersistedQueryRecord): boolean {
  const updatedAt = record.state?.dataUpdatedAt;
  if (!updatedAt || record.buster !== APP_VERSION) return false;
  return Date.now() - updatedAt <= OFFLINE_READ_MAX_AGE_MS;
}

function parseRecord(raw: unknown): PersistedQueryRecord | null {
  if (typeof raw !== 'string') return null;
  try {
    const parsed = JSON.parse(raw) as PersistedQueryRecord;
    return parsed && typeof parsed === 'object' && parsed.state ? parsed : null;
  } catch {
    return null;
  }
}

async function writeQueryRecord(prefix: string, query: Query): Promise<void> {
  try {
    const record: PersistedQueryRecord = {
      buster: APP_VERSION,
      queryHash: query.queryHash,
      queryKey: query.queryKey,
      state: { data: query.state.data, dataUpdatedAt: query.state.dataUpdatedAt },
    };
    await set(`${prefix}-${query.queryHash}`, JSON.stringify(record));
  } catch {
    // Best-effort: storage may be full or unavailable (private browsing).
  }
}

async function readQueryRecord(
  prefix: string,
  queryHash: string,
): Promise<{ data: unknown; dataUpdatedAt: number } | null> {
  try {
    const storageKey = `${prefix}-${queryHash}`;
    const record = parseRecord(await get<string>(storageKey));
    if (!record) return null;
    if (!isFreshRecord(record) || record.state.data === undefined) {
      await del(storageKey);
      return null;
    }
    return { data: record.state.data, dataUpdatedAt: record.state.dataUpdatedAt ?? 0 };
  } catch {
    return null;
  }
}

/** Remove saved reads that are too old or belong to a previous app version. */
async function removeExpiredRecords(): Promise<void> {
  try {
    for (const [key, value] of await entries<IDBValidKey, unknown>()) {
      if (typeof key !== 'string' || !key.startsWith(STORAGE_NAMESPACE)) continue;
      const record = parseRecord(value);
      if (!record || !isFreshRecord(record)) await del(key);
    }
  } catch {
    // Best-effort cleanup.
  }
}

const EXPIRED_RECORD_SWEEP_DELAY_MS = 30_000;

/**
 * Keep field-critical reads available with no connection.
 *
 * Every successful result for an allow-listed query is saved to IndexedDB,
 * and a query that has nothing to show is filled from the saved copy while
 * it waits for the network. This runs outside the query function on purpose:
 * TanStack Query does not call the query function at all while the browser
 * reports no connection, so a persister wired into the query function never
 * gets the chance to restore anything in exactly the case that matters.
 *
 * Restored data keeps its original timestamp, so it is treated as stale and
 * replaced as soon as a fetch succeeds.
 *
 * Call once for the app's QueryClient; returns a cleanup function.
 */
export function attachOfflineReadCache(queryClient: QueryClient): () => void {
  const restoring = new Set<string>();
  const applying = new Set<string>();

  const restore = (query: Query): void => {
    if (query.state.data !== undefined || restoring.has(query.queryHash)) return;
    const prefix = bucketPrefixForKey(query.queryKey);
    if (!prefix) return;

    restoring.add(query.queryHash);
    void readQueryRecord(prefix, query.queryHash)
      .then((saved) => {
        if (!saved) return;
        // A fetch may have finished, or the user/org may have changed, while
        // IndexedDB was being read.
        if (query.state.data !== undefined) return;
        if (bucketPrefixForKey(query.queryKey) !== prefix) return;
        if (!queryClient.getQueryCache().get(query.queryHash)) return;

        applying.add(query.queryHash);
        try {
          queryClient.setQueryData(query.queryKey, saved.data, {
            updatedAt: saved.dataUpdatedAt,
          });
        } finally {
          applying.delete(query.queryHash);
        }
      })
      .finally(() => {
        restoring.delete(query.queryHash);
      });
  };

  const restoreAll = (): void => {
    for (const query of queryClient.getQueryCache().getAll()) restore(query);
  };

  const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
    const { query } = event;
    if (event.type === 'added' || event.type === 'observerAdded') {
      restore(query);
      return;
    }
    if (event.type !== 'updated' || event.action.type !== 'success') return;
    if (applying.has(query.queryHash)) return;
    if (query.state.data === undefined) return;

    const prefix = bucketPrefixForKey(query.queryKey);
    if (prefix) void writeQueryRecord(prefix, query);
  });

  // Queries usually mount before the user/org scope is announced, so fill
  // them again whenever the scope becomes known or changes.
  scopeListeners.add(restoreAll);
  restoreAll();

  const sweepTimer = setTimeout(() => void removeExpiredRecords(), EXPIRED_RECORD_SWEEP_DELAY_MS);

  return () => {
    unsubscribe();
    scopeListeners.delete(restoreAll);
    clearTimeout(sweepTimer);
  };
}

/**
 * Build the per-query persister consumed by every TanStack `useQuery` /
 * `useMutation` via the QueryClient default option. We use
 * `experimental_createQueryPersister` (the v5 per-query API) so that:
 *   - Each query is restored independently — there is no monolithic cache
 *     blob, so a corrupted entry can't poison the whole cache.
 *   - The persister can introspect the query via the `filters.predicate`
 *     and call `isPersistableQuery` at write time.
 *   - Storage uses IndexedDB (`idb-keyval`) instead of `localStorage` so we
 *     don't compete with the offline queue for the synchronous storage
 *     bucket and don't block the main thread for large caches.
 *
 * Scope: the `prefix` is captured ONCE at persister creation time. We
 * deliberately rebuild the persister whenever `setActivePersistenceScope`
 * fires for a different scope (see `AppProviders`) so the prefix actually
 * tracks the active user/org rather than freezing on the first value.
 */
export function createScopedQueryPersister() {
  const scope = currentScope;
  const prefix = scope
    ? `equipqr:tq:${scope.userId}:${scope.orgId}`
    : 'equipqr:tq:noscope';

  if (cachedPersisterKey === prefix && cachedPersister) {
    return cachedPersister;
  }

  cachedPersisterKey = prefix;
  cachedPersister = experimental_createQueryPersister<string>({
    storage: {
      // All three methods must be fail-safe. IndexedDB can be unavailable
      // (private browsing mode, quota exceeded, mobile Safari restrictions,
      // or first-open timing races). A thrown error here would propagate
      // into TanStack Query's restoration step and silently abort the query
      // instead of falling through to the normal network fetch.
      getItem: async (key) => {
        try {
          return (await get<string>(key)) ?? null;
        } catch {
          return null;
        }
      },
      setItem: async (key, value) => {
        try {
          await set(key, value);
        } catch {
          // Silently swallow write failures — the cache is best-effort.
        }
      },
      removeItem: async (key) => {
        try {
          await del(key);
        } catch {
          // Silently swallow removal failures.
        }
      },
    },
    prefix,
    maxAge: OFFLINE_READ_MAX_AGE_MS,
    // App version is part of the buster — a new deploy invalidates
    // everything regardless of maxAge.
    buster: APP_VERSION,
    // The filter runs on write; it accepts the live Query and decides
    // whether to persist its cache entry.
    filters: { predicate: isPersistableQuery },
  });
  return cachedPersister;
}
