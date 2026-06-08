import type { PMChecklistItem } from '@/features/pm-templates/services/preventativeMaintenanceService';

export type PMChecklistStats = {
  progress: number;
  total: number;
};

export function getPMChecklistStats(checklistData: unknown): PMChecklistStats {
  try {
    const checklist = typeof checklistData === 'string'
      ? JSON.parse(checklistData)
      : checklistData;

    if (!Array.isArray(checklist)) {
      return { progress: 0, total: 0 };
    }

    return {
      progress: checklist.filter(
        (item: PMChecklistItem) => item.condition !== null && item.condition !== undefined,
      ).length,
      total: checklist.length,
    };
  } catch {
    return { progress: 0, total: 0 };
  }
}
