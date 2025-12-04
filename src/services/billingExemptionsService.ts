/**
 * @deprecated Billing system has been removed. This service is kept for backward compatibility
 * but all functions return empty arrays or throw errors since billing is disabled.
 */

import type { 
  BillingExemptionWithDetails, 
  ExemptionFormData, 
  AdminOrganization 
} from '@/types/billingExemptions';

/**
 * @deprecated Billing is disabled. Returns empty array.
 */
export async function listExemptions(
  organizationId?: string
): Promise<BillingExemptionWithDetails[]> {
  // Billing is disabled - return empty array
  return [];
}

/**
 * @deprecated Billing is disabled. Throws error.
 */
export async function createExemption(
  data: ExemptionFormData
): Promise<BillingExemptionWithDetails> {
  throw new Error('Billing system has been removed. Exemptions are no longer supported.');
}

/**
 * @deprecated Billing is disabled. Throws error.
 */
export async function updateExemption(
  id: string,
  data: Partial<ExemptionFormData> & { is_active?: boolean }
): Promise<BillingExemptionWithDetails> {
  throw new Error('Billing system has been removed. Exemptions are no longer supported.');
}

/**
 * @deprecated Billing is disabled. Throws error.
 */
export async function deleteExemption(id: string): Promise<void> {
  throw new Error('Billing system has been removed. Exemptions are no longer supported.');
}

/**
 * @deprecated Billing is disabled. Returns empty array.
 */
export async function listOrganizations(): Promise<AdminOrganization[]> {
  // Billing is disabled - return empty array
  return [];
}
