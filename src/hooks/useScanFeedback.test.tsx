import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useScanFeedback } from '@/hooks/useScanFeedback';

const hoisted = vi.hoisted(() => ({
  prepareScanFeedback: vi.fn(),
  markScanFeedbackPending: vi.fn(),
  triggerPendingScanFeedback: vi.fn(),
}));

vi.mock('@/lib/scanFeedback', () => ({
  prepareScanFeedback: hoisted.prepareScanFeedback,
  markScanFeedbackPending: hoisted.markScanFeedbackPending,
  triggerPendingScanFeedback: hoisted.triggerPendingScanFeedback,
  PENDING_SCAN_FEEDBACK_STORAGE_KEY: 'equipqr_pending_scan_feedback',
  playDirectScanFeedbackTone: vi.fn(),
  getScanFeedbackDebugInfo: vi.fn(),
  resetScanFeedbackForTests: vi.fn(),
}));

describe('useScanFeedback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('delegates to scanFeedback helpers', () => {
    const { result } = renderHook(() => useScanFeedback());

    result.current.prepareFeedback();
    expect(hoisted.prepareScanFeedback).toHaveBeenCalledTimes(1);

    result.current.markPendingFeedback();
    expect(hoisted.markScanFeedbackPending).toHaveBeenCalledTimes(1);

    result.current.triggerFeedback();
    expect(hoisted.triggerPendingScanFeedback).toHaveBeenCalledTimes(1);

    result.current.triggerPendingFeedback();
    expect(hoisted.triggerPendingScanFeedback).toHaveBeenCalledTimes(2);
  });
});
