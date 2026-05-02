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
 * As of 2026-05, this is enabled by default for all environments because
 * the offline queue is the field-critical path: technicians need to be
 * able to create / update / complete PM checklists and work orders on
 * cellular dead-zones. Coverage was extended in the same release to
 * include PM init / update via OfflineAwareWorkOrderService.
 *
 * Set `VITE_ENABLE_OFFLINE_QUEUE=false` (literal string `false`) to disable
 * the feature for tests or emergency rollbacks. Any other value (unset,
 * empty, `true`, etc.) keeps it on.
 */
export const OFFLINE_QUEUE_ENABLED = import.meta.env.VITE_ENABLE_OFFLINE_QUEUE !== 'false';

/**
 * Feature flag accessor utility
 */
export const FeatureFlags = {
  quickbooks: {
    enabled: QUICKBOOKS_ENABLED,
    disabled: !QUICKBOOKS_ENABLED
  },
  mfa: {
    enabled: MFA_ENABLED,
    disabled: !MFA_ENABLED
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

