import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/contexts/OrganizationContext', () => ({
  useOrganization: () => ({ currentOrganization: { id: 'test-org', name: 'Test Org' } }),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/features/equipment/services/EquipmentService', () => ({
  EquipmentService: {
    batchUpdate: vi.fn(),
  },
}));

import { toast } from 'sonner';
import { EquipmentService } from '@/features/equipment/services/EquipmentService';
import { useBulkEditEquipment } from '../useBulkEditEquipment';
import type { EquipmentRecord } from '@/features/equipment/types/equipment';

const mockBatchUpdate = vi.mocked(EquipmentService.batchUpdate);

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });

const createWrapper = () => {
  const queryClient = createTestQueryClient();
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return Wrapper;
};

const mockRow = (id: string, overrides: Partial<EquipmentRecord> = {}): EquipmentRecord =>
  ({
    id,
    name: `Equipment ${id}`,
    status: 'active',
    manufacturer: 'Caterpillar',
    model: '320',
    serial_number: `SN-${id}`,
    location: 'Yard A',
    installation_date: '2024-01-01',
    organization_id: 'test-org',
    customer_id: null,
    image_url: null,
    last_maintenance: null,
    last_maintenance_work_order_id: null,
    notes: null,
    custom_attributes: null,
    last_known_location: null,
    team_id: null,
    default_pm_template_id: null,
    warranty_expiration: null,
    working_hours: 100,
    import_id: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  }) as unknown as EquipmentRecord;

