import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { InventoryItem } from '@/features/inventory/types/inventory';

type BatchFn = (
  org: string,
  updates: { id: string; data: Record<string, unknown> }[],
) => Promise<{ succeeded: string[]; failed: { id: string; error: string }[] }>;
type AdjustFn = (org: string, adj: { itemId: string; delta: number; reason: string }) => Promise<number>;

const env = vi.hoisted(() => {
  const batch: BatchFn = async (...[, updates]) => ({ succeeded: updates.map((u) => u.id), failed: [] });
  const adjust: AdjustFn = async () => 0;
  return {
  organization: { id: 'org-1', name: 'Org' } as { id: string; name: string } | null,
  canManage: true,
  toasts: [] as { kind: string; message: string }[],
  batch,
  adjust,
  batchCalls: [] as { id: string; data: Record<string, unknown> }[][],
  adjustCalls: [] as { itemId: string; delta: number }[],
  };
});

vi.mock('@/contexts/OrganizationContext', () => ({
  useOrganization: () => ({ currentOrganization: env.organization }),
}));
vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => ({ canManageInventory: () => env.canManage }),
}));
vi.mock('sonner', () => ({
  toast: {
    success: (message: string) => env.toasts.push({ kind: 'success', message }),
    warning: (message: string) => env.toasts.push({ kind: 'warning', message }),
    error: (message: string) => env.toasts.push({ kind: 'error', message }),
  },
}));
vi.mock('@/features/inventory/services/inventoryService', () => ({
  batchUpdateInventoryItems: (org: string, updates: { id: string; data: Record<string, unknown> }[]) => {
    env.batchCalls.push(updates);
    return env.batch(org, updates);
  },
  adjustInventoryQuantity: (org: string, adj: { itemId: string; delta: number; reason: string }) => {
    env.adjustCalls.push({ itemId: adj.itemId, delta: adj.delta });
    return env.adjust(org, adj);
  },
}));

const { useBulkEditInventory } = await import('./useBulkEditInventory');

