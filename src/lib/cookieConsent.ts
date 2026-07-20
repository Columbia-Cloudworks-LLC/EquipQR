/**
 * First-visit cookie / browser-storage consent helpers.
 *
 * Strictly necessary storage (always allowed):
 * - This consent decision (`equipqr:cookie-consent`)
 * - Supabase Auth session tokens (SDK-managed)
 * - `pendingRedirect` / scan-feedback sessionStorage (auth & QR flows)
 * - Offline mutation queue (`equipqr_offline_queue_*`)
 * - Pending terms-acceptance markers (`equipqr_pending_terms_acceptance:*`)
 *
 * Preference / optional storage (Accept only; cleared on Reject):
 * - `sidebar:state` cookie and UI preference localStorage keys listed below
 *
 * Third-party widgets (hCaptcha, Google Maps) stay available without Accept —
 * they are required for bot protection and map surfaces, not advertising.
 */

export const COOKIE_CONSENT_STORAGE_KEY = 'equipqr:cookie-consent';
export const SIDEBAR_COOKIE_NAME = 'sidebar:state';

export type CookieConsentDecision = 'accepted' | 'rejected';

const OPTIONAL_LOCAL_STORAGE_EXACT = new Set([
  'equipqr_current_org',
  'equipqr_current_organization',
  'equipqr_session_data',
  'equipqr:equipment-view-mode',
  'equipqr:alternate-groups-table-column-sizing',
  'equipqr:equipment-table-column-sizing:v2',
  'equipqr-user-settings',
  'audit-dashboard-grid-v1',
]);

const OPTIONAL_LOCAL_STORAGE_PREFIXES = [
  'equipqr:selectedTeamId:',
  'equipqr:equipment-table-columns:',
  'equipqr:inventory-table-preferences:',
  'equipqr-operator-checkin-starter-catalog-expanded:',
  'equipqr_dashboard_layout_',
  'eqr_work_timer_',
  'equipqr_admin_grants_',
  'equipqr_export_columns_',
  'pm-checklist-',
  'pm-template-editor-',
] as const;

export function isCookieConsentDecision(value: unknown): value is CookieConsentDecision {
  return value === 'accepted' || value === 'rejected';
}

export function getCookieConsentDecision(): CookieConsentDecision | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
    return isCookieConsentDecision(raw) ? raw : null;
  } catch {
    return null;
  }
}

export function setCookieConsentDecision(decision: CookieConsentDecision): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, decision);
  } catch {
    // Best-effort — banner may reappear if storage is unavailable.
  }
}

/** Preference cookies / localStorage may be written only after explicit Accept. */
export function isPreferenceStorageAllowed(): boolean {
  return getCookieConsentDecision() === 'accepted';
}

export function setPreferenceLocalStorage(key: string, value: string): boolean {
  if (typeof window === 'undefined' || !isPreferenceStorageAllowed()) return false;
  // Let quota / privacy-mode errors propagate to callers that log them.
  localStorage.setItem(key, value);
  return true;
}

export function removePreferenceLocalStorage(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export function setPreferenceCookie(name: string, value: string, maxAgeSeconds: number): boolean {
  if (typeof document === 'undefined' || !isPreferenceStorageAllowed()) return false;
  try {
    document.cookie = `${name}=${value}; path=/; max-age=${maxAgeSeconds}`;
    return true;
  } catch {
    return false;
  }
}

function clearSidebarPreferenceCookie(): void {
  if (typeof document === 'undefined') return;
  try {
    document.cookie = `${SIDEBAR_COOKIE_NAME}=; path=/; max-age=0`;
  } catch {
    // ignore
  }
}

function isOptionalLocalStorageKey(key: string): boolean {
  if (key === COOKIE_CONSENT_STORAGE_KEY) return false;
  if (OPTIONAL_LOCAL_STORAGE_EXACT.has(key)) return true;
  return OPTIONAL_LOCAL_STORAGE_PREFIXES.some((prefix) => key.startsWith(prefix));
}

/** Remove product-controlled preference storage after Reject. */
export function clearOptionalPreferenceStorage(): void {
  if (typeof window === 'undefined') return;

  clearSidebarPreferenceCookie();

  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key && isOptionalLocalStorageKey(key)) {
        keysToRemove.push(key);
      }
    }
    for (const key of keysToRemove) {
      localStorage.removeItem(key);
    }
  } catch {
    // ignore
  }
}

export function applyCookieConsentDecision(decision: CookieConsentDecision): void {
  setCookieConsentDecision(decision);
  if (decision === 'rejected') {
    clearOptionalPreferenceStorage();
  }
}
