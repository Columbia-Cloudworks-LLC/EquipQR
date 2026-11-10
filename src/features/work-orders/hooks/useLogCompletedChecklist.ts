import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePMTemplate } from '@/features/pm-templates/hooks/usePMTemplates';
import {
  defaultForkliftChecklist,
  type PMChecklistCondition,
  type PMChecklistItem,
} from '@/features/pm-templates/services/preventativeMaintenanceService';
import { isNegativePMCondition } from '@/utils/pmChecklistHelpers';

/** Every item rated OK, with any prior notes cleared: a clean historical PM. */
export function buildAllOkChecklist(items: ReadonlyArray<PMChecklistItem>): PMChecklistItem[] {
  return items.map((item) => ({
    id: item.id,
    title: item.title,
    description: item.description,
    section: item.section,
    required: item.required,
    condition: 1 as const,
  }));
}

interface UseLogCompletedChecklistArgs {
  /** Only build the checklist while "Include PM" is on in Log Completed mode. */
  enabled: boolean;
  templateId: string | null | undefined;
}

/**
 * Checklist state for a PM logged from a paper sheet. Starts with every item
 * rated OK so a clean PM can be saved immediately; the desk user only taps the
 * one or two items that needed attention.
 */
export function useLogCompletedChecklist({ enabled, templateId }: UseLogCompletedChecklistArgs) {
  const templateQuery = usePMTemplate(enabled && templateId ? templateId : '');
  const isLoading = enabled && Boolean(templateId) && templateQuery.isLoading;

  const sourceItems = useMemo<ReadonlyArray<PMChecklistItem> | null>(() => {
    if (!enabled) return null;
    if (!templateId) return defaultForkliftChecklist;
    const templateData = templateQuery.data?.template_data;
    return Array.isArray(templateData) && templateData.length > 0 ? templateData : null;
  }, [enabled, templateId, templateQuery.data]);

  const [items, setItems] = useState<PMChecklistItem[]>([]);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  // Rebuild from the source whenever the template (or the toggle) changes.
  useEffect(() => {
    setItems(sourceItems ? buildAllOkChecklist(sourceItems) : []);
  }, [sourceItems]);

  const setCondition = useCallback((itemId: string, condition: PMChecklistCondition) => {
    setItems((prev) => prev.map((item) => (item.id === itemId ? { ...item, condition } : item)));
  }, []);

  const setNotes = useCallback((itemId: string, notes: string) => {
    setItems((prev) => prev.map((item) => (item.id === itemId ? { ...item, notes } : item)));
  }, []);

  /** Back to all OK (rapid entry clears exceptions between records). */
  const reset = useCallback(() => {
    setItems(sourceItems ? buildAllOkChecklist(sourceItems) : []);
  }, [sourceItems]);

  const exceptionCount = useMemo(
    () =>
      items.filter(
        (item) =>
          item.condition !== null && item.condition !== undefined && isNegativePMCondition(item.condition),
      ).length,
    [items],
  );

  /** Latest items for the submit handler, without re-creating it on every tap. */
  const getItems = useCallback(() => itemsRef.current, []);

  return { items, isLoading, exceptionCount, setCondition, setNotes, reset, getItems };
}