function item(id: string, overrides: Partial<InventoryItem> = {}): InventoryItem {
  return {
    id,
    organization_id: 'org-1',
    name: `Item ${id}`,
    description: null,
    sku: null,
    external_id: null,
    quantity_on_hand: 50,
    low_stock_threshold: 5,
    location: 'A',
    location_address: null,
    location_city: null,
    location_country: null,
    location_lat: null,
    location_lng: null,
    location_state: null,
    default_unit_cost: 10,
    image_url: null,
    created_at: '2026-01-01T00:00:00Z',
    created_by: null,
    created_by_name: null,
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function setup(rows: InventoryItem[], options?: { canCommit?: boolean }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const invalidated: unknown[] = [];
  const original = client.invalidateQueries.bind(client);
  client.invalidateQueries = (filters, opts) => {
    invalidated.push(filters?.queryKey);
    return original(filters, opts);
  };
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const hook = renderHook(() => useBulkEditInventory(rows, options), { wrapper: Wrapper });
  return { ...hook, invalidated };
}

async function commit(result: { current: { commit: () => Promise<void> } }) {
  await act(async () => {
    await result.current.commit().catch(() => undefined);
  });
}

describe('useBulkEditInventory commit', () => {
  beforeEach(() => {
    env.organization = { id: 'org-1', name: 'Org' };
    env.canManage = true;
    env.toasts = [];
    env.batchCalls = [];
    env.adjustCalls = [];
    env.batch = async (_org, updates) => ({ succeeded: updates.map((u) => u.id), failed: [] });
    env.adjust = async () => 0;
  });

  it('refuses to commit without a selected organization', async () => {
    env.organization = null;
    const { result } = setup([item('a')]);
    act(() => result.current.setCellValue('a', 'location', 'B'));

    await commit(result);

    expect(env.toasts).toEqual([{ kind: 'error', message: 'Organization not selected' }]);
    expect(env.batchCalls).toEqual([]);
  });

  it('refuses to commit without inventory permission, unless the caller allows it', async () => {
    env.canManage = false;
    const denied = setup([item('a')]);
    act(() => denied.result.current.setCellValue('a', 'location', 'B'));
    await commit(denied.result);
    expect(env.toasts).toEqual([{ kind: 'error', message: 'You do not have permission to bulk edit inventory' }]);

    env.toasts = [];
    const allowed = setup([item('a')], { canCommit: true });
    act(() => allowed.result.current.setCellValue('a', 'location', 'B'));
    await commit(allowed.result);
    expect(env.toasts).toEqual([{ kind: 'success', message: 'Updated 1 item' }]);
  });

  it('keeps invalid rows dirty and never sends them', async () => {
    const { result } = setup([item('a'), item('b')]);
    act(() => {
      result.current.setCellValue('a', 'name', '');
      result.current.setCellValue('b', 'quantity_on_hand', 1.5);
    });

    await commit(result);

    expect(env.batchCalls).toEqual([]);
    expect(env.adjustCalls).toEqual([]);
    expect(env.toasts).toEqual([{ kind: 'error', message: 'Failed to update 2 of 2 items' }]);
    expect(result.current.dirtyCount).toBe(2);
  });

  it('never sends edits to rows that are no longer loaded (current behavior: counted as updated)', async () => {
    // NOTE: the row is rejected during validation ("Row not found in initial data"), but the
    // final tally only checks needed updates, so it is reported as updated and cleared.
    const { result } = setup([item('a')]);
    act(() => result.current.setCellValue('ghost', 'quantity_on_hand', 3));

    await commit(result);

    expect(env.batchCalls).toEqual([]);
    expect(env.adjustCalls).toEqual([]);
    expect(env.toasts).toEqual([{ kind: 'success', message: 'Updated 1 item' }]);
  });

  it('counts a row the batch neither confirmed nor rejected as failed', async () => {
    env.batch = async () => ({ succeeded: [], failed: [] });
    const { result } = setup([item('a')]);
    act(() => result.current.setCellValue('a', 'sku', 'NEW'));

    await commit(result);

    expect(env.toasts).toEqual([{ kind: 'error', message: 'Failed to update 1 of 1 item' }]);
    expect(result.current.dirtyRows.get('a')).toEqual({ sku: 'NEW' });
  });

  it('reports a generic failure for a quantity adjustment rejected with a non-Error value', async () => {
    env.adjust = () => Promise.reject('rpc down');
    const { result } = setup([item('a'), item('b')]);
    act(() => {
      result.current.setCellValue('a', 'quantity_on_hand', 55);
      result.current.setCellValue('b', 'location', 'Z');
    });

    await commit(result);

    expect(env.adjustCalls).toEqual([{ itemId: 'a', delta: 5 }]);
    expect(env.toasts).toEqual([{ kind: 'warning', message: 'Updated 1 of 2; 1 failed' }]);
    expect([...result.current.dirtyRows.keys()]).toEqual(['a']);
  });

  it('sends no adjustment when refreshed data already shows the edited quantity (current behavior: reported as failed)', async () => {
    // NOTE: with nothing left to send the row gets no summary, so the tally reports it as a
    // validation failure and keeps it dirty.
    const client = new QueryClient();
    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const { result, rerender } = renderHook(({ rows }) => useBulkEditInventory(rows), {
      wrapper: Wrapper,
      initialProps: { rows: [item('a', { quantity_on_hand: 50 })] },
    });
    act(() => result.current.setCellValue('a', 'quantity_on_hand', 60));
    rerender({ rows: [item('a', { quantity_on_hand: 60 })] });

    await commit(result);

    expect(env.adjustCalls).toEqual([]);
    expect(env.toasts).toEqual([{ kind: 'error', message: 'Failed to update 1 of 1 item' }]);
    expect(result.current.dirtyRows.get('a')).toEqual({ quantity_on_hand: 60 });
  });

  it('still fails a row whose metadata failed without an error message', async () => {
    env.batch = async (_org, updates) => ({ succeeded: [], failed: updates.map((u) => ({ id: u.id, error: '' })) });
    const { result } = setup([item('a')]);
    act(() => result.current.setCellValue('a', 'location', 'Q'));

    await commit(result);

    expect(env.toasts).toEqual([{ kind: 'error', message: 'Failed to update 1 of 1 item' }]);
    expect(result.current.dirtyCount).toBe(1);
  });

  it('saves metadata and quantity together, clears them, and refreshes inventory queries', async () => {
    const { result, invalidated } = setup([item('a'), item('b')]);
    act(() => {
      result.current.setCellValue('a', 'location', 'B');
      result.current.setCellValue('a', 'quantity_on_hand', 40);
      result.current.setCellValue('b', 'default_unit_cost', 12.5);
    });

    await commit(result);

    expect(env.batchCalls).toEqual([[{ id: 'a', data: { location: 'B' } }, { id: 'b', data: { default_unit_cost: 12.5 } }]]);
    expect(env.adjustCalls).toEqual([{ itemId: 'a', delta: -10 }]);
    expect(env.toasts).toEqual([{ kind: 'success', message: 'Updated 2 items' }]);
    expect(result.current.dirtyCount).toBe(0);
    expect(invalidated).toEqual(
      expect.arrayContaining([['inventory-item', 'org-1', 'a'], ['inventory-transactions', 'org-1', 'b']]),
    );
  });

  it('skips cache refresh if the organization is cleared while the commit is in flight', async () => {
    let release: () => void = () => undefined;
    env.batch = (_org, updates) =>
      new Promise((resolve) => {
        release = () => resolve({ succeeded: updates.map((u) => u.id), failed: [] });
      });
    const { result, invalidated, rerender } = setup([item('a')]);
    act(() => result.current.setCellValue('a', 'location', 'B'));

    let pending: Promise<void> = Promise.resolve();
    act(() => {
      pending = result.current.commit();
    });
    await waitFor(() => expect(env.batchCalls).toHaveLength(1));
    env.organization = null;
    rerender();
    await act(async () => {
      release();
      await pending;
    });

    expect(env.toasts).toEqual([{ kind: 'success', message: 'Updated 1 item' }]);
    expect(result.current.dirtyCount).toBe(0);
    expect(invalidated).toEqual([]);
  });
});
