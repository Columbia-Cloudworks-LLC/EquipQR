import { logger } from '@/utils/logger';
import { setPreferenceLocalStorage } from '@/lib/cookieConsent';
import { saveOrganizationPreference } from '@/utils/sessionPersistence';

/** Matches SimpleOrganizationProvider and QR redirect flows. */
export const DASHBOARD_CURRENT_ORG_STORAGE_KEY = 'equipqr_current_organization';

export function persistDashboardOrganizationSelection(organizationId: string): void {
  saveOrganizationPreference(organizationId);

  try {
    if (!setPreferenceLocalStorage(DASHBOARD_CURRENT_ORG_STORAGE_KEY, organizationId)) {
      return;
    }
  } catch (error) {
    logger.warn('Failed to save dashboard organization selection', error);
  }
}
