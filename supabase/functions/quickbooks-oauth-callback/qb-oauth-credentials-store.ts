import type { SupabaseClient } from "npm:@supabase/supabase-js@2.45.0";
import { logStep } from "./qb-oauth-validation.ts";
import type { IntuitTokenResponse } from "./qb-oauth-intuit-api.ts";

export async function verifyOrganization(
  supabaseClient: SupabaseClient,
  organizationId: string,
): Promise<{ id: string; name: string }> {
  const { data: org, error: orgError } = await supabaseClient
    .from("organizations")
    .select("id, name")
    .eq("id", organizationId)
    .single();

  if (orgError || !org) {
    logStep("Organization not found", { organizationId, error: orgError?.message });
    throw new Error("Organization not found");
  }

  logStep("Organization verified", { organizationId, organizationName: org.name });
  return org;
}

export async function storeQuickBooksCredentials(
  supabaseClient: SupabaseClient,
  params: {
    organizationId: string;
    realmId: string;
    tokenData: IntuitTokenResponse;
    accessTokenExpiresAt: Date;
    refreshTokenExpiresAt: Date;
    now: Date;
  },
): Promise<void> {
  const { error: upsertError } = await supabaseClient
    .from("quickbooks_credentials")
    .upsert({
      organization_id: params.organizationId,
      realm_id: params.realmId,
      access_token: params.tokenData.access_token,
      refresh_token: params.tokenData.refresh_token,
      access_token_expires_at: params.accessTokenExpiresAt.toISOString(),
      refresh_token_expires_at: params.refreshTokenExpiresAt.toISOString(),
      scopes: params.tokenData.scope || "com.intuit.quickbooks.accounting",
      token_type: params.tokenData.token_type || "bearer",
      updated_at: params.now.toISOString(),
    }, {
      onConflict: "organization_id,realm_id",
    });

  if (upsertError) {
    logStep("Failed to store credentials", { error: upsertError.message });
    throw new Error(`Failed to store QuickBooks credentials: ${upsertError.message}`);
  }

  logStep("Credentials stored successfully", {
    organizationId: params.organizationId,
    realmId: params.realmId,
  });
}
