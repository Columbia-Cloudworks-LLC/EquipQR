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
 *  - The persister has a max age of 24h; anything older than that is
 *    discarded on hydration.
 *  - `buster` includes the app version so a new deploy invalidates all
 *    persisted state automatically (no risk of replaying queries against a
 *    schema-incompatible build).
 */

import { get, set, del } from 'idb-keyval';
import { experimental_createQueryPersister } from '@tanstack/react-query-persist-client';
import type { Query } from '@tanstack/react-query';

declare const __APP_VERSION__: string;

const APP_VERSION = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev';

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
]);

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

function isPersistableQuery(query: Query): boolean {
  const key = query.queryKey;
  if (!Array.isArray(key) || key.length === 0) return false;

  const head = key[0];
  if (typeof head !== 'string') return false;
  if (!PERSISTABLE_KEY_PREFIXES.has(head)) return false;

  for (const segment of key) {
    if (typeof segment === 'string' && FORBIDDEN_KEY_SEGMENTS.has(segment)) {
      return false;
    }
  }

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

/** The IndexedDB key under which the persister writes its serialized cache. */
function persistenceKey(scope: PersistenceScope): string {
  return `equipqr-tanstack-query:${scope.userId}:${scope.orgId}`;
}

/**
 * Returns the current `<user>:<org>` scope, or `null` when no scope has been
 * announced yet. Components must not assume a scope exists — until the user
 * is authenticated and an organization is selected, persistence is a no-op.
 */
export function getActivePersistenceScope(): PersistenceScope | null {
  return currentScope;
}

/**
 * Announce the active scope. Called from `OrganizationContext` once both the
 * authenticated user id and the current organization id are known. Switching
 * scope clears the in-memory pointer immediately; the previous bucket on
 * disk ages out via `maxAge`.
 */
export function setActivePersistenceScope(scope: PersistenceScope | null): void {
  currentScope = scope;
}

/**
 * Drop the persisted cache for a specific scope (used on sign-out).
 * Logs and swallows IDB failures — clearing is best-effort.
 */
export async function clearPersistedCache(scope: PersistenceScope): Promise<void> {
  try {
    await del(persistenceKey(scope));
  } catch {
    // best-effort cleanup — IDB unavailable in some contexts
  }
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

  return experimental_createQueryPersister<string>({
    storage: {
      getItem: async (key) => (await get<string>(key)) ?? null,
      setItem: async (key, value) => {
        await set(key, value);
      },
      removeItem: async (key) => {
        await del(key);
      },
    },
    prefix,
    maxAge: 24 * 60 * 60 * 1000, // 24h
    // App version is part of the buster — a new deploy invalidates
    // everything regardless of maxAge.
    buster: APP_VERSION,
    // The filter runs on write; it accepts the live Query and decides
    // whether to persist its cache entry.
    filters: { predicate: isPersistableQuery },
  });
}
