/**
 * useWorkOrderCosts Hook Tests
 *
 * Covers the suite of React Query hooks for managing work order cost items,
 * including query hooks (useWorkOrderCosts, useWorkOrderCostById) and mutation
 * hooks for CRUD operations with optional inventory adjustment side-effects.
 *
 * Intentionally deferred: getWorkOrderCosts with organizationId multi-tenancy
 * guard — this lives in the service layer and is covered by the service-level
 * tests (workOrderCostsService). The hooks tested here mock the entire service
 * module, so internal service branches are out-of-scope for this file.
 */

import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Service mocks ──────────────────────────────────────────────────────────
vi.mock('@/features/work-orders/services/workOrderCostsService', () => ({
  getWorkOrderCosts: vi.fn(),
  createWorkOrderCost: vi.fn(),
  updateWorkOrderCost: vi.fn(),
  deleteWorkOrderCost: vi.fn(),
  deleteWorkOrderCostWithInventoryInfo: vi.fn(),
  updateWorkOrderCostWithQuantityTracking: vi.fn(),
  getWorkOrderCostById: vi.fn(),
}));

vi.mock('@/features/inventory/services/inventoryService', () => ({
  adjustInventoryQuantity: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('@/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

// ── Imports (after mocks) ──────────────────────────────────────────────────
import {
  useWorkOrderCosts,
  useCreateWorkOrderCost,
  useUpdateWorkOrderCost,
  useDeleteWorkOrderCost,
  useDeleteWorkOrderCostWithInventoryRestore,
  useUpdateWorkOrderCostWithInventory,
  useWorkOrderCostById,
} from '../useWorkOrderCosts';

import {
  getWorkOrderCosts,
  createWorkOrderCost,
  updateWorkOrderCost,
  deleteWorkOrderCost,
  deleteWorkOrderCostWithInventoryInfo,
  updateWorkOrderCostWithQuantityTracking,
  getWorkOrderCostById,
} from '@/features/work-orders/services/workOrderCostsService';

import { adjustInventoryQuantity } from '@/features/inventory/services/inventoryService';
import { toast } from 'sonner';

// ── Fixtures ───────────────────────────────────────────────────────────────
const WORK_ORDER_ID = 'wo-test-123';
const COST_ID = 'cost-test-456';
const ORG_ID = 'org-test-789';

const mockCost = {
  id: COST_ID,
  work_order_id: WORK_ORDER_ID,
  description: 'Test part',
  quantity: 2,
  unit_price_cents: 5000,
  total_price_cents: 10000,
  created_by: 'user-1',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  created_by_name: 'Alice',
  inventory_item_id: null,
};

const mockCostWithInventory = {
  ...mockCost,
  id: 'cost-inv-123',
  inventory_item_id: 'inv-item-abc',
};

// ── Wrapper ────────────────────────────────────────────────────────────────
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

// ══════════════════════════════════════════════════════════════════════════
describe('useWorkOrderCosts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches costs when workOrderId is provided', async () => {
    vi.mocked(getWorkOrderCosts).mockResolvedValueOnce([mockCost]);

    const { result } = renderHook(() => useWorkOrderCosts(WORK_ORDER_ID), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([mockCost]);
    expect(getWorkOrderCosts).toHaveBeenCalledWith(WORK_ORDER_ID);
  });

  it('is disabled when workOrderId is empty', () => {
    const { result } = renderHook(() => useWorkOrderCosts(''), {
      wrapper: createWrapper(),
    });

    expect(result.current.isFetching).toBe(false);
    expect(result.current.fetchStatus).toBe('idle');
    expect(getWorkOrderCosts).not.toHaveBeenCalled();
  });

  it('propagates fetch errors', async () => {
    vi.mocked(getWorkOrderCosts).mockRejectedValueOnce(new Error('DB error'));

    const { result } = renderHook(() => useWorkOrderCosts(WORK_ORDER_ID), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(Error);
  });
});

// ══════════════════════════════════════════════════════════════════════════
describe('useCreateWorkOrderCost', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls createWorkOrderCost and shows success toast on success', async () => {
    vi.mocked(createWorkOrderCost).mockResolvedValueOnce(mockCost);

    const { result } = renderHook(() => useCreateWorkOrderCost(), {
      wrapper: createWrapper(),
    });

    const payload = {
      work_order_id: WORK_ORDER_ID,
      description: 'Test part',
      quantity: 2,
      unit_price_cents: 5000,
    };

    await act(async () => {
      await result.current.mutateAsync(payload as Parameters<typeof createWorkOrderCost>[0]);
    });

    // TanStack Query v5 passes a mutation context as second arg — assert only the variables
    expect(vi.mocked(createWorkOrderCost).mock.calls[0][0]).toEqual(payload);
    expect(toast.success).toHaveBeenCalledWith('Cost item added successfully');
  });

  it('shows error toast and does not throw when createWorkOrderCost fails', async () => {
    vi.mocked(createWorkOrderCost).mockRejectedValueOnce(new Error('Insert failed'));

    const { result } = renderHook(() => useCreateWorkOrderCost(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ work_order_id: WORK_ORDER_ID, description: 'x', quantity: 1, unit_price_cents: 100 } as Parameters<typeof createWorkOrderCost>[0]);
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(toast.error).toHaveBeenCalledWith('Failed to add cost item');
  });
});

// ══════════════════════════════════════════════════════════════════════════
describe('useUpdateWorkOrderCost', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls updateWorkOrderCost and shows success toast on success', async () => {
    const updatedCost = { ...mockCost, description: 'Updated part' };
    vi.mocked(updateWorkOrderCost).mockResolvedValueOnce(updatedCost);

    const { result } = renderHook(() => useUpdateWorkOrderCost(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({ costId: COST_ID, updateData: { description: 'Updated part' } });
    });

    expect(updateWorkOrderCost).toHaveBeenCalledWith(COST_ID, { description: 'Updated part' });
    expect(toast.success).toHaveBeenCalledWith('Cost item updated successfully');
  });

  it('shows error toast when updateWorkOrderCost fails', async () => {
    vi.mocked(updateWorkOrderCost).mockRejectedValueOnce(new Error('Update failed'));

    const { result } = renderHook(() => useUpdateWorkOrderCost(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ costId: COST_ID, updateData: { description: 'x' } });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(toast.error).toHaveBeenCalledWith('Failed to update cost item');
  });
});