describe('useBulkEditEquipment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('dirty state tracking', () => {
    it('starts with an empty dirty map and selection set', () => {
      const rows = [mockRow('eq-1'), mockRow('eq-2')];
      const { result } = renderHook(() => useBulkEditEquipment(rows), {
        wrapper: createWrapper(),
      });
      expect(result.current.dirtyCount).toBe(0);
      expect(result.current.selectedCount).toBe(0);
      expect(result.current.dirtyRows.size).toBe(0);
      expect(result.current.selectedRowIds.size).toBe(0);
    });

    it('setCellValue records a delta against the initial value', () => {
      const rows = [mockRow('eq-1', { manufacturer: 'Caterpillar' })];
      const { result } = renderHook(() => useBulkEditEquipment(rows), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setCellValue('eq-1', 'manufacturer', 'Komatsu');
      });

      expect(result.current.dirtyCount).toBe(1);
      expect(result.current.dirtyRows.get('eq-1')).toEqual({ manufacturer: 'Komatsu' });
    });

    it('reverting to the initial value clears the field from the delta', () => {
      const rows = [mockRow('eq-1', { manufacturer: 'Caterpillar' })];
      const { result } = renderHook(() => useBulkEditEquipment(rows), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setCellValue('eq-1', 'manufacturer', 'Komatsu');
      });
      act(() => {
        result.current.setCellValue('eq-1', 'manufacturer', 'Caterpillar');
      });

      expect(result.current.dirtyCount).toBe(0);
      expect(result.current.dirtyRows.has('eq-1')).toBe(false);
    });

    it('setCellValueOnRows applies the same change across many rows', () => {
      const rows = [mockRow('eq-1'), mockRow('eq-2'), mockRow('eq-3')];
      const { result } = renderHook(() => useBulkEditEquipment(rows), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setCellValueOnRows(['eq-1', 'eq-2', 'eq-3'], 'location', 'Site B');
      });

      expect(result.current.dirtyCount).toBe(3);
      expect(result.current.dirtyRows.get('eq-1')).toEqual({ location: 'Site B' });
      expect(result.current.dirtyRows.get('eq-2')).toEqual({ location: 'Site B' });
      expect(result.current.dirtyRows.get('eq-3')).toEqual({ location: 'Site B' });
    });

    it('clearDirty removes every dirty edit', () => {
      const rows = [mockRow('eq-1'), mockRow('eq-2')];
      const { result } = renderHook(() => useBulkEditEquipment(rows), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setCellValue('eq-1', 'location', 'Site B');
        result.current.setCellValue('eq-2', 'status', 'maintenance');
      });
      expect(result.current.dirtyCount).toBe(2);

      act(() => {
        result.current.clearDirty();
      });
      expect(result.current.dirtyCount).toBe(0);
    });
  });

  describe('selection', () => {
    it('toggleSelected adds and removes a row from the selection', () => {
      const rows = [mockRow('eq-1'), mockRow('eq-2')];
      const { result } = renderHook(() => useBulkEditEquipment(rows), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.toggleSelected('eq-1');
      });
      expect(result.current.selectedCount).toBe(1);
      expect(result.current.selectedRowIds.has('eq-1')).toBe(true);

      act(() => {
        result.current.toggleSelected('eq-1');
      });
      expect(result.current.selectedCount).toBe(0);
    });

    it('selectAll replaces the selection with the supplied ids', () => {
      const rows = [mockRow('eq-1'), mockRow('eq-2'), mockRow('eq-3')];
      const { result } = renderHook(() => useBulkEditEquipment(rows), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.selectAll(['eq-1', 'eq-3']);
      });
      expect(result.current.selectedCount).toBe(2);
      expect(result.current.selectedRowIds.has('eq-1')).toBe(true);
      expect(result.current.selectedRowIds.has('eq-3')).toBe(true);
      expect(result.current.selectedRowIds.has('eq-2')).toBe(false);
    });

    it('clearSelection empties the selection without affecting dirty state', () => {
      const rows = [mockRow('eq-1')];
      const { result } = renderHook(() => useBulkEditEquipment(rows), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.toggleSelected('eq-1');
        result.current.setCellValue('eq-1', 'location', 'Site B');
      });
      act(() => {
        result.current.clearSelection();
      });
      expect(result.current.selectedCount).toBe(0);
      expect(result.current.dirtyCount).toBe(1);
    });
  });

  describe('commit()', () => {
    it('is a no-op when there are no dirty rows', async () => {
      const rows = [mockRow('eq-1')];
      const { result } = renderHook(() => useBulkEditEquipment(rows), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.commit();
      });

      expect(mockBatchUpdate).not.toHaveBeenCalled();
    });

    it('on full success, clears dirty state and fires sonner.success', async () => {
      mockBatchUpdate.mockResolvedValueOnce({
        success: true,
        data: { succeeded: ['eq-1', 'eq-2'], failed: [] },
        error: null,
      });

      const rows = [mockRow('eq-1'), mockRow('eq-2')];
      const { result } = renderHook(() => useBulkEditEquipment(rows), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setCellValue('eq-1', 'location', 'Site B');
        result.current.setCellValue('eq-2', 'manufacturer', 'Komatsu');
      });

      await act(async () => {
        await result.current.commit();
      });

      expect(mockBatchUpdate).toHaveBeenCalledWith('test-org', [
        { id: 'eq-1', data: { location: 'Site B' } },
        { id: 'eq-2', data: { manufacturer: 'Komatsu' } },
      ]);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Updated 2 equipment');
      });
      expect(result.current.dirtyCount).toBe(0);
    });

    it('on partial failure, surfaces sonner.warning and keeps failed rows dirty', async () => {
      mockBatchUpdate.mockResolvedValueOnce({
        success: true,
        data: {
          succeeded: ['eq-1'],
          failed: [{ id: 'eq-2', error: 'permission denied' }],
        },
        error: null,
      });

      const rows = [mockRow('eq-1'), mockRow('eq-2')];
      const { result } = renderHook(() => useBulkEditEquipment(rows), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setCellValue('eq-1', 'location', 'Site B');
        result.current.setCellValue('eq-2', 'location', 'Site C');
      });

      await act(async () => {
        await result.current.commit();
      });

      await waitFor(() => {
        expect(toast.warning).toHaveBeenCalledWith('Updated 1 of 2; 1 failed');
      });
      // Successful row clears; failed row stays dirty so the user can retry.
      expect(result.current.dirtyRows.has('eq-1')).toBe(false);
      expect(result.current.dirtyRows.has('eq-2')).toBe(true);
    });

    it('on full failure, surfaces sonner.error and preserves dirty state', async () => {
      mockBatchUpdate.mockResolvedValueOnce({
        success: true,
        data: {
          succeeded: [],
          failed: [
            { id: 'eq-1', error: 'database unavailable' },
            { id: 'eq-2', error: 'database unavailable' },
          ],
        },
        error: null,
      });

      const rows = [mockRow('eq-1'), mockRow('eq-2')];
      const { result } = renderHook(() => useBulkEditEquipment(rows), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setCellValue('eq-1', 'location', 'Site B');
        result.current.setCellValue('eq-2', 'location', 'Site C');
      });

      await act(async () => {
        await result.current.commit();
      });

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to update 2 of 2 equipment');
      });
      expect(result.current.dirtyCount).toBe(2);
    });

    it('rejects rows that fail zod partial validation without calling the service for them', async () => {
      mockBatchUpdate.mockResolvedValueOnce({
        success: true,
        data: { succeeded: ['eq-1'], failed: [] },
        error: null,
      });

      const rows = [mockRow('eq-1'), mockRow('eq-2')];
      const { result } = renderHook(() => useBulkEditEquipment(rows), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setCellValue('eq-1', 'location', 'Site B');
        // Empty manufacturer fails the schema's `.min(1)` constraint.
        result.current.setCellValue('eq-2', 'manufacturer', '');
      });

      await act(async () => {
        await result.current.commit();
      });

      // Only the valid row reaches the service.
      expect(mockBatchUpdate).toHaveBeenCalledWith('test-org', [
        { id: 'eq-1', data: { location: 'Site B' } },
      ]);

      await waitFor(() => {
        expect(toast.warning).toHaveBeenCalled();
      });
      // The successful eq-1 clears; the validation-rejected eq-2 stays dirty.
      expect(result.current.dirtyRows.has('eq-2')).toBe(true);
    });
  });
});
