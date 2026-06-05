export type FleetEquipmentSearchFields = {
  name: string;
  manufacturer: string;
  model: string;
  serial_number: string;
  team_name?: string | null;
};

export function filterFleetEquipmentBySearch<T extends FleetEquipmentSearchFields>(
  equipment: T[],
  lowerSearch: string,
): T[] {
  if (!lowerSearch) return equipment;
  return equipment.filter(
    (e) =>
      e.name.toLowerCase().includes(lowerSearch) ||
      e.manufacturer.toLowerCase().includes(lowerSearch) ||
      e.model.toLowerCase().includes(lowerSearch) ||
      e.serial_number.toLowerCase().includes(lowerSearch) ||
      (e.team_name?.toLowerCase().includes(lowerSearch) ?? false),
  );
}
