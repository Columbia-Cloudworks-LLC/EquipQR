import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/contexts/OrganizationContext', () => ({
  useOrganization: () => ({ currentOrganization: { id: 'test-org', name: 'Test Org' } }),
}));

vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => ({
    canManageInventory: () => true,
  }),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/features/inventory/services/inventoryService', () => ({
  batchUpdateInventoryItems: vi.fn(),
  adjustInventoryQuantity: vi.fn(),
}));

import { toast } from 'sonner';
import * as inventoryService from '@/features/inventory/services/inventoryService';
import { useBulkEditInventory } from '../useBulkEditInventory';
import type { InventoryItem } from '@/features/inventory/types/inventory';

const mockBatchUpdate = vi.mocked(inventoryService.batchUpdateInventoryItems);
const mockAdjust = vi.mocked(inventoryService.adjustInventoryQuantity);

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return Wrapper;
};

const mockRow = (id: string, overrides: Partial<InventoryItem> = {}): InventoryItem =>
  ({
    id,
    organization_id: 'test-org',
    name: `Item ${id}`,
    description: null,
    sku: `SKU-${id}`,
    external_id: null,
    quantity_on_hand: 50,
    low_stock_threshold: 5,
    location: 'Warehouse A',
    default_unit_cost: '10.00',
    image_url: null,
    isLowStock: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    created_by: 'user-1',
    ...overrides,
  } as unknown as InventoryItem);

