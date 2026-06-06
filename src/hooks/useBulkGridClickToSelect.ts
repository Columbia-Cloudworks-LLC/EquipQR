import { useCallback, useEffect, useRef } from 'react';

const CLICK_SELECT_DELAY_MS = 250;

/**
 * Debounced click-to-select for bulk-edit grids. Single-click schedules a row toggle;
 * double-click handlers should call `cancelPendingSelection` before opening an editor.
 */
export function useBulkGridClickToSelect(onToggleSelected: (id: string) => void) {
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSelectIdRef = useRef<string | null>(null);

  const cancelPendingSelection = useCallback(() => {
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }
    pendingSelectIdRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current);
        clickTimerRef.current = null;
      }
    };
  }, []);

  const handleRowClick = useCallback(
    (rowId: string, e: React.MouseEvent<HTMLElement>) => {
      if (e.detail > 1) return;
      cancelPendingSelection();
      pendingSelectIdRef.current = rowId;
      clickTimerRef.current = setTimeout(() => {
        const id = pendingSelectIdRef.current;
        clickTimerRef.current = null;
        pendingSelectIdRef.current = null;
        if (id) onToggleSelected(id);
      }, CLICK_SELECT_DELAY_MS);
    },
    [cancelPendingSelection, onToggleSelected]
  );

  return { cancelPendingSelection, handleRowClick };
}
