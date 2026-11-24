/**
 * Equipment as the offline queue will leave it: records created with no
 * connection, and edits (team, PM template, details) still waiting to sync.
 */
import type {
  OfflineQueueEquipmentCreateFullItem,
  OfflineQueueEquipmentCreateItem,
  OfflineQueueItem,
} from '@/services/offlineQueueService';
import type { EquipmentWithTeam } from '@/features/equipment/services/EquipmentService';
import { offlineEquipPlaceholder, parseOfflineEquipPlaceholder } from '@/services/offlineQueuePlaceholders';
import { isLiveQueueItem } from '@/features/offline-queue/utils/queuedWorkOrderChanges';

type EquipmentCreateItem = OfflineQueueEquipmentCreateItem | OfflineQueueEquipmentCreateFullItem;

export type TeamLookup = (teamId: string) => { id: string; name: string } | undefined;

/** A record that exists only in the offline queue until it syncs. */
export type QueuedEquipmentRecord = EquipmentWithTeam & {
  _isPendingSync: true;
  _queueItemId: string;
};

export function isQueuedEquipmentCreate(item: OfflineQueueItem): item is EquipmentCreateItem {
  return (
    (item.type === 'equipment_create' || item.type === 'equipment_create_full') && isLiveQueueItem(item)
  );
}

/** The queued create behind a placeholder id (`offline-equip-…`), if it is still waiting. */
export function findQueuedEquipmentCreate(
  equipmentId: string | undefined,
  queuedItems: readonly OfflineQueueItem[],
): EquipmentCreateItem | undefined {
  const queueItemId = equipmentId ? parseOfflineEquipPlaceholder(equipmentId) : null;
  if (!queueItemId) return undefined;
  return queuedItems.filter(isQueuedEquipmentCreate).find(item => item.id === queueItemId);
}

/** The full record a queued create will produce, under its placeholder id. */
export function buildQueuedEquipmentRecord(
  item: EquipmentCreateItem,
  teamFor?: TeamLookup,
): QueuedEquipmentRecord {
  const createdAt = new Date(item.timestamp).toISOString();
  const full = item.type === 'equipment_create_full' ? item.payload : undefined;
  const teamId = item.payload.team_id ?? null;
  const team = teamId ? teamFor?.(teamId) : undefined;

  return {
    id: offlineEquipPlaceholder(item.id),
    organization_id: item.organizationId,
    name: item.payload.name,
    manufacturer: item.payload.manufacturer,
    model: item.payload.model,
    serial_number: item.payload.serial_number,
    status: full?.status ?? 'active',
    location: full?.location ?? '',
    working_hours: item.payload.working_hours ?? null,
    team_id: teamId,
    image_url: full?.image_url ?? null,
    last_maintenance: full?.last_maintenance ?? null,
    last_maintenance_work_order_id: full?.last_maintenance_work_order_id ?? null,
    custom_attributes: full?.custom_attributes ?? null,
    customer_id: full?.customer_id ?? null,
    default_pm_template_id: full?.default_pm_template_id ?? null,
    import_id: full?.import_id ?? null,
    // The quick form has no date; the server defaults it to today.
    installation_date: full?.installation_date ?? createdAt.split('T')[0],
    warranty_expiration: full?.warranty_expiration ?? null,
    last_known_location: full?.last_known_location ?? null,
    notes: full?.notes ?? null,
    use_team_location: full?.use_team_location ?? false,
    assigned_location_street: full?.assigned_location_street ?? null,
    assigned_location_city: full?.assigned_location_city ?? null,
    assigned_location_state: full?.assigned_location_state ?? null,
    assigned_location_country: full?.assigned_location_country ?? null,
    assigned_location_lat: full?.assigned_location_lat ?? null,
    assigned_location_lng: full?.assigned_location_lng ?? null,
    created_at: createdAt,
    updated_at: createdAt,
    team: team ?? null,
    team_name: team?.name,
    _isPendingSync: true,
    _queueItemId: item.id,
  };
}

/**
 * The record with its queued edits applied, oldest first. Returns the same
 * object when nothing is queued for it. A changed team also updates the
 * joined `team`, which screens read for the team's name.
 */
export function applyQueuedEquipmentUpdates<T extends { id: string; team_id?: string | null }>(
  record: T,
  queuedItems: readonly OfflineQueueItem[],
  teamFor?: TeamLookup,
): T {
  let next = record;
  for (const item of queuedItems) {
    if (item.type !== 'equipment_update' || !isLiveQueueItem(item)) continue;
    if (item.payload.equipmentId !== record.id) continue;
    next = { ...next, ...item.payload.data };
  }
  if (next === record || next.team_id === record.team_id) return next;

  const team = next.team_id ? teamFor?.(next.team_id) : undefined;
  return { ...next, team: team ?? null, team_name: team?.name };
}
