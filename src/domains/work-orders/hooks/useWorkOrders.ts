/**
 * Consolidated Work Order Hooks
 * Uses the new service architecture and hook factories
 * Follows SOLID principles with composition over inheritance
 */

import { useMemo } from 'react';
import { createQueryHook, createMutationHook, useCrudHooks } from '@/shared/base/BaseHook';
import { createWorkOrderService, WorkOrderService } from '../services/WorkOrderService';
import { createWorkOrderCostsService, WorkOrderCostsService } from '../services/WorkOrderCostsService';
import { 
  WorkOrder, 
  EnhancedWorkOrder, 
  CreateWorkOrderData, 
  UpdateWorkOrderData,
  WorkOrderFilters,
  WorkOrderStats
} from '../types/WorkOrder';
import { 
  WorkOrderCost, 
  CreateWorkOrderCostData, 
  UpdateWorkOrderCostData 
} from '../types/WorkOrderCosts';
import { ApiResponse } from '@/shared/types/common';

/**
 * Hook factory for work order queries
 */
const createWorkOrderQueryHook = (organizationId: string) => {
  const service = createWorkOrderService(organizationId);
  
  return {
    useFilteredWorkOrders: createQueryHook(
      'work-orders-filtered',
      (filters: WorkOrderFilters) => service.getFilteredWorkOrders(filters)
    ),
    useMyWorkOrders: createQueryHook(
      'my-work-orders',
      (userId: string) => service.getMyWorkOrders(userId)
    ),
    useTeamWorkOrders: createQueryHook(
      'team-work-orders',
      ({ teamId, status }: { teamId: string; status?: string }) => 
        service.getTeamWorkOrders(teamId, status)
    ),
    useEquipmentWorkOrders: createQueryHook(
      'equipment-work-orders',
      (equipmentId: string) => service.getEquipmentWorkOrders(equipmentId)
    ),
    useOverdueWorkOrders: createQueryHook(
      'overdue-work-orders',
      () => service.getOverdueWorkOrders()
    ),
    useWorkOrdersDueToday: createQueryHook(
      'work-orders-due-today',
      () => service.getWorkOrdersDueToday()
    ),
    useSearchWorkOrders: createQueryHook(
      'search-work-orders',
      (searchTerm: string) => service.searchWorkOrders(searchTerm)
    ),
    useWorkOrderStats: createQueryHook(
      'work-order-stats',
      () => service.getWorkOrderStats()
    )
  };
};

/**
 * Hook factory for work order mutations
 */
const createWorkOrderMutationHook = (organizationId: string) => {
  const service = createWorkOrderService(organizationId);
  
  return {
    useCreateWorkOrder: createMutationHook(
      service.createWorkOrder,
      {
        onSuccessMessage: 'Work order created successfully',
        onErrorMessage: 'Failed to create work order'
      }
    ),
    useUpdateWorkOrder: createMutationHook(
      ({ id, data }: { id: string; data: UpdateWorkOrderData }) => 
        service.updateWorkOrder(id, data),
      {
        onSuccessMessage: 'Work order updated successfully',
        onErrorMessage: 'Failed to update work order'
      }
    ),
    useDeleteWorkOrder: createMutationHook(
      (id: string) => service.deleteWorkOrder(id),
      {
        onSuccessMessage: 'Work order deleted successfully',
        onErrorMessage: 'Failed to delete work order'
      }
    )
  };
};

/**
 * Hook factory for work order costs
 */
const createWorkOrderCostsQueryHook = (organizationId: string) => {
  const service = createWorkOrderCostsService(organizationId);
  
  return {
    useWorkOrderCosts: createQueryHook(
      'work-order-costs',
      (workOrderId: string) => service.getWorkOrderCosts(workOrderId)
    ),
    useMyCosts: createQueryHook(
      'my-costs',
      (userId: string) => service.getMyCosts(userId)
    ),
    useCostSummary: createQueryHook(
      'cost-summary',
      (workOrderId: string) => service.getCostSummary(workOrderId)
    )
  };
};

/**
 * Hook factory for work order costs mutations
 */
