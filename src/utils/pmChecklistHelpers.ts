import type { PMChecklistItem } from '@/features/pm-templates/services/preventativeMaintenanceService'

export const PM_CONDITION_NOT_APPLICABLE = 6 as const;

export type PMChecklistItemStatus =
  | 'not_rated'
  | 'ok'
  | 'not_applicable'
  | 'adjusted'
  | 'recommend_repairs'
  | 'requires_immediate_repairs'
  | 'unsafe_condition';

export const getItemStatus = (item: PMChecklistItem): PMChecklistItemStatus => {
  if (item.condition === null || item.condition === undefined) return 'not_rated'

  switch (item.condition) {
    case 1:
      return 'ok'
    case 2:
      return 'adjusted'
    case 3:
      return 'recommend_repairs'
    case 4:
      return 'requires_immediate_repairs'
    case 5:
      return 'unsafe_condition'
    case PM_CONDITION_NOT_APPLICABLE:
      return 'not_applicable'
    default:
      return 'not_rated'
  }
}

export function isNegativePMCondition(condition: number): boolean {
  return condition >= 2 && condition <= 5;
}

/**
 * Converts a status enum to human-readable text
 */
export const getStatusText = (status: PMChecklistItemStatus): string => {
  switch (status) {
    case 'ok':
      return 'OK'
    case 'not_applicable':
      return 'Not Applicable'
    case 'adjusted':
      return 'Adjusted'
    case 'recommend_repairs':
      return 'Recommend Repairs'
    case 'requires_immediate_repairs':
      return 'Requires Immediate Repairs'
    case 'unsafe_condition':
      return 'Unsafe Condition'
    case 'not_rated':
    default:
      return 'Not Rated'
  }
}

export function groupChecklistItemsBySection<T extends { section: string }>(
  items: T[],
): Record<string, T[]> {
  return items.reduce(
    (acc, item) => {
      if (!acc[item.section]) acc[item.section] = [];
      acc[item.section].push(item);
      return acc;
    },
    {} as Record<string, T[]>,
  );
}

export const createSegmentsForSection = (items: PMChecklistItem[]) => {
  return items.map(item => ({
    id: item.id,
    status: getItemStatus(item),
    section: item.section,
    title: item.title,
    notes: item.notes,
  }))
}