describe('useBulkEditInventory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('dirty state tracking', () => {
    it('starts with empty dirty map and selection set', () => {
      const rows = [mockRow('item-1'), mockRow('item-2')];
      const { result } = renderHook(() => useBulkEditInventory(rows), {
        wrapper: createWrapper(),
      });
      expect(result.current.dirtyCount).toBe(0);
      expect(result.current.selectedCount).toBe(0);
    });

    it('setCellValue records a delta for a changed text field', () => {
      const rows = [mockRow('item-1', { location: 'Warehouse A' })];
      const { result } = renderHook(() => useBulkEditInventory(rows), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setCellValue('item-1', 'location', 'Warehouse B');
      });

      expect(result.current.dirtyCount).toBe(1);
      expect(result.current.dirtyRows.get('item-1')).toEqual({ location: 'Warehouse B' });
    });

    it('reverting a field to its initial value clears it from the delta', () => {
      const rows = [mockRow('item-1', { location: 'Warehouse A' })];
      const { result } = renderHook(() => useBulkEditInventory(rows), {
        wrapper: createWrapper(),
      });

      act(() => { result.current.setCellValue('item-1', 'location', 'Warehouse B'); });
      act(() => { result.current.setCellValue('item-1', 'location', 'Warehouse A'); });

      expect(result.current.dirtyCount).toBe(0);
      expect(result.current.dirtyRows.has('item-1')).toBe(false);
    });

    it('setCellValueOnRows applies the same change across many rows', () => {
      const rows = [mockRow('item-1'), mockRow('item-2'), mockRow('item-3')];
      const { result } = renderHook(() => useBulkEditInventory(rows), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setCellValueOnRows(['item-1', 'item-2', 'item-3'], 'location', 'Site B');
      });

      expect(result.current.dirtyCount).toBe(3);
      expect(result.current.dirtyRows.get('item-1')).toEqual({ location: 'Site B' });
      expect(result.current.dirtyRows.get('item-2')).toEqual({ location: 'Site B' });
    });

    it('clearDirty removes every dirty edit', () => {
      const rows = [mockRow('item-1'), mockRow('item-2')];
      const { result } = renderHook(() => useBulkEditInventory(rows), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setCellValue('item-1', 'location', 'Site B');
        result.current.setCellValue('item-2', 'sku', 'NEW-SKU');
      });
      expect(result.current.dirtyCount).toBe(2);

      act(() => { result.current.clearDirty(); });
      expect(result.current.dirtyCount).toBe(0);
    });
  });

  describe('selection', () => {
    it('toggleSelected adds and removes a row from the selection', () => {
      const rows = [mockRow('item-1'), mockRow('item-2')];
      const { result } = renderHook(() => useBulkEditInventory(rows), {
        wrapper: createWrapper(),
      });

      act(() => { result.current.toggleSelected('item-1'); });
      expect(result.current.selectedCount).toBe(1);

      act(() => { result.current.toggleSelected('item-1'); });
      expect(result.current.selectedCount).toBe(0);
    });

    it('selectAll replaces selection with supplied IDs', () => {
      const rows = [mockRow('item-1'), mockRow('item-2'), mockRow('item-3')];
      const { result } = renderHook(() => useBulkEditInventory(rows), {
        wrapper: createWrapper(),
      });

      act(() => { result.current.selectAll(['item-1', 'item-3']); });
      expect(result.current.selectedCount).toBe(2);
      expect(result.current.selectedRowIds.has('item-1')).toBe(true);
      expect(result.current.selectedRowIds.has('item-2')).toBe(false);
    });

    it('clearSelection empties selection without affecting dirty state', () => {
      const rows = [mockRow('item-1')];
      const { result } = renderHook(() => useBulkEditInventory(rows), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.toggleSelected('item-1');
        result.current.setCellValue('item-1', 'location', 'Site B');
      });
      act(() => { result.current.clearSelection(); });

      expect(result.current.selectedCount).toBe(0);
      expect(result.current.dirtyCount).toBe(1);
    });
  });

  describe('commit — metadata update', () => {
    it('calls batchUpdateInventoryItems for metadata changes and clears dirty on success', async () => {
      mockBatchUpdate.mockResolvedValue({ succeeded: ['item-1'], failed: [] });

      const rows = [mockRow('item-1', { location: 'A' })];
      const { result } = renderHook(() => useBulkEditInventory(rows), {
        wrapper: createWrapper(),
      });

      act(() => { result.current.setCellValue('item-1', 'location', 'B'); });
      await act(async () => { await result.current.commit(); });

      await waitFor(() => {
        expect(mockBatchUpdate).toHaveBeenCalledWith('test-org', [
          { id: 'item-1', data: { location: 'B' } },
        ]);
        expect(result.current.dirtyCount).toBe(0);
        expect(toast.success).toHaveBeenCalled();
      });
    });

    it('shows a partial-success toast when some rows fail', async () => {
      mockBatchUpdate.mockResolvedValue({
        succeeded: ['item-1'],
        failed: [{ id: 'item-2', error: 'RLS denied' }],
      });

      const rows = [mockRow('item-1'), mockRow('item-2')];
      const { result } = renderHook(() => useBulkEditInventory(rows), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setCellValue('item-1', 'location', 'B');
        result.current.setCellValue('item-2', 'location', 'C');
      });
      await act(async () => { await result.current.commit(); });

      await waitFor(() => {
        expect(toast.warning).toHaveBeenCalled();
        // item-1 committed, item-2 still dirty
        expect(result.current.dirtyRows.has('item-2')).toBe(true);
      });
    });

    it('does not call batchUpdateInventoryItems when no rows are dirty', async () => {
      const rows = [mockRow('item-1')];
      const { result } = renderHook(() => useBulkEditInventory(rows), {
        wrapper: createWrapper(),
      });

      await act(async () => { await result.current.commit(); });
      expect(mockBatchUpdate).not.toHaveBeenCalled();
    });
  });

  describe('commit — quantity changes via adjustment RPC', () => {
    it('calls adjustInventoryQuantity with correct delta for a quantity change', async () => {
      mockBatchUpdate.mockResolvedValue({ succeeded: ['item-1'], failed: [] });
      mockAdjust.mockResolvedValue(60);

      const rows = [mockRow('item-1', { quantity_on_hand: 50 })];
      const { result } = renderHook(() => useBulkEditInventory(rows), {
        wrapper: createWrapper(),
      });

      act(() => { result.current.setCellValue('item-1', 'quantity_on_hand', 60); });
      await act(async () => { await result.current.commit(); });

      await waitFor(() => {
        expect(mockAdjust).toHaveBeenCalledWith('test-org', {
          itemId: 'item-1',
          delta: 10,
          reason: 'Bulk inventory grid adjustment',
        });
      });
    });

    it('does not call adjustInventoryQuantity when quantity is unchanged', async () => {
      mockBatchUpdate.mockResolvedValue({ succeeded: ['item-1'], failed: [] });

      const rows = [mockRow('item-1', { quantity_on_hand: 50, location: 'A' })];
      const { result } = renderHook(() => useBulkEditInventory(rows), {
        wrapper: createWrapper(),
      });

      // Only location changed; quantity stays at 50
      act(() => { result.current.setCellValue('item-1', 'location', 'B'); });
      await act(async () => { await result.current.commit(); });

      await waitFor(() => {
        expect(mockAdjust).not.toHaveBeenCalled();
      });
    });

    it('marks quantity as failed in summary when adjustInventoryQuantity throws', async () => {
      mockBatchUpdate.mockResolvedValue({ succeeded: [], failed: [] });
      mockAdjust.mockRejectedValue(new Error('RPC error'));

      const rows = [mockRow('item-1', { quantity_on_hand: 50 })];
      const { result } = renderHook(() => useBulkEditInventory(rows), {
        wrapper: createWrapper(),
      });

      act(() => { result.current.setCellValue('item-1', 'quantity_on_hand', 60); });
      await act(async () => { await result.current.commit(); });

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
      });
    });
  });
});
