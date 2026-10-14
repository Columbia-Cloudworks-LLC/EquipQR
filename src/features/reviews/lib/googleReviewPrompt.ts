/**
 * One-time "leave us a Google review" prompt for organization owners/admins
 * after a real value milestone. The link is the Columbia Cloudworks LLC Google
 * Business Profile review URL from build-time env.
 */

/** Completed work orders in the organization that unlock the prompt. */
export const REVIEW_MILESTONE_COMPLETED_WORK_ORDERS = 10;
/**
 * Successful QuickBooks invoice exports in the organization that unlock the
 * prompt. Counted only for users who can manage QuickBooks (owners, and admins
 * with that permission), because export logs are limited to them by RLS.
 */
export const REVIEW_MILESTONE_EXPORTED_INVOICES = 5;

/**
 * Set once the prompt has been shown. Kept even when preference storage is
 * rejected: it exists only to honor "never ask again".
 */
export const GBP_REVIEW_PROMPT_STORAGE_KEY = 'gbp_review_prompt_dismissed_at';

export interface ReviewMilestoneCounts {
  completedWorkOrders: number;
  exportedInvoices: number;
}

export function hasReachedReviewMilestone(counts: ReviewMilestoneCounts): boolean {
  return (
    counts.completedWorkOrders >= REVIEW_MILESTONE_COMPLETED_WORK_ORDERS ||
    counts.exportedInvoices >= REVIEW_MILESTONE_EXPORTED_INVOICES
  );
}

/** Review URL from env; only https Google links are accepted. */
export function getGbpReviewUrl(): string | null {
  const raw = (import.meta.env.VITE_GBP_REVIEW_URL as string | undefined)?.trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    const host = url.hostname;
    const isGoogle = host === 'g.page' || host === 'google.com' || host.endsWith('.google.com');
    return url.protocol === 'https:' && isGoogle ? url.toString() : null;
  } catch {
    return null;
  }
}

function getLocalStorage(): Storage | null {
  try {
    if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis) {
      return globalThis.localStorage;
    }
  } catch {
    // ignore
  }
  return null;
}

export function isReviewPromptDismissed(): boolean {
  try {
    return Boolean(getLocalStorage()?.getItem(GBP_REVIEW_PROMPT_STORAGE_KEY));
  } catch {
    // Unreadable storage: stay quiet rather than risk asking repeatedly.
    return true;
  }
}

export function markReviewPromptDismissed(now: Date = new Date()): void {
  try {
    getLocalStorage()?.setItem(GBP_REVIEW_PROMPT_STORAGE_KEY, now.toISOString());
  } catch {
    // ignore — best-effort
  }
}
