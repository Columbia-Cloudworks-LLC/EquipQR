/**
 * Feature flags for EquipQR
 * 
 * These flags control the availability of features in the application.
 * They can be configured via environment variables.
 */

/**
 * Controls whether billing and payment features are enabled.
 * When disabled, all users have access to all features regardless of subscription status.
 * 
 * Set via environment variable: BILLING_DISABLED
 * Defaults to true (disabled) unless explicitly set to false in production.
 */
export const BILLING_DISABLED = import.meta.env.BILLING_DISABLED === 'true' || import.meta.env.BILLING_DISABLED !== 'false';

/**
 * Controls whether QuickBooks Online integration is enabled.
 * When disabled, all QuickBooks-related UI and functionality is hidden.
 * 
 * Set via environment variable: VITE_ENABLE_QUICKBOOKS
 * Defaults to false (disabled) unless explicitly set to 'true'.
 */
export const QUICKBOOKS_ENABLED = import.meta.env.VITE_ENABLE_QUICKBOOKS === 'true';

/**
 * Controls whether PDF attachments are enabled for QuickBooks invoice exports.
 * When enabled, a PDF containing public work order details will be attached to exported invoices.
 * 
 * Set via environment variable: VITE_ENABLE_QB_PDF_ATTACHMENT
 * Defaults to false (disabled) unless explicitly set to 'true'.
 * 
 * Note: This is a client-side flag for UI purposes. The actual feature is controlled
 * by the ENABLE_QB_PDF_ATTACHMENT environment variable in the Supabase edge function.
 */
export const QB_PDF_ATTACHMENT_ENABLED = import.meta.env.VITE_ENABLE_QB_PDF_ATTACHMENT === 'true';

/**
 * Controls whether the enhanced geolocation hierarchy features are enabled.
 * Includes: team location override, structured address fields, location history, and privacy controls.
 * 
 * Set via environment variable: VITE_ENABLE_GEOLOCATION_HIERARCHY
 * Defaults to false (disabled) unless explicitly set to 'true'.
 */
export const GEOLOCATION_HIERARCHY_ENABLED = import.meta.env.VITE_ENABLE_GEOLOCATION_HIERARCHY === 'true';

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
 * Feature flag accessor utility
 */
export const FeatureFlags = {
  billing: {
    disabled: BILLING_DISABLED,
    enabled: !BILLING_DISABLED
  },
  quickbooks: {
    enabled: QUICKBOOKS_ENABLED,
    disabled: !QUICKBOOKS_ENABLED,
    pdfAttachment: {
      enabled: QB_PDF_ATTACHMENT_ENABLED,
      disabled: !QB_PDF_ATTACHMENT_ENABLED
    }
  },
  geolocation: {
    enabled: GEOLOCATION_HIERARCHY_ENABLED,
    disabled: !GEOLOCATION_HIERARCHY_ENABLED
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
 * Check if billing is enabled
 * @returns true if billing features should be active
 */
export function isBillingEnabled(): boolean {
  return !BILLING_DISABLED;
}

/**
 * Check if billing is disabled
 * @returns true if billing is disabled
 */
export function isBillingDisabled(): boolean {
  return BILLING_DISABLED;
}

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
 * Check if QuickBooks PDF attachment is enabled
 * @returns true if PDF attachments should be active
 */
export function isQBPDFAttachmentEnabled(): boolean {
  return QB_PDF_ATTACHMENT_ENABLED;
}

/**
 * Check if geolocation hierarchy is enabled
 * @returns true if geolocation hierarchy features should be active
 */
export function isGeolocationHierarchyEnabled(): boolean {
  return GEOLOCATION_HIERARCHY_ENABLED;
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