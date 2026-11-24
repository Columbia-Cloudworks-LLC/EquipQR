import { useMemo } from 'react';
import type { EquipmentSummary } from '@/features/equipment/services/EquipmentService';
import { useEquipmentSummaries } from '@/features/equipment/hooks/useEquipment';
import { useQueuedItems, useQueuedTeamLookup } from '@/features/offline-queue/hooks/useQueuedLookups';
import {
  applyQueuedEquipmentUpdates,
  buildQueuedEquipmentRecord,
  isQueuedEquipmentCreate,
} from '@/features/offline-queue/utils/queuedEquipment';

/**
 * The equipment pickers' list plus what is still in the offline queue:
 * equipment created with no connection (so a work order can be raised for it
 * before it syncs) and queued team changes.
 */
export function useEquipmentSummariesWithQueued(
  organizationId: string | undefined,
  options?: { enabled?: boolean },
): EquipmentSummary[] {
  const { data } = useEquipmentSummaries(organizationId, options);
  const queuedItems = useQueuedItems();
  const teamFor = useQueuedTeamLookup();

  return useMemo(() => {
    const saved = (data ?? []).map(row => applyQueuedEquipmentUpdates(row, queuedItems, teamFor));
    const created = queuedItems
      .filter(isQueuedEquipmentCreate)
      .filter(item => item.organizationId === organizationId)
      .map(item => applyQueuedEquipmentUpdates(buildQueuedEquipmentRecord(item, teamFor), queuedItems, teamFor))
      .map(
        (record): EquipmentSummary => ({
          id: record.id,
          organization_id: record.organization_id,
          name: record.name,
          manufacturer: record.manufacturer,
          model: record.model,
          serial_number: record.serial_number,
          status: record.status,
          team_id: record.team_id,
          location: record.location,
          image_url: record.image_url,
          working_hours: record.working_hours,
          last_maintenance: record.last_maintenance,
          last_known_location: null,
          team: record.team,
          team_name: record.team_name,
          default_pm_template_id: record.default_pm_template_id,
        }),
      );
    return created.length > 0 ? [...created, ...saved] : saved;
  }, [data, queuedItems, teamFor, organizationId]);
}
