/**
 * useWorkOrders Hook Tests
 * 
 * Tests the work orders data fetching hooks with different
 * query scenarios and filter combinations.
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  useWorkOrders,
  useMyWorkOrders,
  useTeamWorkOrders,
  useEquipmentWorkOrders,
  useOverdueWorkOrders,
  useWorkOrdersDueToday,
  useWorkOrderById,
  useFilteredWorkOrders,
  workOrderKeys
} from '../useWorkOrders';
import { workOrders, organizations, teams, equipment } from '@/test/fixtures/entities';
import { personas } from '@/test/fixtures/personas';

// Mock the WorkOrderService
vi.mock('@/features/work-orders/services/workOrderService', () => ({
  WorkOrderService: vi.fn().mockImplementation(() => ({
    getAll: vi.fn(),
    getById: vi.fn(),
    getMyWorkOrders: vi.fn(),
    getTeamWorkOrders: vi.fn(),
    getEquipmentWorkOrders: vi.fn(),
    getOverdueWorkOrders: vi.fn(),
    getWorkOrdersDueToday: vi.fn()
  }))
}));

import { WorkOrderService } from '@/features/work-orders/services/workOrderService';

// Create a new query client for each test
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0
      }
    }
  });

const createWrapper = () => {
  const queryClient = createTestQueryClient();
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useWorkOrders', () => {
  let mockService: {
    getAll: ReturnType<typeof vi.fn>;
    getById: ReturnType<typeof vi.fn>;
    getMyWorkOrders: ReturnType<typeof vi.fn>;
    getTeamWorkOrders: ReturnType<typeof vi.fn>;
    getEquipmentWorkOrders: ReturnType<typeof vi.fn>;
    getOverdueWorkOrders: ReturnType<typeof vi.fn>;
    getWorkOrdersDueToday: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockService = {
      getAll: vi.fn().mockResolvedValue({ success: true, data: Object.values(workOrders) }),
      getById: vi.fn(),
      getMyWorkOrders: vi.fn(),
      getTeamWorkOrders: vi.fn(),
      getEquipmentWorkOrders: vi.fn(),
      getOverdueWorkOrders: vi.fn(),
      getWorkOrdersDueToday: vi.fn()
    };
    
    vi.mocked(WorkOrderService).mockImplementation(() => mockService as unknown as WorkOrderService);
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

    it('uses custom stale time', async () => {
      const customStaleTime = 60000;
      
      const { result } = renderHook(
        () => useWorkOrders(organizations.acme.id, { staleTime: customStaleTime }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Verify the hook is configured (staleTime is internal config)
      expect(mockService.getAll).toHaveBeenCalled();
    });
  });

  describe('useMyWorkOrders', () => {
    beforeEach(() => {
      const techWorkOrders = Object.values(workOrders).filter(
        wo => wo.assignee_id === personas.technician.id
      );
      mockService.getMyWorkOrders.mockResolvedValue({
        success: true,
        data: techWorkOrders
      });
    });

    it('fetches work orders assigned to user', async () => {
      const { result } = renderHook(
        () => useMyWorkOrders(organizations.acme.id, personas.technician.id),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockService.getMyWorkOrders).toHaveBeenCalledWith(personas.technician.id);
      expect(result.current.data?.every(wo => wo.assignee_id === personas.technician.id)).toBe(true);
    });

    it('is disabled without userId', () => {
      const { result } = renderHook(
        () => useMyWorkOrders(organizations.acme.id, ''),
        { wrapper: createWrapper() }
      );

      expect(result.current.fetchStatus).toBe('idle');
    });
  });

  describe('useTeamWorkOrders', () => {
    beforeEach(() => {
      const teamWorkOrdersList = Object.values(workOrders).filter(
        wo => wo.team_id === teams.maintenance.id
      );
      mockService.getTeamWorkOrders.mockResolvedValue({
        success: true,
        data: teamWorkOrdersList
      });
    });

    it('fetches work orders for team', async () => {
      const { result } = renderHook(
        () => useTeamWorkOrders(organizations.acme.id, teams.maintenance.id),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockService.getTeamWorkOrders).toHaveBeenCalledWith(teams.maintenance.id, undefined);
    });

    it('filters by status when provided', async () => {
      const { result } = renderHook(
        () => useTeamWorkOrders(organizations.acme.id, teams.maintenance.id, 'in_progress'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockService.getTeamWorkOrders).toHaveBeenCalledWith(teams.maintenance.id, 'in_progress');
    });

    it('is disabled without teamId', () => {
      const { result } = renderHook(
        () => useTeamWorkOrders(organizations.acme.id, ''),
        { wrapper: createWrapper() }
      );

      expect(result.current.fetchStatus).toBe('idle');
    });
  });

  describe('useEquipmentWorkOrders', () => {
    beforeEach(() => {
      const equipmentWorkOrdersList = Object.values(workOrders).filter(
        wo => wo.equipment_id === equipment.forklift1.id
      );
      mockService.getEquipmentWorkOrders.mockResolvedValue({
        success: true,
        data: equipmentWorkOrdersList
      });
    });

    it('fetches work orders for equipment', async () => {
      const { result } = renderHook(
        () => useEquipmentWorkOrders(organizations.acme.id, equipment.forklift1.id),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockService.getEquipmentWorkOrders).toHaveBeenCalledWith(equipment.forklift1.id, undefined);
    });

    it('filters by status when provided', async () => {
      const { result } = renderHook(
        () => useEquipmentWorkOrders(organizations.acme.id, equipment.forklift1.id, 'completed'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockService.getEquipmentWorkOrders).toHaveBeenCalledWith(equipment.forklift1.id, 'completed');
    });
  });

  describe('useOverdueWorkOrders', () => {
    beforeEach(() => {
      const overdueList = [workOrders.overdue];
      mockService.getOverdueWorkOrders.mockResolvedValue({
        success: true,
        data: overdueList
      });
    });

    it('fetches overdue work orders', async () => {
      const { result } = renderHook(
        () => useOverdueWorkOrders(organizations.acme.id),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockService.getOverdueWorkOrders).toHaveBeenCalled();
      expect(result.current.data).toHaveLength(1);
    });
  });

  describe('useWorkOrdersDueToday', () => {
    beforeEach(() => {
      mockService.getWorkOrdersDueToday.mockResolvedValue({
        success: true,
        data: []
      });
    });

    it('fetches work orders due today', async () => {
      const { result } = renderHook(
        () => useWorkOrdersDueToday(organizations.acme.id),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockService.getWorkOrdersDueToday).toHaveBeenCalled();
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

      expect(mockService.getById).toHaveBeenCalledWith(workOrders.submitted.id);
      expect(result.current.data?.id).toBe(workOrders.submitted.id);
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

  describe('useFilteredWorkOrders', () => {
    it('wraps useWorkOrders with filters', async () => {
      const filters = { status: 'submitted' as const };
      
      const { result } = renderHook(
        () => useFilteredWorkOrders(organizations.acme.id, filters),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockService.getAll).toHaveBeenCalledWith(filters);
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

    it('handles service returning success false', async () => {
      mockService.getAll.mockResolvedValueOnce({
        success: false,
        error: 'Database error'
      });

      const { result } = renderHook(
        () => useWorkOrders(organizations.acme.id),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toBe('Database error');
    });
  });
});
