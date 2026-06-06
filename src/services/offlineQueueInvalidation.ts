import type { QueryClient } from '@tanstack/react-query';
import { workOrders, organization, equipment, preventiveMaintenance } from '@/lib/queryKeys';
import type { OfflineQueueItem } from './offlineQueueService';

const WORK_ORDER_ITEM_TYPES = new Set([
  'work_order_create',
  'work_order_update',
  'work_order_status',
  'work_order_note',
]);

const EQUIPMENT_ITEM_TYPES = new Set([
  'equipment_create',
  'equipment_create_full',
  'equipment_update',
  'equipment_hours',
  'equipment_note',
]);

function hasPmItems(items: OfflineQueueItem[]): boolean {
  return items.some(
    i =>
      i.type === 'pm_init' ||
      i.type === 'pm_update' ||
      i.type === 'pm_delete' ||
      (i.type === 'work_order_create' && i.payload.hasPM),
  );
}

export function invalidateOfflineSyncQueries(queryClient: QueryClient, items: OfflineQueueItem[]): void {
  const orgIds = [...new Set(items.map(i => i.organizationId))];
  const hasWorkOrderItems = items.some(i => WORK_ORDER_ITEM_TYPES.has(i.type));
  const hasEquipmentItems = items.some(i => EQUIPMENT_ITEM_TYPES.has(i.type));
  const hasPMItems = hasPmItems(items);

  for (const orgId of orgIds) {
    if (hasWorkOrderItems) {
      queryClient.invalidateQueries({ queryKey: workOrders.root });
      queryClient.invalidateQueries({ queryKey: workOrders.enhanced(orgId) });
      queryClient.invalidateQueries({ queryKey: workOrders.optimized(orgId) });
      queryClient.invalidateQueries({ queryKey: ['enhanced-work-orders', orgId] });
      queryClient.invalidateQueries({ queryKey: ['workOrders', orgId] });
      queryClient.invalidateQueries({ queryKey: ['work-orders-filtered-optimized', orgId] });
      queryClient.invalidateQueries({ queryKey: ['team-based-work-orders', orgId] });
    }
    if (hasEquipmentItems) {
      queryClient.invalidateQueries({ queryKey: equipment.root });
      queryClient.invalidateQueries({ queryKey: ['equipment', orgId] });
    }
    if (hasPMItems) {
      queryClient.invalidateQueries({ queryKey: preventiveMaintenance.root });
    }
    queryClient.invalidateQueries({ queryKey: organization(orgId).dashboardStats() });
    queryClient.invalidateQueries({ queryKey: ['dashboardStats', orgId] });
  }
}
