import type {
  EquipmentListFilters,
  EquipmentListRow,
} from '@/features/equipment/services/EquipmentService';

const WARRANTY_EXPIRING_WINDOW_DAYS = 30;

function includesText(value: string | null | undefined, needle: string): boolean {
  return !!value && value.toLowerCase().includes(needle);
}

function dateOnly(value: string | null | undefined): string | null {
  return value ? value.slice(0, 10) : null;
}

function withinDates(value: string | null | undefined, from?: string, to?: string): boolean {
  if (!from && !to) return true;
  const day = dateOnly(value);
  if (!day) return false;
  return (!from || day >= from) && (!to || day <= to);
}

function matches(row: EquipmentListRow, filters: EquipmentListFilters, today: string, warrantyLimit: string): boolean {
  const search = filters.search?.trim().toLowerCase();
  if (
    search &&
    !includesText(row.name, search) &&
    !includesText(row.manufacturer, search) &&
    !includesText(row.model, search) &&
    !includesText(row.serial_number, search) &&
    !includesText(row.location, search)
  ) {
    return false;
  }

  if (filters.status === 'out_of_service') {
    if (row.status !== 'maintenance' && row.status !== 'inactive') return false;
  } else if (filters.status && row.status !== filters.status) {
    return false;
  }

  if (filters.manufacturer && row.manufacturer !== filters.manufacturer) return false;
  if (filters.location && row.location !== filters.location) return false;

  if (filters.team === 'unassigned') {
    if (row.team_id) return false;
  } else if (filters.team && filters.team !== 'all' && row.team_id !== filters.team) {
    return false;
  }

  if (!withinDates(row.last_maintenance, filters.maintenanceDateFrom, filters.maintenanceDateTo)) return false;
  if (!withinDates(row.installation_date, filters.installationDateFrom, filters.installationDateTo)) return false;

  if (filters.warrantyExpiring) {
    const warranty = dateOnly(row.warranty_expiration);
    if (!warranty || warranty < today || warranty > warrantyLimit) return false;
  }

  return true;
}

function sortValue(row: EquipmentListRow, field: string): string | number | null {
  if (field === 'team_name') return row.team?.name ?? row.team_name ?? null;
  const value: unknown = field in row ? row[field as keyof EquipmentListRow] : null;
  return typeof value === 'string' || typeof value === 'number' ? value : null;
}

/**
 * The Equipment screen's filters and sort, applied on the device to the
 * saved copy of the list. Used only with no connection, where the server
 * that normally does this cannot be reached.
 */
export function filterEquipmentListOffline<T extends EquipmentListRow>(
  rows: readonly T[],
  filters: EquipmentListFilters,
  sort: { field: string; direction: 'asc' | 'desc' },
  now: Date = new Date(),
): T[] {
  const today = now.toISOString().slice(0, 10);
  const limit = new Date(now.getTime() + WARRANTY_EXPIRING_WINDOW_DAYS * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const direction = sort.direction === 'desc' ? -1 : 1;

  return rows
    .filter((row) => matches(row, filters, today, limit))
    .sort((a, b) => {
      const left = sortValue(a, sort.field);
      const right = sortValue(b, sort.field);
      if (left === right) return a.name.localeCompare(b.name);
      // Rows without a value go last whichever way the list is sorted.
      if (left === null) return 1;
      if (right === null) return -1;
      const order =
        typeof left === 'number' && typeof right === 'number'
          ? left - right
          : String(left).localeCompare(String(right), undefined, { numeric: true, sensitivity: 'base' });
      return order * direction;
    });
}
