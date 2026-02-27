/**
 * Merges server work orders with pending offline queue items so that
 * work orders created offline appear in the list with a "Pending sync" badge.
 *
 * Resolves display-friendly names (equipment, assignee) from TanStack Query cache.
 */

import { useMemo } from 'react';
import { useOfflineQueueOptional } from '@/contexts/OfflineQueueContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useAuth } from '@/hooks/useAuth';
import { useEquipment } from '@/features/equipment/hooks/useEquipment';
import type { WorkOrder } from '@/features/work-orders/types/workOrder';
import type { OfflineQueueItem, OfflineQueueCreateItem } from '@/services/offlineQueueService';

// ─── Prefix used to identify offline-created items ──────────────────────────
export const OFFLINE_ID_PREFIX = 'offline-';

/** Checks whether a work order ID represents a pending offline item. */
export const isOfflineId = (id: string): boolean => id.startsWith(OFFLINE_ID_PREFIX);

// ─── Extended type ──────────────────────────────────────────────────────────

export interface MergedWorkOrder extends WorkOrder {
  /** True when the item exists only in the offline queue (not yet synced). */
  _isPendingSync?: boolean;
  /** The offline queue item ID — used for editing queued items. */
  _queueItemId?: string;
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useOfflineMergedWorkOrders(
  serverWorkOrders: WorkOrder[],
): MergedWorkOrder[] {
  const offlineCtx = useOfflineQueueOptional();
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();
  const { data: allEquipment = [] } = useEquipment(currentOrganization?.id);

  return useMemo(() => {
    if (!offlineCtx) return serverWorkOrders;

    // Filter to only work_order_create items that are pending or processing
    const pendingCreates = offlineCtx.queuedItems.filter(
      (item): item is OfflineQueueCreateItem =>
        item.type === 'work_order_create' &&
        (item.status === 'pending' || item.status === 'processing'),
    );

    if (pendingCreates.length === 0) return serverWorkOrders;

    const offlineWorkOrders: MergedWorkOrder[] = pendingCreates.map((item) => {
      const { payload } = item;

      // Resolve equipment name from cache
      const equipment = allEquipment.find((e) => e.id === payload.equipmentId);
      const equipmentName = equipment?.name ?? 'Unknown Equipment';
      const equipmentTeamName = equipment && 'team' in equipment
        ? (equipment as { team?: { name: string } | null }).team?.name
        : undefined;

      return {
        // Database row fields (snake_case) — provide sensible defaults
        id: `${OFFLINE_ID_PREFIX}${item.id}`,
        organization_id: item.organizationId,
        equipment_id: payload.equipmentId,
        title: payload.title,
        description: payload.description,
        priority: payload.priority,
        status: 'submitted',
        assignee_id: payload.assigneeId ?? null,
        assignee_name: null,
        team_id: null,
        created_by: item.userId,
        created_by_admin: false,
        created_by_name: user?.user_metadata?.full_name ?? null,
        created_date: new Date(item.timestamp).toISOString(),
        due_date: payload.dueDate ?? null,
        estimated_hours: null,
        completed_date: null,
        acceptance_date: null,
        updated_at: new Date(item.timestamp).toISOString(),
        has_pm: payload.hasPM ?? false,
        pm_required: false,
        is_historical: false,
        historical_start_date: null,
        historical_notes: null,
        equipment_working_hours_at_creation: payload.equipmentWorkingHours ?? null,

        // Computed display fields (camelCase)
        equipmentName,
        equipmentTeamName,
        assigneeName: undefined, // Assignee name hard to resolve without member data
        createdByName: user?.user_metadata?.full_name ?? undefined,

        // Pending-sync markers
        _isPendingSync: true,
        _queueItemId: item.id,
      } as MergedWorkOrder;
    });

    // Offline items first (most recent queue items at top), then server data
    return [...offlineWorkOrders, ...serverWorkOrders];
  }, [offlineCtx?.queuedItems, serverWorkOrders, allEquipment, user, offlineCtx]);
}
