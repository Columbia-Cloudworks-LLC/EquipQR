import { useOrganization } from '@/contexts/OrganizationContext';
import { useAuth } from '@/hooks/useAuth';
import { useWorkOrderById } from '@/features/work-orders/hooks/useWorkOrders';
import { usePMByWorkOrderAndEquipment } from '@/features/pm-templates/hooks/usePMData';
import { useWorkOrderPermissionLevels } from '@/features/work-orders/hooks/useWorkOrderPermissionLevels';
import type { Tables } from '@/integrations/supabase/types';

/**
 * Pull together the data the work-order detail page needs.
 *
 * The `equipment` returned here comes from the work-order's embedded join
 * (`workOrder.equipment`) — there is intentionally NO separate
 * `useEquipmentById` call here. The embedded select in
 * `workOrderService.WORK_ORDER_SELECT` already includes every equipment field
 * the detail consumers read (id, name, manufacturer, model, serial_number,
 * status, team_id, location, last_known_location, assigned_location_*,
 * customer_id, default_pm_template_id, use_team_location, working_hours,
 * image_url), so on Slow 4G we save a full equipment row fetch on every WO
 * detail open.
 *
 * If, for some reason, the WO row arrives without an embedded equipment
 * (data integrity issue), `equipment` is `undefined` and the consumers
 * gracefully fall through with their existing `equipment?.field` accessors.
 */
export const useWorkOrderDetailsData = (workOrderId: string, selectedEquipmentId?: string) => {
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();

  const { data: workOrder, isLoading: workOrderLoading } = useWorkOrderById(
    currentOrganization?.id || '',
    workOrderId || ''
  );

  const equipment = workOrder?.equipment ?? undefined;

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
