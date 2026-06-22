import type { EquipmentRecord } from '@/features/equipment/types/equipment';

export type PmTemplateAssignmentFilter = 'all' | 'unassigned' | 'assigned';

export interface TemplateAssignmentFilters {
  search: string;
  status: string;
  manufacturer: string;
  location: string;
  pmTemplate: PmTemplateAssignmentFilter;
}

export const initialTemplateAssignmentFilters: TemplateAssignmentFilters = {
  search: '',
  status: 'all',
  manufacturer: 'all',
  location: 'all',
  pmTemplate: 'all',
};

export function countActiveTemplateAssignmentFilters(
  filters: TemplateAssignmentFilters,
): number {
  let count = 0;
  if (filters.status !== 'all') count += 1;
  if (filters.manufacturer !== 'all') count += 1;
  if (filters.location !== 'all') count += 1;
  if (filters.pmTemplate !== 'all') count += 1;
  return count;
}

export function deriveTemplateAssignmentFilterOptions(equipment: EquipmentRecord[]) {
  const manufacturers = [
    ...new Set(
      equipment
        .map((item) => item.manufacturer)
        .filter((value): value is string => Boolean(value?.trim())),
    ),
  ].sort((a, b) => a.localeCompare(b));

  const locations = [
    ...new Set(
      equipment
        .map((item) => item.location)
        .filter((value): value is string => Boolean(value?.trim())),
    ),
  ].sort((a, b) => a.localeCompare(b));

  return { manufacturers, locations };
}

export function filterEquipmentForTemplateAssignment(
  equipment: EquipmentRecord[],
  filters: TemplateAssignmentFilters,
): EquipmentRecord[] {
  const normalizedQuery = filters.search.trim().toLowerCase();

  return equipment.filter((item) => {
    if (normalizedQuery) {
      const name = (item.name ?? '').toLowerCase();
      const model = (item.model ?? '').toLowerCase();
      const serial = (item.serial_number ?? '').toLowerCase();
      const matchesSearch =
        name.includes(normalizedQuery) ||
        model.includes(normalizedQuery) ||
        serial.includes(normalizedQuery);
      if (!matchesSearch) return false;
    }

    if (filters.status !== 'all' && item.status !== filters.status) {
      return false;
    }

    if (filters.manufacturer !== 'all' && item.manufacturer !== filters.manufacturer) {
      return false;
    }

    if (filters.location !== 'all' && item.location !== filters.location) {
      return false;
    }

    if (filters.pmTemplate === 'unassigned' && item.default_pm_template_id) {
      return false;
    }

    if (filters.pmTemplate === 'assigned' && !item.default_pm_template_id) {
      return false;
    }

    return true;
  });
}
