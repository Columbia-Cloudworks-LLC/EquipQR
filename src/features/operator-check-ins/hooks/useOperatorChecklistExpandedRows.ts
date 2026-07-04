import { useCallback, useState } from 'react';

export function useOperatorChecklistExpandedRows() {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());

  const setRowOpen = useCallback((rowId: string, open: boolean) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (open) {
        next.add(rowId);
      } else {
        next.delete(rowId);
      }
      return next;
    });
  }, []);

  const clearExpanded = useCallback((rowId: string) => {
    setExpandedIds((prev) => {
      if (!prev.has(rowId)) return prev;
      const next = new Set(prev);
      next.delete(rowId);
      return next;
    });
  }, []);

  const expandRow = useCallback((rowId: string) => {
    setExpandedIds((prev) => new Set(prev).add(rowId));
  }, []);

  return { expandedIds, setRowOpen, clearExpanded, expandRow };
}
