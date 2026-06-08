import { useEffect, useRef } from 'react';
import type { SetURLSearchParams } from 'react-router-dom';

type UseWorkOrderDetailsActionQueryParams = {
  actionParam: string | null;
  shouldAutoOpenNoteForm: boolean;
  shouldAutoOpenPDFDialog: boolean;
  shouldAutoFocusPM: boolean;
  workOrderLoading: boolean;
  hasWorkOrder: boolean;
  setSearchParams: SetURLSearchParams;
  notesSectionRef: React.RefObject<HTMLDivElement | null>;
  pmSectionRef: React.RefObject<HTMLDivElement | null>;
  onAutoOpenPDFDialog: () => void;
};

export function useWorkOrderDetailsActionQuery({
  actionParam,
  shouldAutoOpenNoteForm,
  shouldAutoOpenPDFDialog,
  shouldAutoFocusPM,
  workOrderLoading,
  hasWorkOrder,
  setSearchParams,
  notesSectionRef,
  pmSectionRef,
  onAutoOpenPDFDialog,
}: UseWorkOrderDetailsActionQueryParams) {
  const actionHandledRef = useRef(false);

  useEffect(() => {
    if (actionHandledRef.current) return;
    if (!hasWorkOrder || workOrderLoading) return;

    if (shouldAutoOpenPDFDialog) {
      onAutoOpenPDFDialog();
      actionHandledRef.current = true;
      setSearchParams({}, { replace: true });
    } else if (shouldAutoOpenNoteForm) {
      setTimeout(() => {
        notesSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
      actionHandledRef.current = true;
      setSearchParams({}, { replace: true });
    } else if (shouldAutoFocusPM) {
      setTimeout(() => {
        pmSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
      actionHandledRef.current = true;
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete('action');
          return next;
        },
        { replace: true },
      );
    }
  }, [
    shouldAutoOpenPDFDialog,
    shouldAutoOpenNoteForm,
    shouldAutoFocusPM,
    hasWorkOrder,
    workOrderLoading,
    setSearchParams,
    notesSectionRef,
    pmSectionRef,
    onAutoOpenPDFDialog,
  ]);

  useEffect(() => {
    if (!actionParam) {
      actionHandledRef.current = false;
    }
  }, [actionParam]);
}