const createWorkOrderCostsMutationHook = (organizationId: string) => {
  const service = createWorkOrderCostsService(organizationId);
  
  return {
    useCreateWorkOrderCost: createMutationHook(
      service.createWorkOrderCost,
      {
        onSuccessMessage: 'Cost item added successfully',
        onErrorMessage: 'Failed to add cost item'
      }
    ),
    useUpdateWorkOrderCost: createMutationHook(
      ({ id, data }: { id: string; data: UpdateWorkOrderCostData }) => 
        service.updateWorkOrderCost(id, data),
      {
        onSuccessMessage: 'Cost item updated successfully',
        onErrorMessage: 'Failed to update cost item'
      }
    ),
    useDeleteWorkOrderCost: createMutationHook(
      (id: string) => service.deleteWorkOrderCost(id),
      {
        onSuccessMessage: 'Cost item deleted successfully',
        onErrorMessage: 'Failed to delete cost item'
      }
    )
  };
};

/**
 * Main hook for work order operations
 */
export function useWorkOrders(organizationId: string) {
  const queryHooks = useMemo(() => createWorkOrderQueryHook(organizationId), [organizationId]);
  const mutationHooks = useMemo(() => createWorkOrderMutationHook(organizationId), [organizationId]);
  
  return {
    // Queries
    ...queryHooks,
    
    // Mutations
    ...mutationHooks
  };
}

/**
 * Main hook for work order costs operations
 */
export function useWorkOrderCosts(organizationId: string) {
  const queryHooks = useMemo(() => createWorkOrderCostsQueryHook(organizationId), [organizationId]);
  const mutationHooks = useMemo(() => createWorkOrderCostsMutationHook(organizationId), [organizationId]);
  
  return {
    // Queries
    ...queryHooks,
    
    // Mutations
    ...mutationHooks
  };
}

/**
 * Hook for work order CRUD operations using the generic pattern
 */
export function useWorkOrderCrud(organizationId: string) {
  const service = useMemo(() => createWorkOrderService(organizationId), [organizationId]);
  
  return useCrudHooks('work-order', {
    findById: (id: string) => service.getFilteredWorkOrders({} as WorkOrderFilters).then(res => 
      res.success ? res.data?.find(wo => wo.id === id) || null : null
    ),
    findMany: () => service.getFilteredWorkOrders({}),
    create: (data: CreateWorkOrderData) => service.createWorkOrder(data),
    update: (id: string, data: UpdateWorkOrderData) => service.updateWorkOrder(id, data),
    delete: (id: string) => service.deleteWorkOrder(id)
  });
}

/**
 * Hook for work order costs CRUD operations
 */
export function useWorkOrderCostsCrud(organizationId: string) {
  const service = useMemo(() => createWorkOrderCostsService(organizationId), [organizationId]);
  
  return useCrudHooks('work-order-cost', {
    findById: (id: string) => service.getWorkOrderCosts('').then(res => 
      res.success ? res.data?.find(cost => cost.id === id) || null : null
    ),
    findMany: () => service.getWorkOrderCosts(''),
    create: (data: CreateWorkOrderCostData) => service.createWorkOrderCost(data),
    update: (id: string, data: UpdateWorkOrderCostData) => service.updateWorkOrderCost(id, data),
    delete: (id: string) => service.deleteWorkOrderCost(id)
  });
}

/**
 * Hook for work order dashboard data
 */
export function useWorkOrderDashboard(organizationId: string, userId?: string) {
  const workOrders = useWorkOrders(organizationId);
  
  return {
    // Stats
    stats: workOrders.useWorkOrderStats(),
    
    // My work orders
    myWorkOrders: userId ? workOrders.useMyWorkOrders(userId) : null,
    
    // Overdue work orders
    overdueWorkOrders: workOrders.useOverdueWorkOrders(),
    
    // Work orders due today
    workOrdersDueToday: workOrders.useWorkOrdersDueToday(),
    
    // Recent work orders (last 10)
    recentWorkOrders: workOrders.useFilteredWorkOrders({})
  };
}

/**
 * Hook for work order search
 */
export function useWorkOrderSearch(organizationId: string) {
  const workOrders = useWorkOrders(organizationId);
  
  return {
    searchWorkOrders: workOrders.useSearchWorkOrders,
    searchResults: null // This would be managed by the component
  };
}

/**
 * Hook for work order filters
 */
export function useWorkOrderFilters(organizationId: string, initialFilters: WorkOrderFilters = {}) {
  const workOrders = useWorkOrders(organizationId);
  
  return {
    filteredWorkOrders: workOrders.useFilteredWorkOrders(initialFilters),
    // Additional filter utilities would go here
  };
}
