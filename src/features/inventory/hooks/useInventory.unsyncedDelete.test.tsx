import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mocks = vi.hoisted(() => ({
  deleteItem: vi.fn(),
  removeItem: vi.fn(),
  stored: [] as unknown[],
}));

vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'user-1' } }) }));
vi.mock('@/hooks/useAppToast', () => ({ useAppToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
vi.mock('@/features/offline-queue/services/offlineWorkDataDownload', () => ({
  downloadInventoryForOffline: vi.fn().mockResolvedValue(true),
}));
vi.mock('@/features/inventory/services/inventoryService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/inventory/services/inventoryService')>()),
  deleteInventoryItem: mocks.deleteItem,
}));
vi.mock('@/contexts/OfflineQueueContext', () => ({
  useOfflineQueueOptional: () => ({
    queuedItems: [],
    removeItem: mocks.removeItem,
    refresh: vi.fn(),
    // The stored queue is what counts, not the list on screen.
    queueServiceInstance: { getAll: () => mocks.stored },
  }),
}));

import { useDeleteInventoryItem } from './useInventory';
import { OfflineQueueService } from '@/services/offlineQueueService';

const ORG = 'org-1';
const queuedCreate = (payload: Record<string, unknown> = {}, status = 'pending') => ({
  id: 'queue-create',
  type: 'inventory_create',
  status,
  organizationId: ORG,
  userId: 'user-1',
  payload: { itemId: 'item-new', formData: { name: 'Hose' }, ...payload },
});
const queuedDeletes = () =>
  new OfflineQueueService('user-1', ORG).getAll().filter(item => item.type === 'inventory_delete');

function wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>;
}
function setOnline(online: boolean) {
  Object.defineProperty(navigator, 'onLine', { value: online, configurable: true, writable: true });
}
const deleteNewItem = async () => {
  const { result } = renderHook(() => useDeleteInventoryItem(), { wrapper });
  await result.current.mutateAsync({ organizationId: ORG, itemId: 'item-new' });
};

describe('deleting an inventory item that was created offline and has not synced', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    mocks.deleteItem.mockResolvedValue(undefined);
    mocks.stored = [queuedCreate()];
    setOnline(false);
  });

  afterEach(() => setOnline(true));

  it('just leaves the queue when its create was never sent: nothing can be on the server', async () => {
    await deleteNewItem();

    expect(mocks.removeItem).toHaveBeenCalledWith('queue-create');
    expect(mocks.deleteItem).not.toHaveBeenCalled();
    expect(queuedDeletes()).toEqual([]);
  });

  it('queues a server delete when its create was sent and the answer lost, so it cannot reappear', async () => {
    mocks.stored = [queuedCreate({ createAttempted: true })];

    await deleteNewItem();

    expect(mocks.removeItem).toHaveBeenCalledWith('queue-create');
    expect(mocks.deleteItem).not.toHaveBeenCalled();
    expect(queuedDeletes().map(item => item.payload)).toEqual([{ itemId: 'item-new' }]);
  });

  it('deletes the server copy straight away when connected', async () => {
    mocks.stored = [queuedCreate({ createAttempted: true })];
    setOnline(true);

    await deleteNewItem();

    expect(mocks.deleteItem).toHaveBeenCalledWith(ORG, 'item-new');
    expect(queuedDeletes()).toEqual([]);
  });

  it('queues the delete behind a create that sync is sending right now, even when connected', async () => {
    mocks.stored = [queuedCreate({}, 'processing')];
    setOnline(true);

    await deleteNewItem();

    // A direct delete could land before the create does.
    expect(mocks.deleteItem).not.toHaveBeenCalled();
    expect(queuedDeletes()).toHaveLength(1);
  });

  it('deletes an item that is on the server on the server', async () => {
    mocks.stored = [];
    setOnline(true);

    await deleteNewItem();

    expect(mocks.deleteItem).toHaveBeenCalledWith(ORG, 'item-new');
    expect(mocks.removeItem).not.toHaveBeenCalled();
  });
});
