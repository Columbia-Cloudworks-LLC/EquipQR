import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useAuth } from '@/hooks/useAuth';
import { useOfflineQueueOptional } from '@/contexts/OfflineQueueContext';
import { OfflineAwareWorkOrderService } from '@/services/offlineAwareService';
import { createScopedQueryPersister } from '@/lib/queryPersistence';
import {
  getPMByWorkOrderId,
  getPMByWorkOrderAndEquipment,
  getPMsByWorkOrderId,
  getLatestCompletedPMDetails,
  UpdatePMData,
  type PreventativeMaintenance,
} from '@/features/pm-templates/services/preventativeMaintenanceService';
import { useQueuedItems } from '@/features/offline-queue/hooks/useQueuedLookups';
import { applyQueuedPmUpdates } from '@/features/offline-queue/utils/queuedPm';
import { useOfflineQueuedPm } from '@/features/work-orders/hooks/useOfflineQueuedPm';
import { parseOfflineQueueItemId } from '@/features/work-orders/hooks/useOfflineQueuedWorkOrder';
import { isOfflineId } from '@/features/work-orders/types/offlineMergedWorkOrder';
import { preventiveMaintenance as preventiveMaintenanceKeys } from '@/lib/queryKeys';
import { toast } from 'sonner';

function fieldReadPersister() {
  return createScopedQueryPersister().persisterFn;
}

// Legacy hook - returns first PM found
export const usePMByWorkOrderId = (workOrderId: string) => {
  const { currentOrganization } = useOrganization();
  const withQueuedUpdates = useQueuedPmUpdates();

  // A work order created offline has no PM on the server yet; its checklist
  // lives in the offline queue. Completing the work order checks this hook.
  const queuedItems = useQueuedItems();
  const queuedWorkOrderId = isOfflineId(workOrderId) ? parseOfflineQueueItemId(workOrderId) : null;
  const queuedCreate = queuedWorkOrderId
    ? queuedItems.find(item => item.id === queuedWorkOrderId && item.type === 'work_order_create')
    : undefined;
  const queuedPm = useOfflineQueuedPm(
    queuedCreate?.type === 'work_order_create' && queuedCreate.payload.hasPM ? workOrderId : undefined,
    queuedCreate?.type === 'work_order_create' ? queuedCreate.payload.equipmentId : undefined,
  );

  const query = useQuery({
    queryKey: ['preventativeMaintenance', workOrderId, currentOrganization?.id],
    queryFn: () => getPMByWorkOrderId(workOrderId, currentOrganization!.id),
    // A placeholder id is never sent to the server.
    enabled: !!workOrderId && !!currentOrganization?.id && !queuedWorkOrderId,
    staleTime: 5 * 60 * 1000,  // 5 min — active work data
    gcTime: 30 * 60 * 1000,    // 30 min — survive offline
    select: withQueuedUpdates,
  });

  if (!queuedPm || query.data) return query;
  return { ...query, data: queuedPm, isPending: false, isLoading: false, isError: false, error: null };
};

/**
 * Applies PM edits still waiting in the offline queue to what a PM query
 * returns, so a checklist finished with no connection reads as finished.
 */
function useQueuedPmUpdates() {
  const queuedItems = useQueuedItems();
  return useCallback(
    <T extends PreventativeMaintenance | null | undefined>(pm: T): T | PreventativeMaintenance =>
      pm ? applyQueuedPmUpdates(pm, queuedItems) : pm,
    [queuedItems],
  );
}

// Multi-equipment support - get PM by work order AND equipment
export const usePMByWorkOrderAndEquipment = (workOrderId: string, equipmentId: string) => {
  const { currentOrganization } = useOrganization();
  const withQueuedUpdates = useQueuedPmUpdates();

  return useQuery({
    queryKey: ['preventativeMaintenance', workOrderId, equipmentId, currentOrganization?.id],
    queryFn: () => getPMByWorkOrderAndEquipment(workOrderId, equipmentId, currentOrganization!.id),
    enabled: !!workOrderId && !!equipmentId && !!currentOrganization?.id,
    staleTime: 5 * 60 * 1000,  // 5 min — was 0; mutations still invalidate via useUpdatePM
    gcTime: 30 * 60 * 1000,    // 30 min — survive offline
    // Keep data even if refetch fails - don't clear on error
    retry: 1,
    retryOnMount: true, // Refetch on mount to ensure we have latest data
    // Prevent clearing data on refetch failure
    refetchOnWindowFocus: false,
    // Keep previous data when query fails - prevents clearing on 406 errors
    placeholderData: (previousData) => previousData,
    persister: fieldReadPersister(),
    select: withQueuedUpdates,
  });
};

