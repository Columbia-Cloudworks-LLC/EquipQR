import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mocks = vi.hoisted(() => ({ adjust: vi.fn(), newestMovement: vi.fn() }));

vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'user-1' } }) }));
vi.mock('@/hooks/useAppToast', () => ({ useAppToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
vi.mock('@/features/offline-queue/services/offlineWorkDataDownload', () => ({
  downloadInventoryForOffline: vi.fn().mockResolvedValue(true),
}));
vi.mock('@/features/inventory/services/inventoryService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/inventory/services/inventoryService')>()),
  adjustInventoryQuantity: mocks.adjust,
  getNewestInventoryMovementTime: mocks.newestMovement,
}));

import { useAdjustInventoryQuantity } from './useInventory';
import { OfflineQueueService } from '@/services/offlineQueueService';

const ORG = 'org-1';
const adjustment = { itemId: 'item-1', delta: -2, reason: 'Used in work order wo-1', workOrderId: 'wo-1' };

function wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>;
}

function setOnline(online: boolean) {
  Object.defineProperty(navigator, 'onLine', { value: online, configurable: true, writable: true });
}

describe('useAdjustInventoryQuantity with no connection', () => {
  beforeEach(() => {
    localStorage.clear();
    mocks.adjust.mockReset().mockRejectedValue(new TypeError('Failed to fetch'));
    mocks.newestMovement.mockReset().mockRejectedValue(new TypeError('Failed to fetch'));
    setOnline(false);
  });

  afterEach(() => setOnline(true));

  it('saves a stock change for later', async () => {
    const { result } = renderHook(() => useAdjustInventoryQuantity(), { wrapper });

    await expect(result.current.mutateAsync({ organizationId: ORG, adjustment })).resolves.toBeNull();

    expect(mocks.adjust).not.toHaveBeenCalled();
    expect(new OfflineQueueService('user-1', ORG).getAll().map(item => item.type)).toEqual(['inventory_adjust']);
  });

  it('fails instead when the caller pairs it with a write that cannot be saved for later', async () => {
    // A work order cost line: queueing only the deduction would take stock
    // on sync with no cost recorded for it.
    const { result } = renderHook(() => useAdjustInventoryQuantity({ requireServer: true }), { wrapper });

    await expect(result.current.mutateAsync({ organizationId: ORG, adjustment })).rejects.toThrow('Failed to fetch');

    expect(new OfflineQueueService('user-1', ORG).getAll()).toEqual([]);
  });
});
