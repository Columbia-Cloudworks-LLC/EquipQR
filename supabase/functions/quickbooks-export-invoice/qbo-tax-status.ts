import type { SupabaseClient } from "npm:@supabase/supabase-js@2.45.0";
import {
  QBO_API_BASE,
  resolveQboTaxStatusMaxCacheAgeHours,
  resolveQboTaxStatusUnconfirmedMode,
  withMinorVersion,
} from "../_shared/quickbooks-config.ts";
import type { VerifiedTaxState } from "./qbo-invoice-payload.ts";

export interface TeamCustomerMapping {
  quickbooks_customer_id: string;
  display_name: string;
  customer_account_id: string | null;
  cached_is_tax_exempt: boolean | null;
  tax_status_synced_at: string | null;
}

export class TaxStatusUnconfirmedError extends Error {
  constructor(message = "QuickBooks tax status could not be confirmed. Please refresh the customer from QuickBooks and try again.") {
    super(message);
    this.name = "TaxStatusUnconfirmedError";
  }
}

export const isCacheFresh = (syncedAt: string | null, maxAgeHours: number): boolean => {
  if (!syncedAt) return false;
  const parsed = new Date(syncedAt).getTime();
  if (Number.isNaN(parsed)) return false;
  return Date.now() - parsed <= maxAgeHours * 60 * 60 * 1000;
};

export async function logTaxStatusAudit(
  supabaseClient: SupabaseClient,
  logStep: (step: string, details?: Record<string, unknown>) => void,
  params: {
    organizationId: string;
    customerAccountId: string | null;
    displayName: string;
    action: string;
    previousValue: boolean | null;
    nextValue: boolean | null;
    source: VerifiedTaxState["source"];
  },
): Promise<void> {
  if (!params.customerAccountId) return;
  try {
    const { error } = await supabaseClient.rpc("log_audit_entry", {
      p_organization_id: params.organizationId,
      p_entity_type: "customer",
      p_entity_id: params.customerAccountId,
      p_entity_name: params.displayName,
      p_action: params.action,
      p_changes: {
        is_tax_exempt: {
          old: params.previousValue,
          new: params.nextValue,
        },
      },
      p_metadata: {
        source: "quickbooks",
        tax_status_source: params.source,
      },
    });
    if (error) {
      logStep("Warning: tax status audit logging failed", { error: error.message });
    }
  } catch (error) {
    logStep("Warning: tax status audit logging failed with exception", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function confirmCustomerTaxStatus(
  supabaseClient: SupabaseClient,
  logStep: (step: string, details?: Record<string, unknown>) => void,
  params: {
    accessToken: string;
    realmId: string;
    organizationId: string;
    customerMapping: TeamCustomerMapping;
  },
): Promise<VerifiedTaxState> {
  const headers = {
    Authorization: `Bearer ${params.accessToken}`,
    Accept: "application/json",
  };
  const url = withMinorVersion(
    `${QBO_API_BASE}/v3/company/${params.realmId}/customer/${encodeURIComponent(params.customerMapping.quickbooks_customer_id)}`,
  );
  const maxAgeHours = resolveQboTaxStatusMaxCacheAgeHours();
  const mode = resolveQboTaxStatusUnconfirmedMode();
  const cachedState: VerifiedTaxState = {
    isTaxExempt: params.customerMapping.cached_is_tax_exempt,
    verified: false,
    source: "cache",
  };

  try {
    const response = await fetch(url, { method: "GET", headers });
    if (!response.ok) {
      throw new Error(`QuickBooks Customer lookup failed with HTTP ${response.status}`);
    }

    const body = await response.json();
    if (body.Fault) {
      throw new Error(`QuickBooks Customer lookup Fault: ${JSON.stringify(body.Fault).substring(0, 300)}`);
    }

    const taxable = body.Customer?.Taxable;
    if (typeof taxable !== "boolean") {
      throw new Error("QuickBooks Customer.Taxable was not present in the response");
    }

    const nextIsTaxExempt = taxable === false;
    const now = new Date().toISOString();
    if (params.customerMapping.customer_account_id) {
      const { error } = await supabaseClient
        .from("customers")
        .update({
          is_tax_exempt: nextIsTaxExempt,
          quickbooks_tax_status_synced_at: now,
        })
        .eq("id", params.customerMapping.customer_account_id)
        .eq("organization_id", params.organizationId);

      if (error) {
        logStep("Warning: tax status cache update failed", { error: error.message });
      }
    }

    const action = params.customerMapping.cached_is_tax_exempt !== null &&
      params.customerMapping.cached_is_tax_exempt !== nextIsTaxExempt
      ? "quickbooks_tax_status_diverged"
      : "quickbooks_tax_status_read";

    await logTaxStatusAudit(supabaseClient, logStep, {
      organizationId: params.organizationId,
      customerAccountId: params.customerMapping.customer_account_id,
      displayName: params.customerMapping.display_name,
      action,
      previousValue: params.customerMapping.cached_is_tax_exempt,
      nextValue: nextIsTaxExempt,
      source: "quickbooks",
    });

    return {
      isTaxExempt: nextIsTaxExempt,
      verified: true,
      source: "quickbooks",
    };
  } catch (error) {
    logStep("QuickBooks tax status confirmation failed", {
      customerId: params.customerMapping.quickbooks_customer_id,
      error: error instanceof Error ? error.message : String(error),
    });

    if (
      cachedState.isTaxExempt !== null &&
      isCacheFresh(params.customerMapping.tax_status_synced_at, maxAgeHours)
    ) {
      return cachedState;
    }

    await logTaxStatusAudit(supabaseClient, logStep, {
      organizationId: params.organizationId,
      customerAccountId: params.customerMapping.customer_account_id,
      displayName: params.customerMapping.display_name,
      action: mode === "warn" ? "quickbooks_tax_status_unconfirmed_warn" : "quickbooks_tax_status_unconfirmed_block",
      previousValue: params.customerMapping.cached_is_tax_exempt,
      nextValue: params.customerMapping.cached_is_tax_exempt,
      source: "unconfirmed",
    });

    if (mode === "warn") {
      return {
        isTaxExempt: params.customerMapping.cached_is_tax_exempt,
        verified: false,
        source: "unconfirmed",
      };
    }

    throw new TaxStatusUnconfirmedError();
  }
}
