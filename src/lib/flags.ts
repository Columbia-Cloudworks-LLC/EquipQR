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
 * Feature flag accessor utility
 */
export const FeatureFlags = {
  quickbooks: {
    enabled: QUICKBOOKS_ENABLED,
    disabled: !QUICKBOOKS_ENABLED
  },
  offlineQueue: {
    enabled: OFFLINE_QUEUE_ENABLED,
    disabled: !OFFLINE_QUEUE_ENABLED
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
 * Check if QuickBooks integration is disabled
 * @returns true if QuickBooks is disabled
 */
export function isQuickBooksDisabled(): boolean {
  return !QUICKBOOKS_ENABLED;
}

/**
 * Check if the offline queue feature is enabled
 * @returns true if offline queue features should be active
 */
export function isOfflineQueueEnabled(): boolean {
  return OFFLINE_QUEUE_ENABLED;
}

