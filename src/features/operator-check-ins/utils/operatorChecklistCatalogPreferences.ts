import { getPreferenceLocalStorage, setPreferenceLocalStorage } from '@/lib/cookieConsent';

const STORAGE_PREFIX = 'equipqr-operator-checkin-starter-catalog-expanded:';

export function getStarterCatalogExpandedPreference(organizationId: string): boolean | null {
  try {
    const stored = getPreferenceLocalStorage(`${STORAGE_PREFIX}${organizationId}`);
    if (stored === '1') return true;
    if (stored === '0') return false;
    return null;
  } catch {
    return null;
  }
}

export function setStarterCatalogExpandedPreference(organizationId: string, expanded: boolean): void {
  try {
    setPreferenceLocalStorage(`${STORAGE_PREFIX}${organizationId}`, expanded ? '1' : '0');
  } catch {
    // Best-effort only — catalog defaults to org template count when unset.
  }
}
