/**
 * Helper utilities for testing QR code functionality
 * These functions help simulate and test the QR redirect flow
 */

import { logger } from '@/utils/logger';

export const QRTestHelper = {
  /**
   * Simulate scanning a QR code by navigating to the QR redirect URL
   */
  simulateQRScan: (equipmentId: string) => {
    logger.debug('Simulating QR scan for equipment', { equipmentId });
    window.location.href = `/qr/equipment/${equipmentId}`;
  },

  /**
   * Check if there's a pending redirect in session storage
   */
  checkPendingRedirect: () => {
    const pendingRedirect = sessionStorage.getItem('pendingRedirect');
    logger.debug('Pending redirect', { pendingRedirect });
    return pendingRedirect;
  },

  /**
   * Clear any pending redirects (useful for testing)
   */
  clearPendingRedirect: () => {
    sessionStorage.removeItem('pendingRedirect');
    logger.debug('Cleared pending redirect');
  },

  /**
   * Set a test pending redirect (for testing auth flow)
   */
  setTestPendingRedirect: (equipmentId: string) => {
    const testRedirect = `/equipment/${equipmentId}?qr=true`;
    sessionStorage.setItem('pendingRedirect', testRedirect);
    logger.debug('Set test pending redirect', { testRedirect });
  },

  /**
   * Get current organization context for debugging
   */
  debugOrganizationContext: () => {
    const sessionData = localStorage.getItem('equipqr_session_data');
    if (sessionData) {
      try {
        const parsed = JSON.parse(sessionData) as {
          organizations?: unknown;
          currentOrganizationId?: string;
        };
        logger.debug('Current session organizations', { organizations: parsed.organizations });
        logger.debug('Current organization ID', { organizationId: parsed.currentOrganizationId });
        return parsed;
      } catch (error) {
        logger.error('Error parsing session data', error);
      }
    }
    return null;
  }
};

// Make available globally for testing in browser console
if (typeof window !== 'undefined') {
  type WindowWithQRTestHelper = typeof window & {
    QRTestHelper?: typeof QRTestHelper;
  };

  const windowWithHelper = window as WindowWithQRTestHelper;
  windowWithHelper.QRTestHelper = QRTestHelper;
}