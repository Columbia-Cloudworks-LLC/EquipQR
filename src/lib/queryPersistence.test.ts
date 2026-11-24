import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient } from '@tanstack/react-query';

const store = vi.hoisted(() => new Map<string, unknown>());

vi.mock('idb-keyval', () => ({
  get: vi.fn(async (key: string) => store.get(key)),
  set: vi.fn(async (key: string, value: unknown) => {
    store.set(key, value);
  }),
  del: vi.fn(async (key: string) => {
    store.delete(key);
  }),
  entries: vi.fn(async () => [...store.entries()]),
}));

import {
  attachOfflineReadCache,
  setActivePersistenceScope,
  setActivePersistenceUser,
} from './queryPersistence';

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

/**
 * Save `data` for `queryKey` the way the app does (through the cache), then
 * empty the in-memory cache so only the copy on disk is left. Optionally
 * backdates the saved copy.
 */
async function seedSavedCopy(
  queryClient: QueryClient,
  bucket: string,
  queryKey: readonly unknown[],
  data: unknown,
  dataUpdatedAt?: number,
): Promise<string> {
  queryClient.setQueryData(queryKey, data);
  await flush();
  const written = [...store.keys()].find((key) => key.startsWith('equipqr:tq:'));
  if (!written) throw new Error('nothing was saved');
  const record = JSON.parse(store.get(written) as string) as {
    state: { dataUpdatedAt: number };
  };
  if (dataUpdatedAt !== undefined) record.state.dataUpdatedAt = dataUpdatedAt;
  // Query hashes are JSON arrays, so the hash starts at the first `-[`.
  const queryHash = written.slice(written.indexOf('-[') + 1);
  store.clear();
  const storageKey = `${bucket}-${queryHash}`;
  store.set(storageKey, JSON.stringify(record));
  queryClient.clear();
  await flush();
  return storageKey;
}

