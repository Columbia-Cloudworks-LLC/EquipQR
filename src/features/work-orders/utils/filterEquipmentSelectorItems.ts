import type { EquipmentSelectorItem } from '@/features/work-orders/types/workOrderEquipment';

function getEquipmentLocationDisplay(equipment: EquipmentSelectorItem): string {
  return equipment.last_known_location?.name || equipment.location || 'Unknown location';
}

function equipmentSearchHaystack(equipment: EquipmentSelectorItem): string {
  return [
    equipment.name,
    equipment.manufacturer,
    equipment.model,
    equipment.serial_number,
    equipment.team?.name,
    getEquipmentLocationDisplay(equipment),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

export function filterEquipmentSelectorItems(
  equipment: EquipmentSelectorItem[],
  searchQuery: string,
): EquipmentSelectorItem[] {
  const normalizedQuery = searchQuery.trim().toLowerCase();
  if (!normalizedQuery) {
    return equipment;
  }

  return equipment.filter((item) => equipmentSearchHaystack(item).includes(normalizedQuery));
}
