import { useMemo } from 'react';

interface Equipment {
  id: string;
  name: string;
  manufacturer: string;
  model: string;
  serial_number: string;
  status: string;
  location: string;
  installation_date: string;
  warranty_expiration?: string;
  last_maintenance?: string;
  team_id?: string;
}

interface StatusCounts {
  active: number;
  maintenance: number;
  inactive: number;
}

interface MaintenanceInsights {
  needsMaintenance: number;
  recentlyMaintained: number;
  maintenanceRate: number;
}

interface WarrantyInsights {
  expiringSoon: number;
  expired: number;
  hasWarrantyIssues: boolean;
}

interface LocationBreakdown {
  location: string;
  count: number;
}

interface ManufacturerBreakdown {
  manufacturer: string;
  count: number;
}

export interface EquipmentInsightsModel {
  totalEquipment: number;
  filteredTotal: number;
  statusCounts: StatusCounts;
  maintenanceInsights: MaintenanceInsights;
  warrantyInsights: WarrantyInsights;
  topLocations: LocationBreakdown[];
  topManufacturers: ManufacturerBreakdown[];
  hasFiltersApplied: boolean;
}

/**
 * Calculates the count of equipment by status
 */
function calculateStatusCounts(equipment: Equipment[]): StatusCounts {
  const counts = equipment.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    active: counts.active || 0,
    maintenance: counts.maintenance || 0,
    inactive: counts.inactive || 0,
  };
}

/**
 * Calculates maintenance-related insights
 */
function calculateMaintenanceInsights(
  equipment: Equipment[],
  now: Date
): MaintenanceInsights {
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const needsMaintenance = equipment.filter(
    (item) => item.status === 'maintenance'
  ).length;

  const recentlyMaintained = equipment.filter((item) => {
    if (!item.last_maintenance) return false;
    const maintenanceDate = new Date(item.last_maintenance);
    return maintenanceDate >= sevenDaysAgo;
  }).length;

  const maintenanceRate =
    equipment.length > 0
      ? Math.round((needsMaintenance / equipment.length) * 100)
      : 0;

  return {
    needsMaintenance,
    recentlyMaintained,
    maintenanceRate,
  };
}

/**
 * Calculates warranty-related insights
 */
function calculateWarrantyInsights(
  equipment: Equipment[],
  now: Date
): WarrantyInsights {
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const expiringSoon = equipment.filter(
    (item) =>
      item.warranty_expiration &&
      new Date(item.warranty_expiration) <= thirtyDaysFromNow &&
      new Date(item.warranty_expiration) >= now
  ).length;

  const expired = equipment.filter(
    (item) =>
      item.warranty_expiration && new Date(item.warranty_expiration) < now
  ).length;

  return {
    expiringSoon,
    expired,
    hasWarrantyIssues: expiringSoon > 0 || expired > 0,
  };
}

/**
 * Calculates top locations by equipment count
 */
function calculateTopLocations(
  equipment: Equipment[],
  limit = 5
): LocationBreakdown[] {
  const locationCounts = equipment.reduce((acc, item) => {
    acc[item.location] = (acc[item.location] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return Object.entries(locationCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([location, count]) => ({ location, count }));
}

/**
 * Calculates top manufacturers by equipment count
 */
function calculateTopManufacturers(
  equipment: Equipment[],
  limit = 5
): ManufacturerBreakdown[] {
  const manufacturerCounts = equipment.reduce((acc, item) => {
    acc[item.manufacturer] = (acc[item.manufacturer] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return Object.entries(manufacturerCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([manufacturer, count]) => ({ manufacturer, count }));
}

/**
 * Hook that computes equipment insights from the provided equipment data.
 * Extracts complex calculation logic from UI components for better testability
 * and separation of concerns.
 *
 * @param equipment - All equipment in the organization
 * @param filteredEquipment - Equipment after applying current filters
 * @returns Computed insights model ready for display
 */
export function useEquipmentInsights(
  equipment: Equipment[],
  filteredEquipment: Equipment[]
): EquipmentInsightsModel {
  return useMemo(() => {
    const now = new Date();
    const totalEquipment = equipment.length;
    const filteredTotal = filteredEquipment.length;

    return {
      totalEquipment,
      filteredTotal,
      statusCounts: calculateStatusCounts(filteredEquipment),
      maintenanceInsights: calculateMaintenanceInsights(filteredEquipment, now),
      warrantyInsights: calculateWarrantyInsights(filteredEquipment, now),
      topLocations: calculateTopLocations(filteredEquipment),
      topManufacturers: calculateTopManufacturers(filteredEquipment),
      hasFiltersApplied: filteredTotal !== totalEquipment,
    };
  }, [equipment, filteredEquipment]);
}

/**
 * Computes status percentage for display
 */
export function getStatusPercentage(count: number, total: number): number {
  return total > 0 ? Math.round((count / total) * 100) : 0;
}

/**
 * Truncates text for display with ellipsis
 */
export function truncateText(text: string, maxLength = 15): string {
  return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
}
