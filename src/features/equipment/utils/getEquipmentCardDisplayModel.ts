import { getStatusColor } from "@/features/equipment/utils/equipmentHelpers";

export interface EquipmentCardDisplayModel {
  imageAlt: string;
  imageFallbackSrc: string;
  showStatusBadge: boolean;
  statusText: string;
  statusClassName: string;
  lastMaintenanceText?: string;
  workingHoursText: string;
}

interface EquipmentCardDisplayInput {
  name: string;
  status: string;
  last_maintenance?: string;
  working_hours?: number | null;
}

function safeFormatDate(value: string): string | null {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toLocaleDateString();
}

export function getEquipmentCardDisplayModel(
  equipment: EquipmentCardDisplayInput
): EquipmentCardDisplayModel {
  const showStatusBadge = equipment.status !== "active";
  const lastMaintenanceDate = equipment.last_maintenance ? safeFormatDate(equipment.last_maintenance) : null;
  const hours = equipment.working_hours ?? 0;

  return {
    imageAlt: `${equipment.name} equipment`,
    imageFallbackSrc: "/placeholder.svg",
    showStatusBadge,
    statusText: equipment.status,
    statusClassName: getStatusColor(equipment.status),
    lastMaintenanceText: lastMaintenanceDate ? `Last maintenance: ${lastMaintenanceDate}` : undefined,
    workingHoursText: `${hours.toLocaleString()} hours`,
  };
}

