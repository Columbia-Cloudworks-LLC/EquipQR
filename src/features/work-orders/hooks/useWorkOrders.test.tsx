/**
 * useWorkOrders Hook Tests
 * 
 * Tests the work orders data fetching hooks with different
 * query scenarios and filter combinations.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createQueryClientWrapper } from '@vitest-harness/utils/test-utils';
import {
  useWorkOrders,
  useWorkOrderById,
  workOrderKeys
} from './useWorkOrders';
import { workOrders as workOrderLibKeys } from '@/lib/queryKeys';
import { workOrders, organizations } from '@vitest-harness/fixtures/entities';

// Mock the WorkOrderService (Vitest 4: constructor mocks must use function/class, not arrow factories)
vi.mock('@/features/work-orders/services/workOrderService', () => ({
  WorkOrderService: vi.fn(function WorkOrderServiceMock() {
    return {
      getAll: vi.fn(),
      getById: vi.fn(),
    };
  }),
}));

import { WorkOrderService } from '@/features/work-orders/services/workOrderService';

const createWrapper = createQueryClientWrapper;

describe('useWorkOrders', () => {
  let mockService: {
    getAll: ReturnType<typeof vi.fn>;
    getById: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockService = {
      getAll: vi.fn().mockResolvedValue({ success: true, data: Object.values(workOrders) }),
      getById: vi.fn(),
    };
    
    vi.mocked(WorkOrderService).mockImplementation(function () {
      return mockService as unknown as WorkOrderService;
    });
  });

  describe('useWorkOrders', () => {
    it('fetches work orders for organization', async () => {
      const { result } = renderHook(
        () => useWorkOrders(organizations.acme.id),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toHaveLength(Object.keys(workOrders).length);
      expect(mockService.getAll).toHaveBeenCalledWith(undefined);
    });

    it('returns empty array when no organization provided', async () => {
      const { result } = renderHook(
        () => useWorkOrders(undefined),
        { wrapper: createWrapper() }
      );

      // Query should be disabled without organizationId
      expect(result.current.fetchStatus).toBe('idle');
    });

    it('applies filters to query', async () => {
      const filters = { status: 'in_progress' as const, priority: 'high' as const };
      
      const { result } = renderHook(
        () => useWorkOrders(organizations.acme.id, { filters }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockService.getAll).toHaveBeenCalledWith(filters);
    });

    it('handles API errors', async () => {
      mockService.getAll.mockResolvedValueOnce({
        success: false,
        error: 'Failed to fetch work orders'
      });

      const { result } = renderHook(
        () => useWorkOrders(organizations.acme.id),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toBe('Failed to fetch work orders');
    });

    it('respects enabled option', async () => {
      const { result } = renderHook(
        () => useWorkOrders(organizations.acme.id, { enabled: false }),
        { wrapper: createWrapper() }
      );

      expect(result.current.fetchStatus).toBe('idle');
      expect(mockService.getAll).not.toHaveBeenCalled();
    });
  });

  describe('useWorkOrderById', () => {
    beforeEach(() => {
      mockService.getById.mockResolvedValue({
        success: true,
        data: workOrders.submitted
      });
    });

    it('fetches single work order by id', async () => {
      const { result } = renderHook(
        () => useWorkOrderById(organizations.acme.id, workOrders.submitted.id),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockService.getById).toHaveBeenCalledWith(workOrders.submitted.id, {
        userTeamIds: [],
        isOrgAdmin: false,
      });
      expect(result.current.data?.id).toBe(workOrders.submitted.id);
    });

    it('does not fetch until enabled after team membership resolves', () => {
      const { result } = renderHook(
        () =>
          useWorkOrderById(organizations.acme.id, workOrders.submitted.id, {
            userTeamIds: ['team-cs'],
            isOrgAdmin: false,
            enabled: false,
          }),
        { wrapper: createWrapper() },
      );

      expect(result.current.fetchStatus).toBe('idle');
      expect(mockService.getById).not.toHaveBeenCalled();
    });

    it('returns null for non-existent work order', async () => {
      mockService.getById.mockResolvedValueOnce({
        success: false,
        error: 'Work order not found'
      });

      const { result } = renderHook(
        () => useWorkOrderById(organizations.acme.id, 'non-existent-id'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeNull();
    });

    it('is disabled without workOrderId', () => {
      const { result } = renderHook(
        () => useWorkOrderById(organizations.acme.id, ''),
        { wrapper: createWrapper() }
      );

      expect(result.current.fetchStatus).toBe('idle');
    });
  });

  describe('workOrderKeys', () => {
    it('generates correct list key', () => {
      const key = workOrderKeys.list(organizations.acme.id);
      expect(key).toEqual(['work-orders', 'list', organizations.acme.id, undefined]);
    });

    it('generates correct list key with filters', () => {
      const filters = { status: 'in_progress' as const };
      const key = workOrderKeys.list(organizations.acme.id, filters);
      expect(key).toEqual(['work-orders', 'list', organizations.acme.id, filters]);
    });

    it('generates correct detail key', () => {
      const key = workOrderKeys.detail(organizations.acme.id, 'wo-1');
      expect(key).toEqual(['work-orders', 'detail', organizations.acme.id, 'wo-1']);
    });

    it('detailScoped factory prefixes the detail key', () => {
      const key = workOrderLibKeys.detailScoped(organizations.acme.id, 'wo-1', 'none');
      expect(key).toEqual([...workOrderKeys.detail(organizations.acme.id, 'wo-1'), 'none']);
    });

    it('generates correct myWorkOrders key', () => {
      const key = workOrderKeys.myWorkOrders(organizations.acme.id, 'user-1');
      expect(key).toEqual(['work-orders', 'list', organizations.acme.id, { assigneeId: 'user-1' }]);
    });

    it('generates correct teamWorkOrders key', () => {
      const key = workOrderKeys.teamWorkOrders(organizations.acme.id, 'team-1', 'active');
      expect(key).toEqual(['work-orders', 'list', organizations.acme.id, { teamId: 'team-1', status: 'active' }]);
    });

    it('generates correct equipmentWorkOrders key', () => {
      const key = workOrderKeys.equipmentWorkOrders(organizations.acme.id, 'eq-1');
      expect(key).toEqual(['work-orders', 'list', organizations.acme.id, { equipmentId: 'eq-1', status: undefined }]);
    });

    it('generates correct overdue key', () => {
      const key = workOrderKeys.overdue(organizations.acme.id);
      expect(key).toEqual(['work-orders', 'list', organizations.acme.id, { dueDateFilter: 'overdue' }]);
    });

    it('generates correct dueToday key', () => {
      const key = workOrderKeys.dueToday(organizations.acme.id);
      expect(key).toEqual(['work-orders', 'list', organizations.acme.id, { dueDateFilter: 'today' }]);
    });
  });

  describe('Error Handling', () => {
    it('handles network errors', async () => {
      mockService.getAll.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(
        () => useWorkOrders(organizations.acme.id),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });
});