// ══════════════════════════════════════════════════════════════════════════
describe('useDeleteWorkOrderCost', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls deleteWorkOrderCost and shows success toast on success', async () => {
    vi.mocked(deleteWorkOrderCost).mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useDeleteWorkOrderCost(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync(COST_ID);
    });

    expect(deleteWorkOrderCost).toHaveBeenCalledWith(COST_ID, expect.objectContaining({ client: expect.anything() }));
    expect(toast.success).toHaveBeenCalledWith('Cost item deleted successfully');
  });

  it('shows error toast when deleteWorkOrderCost fails', async () => {
    vi.mocked(deleteWorkOrderCost).mockRejectedValueOnce(new Error('Delete failed'));

    const { result } = renderHook(() => useDeleteWorkOrderCost(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate(COST_ID);
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(toast.error).toHaveBeenCalledWith('Failed to delete cost item');
  });
});

// ══════════════════════════════════════════════════════════════════════════
describe('useDeleteWorkOrderCostWithInventoryRestore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('restores inventory and shows quantity toast when cost was from inventory', async () => {
    vi.mocked(deleteWorkOrderCostWithInventoryInfo).mockResolvedValueOnce({
      inventory_item_id: 'inv-item-abc',
      quantity: 3,
    });
    vi.mocked(adjustInventoryQuantity).mockResolvedValueOnce(undefined as never);

    const { result } = renderHook(() => useDeleteWorkOrderCostWithInventoryRestore(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({ costId: COST_ID, organizationId: ORG_ID });
    });

    expect(deleteWorkOrderCostWithInventoryInfo).toHaveBeenCalledWith(COST_ID);
    expect(adjustInventoryQuantity).toHaveBeenCalledWith(ORG_ID, {
      itemId: 'inv-item-abc',
      delta: 3,
      reason: 'Restored from deleted work order cost',
    });
    expect(toast.success).toHaveBeenCalledWith('Cost deleted. 3 unit(s) restored to inventory.');
  });

  it('deletes without inventory adjustment and shows basic toast when cost has no inventory link', async () => {
    vi.mocked(deleteWorkOrderCostWithInventoryInfo).mockResolvedValueOnce(null);

    const { result } = renderHook(() => useDeleteWorkOrderCostWithInventoryRestore(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({ costId: COST_ID, organizationId: ORG_ID });
    });

    expect(adjustInventoryQuantity).not.toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith('Cost item deleted successfully');
  });

  it('shows error toast when deletion fails', async () => {
    vi.mocked(deleteWorkOrderCostWithInventoryInfo).mockRejectedValueOnce(
      new Error('Cost item not found')
    );

    const { result } = renderHook(() => useDeleteWorkOrderCostWithInventoryRestore(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ costId: COST_ID, organizationId: ORG_ID });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(toast.error).toHaveBeenCalledWith('Failed to delete cost item');
  });
});

