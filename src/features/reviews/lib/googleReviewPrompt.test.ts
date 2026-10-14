import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  GBP_REVIEW_PROMPT_STORAGE_KEY,
  REVIEW_MILESTONE_COMPLETED_WORK_ORDERS,
  REVIEW_MILESTONE_EXPORTED_INVOICES,
  getGbpReviewUrl,
  hasReachedReviewMilestone,
  isReviewPromptDismissed,
  markReviewPromptDismissed,
} from './googleReviewPrompt';

describe('hasReachedReviewMilestone', () => {
  it('is false below both thresholds', () => {
    expect(
      hasReachedReviewMilestone({
        completedWorkOrders: REVIEW_MILESTONE_COMPLETED_WORK_ORDERS - 1,
        exportedInvoices: REVIEW_MILESTONE_EXPORTED_INVOICES - 1,
      }),
    ).toBe(false);
  });

  it('is true at the 10th completed work order', () => {
    expect(REVIEW_MILESTONE_COMPLETED_WORK_ORDERS).toBe(10);
    expect(hasReachedReviewMilestone({ completedWorkOrders: 10, exportedInvoices: 0 })).toBe(true);
  });

  it('is true at the 5th exported QuickBooks invoice', () => {
    expect(REVIEW_MILESTONE_EXPORTED_INVOICES).toBe(5);
    expect(hasReachedReviewMilestone({ completedWorkOrders: 0, exportedInvoices: 5 })).toBe(true);
  });
});

describe('getGbpReviewUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns the configured Google Business Profile review link', () => {
    vi.stubEnv('VITE_GBP_REVIEW_URL', ' https://g.page/r/Cf8iRdYNXzu1EBM/review ');
    expect(getGbpReviewUrl()).toBe('https://g.page/r/Cf8iRdYNXzu1EBM/review');
  });

  it.each(['', 'not a url', 'http://g.page/r/x/review', 'https://evil.example/review'])(
    'rejects %j',
    (value) => {
      vi.stubEnv('VITE_GBP_REVIEW_URL', value);
      expect(getGbpReviewUrl()).toBeNull();
    },
  );
});

describe('review prompt dismissal', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('persists the dismissal timestamp under gbp_review_prompt_dismissed_at', () => {
    expect(isReviewPromptDismissed()).toBe(false);
    markReviewPromptDismissed(new Date('2026-10-14T12:00:00.000Z'));
    expect(localStorage.getItem(GBP_REVIEW_PROMPT_STORAGE_KEY)).toBe('2026-10-14T12:00:00.000Z');
    expect(isReviewPromptDismissed()).toBe(true);
  });
});
