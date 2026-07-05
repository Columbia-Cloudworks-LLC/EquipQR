import { defaultForkliftChecklist, type PMChecklistCondition, type PMChecklistItem } from '@/features/pm-templates/services/preventativeMaintenanceService';
import { PM_CONDITION_NOT_APPLICABLE } from '@/utils/pmChecklistHelpers';
import { buildCollapsedPmChecklistSections } from '@/features/work-orders/utils/pmChecklistSectionState';
import { logger } from '@/utils/logger';

export function parsePMChecklistData(
  checklistData: unknown,
  storageKey: string,
): { checklist: PMChecklistItem[]; notes: string; fromStorage: boolean } {
  let parsedChecklist: PMChecklistItem[] = [];
  let notes = '';

  if (checklistData && Array.isArray(checklistData) && checklistData.length > 0) {
    const isValidChecklistData = checklistData.every((item: unknown) => {
      const checklistItem = item as Record<string, unknown>;
      return (
        item &&
        typeof item === 'object' &&
        typeof checklistItem.id === 'string' &&
        typeof checklistItem.title === 'string' &&
        typeof checklistItem.section === 'string' &&
        typeof checklistItem.required === 'boolean' &&
        (checklistItem.condition === null ||
          checklistItem.condition === undefined ||
          (typeof checklistItem.condition === 'number' &&
            Number(checklistItem.condition) >= 1 &&
            Number(checklistItem.condition) <= PM_CONDITION_NOT_APPLICABLE))
      );
    });

    if (isValidChecklistData) {
      parsedChecklist = checklistData.map((item: unknown) => {
        const checklistItem = item as Record<string, unknown>;
        return {
          id: String(checklistItem.id),
          title: String(checklistItem.title),
          description: checklistItem.description ? String(checklistItem.description) : undefined,
          section: String(checklistItem.section),
          required: Boolean(checklistItem.required),
          condition:
            checklistItem.condition !== null && checklistItem.condition !== undefined
              ? (Number(checklistItem.condition) as PMChecklistCondition)
              : null,
          notes: checklistItem.notes ? String(checklistItem.notes) : undefined,
        };
      });
    } else {
      parsedChecklist = [...defaultForkliftChecklist];
    }
  } else {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
          if (parsed.data.checklist && Array.isArray(parsed.data.checklist)) {
            parsedChecklist = parsed.data.checklist;
            notes = parsed.data.notes || '';
            return { checklist: parsedChecklist, notes, fromStorage: true };
          }
        }
      }
    } catch (error) {
      logger.warn('Failed to load PM checklist from browser storage', error);
    }

    if (parsedChecklist.length === 0) {
      parsedChecklist = [...defaultForkliftChecklist];
    }
  }

  return { checklist: parsedChecklist, notes, fromStorage: false };
}

export function buildInitialOpenSections(checklist: PMChecklistItem[]): Record<string, boolean> {
  const sections = Array.from(new Set(checklist.map(item => item.section)));
  return buildCollapsedPmChecklistSections(sections);
}

export function isPMChecklistItemComplete(item: PMChecklistItem): boolean {
  return item.condition !== undefined && item.condition !== null;
}
