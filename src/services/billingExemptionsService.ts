import { supabase } from '@/integrations/supabase/client';
import type { 
  BillingExemptionWithDetails, 
  ExemptionFormData, 
  AdminOrganization 
} from '@/types/billingExemptions';

/**
 * List billing exemptions for a specific organization or all organizations
 */
export async function listExemptions(
  organizationId?: string
): Promise<BillingExemptionWithDetails[]> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const url = new URL(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-billing-exemptions/list`
  );
  
  if (organizationId) {
    url.searchParams.set('organization_id', organizationId);
  }

  const response = await fetch(url.toString(), {
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to list exemptions');
  }

  const result = await response.json();
  return result.exemptions;
}

/**
 * Create a new billing exemption
 */
export async function createExemption(
  data: ExemptionFormData
): Promise<BillingExemptionWithDetails> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-billing-exemptions/create`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create exemption');
  }

  const result = await response.json();
  return result.exemption;
}

/**
 * Update an existing billing exemption
 */
export async function updateExemption(
  id: string,
  data: Partial<ExemptionFormData> & { is_active?: boolean }
): Promise<BillingExemptionWithDetails> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-billing-exemptions/update`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id, ...data }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update exemption');
  }

  const result = await response.json();
  return result.exemption;
}

/**
 * Delete a billing exemption
 */
export async function deleteExemption(id: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const url = new URL(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-billing-exemptions/delete`
  );
  url.searchParams.set('id', id);

  const response = await fetch(url.toString(), {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete exemption');
  }
}

/**
 * List all organizations (admin only)
 */
export async function listOrganizations(): Promise<AdminOrganization[]> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/list-organizations-admin`,
    {
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to list organizations');
  }

  const result = await response.json();
  return result.organizations;
}

