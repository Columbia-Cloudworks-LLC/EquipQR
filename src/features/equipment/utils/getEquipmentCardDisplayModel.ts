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
  /** Mobile card: formatted date plus compact days-ago suffix */
  lastMaintenanceMobileDisplay: string;
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

/** Calendar-day delta for Postgres `date` strings (yyyy-mm-dd). */
function daysSinceDateOnly(value: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const maintenanceDate = new Date(year, month, day);
  if (
    maintenanceDate.getFullYear() !== year ||
    maintenanceDate.getMonth() !== month ||
    maintenanceDate.getDate() !== day
  ) {
    return null;
  }

  const today = new Date();
  const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diffDays = Math.floor(
    (todayDate.getTime() - maintenanceDate.getTime()) / (1000 * 60 * 60 * 24),
  );

  return diffDays >= 0 ? diffDays : null;
}

function buildLastMaintenanceMobileDisplay(
  rawDate: string | undefined,
  formattedDate: string | null,
): string {
  if (!formattedDate || !rawDate?.trim()) return EMPTY_READOUT;

  const daysAgo = daysSinceDateOnly(rawDate);
  if (daysAgo === null) return formattedDate;

  return `${formattedDate} (${daysAgo} d ago)`;
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
    lastMaintenanceMobileDisplay: buildLastMaintenanceMobileDisplay(
      equipment.last_maintenance,
      lastMaintenanceDate,
    ),
    workingHoursText: `${hoursFormatted} hours`,
    workingHoursShortText: `${hoursFormatted} hrs`,
    workingHoursDisplay: hoursFormatted,
    assetDescriptor: buildAssetDescriptor(equipment.manufacturer, equipment.model),
    serialDisplay: equipment.serial_number?.trim() ? equipment.serial_number : EMPTY_READOUT,
    locationDisplay: equipment.location?.trim() ? equipment.location : EMPTY_READOUT,
  };
}
