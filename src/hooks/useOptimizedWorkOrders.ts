import { useQuery } from '@tanstack/react-query';
import { WorkOrderService, WorkOrderFilters, WorkOrder } from '@/services/WorkOrderService';

export type { WorkOrderFilters, WorkOrder } from '@/services/WorkOrderService';

export const useOptimizedFilteredWorkOrders = (organizationId: string, filters?: WorkOrderFilters) => {
  return useQuery({
    queryKey: ['work-orders', organizationId, filters],
    queryFn: async (): Promise<WorkOrder[]> => {
      const service = new WorkOrderService(organizationId);
      const result = await service.getAll(filters);
      if (result.success && result.data) {
        return result.data;
      }
      throw new Error(result.error || 'Failed to fetch work orders');
    },
    enabled: !!organizationId,
    staleTime: 30 * 1000, // 30 seconds
  });
};

export const useOptimizedMyWorkOrders = (organizationId: string, userId: string) => {
  return useQuery({
    queryKey: ['work-orders', organizationId, { assigneeId: userId }],
    queryFn: async (): Promise<WorkOrder[]> => {
      const service = new WorkOrderService(organizationId);
      const result = await service.getMyWorkOrders(userId);
      if (result.success && result.data) {
        return result.data;
      }
      throw new Error(result.error || 'Failed to fetch my work orders');
    },
    enabled: !!organizationId && !!userId,
    staleTime: 30 * 1000,
  });
};

export const useOptimizedTeamWorkOrders = (
  organizationId: string, 
  teamId: string, 
  status?: WorkOrder['status'] | 'all'
) => {
  return useQuery({
    queryKey: ['work-orders', organizationId, { teamId, status }],
    queryFn: async (): Promise<WorkOrder[]> => {
      const service = new WorkOrderService(organizationId);
      const result = await service.getTeamWorkOrders(teamId, status);
      if (result.success && result.data) {
        return result.data;
      }
      throw new Error(result.error || 'Failed to fetch team work orders');
    },
    enabled: !!organizationId && !!teamId,
    staleTime: 30 * 1000,
  });
};

export const useOptimizedEquipmentWorkOrders = (
  organizationId: string, 
  equipmentId: string, 
  status?: WorkOrder['status'] | 'all'
) => {
  return useQuery({
    queryKey: ['work-orders', organizationId, { equipmentId, status }],
    queryFn: async (): Promise<WorkOrder[]> => {
      const service = new WorkOrderService(organizationId);
      const result = await service.getEquipmentWorkOrders(equipmentId, status);
      if (result.success && result.data) {
        return result.data;
      }
      throw new Error(result.error || 'Failed to fetch equipment work orders');
    },
    enabled: !!organizationId && !!equipmentId,
    staleTime: 30 * 1000,
  });
};

export const useOptimizedOverdueWorkOrders = (organizationId: string) => {
  return useQuery({
    queryKey: ['work-orders', organizationId, { dueDateFilter: 'overdue' }],
    queryFn: async (): Promise<WorkOrder[]> => {
      const service = new WorkOrderService(organizationId);
      const result = await service.getOverdueWorkOrders();
      if (result.success && result.data) {
        return result.data;
      }
      throw new Error(result.error || 'Failed to fetch overdue work orders');
    },
    enabled: !!organizationId,
    staleTime: 60 * 1000, // 1 minute
  });
};

export const useOptimizedWorkOrdersDueToday = (organizationId: string) => {
  return useQuery({
    queryKey: ['work-orders', organizationId, { dueDateFilter: 'today' }],
    queryFn: async (): Promise<WorkOrder[]> => {
      const service = new WorkOrderService(organizationId);
      const result = await service.getWorkOrdersDueToday();
      if (result.success && result.data) {
        return result.data;
      }
      throw new Error(result.error || 'Failed to fetch work orders due today');
    },
    enabled: !!organizationId,
    staleTime: 60 * 1000, // 1 minute
  });
};
