import { getStatusColor, getStatusDisplayInfo, safeFormatDate } from "@/features/equipment/utils/equipmentHelpers";
import type { UserSettings } from "@/types/settings";

export interface EquipmentCardDisplayModel {
  imageAlt: string;
  imageFallbackSrc: string;
  statusLabel: string;
  statusClassName: string;
  lastMaintenanceText?: string;
  workingHoursText: string;
  workingHoursShortText: string;
}

interface EquipmentCardDisplayInput {
  name: string;
  status: string;
  last_maintenance?: string;
  working_hours?: number | null;
}

export function getEquipmentCardDisplayModel(
  equipment: EquipmentCardDisplayInput,
  settings: UserSettings
): EquipmentCardDisplayModel {
  const statusInfo = getStatusDisplayInfo(equipment.status);
  const lastMaintenanceDate = equipment.last_maintenance
    ? safeFormatDate(equipment.last_maintenance, settings)
    : null
  const hours = equipment.working_hours ?? 0;

  return {
    imageAlt: `${equipment.name} equipment`,
    imageFallbackSrc: "/placeholder.svg",
    statusLabel: statusInfo.label,
    statusClassName: getStatusColor(equipment.status),
    lastMaintenanceText: lastMaintenanceDate ? `Last maintenance: ${lastMaintenanceDate}` : undefined,
    workingHoursText: `${hours.toLocaleString()} hours`,
    workingHoursShortText: `${hours.toLocaleString()} hrs`,
  };
}

