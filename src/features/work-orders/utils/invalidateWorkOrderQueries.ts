import type { QueryClient } from '@tanstack/react-query';
import { workOrderKeys } from '@/features/work-orders/hooks/useWorkOrders';
import { organization, workOrders } from '@/lib/queryKeys';

/**
 * Invalidate every query key shape that can hold a single work order record.
 * The details page reads `workOrderKeys.detail`; list cards may use legacy keys.
 */
export function invalidateWorkOrderRecord(
  queryClient: QueryClient,
  organizationId: string,
  workOrderId: string,
): void {
  void queryClient.invalidateQueries({
    queryKey: workOrderKeys.detail(organizationId, workOrderId),
  });
  void queryClient.invalidateQueries({
    queryKey: workOrders.byId(organizationId, workOrderId),
  });
  void queryClient.invalidateQueries({
    queryKey: workOrders.legacyById(organizationId, workOrderId),
  });
  void queryClient.invalidateQueries({
    queryKey: workOrders.enhancedById(organizationId, workOrderId),
  });
}

/**
 * Invalidate list and dashboard queries after a work order mutation.
 */
export function invalidateWorkOrderLists(
  queryClient: QueryClient,
  organizationId: string,
): void {
  void queryClient.invalidateQueries({ queryKey: workOrderKeys.lists() });
  void queryClient.invalidateQueries({ queryKey: workOrderKeys.all });
  void queryClient.invalidateQueries({ queryKey: workOrders.enhancedList(organizationId) });
  void queryClient.invalidateQueries({ queryKey: workOrders.legacyList(organizationId) });
  void queryClient.invalidateQueries({ queryKey: workOrders.optimized(organizationId) });
  void queryClient.invalidateQueries({ queryKey: workOrders.enhanced(organizationId) });
  void queryClient.invalidateQueries({ queryKey: workOrders.teamBasedList(organizationId) });
  void queryClient.invalidateQueries({ queryKey: organization(organizationId).dashboardStats() });
  void queryClient.invalidateQueries({ queryKey: workOrders.root, exact: false });
}

/** Record + list invalidation for inline edits and assignment changes. */
export function invalidateWorkOrderCaches(
  queryClient: QueryClient,
  organizationId: string,
  workOrderId: string,
): void {
  invalidateWorkOrderRecord(queryClient, organizationId, workOrderId);
  invalidateWorkOrderLists(queryClient, organizationId);
}
