import type { SupabaseClient } from "npm:@supabase/supabase-js@2.45.0";
import type { TeamCustomerMapping } from "./qbo-tax-status.ts";

export async function resolveTeamCustomerMapping(
  supabaseClient: SupabaseClient,
  logStep: (step: string, details?: Record<string, unknown>) => void,
  params: {
    workOrderId: string;
    equipmentTeamId: string;
    organizationId: string;
  },
): Promise<TeamCustomerMapping | null> {
  let resolvedQBCustomerId: string | null = null;
  let resolvedDisplayName: string | null = null;
  let resolvedCustomerAccountId: string | null = null;
  let cachedIsTaxExempt: boolean | null = null;
  let taxStatusSyncedAt: string | null = null;

  const { data: teamRow, error: teamError } = await supabaseClient
    .from('teams')
    .select('customer_id')
    .eq('id', params.equipmentTeamId)
    .eq('organization_id', params.organizationId)
    .single();

  if (teamError) {
    logStep('Error resolving team for QB customer', {
      work_order_id: params.workOrderId,
      equipmentTeamId: params.equipmentTeamId,
      organization_id: params.organizationId,
      error: teamError.message,
      code: teamError.code,
    });
  }

  if (teamRow?.customer_id) {
    const { data: customerAccount } = await supabaseClient
      .from('customers')
      .select('id, quickbooks_customer_id, name, is_tax_exempt, quickbooks_tax_status_synced_at')
      .eq('id', teamRow.customer_id)
      .eq('organization_id', params.organizationId)
      .single();

    if (customerAccount?.quickbooks_customer_id) {
      resolvedQBCustomerId = customerAccount.quickbooks_customer_id;
      resolvedDisplayName = customerAccount.name;
      resolvedCustomerAccountId = customerAccount.id;
      cachedIsTaxExempt = customerAccount.is_tax_exempt ?? null;
      taxStatusSyncedAt = customerAccount.quickbooks_tax_status_synced_at ?? null;
    }
  }

  // Fallback to legacy mapping table
  if (!resolvedQBCustomerId) {
    const { data: legacyMapping } = await supabaseClient
      .from('quickbooks_team_customers')
      .select('quickbooks_customer_id, display_name')
      .eq('organization_id', params.organizationId)
      .eq('team_id', params.equipmentTeamId)
      .single();

    if (legacyMapping) {
      resolvedQBCustomerId = legacyMapping.quickbooks_customer_id;
      resolvedDisplayName = legacyMapping.display_name;
    }
  }

  if (!resolvedQBCustomerId) {
    return null;
  }

  return {
    quickbooks_customer_id: resolvedQBCustomerId,
    display_name: resolvedDisplayName ?? 'Unknown',
    customer_account_id: resolvedCustomerAccountId,
    cached_is_tax_exempt: cachedIsTaxExempt,
    tax_status_synced_at: taxStatusSyncedAt,
  };
}