describe('attachOfflineReadCache', () => {
  let queryClient: QueryClient;
  let detach: () => void;

  beforeEach(() => {
    store.clear();
    setActivePersistenceUser(null);
    setActivePersistenceScope(null);
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    detach = attachOfflineReadCache(queryClient);
  });

  afterEach(() => {
    detach();
    queryClient.clear();
    setActivePersistenceUser(null);
    setActivePersistenceScope(null);
  });

  it('saves a successful field-critical read under the active user and organization', async () => {
    setActivePersistenceScope({ userId: 'user-1', orgId: 'org-1' });

    queryClient.setQueryData(['equipment', 'org-1', 'summaries'], [{ id: 'eq-1' }]);
    await flush();

    const keys = [...store.keys()];
    expect(keys).toHaveLength(1);
    expect(keys[0].startsWith('equipqr:tq:user-1:org-1-')).toBe(true);
  });

  it('does not save reads outside the allow-list or under a forbidden segment', async () => {
    setActivePersistenceScope({ userId: 'user-1', orgId: 'org-1' });

    queryClient.setQueryData(['notifications', 'org-1'], [{ id: 'n-1' }]);
    queryClient.setQueryData(['equipment', 'org-1', 'billing'], [{ id: 'eq-1' }]);
    await flush();

    expect(store.size).toBe(0);
  });

  it('does not save anything before the user and organization are known', async () => {
    queryClient.setQueryData(['equipment', 'org-1', 'summaries'], [{ id: 'eq-1' }]);
    await flush();

    expect(store.size).toBe(0);
  });

  it('fills a query that has nothing to show from the saved copy, keeping its age', async () => {
    setActivePersistenceScope({ userId: 'user-1', orgId: 'org-1' });
    const queryKey = ['work-orders', 'org-1'];
    const updatedAt = Date.now() - 3 * 24 * 60 * 60 * 1000;
    await seedSavedCopy(queryClient, 'equipqr:tq:user-1:org-1', queryKey, [{ id: 'wo-1' }], updatedAt);

    queryClient.getQueryCache().build(queryClient, { queryKey });
    await flush();

    expect(queryClient.getQueryData(queryKey)).toEqual([{ id: 'wo-1' }]);
    expect(queryClient.getQueryState(queryKey)?.dataUpdatedAt).toBe(updatedAt);
  });

  it('still asks the server after showing a saved copy, however recent', async () => {
    setActivePersistenceScope({ userId: 'user-1', orgId: 'org-1' });
    const queryKey = ['inventory', 'org-1', 'list'];
    await seedSavedCopy(queryClient, 'equipqr:tq:user-1:org-1', queryKey, [{ id: 'item-1' }], Date.now() - 1000);

    queryClient.getQueryCache().build(queryClient, { queryKey });
    await flush();

    // Shown, but marked out of date so the screen fetches when it mounts.
    expect(queryClient.getQueryData(queryKey)).toEqual([{ id: 'item-1' }]);
    expect(queryClient.getQueryState(queryKey)?.isInvalidated).toBe(true);
  });

  it('leaves the saved copy alone with no connection, when there is nothing to ask', async () => {
    setActivePersistenceScope({ userId: 'user-1', orgId: 'org-1' });
    const queryKey = ['inventory', 'org-1', 'list'];
    await seedSavedCopy(queryClient, 'equipqr:tq:user-1:org-1', queryKey, [{ id: 'item-1' }], Date.now() - 1000);

    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    try {
      queryClient.getQueryCache().build(queryClient, { queryKey });
      await flush();
      expect(queryClient.getQueryData(queryKey)).toEqual([{ id: 'item-1' }]);
      expect(queryClient.getQueryState(queryKey)?.isInvalidated).toBe(false);
    } finally {
      Reflect.deleteProperty(navigator, 'onLine');
    }
  });

  it('fills queries that mounted before the scope was announced', async () => {
    const queryKey = ['equipment', 'org-1', 'summaries'];
    setActivePersistenceScope({ userId: 'user-1', orgId: 'org-1' });
    await seedSavedCopy(queryClient, 'equipqr:tq:user-1:org-1', queryKey, [{ id: 'eq-1' }]);
    setActivePersistenceScope(null);

    queryClient.getQueryCache().build(queryClient, { queryKey });
    await flush();
    expect(queryClient.getQueryData(queryKey)).toBeUndefined();

    setActivePersistenceScope({ userId: 'user-1', orgId: 'org-1' });
    await flush();

    expect(queryClient.getQueryData(queryKey)).toEqual([{ id: 'eq-1' }]);
  });

  it('never reads another user or organization bucket', async () => {
    const queryKey = ['equipment', 'org-1', 'summaries'];
    setActivePersistenceScope({ userId: 'user-1', orgId: 'org-1' });
    const storageKey = await seedSavedCopy(queryClient, 'equipqr:tq:other-user:org-1', queryKey, [
      { id: 'eq-1' },
    ]);
    store.set(storageKey.replace('other-user:org-1', 'user-1:other-org'), store.get(storageKey));

    queryClient.getQueryCache().build(queryClient, { queryKey });
    await flush();

    expect(queryClient.getQueryData(queryKey)).toBeUndefined();
  });

  it('discards a saved copy older than the offline window', async () => {
    setActivePersistenceScope({ userId: 'user-1', orgId: 'org-1' });
    const queryKey = ['work-orders', 'org-1'];
    const fifteenDaysAgo = Date.now() - 15 * 24 * 60 * 60 * 1000;
    const storageKey = await seedSavedCopy(
      queryClient,
      'equipqr:tq:user-1:org-1',
      queryKey,
      [{ id: 'wo-1' }],
      fifteenDaysAgo,
    );

    queryClient.getQueryCache().build(queryClient, { queryKey });
    await flush();

    expect(queryClient.getQueryData(queryKey)).toBeUndefined();
    expect(store.has(storageKey)).toBe(false);
  });

  it('does not overwrite data that arrived while the saved copy was being read', async () => {
    setActivePersistenceScope({ userId: 'user-1', orgId: 'org-1' });
    const queryKey = ['work-orders', 'org-1'];
    await seedSavedCopy(queryClient, 'equipqr:tq:user-1:org-1', queryKey, [{ id: 'stale' }]);

    queryClient.getQueryCache().build(queryClient, { queryKey });
    queryClient.setQueryData(queryKey, [{ id: 'fresh' }]);
    await flush();

    expect(queryClient.getQueryData(queryKey)).toEqual([{ id: 'fresh' }]);
  });

  it('keeps the organization list per user so an offline start can pick an organization', async () => {
    setActivePersistenceUser('user-1');

    queryClient.setQueryData(['simple-organizations', 'user-1'], [{ id: 'org-1' }]);
    // A key naming a different user must not land in this user's bucket.
    queryClient.setQueryData(['simple-organizations', 'user-2'], [{ id: 'org-9' }]);
    await flush();

    const keys = [...store.keys()];
    expect(keys).toHaveLength(1);
    expect(keys[0].startsWith('equipqr:tq:user-1:user-')).toBe(true);
  });
});
