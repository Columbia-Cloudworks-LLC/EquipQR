import type { EquipmentSelectorItem } from '@/features/work-orders/types/workOrderEquipment';

type EquipmentSelectorSource = {
  id: string;
  name: string;
  manufacturer?: string | null;
  model?: string | null;
  serial_number?: string | null;
  location?: string | null;
  last_known_location?: unknown;
  team?: { id: string; name: string } | null;
  working_hours?: number | null;
};

function toSelectorLastKnownLocation(lastKnown: unknown): { name?: string } | null {
  if (!lastKnown || typeof lastKnown !== 'object' || Array.isArray(lastKnown)) {
    return null;
  }

  const name = 'name' in lastKnown && typeof lastKnown.name === 'string'
    ? lastKnown.name
    : undefined;

  return { name };
}

export function toEquipmentSelectorItem(equipment: EquipmentSelectorSource): EquipmentSelectorItem {
  return {
    id: equipment.id,
    name: equipment.name,
    manufacturer: equipment.manufacturer,
    model: equipment.model,
    serial_number: equipment.serial_number,
    location: equipment.location,
    last_known_location: toSelectorLastKnownLocation(equipment.last_known_location),
    team: equipment.team ? { id: equipment.team.id, name: equipment.team.name } : null,
    working_hours: equipment.working_hours,
  };
}
