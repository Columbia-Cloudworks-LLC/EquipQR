import { useCallback } from 'react';
import {
  markScanFeedbackPending,
  prepareScanFeedback,
  triggerPendingScanFeedback,
} from '@/lib/scanFeedback';

export function useScanFeedback() {
  const prepareFeedback = useCallback(() => {
    prepareScanFeedback();
  }, []);

  const markPendingFeedback = useCallback(() => {
    markScanFeedbackPending();
  }, []);

  const triggerPendingFeedback = useCallback(() => {
    triggerPendingScanFeedback();
  }, []);

  return { prepareFeedback, markPendingFeedback, triggerPendingFeedback };
}
