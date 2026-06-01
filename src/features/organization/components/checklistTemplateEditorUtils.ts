import type { PMChecklistItem } from '@/features/pm-templates/services/preventativeMaintenanceService';

export const LARGE_TEMPLATE_THRESHOLD = 20;
export const SECTION_VIRTUALIZATION_THRESHOLD = 30;
export const VIRTUALIZATION_THRESHOLD = SECTION_VIRTUALIZATION_THRESHOLD;
export const COMPACT_ROW_HEIGHT = 72;

/** Reorder items within a flat checklist array (same-section drag-and-drop). */
export function reorderChecklistItems(
  items: PMChecklistItem[],
  activeId: string,
  overId: string
): PMChecklistItem[] {
  if (activeId === overId) return items;
  const fromIndex = items.findIndex((i) => i.id === activeId);
  const toIndex = items.findIndex((i) => i.id === overId);
  if (fromIndex === -1 || toIndex === -1) return items;
  if (items[fromIndex].section !== items[toIndex].section) return items;
  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

/** Move one item to the top or bottom of its section while preserving section order. */
export function moveChecklistItemToSectionEdge(
  items: PMChecklistItem[],
  itemId: string,
  edge: 'top' | 'bottom'
): PMChecklistItem[] {
  const item = items.find((i) => i.id === itemId);
  if (!item) return items;

  const sectionsOrder: string[] = [];
  const bySection = new Map<string, PMChecklistItem[]>();
  for (const entry of items) {
    if (!bySection.has(entry.section)) {
      sectionsOrder.push(entry.section);
      bySection.set(entry.section, []);
    }
    bySection.get(entry.section)!.push(entry);
  }

  const sectionItems = bySection.get(item.section);
  if (!sectionItems) return items;

  const idx = sectionItems.findIndex((i) => i.id === itemId);
  if (idx === -1) return items;
  if ((edge === 'top' && idx === 0) || (edge === 'bottom' && idx === sectionItems.length - 1)) {
    return items;
  }

  const [moved] = sectionItems.splice(idx, 1);
  if (edge === 'top') {
    sectionItems.unshift(moved);
  } else {
    sectionItems.push(moved);
  }
  bySection.set(item.section, sectionItems);

  return sectionsOrder.flatMap((section) => bySection.get(section)!);
}
