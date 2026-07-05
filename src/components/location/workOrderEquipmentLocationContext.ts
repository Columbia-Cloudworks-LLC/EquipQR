import type { EquipmentTeamSummary, EquipmentWithTeam } from '@/features/equipment/services/EquipmentService';
import type { WorkOrderEmbeddedEquipment } from '@/features/work-orders/types/workOrder';

export type WorkOrderLocationEquipment = WorkOrderEmbeddedEquipment | EquipmentWithTeam;

export function toWorkOrderEquipmentTeamSummary(
  equipment: WorkOrderLocationEquipment | null | undefined,
): EquipmentTeamSummary | null {
  if (!equipment?.team?.id) {
    return null;
  }

  const { team } = equipment;
  return {
    id: team.id,
    name: team.name,
    description: team.description ?? null,
    location_address: team.location_address ?? null,
    location_city: team.location_city ?? null,
    location_state: team.location_state ?? null,
    location_country: team.location_country ?? null,
    location_lat: team.location_lat ?? null,
    location_lng: team.location_lng ?? null,
    override_equipment_location: team.override_equipment_location ?? null,
  };
}

export function toWorkOrderEquipmentMapInput(equipment: WorkOrderLocationEquipment | null | undefined) {
  if (!equipment) {
    return null;
  }

  return {
    id: equipment.id,
    organization_id: equipment.organization_id,
    team_id: equipment.team_id,
    use_team_location: equipment.use_team_location,
    assigned_location_lat: equipment.assigned_location_lat,
    assigned_location_lng: equipment.assigned_location_lng,
    assigned_location_street: equipment.assigned_location_street,
    assigned_location_city: equipment.assigned_location_city,
    assigned_location_state: equipment.assigned_location_state,
    assigned_location_country: equipment.assigned_location_country,
    location: equipment.location,
    last_known_location: equipment.last_known_location,
    updated_at: 'updated_at' in equipment ? equipment.updated_at : null,
  };
}