// Get all PMs for a work order (all equipment)
const usePMsByWorkOrderId = (workOrderId: string) => {
  const { currentOrganization } = useOrganization();

  return useQuery({
    queryKey: ['preventativeMaintenance', 'all', workOrderId, currentOrganization?.id],
    queryFn: () => getPMsByWorkOrderId(workOrderId, currentOrganization!.id),
    enabled: !!workOrderId && !!currentOrganization?.id,
    staleTime: 5 * 60 * 1000,  // 5 min (was 2 min)
    gcTime: 30 * 60 * 1000,    // 30 min — survive offline
  });
};

/** For contexts without OrganizationProvider (e.g. `/qr/equipment/*` landing). */
export const useLatestCompletedPMDetails = (
  equipmentId: string | undefined,
  organizationId: string | undefined
) => {
  const enabled = Boolean(equipmentId && organizationId);
  return useQuery({
    queryKey: enabled
      ? preventiveMaintenanceKeys.latestCompletedByEquipment(organizationId!, equipmentId!)
      : (['preventativeMaintenance', 'latest-completed', 'idle'] as const),
    queryFn: () => getLatestCompletedPMDetails(equipmentId!, organizationId!),
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 1,
  });
};

export const useUpdatePM = () => {
  const queryClient = useQueryClient();
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();
  const offlineCtx = useOfflineQueueOptional();

  return useMutation({
    mutationFn: async ({
      pmId,
      data,
      serverUpdatedAt,
    }: {
      pmId: string;
      data: UpdatePMData;
      /**
       * Pass the snapshot of `pm.updated_at` from the time the user opened
       * the PM checklist so the offline-sync conflict detector can compare
       * against the live server value during replay. Optional for online
       * paths that don't care about offline conflicts.
       */
      serverUpdatedAt?: string;
    }) => {
      // When the user is signed in inside an organization, route through
      // the offline-aware service so failed network calls (or `!navigator.
      // onLine`) queue locally instead of throwing. Otherwise fall back to
      // the original direct call so unrelated callers (e.g. tests) keep
      // working.
      if (currentOrganization?.id && user?.id) {
        const svc = new OfflineAwareWorkOrderService(currentOrganization.id, user.id);
        const result = await svc.updatePM(pmId, data, serverUpdatedAt);
        if (result.queuedOffline) {
          offlineCtx?.refresh();
          return null;
        }
        return result.data;
      }
      const { updatePM } = await import('@/features/pm-templates/services/preventativeMaintenanceService');
      return await updatePM(pmId, data);
    },
    onSuccess: (updatedPM) => {
      if (updatedPM && currentOrganization?.id) {
        // Update specific query cache immediately with returned data
        queryClient.setQueryData(
          ['preventativeMaintenance', updatedPM.work_order_id, updatedPM.equipment_id, currentOrganization.id],
          updatedPM
        );

        // Invalidate related queries to ensure fresh data on next load
        queryClient.invalidateQueries({
          queryKey: ['preventativeMaintenance', updatedPM.work_order_id],
          exact: false,
          refetchType: 'active' // Refetch active queries to get updated data
        });
        queryClient.invalidateQueries({
          queryKey: ['workOrder'],
          exact: false,
          refetchType: 'active' // OK to refetch work orders
        });

        // Only show toast if not already shown by caller
        // (Some callers like handleSetAllToOK show their own toast)
      } else if (updatedPM === null) {
        // queuedOffline path — the banner will surface the queued state.
        toast.success('PM saved offline — will sync when you reconnect.');
      }
    },
    onError: (error) => {
      console.error('Error updating PM:', error);
      toast.error('Failed to update PM');
    },
  });
};

