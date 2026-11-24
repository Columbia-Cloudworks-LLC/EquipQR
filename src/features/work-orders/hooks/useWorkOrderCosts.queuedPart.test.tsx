import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mocks = vi.hoisted(() => ({
  getCosts: vi.fn(),
  deleteCost: vi.fn(),
  updateCost: vi.fn(),
  removeItem: vi.fn(),
  updatePayload: vi.fn(),
  queuedItems: [] as unknown[],
}));

vi.mock('@/features/work-orders/services/workOrderCostsService', () => ({
  getWorkOrderCosts: mocks.getCosts,
  createWorkOrderCost: vi.fn(),
  deleteWorkOrderCostWithInventoryInfo: mocks.deleteCost,
  updateWorkOrderCostWithQuantityTracking: mocks.updateCost,
}));
vi.mock('@/features/inventory/services/inventoryService', () => ({ adjustInventoryQuantity: vi.fn() }));
vi.mock('@/contexts/OfflineQueueContext', () => ({
  useOfflineQueueOptional: () => ({
    queuedItems: mocks.queuedItems,
    removeItem: mocks.removeItem,
    refresh: vi.fn(),
    queueServiceInstance: { updatePayload: mocks.updatePayload },
  }),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import {
  useDeleteWorkOrderCostWithInventoryRestore,
  useUpdateWorkOrderCostWithInventory,
  useWorkOrderCosts,
} from './useWorkOrderCosts';

const queuedPart = (overrides: Record<string, unknown> = {}, status = 'pending') => ({
  id: 'queue-1',
  type: 'work_order_part_use',
  status,
  organizationId: 'org-1',
  userId: 'user-1',
  timestamp: Date.UTC(2026, 10, 24, 12),
  payload: {
    costId: 'cost-new',
    workOrderId: 'wo-1',
    itemId: 'item-1',
    description: 'Air filter',
    quantity: 2,
    unitPriceCents: 1250,
    ...overrides,
  },
});

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('work order costs with a part added offline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCosts.mockResolvedValue([]);
    mocks.updatePayload.mockReturnValue(true);
    mocks.queuedItems = [queuedPart()];
  });

  it('lists the part on a work order created offline without asking the server for its costs', () => {
    mocks.queuedItems = [queuedPart({ workOrderId: 'offline-queue-9' })];

    const { result } = renderHook(() => useWorkOrderCosts('offline-queue-9'), { wrapper });

    expect(result.current.data).toMatchObject([{ id: 'cost-new', description: 'Air filter', quantity: 2 }]);
    expect(result.current.isLoading).toBe(false);
    expect(mocks.getCosts).not.toHaveBeenCalled();
  });

  it('removing it takes it out of the queue; nothing was written or deducted', async () => {
    const { result } = renderHook(() => useDeleteWorkOrderCostWithInventoryRestore(), { wrapper });

    const outcome = await result.current.mutateAsync({ costId: 'cost-new', organizationId: 'org-1' });

    expect(mocks.removeItem).toHaveBeenCalledWith('queue-1');
    expect(mocks.deleteCost).not.toHaveBeenCalled();
    expect(outcome).toEqual({ inventoryRestored: false, quantity: 0 });
  });

  it('changing its quantity changes what it will take from stock', async () => {
    const { result } = renderHook(() => useUpdateWorkOrderCostWithInventory(), { wrapper });

    const outcome = await result.current.mutateAsync({
      costId: 'cost-new',
      updateData: { quantity: 3 },
      organizationId: 'org-1',
    });

    expect(mocks.updatePayload).toHaveBeenCalledWith('queue-1', {
      description: 'Air filter',
      quantity: 3,
      unitPriceCents: 1250,
    });
    expect(mocks.updateCost).not.toHaveBeenCalled();
    expect(outcome.cost).toMatchObject({ id: 'cost-new', quantity: 3, total_price_cents: 3750 });
  });

  it('cannot be changed or removed once sync has started sending it, when its stock may already be deducted', async () => {
    // A first attempt was made and its answer lost: back to pending, outcome unknown.
    mocks.queuedItems = [queuedPart({ lastMovementBeforeReplay: '2026-11-24T12:00:00.000Z' })];
    const { result } = renderHook(() => useDeleteWorkOrderCostWithInventoryRestore(), { wrapper });

    await expect(result.current.mutateAsync({ costId: 'cost-new', organizationId: 'org-1' })).rejects.toThrow(
      'syncing right now',
    );
    expect(mocks.removeItem).not.toHaveBeenCalled();
  });

  it('leaves cost lines that are on the server to the server', async () => {
    mocks.deleteCost.mockResolvedValue(null);
    const { result } = renderHook(() => useDeleteWorkOrderCostWithInventoryRestore(), { wrapper });

    await result.current.mutateAsync({ costId: 'cost-on-server', organizationId: 'org-1' });

    expect(mocks.deleteCost).toHaveBeenCalledWith('cost-on-server');
    expect(mocks.removeItem).not.toHaveBeenCalled();
  });
});
