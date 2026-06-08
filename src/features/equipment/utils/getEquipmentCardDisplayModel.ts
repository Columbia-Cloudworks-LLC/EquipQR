import { getStatusColor, getStatusDisplayInfo, safeFormatDate } from "@/features/equipment/utils/equipmentHelpers";
import type { UserSettings } from "@/types/settings";

const EMPTY_READOUT = '—';

export interface EquipmentCardDisplayModel {
  imageAlt: string;
  imageFallbackSrc: string;
  statusLabel: string;
  statusClassName: string;
  /** Full sentence for list/mobile contexts */
  lastMaintenanceText?: string;
  /** Telemetry cell value for grid cards */
  lastMaintenanceDisplay: string;
  workingHoursText: string;
  workingHoursShortText: string;
  /** Tabular number for grid hero metric */
  workingHoursDisplay: string;
  assetDescriptor: string;
  serialDisplay: string;
  locationDisplay: string;
}

interface EquipmentCardDisplayInput {
  name: string;
  manufacturer?: string | null;
  model?: string | null;
  serial_number?: string | null;
  location?: string | null;
  status: string;
  last_maintenance?: string;
  working_hours?: number | null;
}

function buildAssetDescriptor(manufacturer?: string | null, model?: string | null): string {
  const parts = [manufacturer, model].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : EMPTY_READOUT;
}

export function getEquipmentCardDisplayModel(
  equipment: EquipmentCardDisplayInput,
  settings: UserSettings
): EquipmentCardDisplayModel {
  const statusInfo = getStatusDisplayInfo(equipment.status);
  const lastMaintenanceDate = equipment.last_maintenance
    ? safeFormatDate(equipment.last_maintenance, settings)
    : null;
  const hours = equipment.working_hours ?? 0;
  const hoursFormatted = hours.toLocaleString();

  return {
    imageAlt: `${equipment.name} equipment`,
    imageFallbackSrc: "/placeholder.svg",
    statusLabel: statusInfo.label,
    statusClassName: getStatusColor(equipment.status),
    lastMaintenanceText: lastMaintenanceDate ? `Last maintenance: ${lastMaintenanceDate}` : undefined,
    lastMaintenanceDisplay: lastMaintenanceDate ?? EMPTY_READOUT,
    workingHoursText: `${hoursFormatted} hours`,
    workingHoursShortText: `${hoursFormatted} hrs`,
    workingHoursDisplay: hoursFormatted,
    assetDescriptor: buildAssetDescriptor(equipment.manufacturer, equipment.model),
    serialDisplay: equipment.serial_number?.trim() ? equipment.serial_number : EMPTY_READOUT,
    locationDisplay: equipment.location?.trim() ? equipment.location : EMPTY_READOUT,
  };
}
