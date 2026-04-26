import { useOrganization } from '@/contexts/OrganizationContext';
import { useAuth } from '@/hooks/useAuth';
import { useWorkOrderById } from '@/features/work-orders/hooks/useWorkOrders';
import { useEquipmentById } from '@/features/equipment/hooks/useEquipment';
import { usePMByWorkOrderAndEquipment } from '@/features/pm-templates/hooks/usePMData';
import { useWorkOrderPermissionLevels } from '@/features/work-orders/hooks/useWorkOrderPermissionLevels';
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

  const { data: workOrder, isLoading: workOrderLoading } = useWorkOrderById(
    currentOrganization?.id || '',
    workOrderId || ''
  );

  const { data: freshEquipment } = useEquipmentById(
    currentOrganization?.id,
    workOrder?.equipment_id
  );
  const equipment = freshEquipment ?? workOrder?.equipment ?? undefined;

  // Fetch PM data for specific equipment if work order has PM enabled
  const { data: pmData, isLoading: pmLoading, isError: pmError } = usePMByWorkOrderAndEquipment(
    workOrderId || '',
    selectedEquipmentId || workOrder?.equipment_id || ''
  );

  const permissionLevels = useWorkOrderPermissionLevels();

  // Calculate derived state
  const createdByCurrentUser = workOrder?.created_by === user?.id;
  const formMode = workOrder ? permissionLevels.getFormMode(workOrder as Tables<'work_orders'>, createdByCurrentUser) : 'viewer';
  const isWorkOrderLocked = workOrder?.status === 'completed' || workOrder?.status === 'cancelled';

  // Calculate permissions
  const canAddCosts = permissionLevels.isManager || permissionLevels.isTechnician;
  const canEditCosts = permissionLevels.isManager;
  const baseCanAddNotes = permissionLevels.isManager || createdByCurrentUser;
  const baseCanUpload = permissionLevels.isManager || createdByCurrentUser;
  const canAddNotes = baseCanAddNotes && !isWorkOrderLocked;
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
    canUpload,
    canEdit,
    baseCanAddNotes,
    createdByCurrentUser,
    currentOrganization
  };
};
