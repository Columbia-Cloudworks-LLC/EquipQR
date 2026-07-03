import { useOrganization } from '@/contexts/OrganizationContext';
import { useAuth } from '@/hooks/useAuth';
import { useWorkOrderById } from '@/features/work-orders/hooks/useWorkOrders';
import { useOfflineQueuedWorkOrder } from '@/features/work-orders/hooks/useOfflineQueuedWorkOrder';
import { useOfflineQueuedPm } from '@/features/work-orders/hooks/useOfflineQueuedPm';
import { isOfflineId } from '@/features/work-orders/hooks/useOfflineMergedWorkOrders';
import { useEquipmentById } from '@/features/equipment/hooks/useEquipment';
import { usePMByWorkOrderAndEquipment } from '@/features/pm-templates/hooks/usePMData';
import { useWorkOrderPermissionLevels } from '@/features/work-orders/hooks/useWorkOrderPermissionLevels';
import { useTeamMembership } from '@/features/teams/hooks/useTeamMembership';
import {
  canAddWorkOrderNotes,
  canUsePrivateWorkOrderNotes,
  isWorkOrderEditLocked,
} from '@/features/work-orders/utils/workOrderNotePermissions';
import type { Tables } from '@/integrations/supabase/types';

/**
 * Pull together the data the work-order detail page needs.
 *
 * `equipment` is sourced from a dedicated `useEquipmentById` query so that
 * equipment mutations (status changes, name edits, location updates) that
 * invalidate `['equipment', orgId, equipmentId]` propagate to this view
 * immediately. The embedded join on the work-order is used as the initial
 * value while `useEquipmentById` is loading.
 */
export const useWorkOrderDetailsData = (workOrderId: string, selectedEquipmentId?: string) => {
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();
  const { teamMemberships } = useTeamMembership();
  const viewingOfflinePlaceholder = isOfflineId(workOrderId || '');

  const { data: serverWorkOrder, isLoading: workOrderLoading } = useWorkOrderById(
    currentOrganization?.id || '',
    viewingOfflinePlaceholder ? '' : workOrderId || '',
  );
  const offlineWorkOrder = useOfflineQueuedWorkOrder(workOrderId);
  const workOrder = serverWorkOrder ?? offlineWorkOrder ?? undefined;

  const { data: freshEquipment } = useEquipmentById(
    currentOrganization?.id,
    workOrder?.equipment_id
  );
  const equipment = freshEquipment ?? workOrder?.equipment ?? undefined;

  // Fetch PM data for specific equipment if work order has PM enabled
  const { data: serverPmData, isLoading: pmLoading, isError: pmError } = usePMByWorkOrderAndEquipment(
    viewingOfflinePlaceholder ? '' : workOrderId || '',
    selectedEquipmentId || workOrder?.equipment_id || ''
  );
  const offlinePmData = useOfflineQueuedPm(
    viewingOfflinePlaceholder ? workOrderId : undefined,
    selectedEquipmentId || workOrder?.equipment_id || undefined,
  );
  const pmData = serverPmData ?? offlinePmData ?? undefined;

  const permissionLevels = useWorkOrderPermissionLevels();

  // Calculate derived state
  const createdByCurrentUser = workOrder?.created_by === user?.id;
  const formMode = workOrder ? permissionLevels.getFormMode(workOrder as Tables<'work_orders'>, createdByCurrentUser) : 'viewer';
  const isWorkOrderLocked = workOrder ? isWorkOrderEditLocked(workOrder.status) : false;

  const notePermissionInput = {
    status: workOrder?.status ?? 'submitted',
    teamId: workOrder?.team_id,
    createdBy: workOrder?.created_by,
    userId: user?.id,
    isOrgAdmin: permissionLevels.isManager,
    teamMemberships,
  };

  const canAddNotes = canAddWorkOrderNotes(notePermissionInput);
  const canUsePrivateNotes = canUsePrivateWorkOrderNotes(notePermissionInput);

  // Calculate permissions
  const canAddCosts = permissionLevels.isManager || permissionLevels.isTechnician;
  const canEditCosts = permissionLevels.isManager;
  const baseCanAddNotes = canAddNotes;
  const baseCanUpload = permissionLevels.isManager || createdByCurrentUser;
  const canUpload = baseCanUpload && !isWorkOrderLocked;
  const canEdit = formMode === 'manager' || (formMode === 'requestor' && createdByCurrentUser);

  return {
    workOrder,
    equipment,
    pmData,
    workOrderLoading,
    pmLoading,
    pmError, // Expose PM query error state
    permissionLevels,
    formMode,
    isWorkOrderLocked,
    canAddCosts: canAddCosts && !isWorkOrderLocked,
    canEditCosts: canEditCosts && !isWorkOrderLocked,
    canAddNotes,
    canUsePrivateNotes,
    canUpload,
    canEdit,
    baseCanAddNotes,
    createdByCurrentUser,
    currentOrganization
  };
};
