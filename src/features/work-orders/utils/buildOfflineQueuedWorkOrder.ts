import type { EquipmentSummary } from '@/features/equipment/services/EquipmentService';
import type { MergedWorkOrder } from '@/features/work-orders/types/offlineMergedWorkOrder';
import { OFFLINE_ID_PREFIX } from '@/features/work-orders/types/offlineMergedWorkOrder';
import type { OfflineQueueCreateItem } from '@/services/offlineQueueService';

interface BuildOfflineQueuedWorkOrderOptions {
  item: OfflineQueueCreateItem;
  allEquipment: EquipmentSummary[];
  userDisplayName?: string | null;
  workOrderId?: string;
}

export function buildOfflineQueuedWorkOrder({
  item,
  allEquipment,
  userDisplayName,
  workOrderId,
}: BuildOfflineQueuedWorkOrderOptions): MergedWorkOrder {
  const { payload } = item;
  const equipment = allEquipment.find((entry) => entry.id === payload.equipmentId);

  return {
    id: workOrderId ?? `${OFFLINE_ID_PREFIX}${item.id}`,
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
    created_by_name: userDisplayName ?? null,
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
    equipmentName: equipment?.name ?? 'Unknown Equipment',
    equipmentManufacturer: equipment?.manufacturer ?? undefined,
    equipmentModel: equipment?.model ?? undefined,
    equipmentSerialNumber: equipment?.serial_number ?? undefined,
    equipmentWorkingHours: equipment?.working_hours ?? null,
    equipmentImageUrl: equipment?.image_url ?? null,
    equipmentTeamName: equipment?.team?.name,
    assigneeName: undefined,
    createdByName: userDisplayName ?? undefined,
    _isPendingSync: true,
    _queueItemId: item.id,
  } as MergedWorkOrder;
}
