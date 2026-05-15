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

  const triggerFeedback = useCallback(() => {
    triggerPendingScanFeedback();
  }, []);

  return {
    prepareFeedback,
    markPendingFeedback,
    /** Compliance / checklist entrypoint — same as `triggerPendingScanFeedback`. */
    triggerFeedback,
    /** @deprecated Prefer `triggerFeedback` — kept for existing call sites. */
    triggerPendingFeedback: triggerFeedback,
  };
}
