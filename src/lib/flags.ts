/**
 * Feature flags for EquipQR
 * 
 * These flags control the availability of features in the application.
 * They can be configured via environment variables.
 */

/**
 * Controls whether QuickBooks Online integration is enabled.
 * When disabled, all QuickBooks-related UI and functionality is hidden.
 * 
 * Set via environment variable: VITE_ENABLE_QUICKBOOKS
 * Defaults to false (disabled) unless explicitly set to 'true'.
 */
export const QUICKBOOKS_ENABLED = import.meta.env.VITE_ENABLE_QUICKBOOKS === 'true';

/**
 * Controls whether Multi-Factor Authentication (MFA) features are enabled.
 * When enabled, TOTP-based MFA is available for all users and mandatory for admin/owner roles.
 * 
 * Set via environment variable: VITE_ENABLE_MFA
 * Defaults to false (disabled) unless explicitly set to 'true'.
 */
export const MFA_ENABLED = import.meta.env.VITE_ENABLE_MFA === 'true';

/**
 * Controls whether the offline queue / offline-mode feature is enabled.
 * When enabled, mutations are queued locally when the device is offline and
 * replayed automatically on reconnect (OfflineQueueProvider + PendingSyncBanner).
 *
 * This feature is work-in-progress. Keep defaulting to false until it is
 * fully validated and ready for general availability.
 *
 * Set via environment variable: VITE_ENABLE_OFFLINE_QUEUE
 * Defaults to false (disabled) unless explicitly set to 'true'.
 */
export const OFFLINE_QUEUE_ENABLED = import.meta.env.VITE_ENABLE_OFFLINE_QUEUE === 'true';

/**
 * Controls whether the DSR cockpit workspace is enabled.
 * When enabled, org admins/owners can access the compliance cockpit route.
 *
 * Set via environment variable: VITE_ENABLE_DSR_COCKPIT
 * Defaults to false (disabled) unless explicitly set to 'true'.
 */
export const DSR_COCKPIT_ENABLED = import.meta.env.VITE_ENABLE_DSR_COCKPIT === 'true';

/**
 * Feature flag accessor utility
 */
export const FeatureFlags = {
  quickbooks: {
    enabled: QUICKBOOKS_ENABLED
  },
  mfa: {
    enabled: MFA_ENABLED
  },
  offlineQueue: {
    enabled: OFFLINE_QUEUE_ENABLED
  },
  dsrCockpit: {
    enabled: DSR_COCKPIT_ENABLED
  }
} as const;

/**
 * Check if QuickBooks integration is enabled
 * @returns true if QuickBooks features should be active
 */
export function isQuickBooksEnabled(): boolean {
  return QUICKBOOKS_ENABLED;
}

/**
 * Check if MFA is enabled
 * @returns true if MFA features should be active
 */
export function isMFAEnabled(): boolean {
  return MFA_ENABLED;
}

/**
 * Check if the offline queue feature is enabled
 * @returns true if offline queue features should be active
 */
export function isOfflineQueueEnabled(): boolean {
  return OFFLINE_QUEUE_ENABLED;
}

/**
 * Check if DSR cockpit is enabled
 * @returns true if cockpit features should be active
 */
export function isDSRCockpitEnabled(): boolean {
  return DSR_COCKPIT_ENABLED;
}
