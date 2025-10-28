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
 * Feature flag accessor utility
 */
export const FeatureFlags = {
  billing: {
    disabled: BILLING_DISABLED,
    enabled: !BILLING_DISABLED
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

