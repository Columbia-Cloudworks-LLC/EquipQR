import { logger } from '@/utils/logger';
import { saveOrganizationPreference } from '@/utils/sessionPersistence';

/** Matches SimpleOrganizationProvider and QR redirect flows. */
export const DASHBOARD_CURRENT_ORG_STORAGE_KEY = 'equipqr_current_organization';

export function persistDashboardOrganizationSelection(organizationId: string): void {
  saveOrganizationPreference(organizationId);

  try {
    // This is strictly-necessary navigation state: QR redirects cross a
    // document boundary before the dashboard can receive the selected org.
    sessionStorage.setItem(DASHBOARD_CURRENT_ORG_STORAGE_KEY, organizationId);
  } catch (error) {
    logger.warn('Failed to save dashboard organization selection', error);
  }
}