// ══════════════════════════════════════════════════════════════════════════
describe('useUpdateWorkOrderCostWithInventory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('adjusts inventory and shows "restored to" toast when delta is positive', async () => {
    // current qty=3, new qty=1 → delta=2 (positive → returning 2 to inventory)
    const updatedCost = { ...mockCostWithInventory, quantity: 1 };
    vi.mocked(updateWorkOrderCostWithQuantityTracking).mockResolvedValueOnce({
      cost: updatedCost,
      inventoryAdjustment: { inventory_item_id: 'inv-item-abc', delta: 2 },
    });
    vi.mocked(adjustInventoryQuantity).mockResolvedValueOnce(undefined as never);

    const { result } = renderHook(() => useUpdateWorkOrderCostWithInventory(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({
        costId: COST_ID,
        updateData: { quantity: 1 },
        organizationId: ORG_ID,
      });
    });

    expect(adjustInventoryQuantity).toHaveBeenCalledWith(ORG_ID, {
      itemId: 'inv-item-abc',
      delta: 2,
      reason: 'Returned from work order cost quantity reduction',
    });
    expect(toast.success).toHaveBeenCalledWith('Cost updated. 2 unit(s) restored to inventory.');
  });

  it('adjusts inventory and shows "taken from" toast when delta is negative', async () => {
    // current qty=1, new qty=4 → delta=-3 (negative → taking 3 more from inventory)
    const updatedCost = { ...mockCostWithInventory, quantity: 4 };
    vi.mocked(updateWorkOrderCostWithQuantityTracking).mockResolvedValueOnce({
      cost: updatedCost,
      inventoryAdjustment: { inventory_item_id: 'inv-item-abc', delta: -3 },
    });
    vi.mocked(adjustInventoryQuantity).mockResolvedValueOnce(undefined as never);

    const { result } = renderHook(() => useUpdateWorkOrderCostWithInventory(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({
        costId: COST_ID,
        updateData: { quantity: 4 },
        organizationId: ORG_ID,
      });
    });

    expect(adjustInventoryQuantity).toHaveBeenCalledWith(ORG_ID, {
      itemId: 'inv-item-abc',
      delta: -3,
      reason: 'Used in work order cost quantity increase',
    });
    expect(toast.success).toHaveBeenCalledWith('Cost updated. 3 unit(s) taken from inventory.');
  });

  it('shows plain success toast when no inventory adjustment is needed', async () => {
    const nonInventoryCost = { ...mockCost };
    vi.mocked(updateWorkOrderCostWithQuantityTracking).mockResolvedValueOnce({
      cost: nonInventoryCost,
      inventoryAdjustment: null,
    });

    const { result } = renderHook(() => useUpdateWorkOrderCostWithInventory(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({
        costId: COST_ID,
        updateData: { description: 'Changed description' },
        organizationId: ORG_ID,
      });
    });

    expect(adjustInventoryQuantity).not.toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith('Cost item updated successfully');
  });

  it('shows error toast when update fails', async () => {
    vi.mocked(updateWorkOrderCostWithQuantityTracking).mockRejectedValueOnce(
      new Error('Update conflict')
    );

    const { result } = renderHook(() => useUpdateWorkOrderCostWithInventory(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({
        costId: COST_ID,
        updateData: { quantity: 5 },
        organizationId: ORG_ID,
      });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(toast.error).toHaveBeenCalledWith('Failed to update cost item');
  });
});

// ══════════════════════════════════════════════════════════════════════════
describe('useWorkOrderCostById', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches a single cost when costId is provided', async () => {
    vi.mocked(getWorkOrderCostById).mockResolvedValueOnce(mockCost);

    const { result } = renderHook(() => useWorkOrderCostById(COST_ID), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockCost);
    expect(getWorkOrderCostById).toHaveBeenCalledWith(COST_ID);
  });

  it('is disabled when costId is undefined', () => {
    const { result } = renderHook(() => useWorkOrderCostById(undefined), {
      wrapper: createWrapper(),
    });

    expect(result.current.isFetching).toBe(false);
    expect(result.current.fetchStatus).toBe('idle');
    expect(getWorkOrderCostById).not.toHaveBeenCalled();
  });

  it('returns null when cost is not found', async () => {
    vi.mocked(getWorkOrderCostById).mockResolvedValueOnce(null);

    const { result } = renderHook(() => useWorkOrderCostById(COST_ID), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
  });

  it('propagates fetch errors', async () => {
    vi.mocked(getWorkOrderCostById).mockRejectedValueOnce(new Error('Not found'));

    const { result } = renderHook(() => useWorkOrderCostById(COST_ID), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
