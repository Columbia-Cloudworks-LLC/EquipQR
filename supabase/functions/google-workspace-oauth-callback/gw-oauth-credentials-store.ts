import type { SupabaseClient } from "npm:@supabase/supabase-js@2.45.0";
import { decryptToken, encryptToken, getTokenEncryptionKey } from "../_shared/crypto.ts";
import type { GoogleTokenResponse } from "./gw-oauth-google-api.ts";
import { logStep, normalizeDomain } from "./gw-oauth-validation.ts";

export const DOMAIN_ALREADY_LINKED_ERROR =
  "This Google Workspace domain is already linked to another EquipQR organization.";

const DOMAIN_CLAIM_VERIFY_ERROR =
  "Failed to verify workspace domain claim. Please try again.";

async function findOrgScopedDomainClaim(
  supabaseClient: SupabaseClient,
  params: { effectiveOrgId: string; domain: string },
): Promise<{ data: { organization_id: string } | null; error: { message: string } | null }> {
  const { data, error } = await supabaseClient
    .from("workspace_domains")
    .select("organization_id")
    .eq("domain", params.domain)
    .eq("organization_id", params.effectiveOrgId)
    .maybeSingle();

  return { data, error };
}

async function resolveWorkspaceDomainClaim(
  supabaseClient: SupabaseClient,
  params: { effectiveOrgId: string; domain: string },
): Promise<{ insertedNewClaim: boolean }> {
  const { data: existingOrgClaim, error: existingOrgClaimError } = await findOrgScopedDomainClaim(
    supabaseClient,
    params,
  );

  if (existingOrgClaimError) {
    logStep("Org-scoped domain claim lookup failed", { error: existingOrgClaimError.message });
    throw new Error(DOMAIN_CLAIM_VERIFY_ERROR);
  }

  if (existingOrgClaim) {
    return { insertedNewClaim: false };
  }

  const { error: domainInsertError } = await supabaseClient
    .from("workspace_domains")
    .insert({
      domain: params.domain,
      organization_id: params.effectiveOrgId,
    });

  if (!domainInsertError) {
    logStep("Workspace domain claimed", {
      domain: params.domain,
      organizationId: params.effectiveOrgId,
    });
    return { insertedNewClaim: true };
  }

  if (domainInsertError.code === "23505") {
    const { data: sameOrgClaim, error: conflictLookupError } = await findOrgScopedDomainClaim(
      supabaseClient,
      params,
    );

    if (conflictLookupError) {
      logStep("Domain claim conflict lookup failed", { error: conflictLookupError.message });
      throw new Error(DOMAIN_CLAIM_VERIFY_ERROR);
    }

    if (sameOrgClaim) {
      logStep("Workspace domain claim race resolved for same organization", {
        domain: params.domain,
        organizationId: params.effectiveOrgId,
      });
      return { insertedNewClaim: false };
    }

    logStep("Domain claim unique violation without org-scoped match", {
      domain: params.domain,
      organizationId: params.effectiveOrgId,
    });
    throw new Error(DOMAIN_ALREADY_LINKED_ERROR);
  }

  logStep("Domain claim insert failed", {
    code: domainInsertError.code,
    message: domainInsertError.message,
  });
  throw new Error("Failed to claim workspace domain. Please try again or contact support.");
}

async function rollbackWorkspaceDomainClaim(
  supabaseClient: SupabaseClient,
  params: { effectiveOrgId: string; domain: string },
): Promise<void> {
  const { error } = await supabaseClient
    .from("workspace_domains")
    .delete()
    .eq("domain", params.domain)
    .eq("organization_id", params.effectiveOrgId);

  if (error) {
    logStep("Domain claim rollback failed", {
      domain: params.domain,
      organizationId: params.effectiveOrgId,
      error: error.message,
    });
  }
}

export async function storeGoogleWorkspaceCredentials(
  supabaseClient: SupabaseClient,
  params: {
    effectiveOrgId: string;
    domain: string;
    tokenData: GoogleTokenResponse;
    userEmail: string;
    accessTokenExpiresAt: Date;
    now: Date;
  },
): Promise<void> {
  const domain = normalizeDomain(params.domain);

  let encryptionKey: string;
  try {
    encryptionKey = getTokenEncryptionKey();
  } catch (keyError) {
    const keyErrorMsg = keyError instanceof Error ? keyError.message : String(keyError);
    logStep("Encryption key configuration error", { error: keyErrorMsg });
    throw new Error(`Encryption key error: ${keyErrorMsg}`);
  }

  let refreshToken = params.tokenData.refresh_token || null;
  if (!refreshToken) {
    const { data: existingCreds } = await supabaseClient
      .from("google_workspace_credentials")
      .select("refresh_token")
      .eq("organization_id", params.effectiveOrgId)
      .eq("domain", domain)
      .maybeSingle();

    const storedRefreshToken = existingCreds?.refresh_token || null;
    if (storedRefreshToken) {
      try {
        refreshToken = await decryptToken(storedRefreshToken, encryptionKey);
        logStep("Reusing existing refresh token from stored credentials");
      } catch {
        refreshToken = storedRefreshToken;
        logStep("Reusing existing refresh token (legacy plaintext)");
      }
    }
  }

  if (!refreshToken) {
    throw new Error(
      "Google Workspace refresh token missing. Revoke EquipQR at myaccount.google.com/permissions and reconnect.",
    );
  }

  let encryptedRefreshToken: string;
  try {
    encryptedRefreshToken = await encryptToken(refreshToken, encryptionKey);
  } catch (encryptError) {
    const encryptErrorMsg = encryptError instanceof Error ? encryptError.message : String(encryptError);
    logStep("Token encryption failed", { error: encryptErrorMsg });
    throw new Error(`Encryption failed: ${encryptErrorMsg}`);
  }

  const { insertedNewClaim } = await resolveWorkspaceDomainClaim(supabaseClient, {
    effectiveOrgId: params.effectiveOrgId,
    domain,
  });

  const { data: existingRecord, error: selectError } = await supabaseClient
    .from("google_workspace_credentials")
    .select("id")
    .eq("organization_id", params.effectiveOrgId)
    .eq("domain", domain)
    .maybeSingle();

  if (selectError) {
    logStep("Credentials lookup failed", {
      error: selectError.message,
      code: selectError.code,
    });
    if (insertedNewClaim) {
      await rollbackWorkspaceDomainClaim(supabaseClient, {
        effectiveOrgId: params.effectiveOrgId,
        domain,
      });
    }
    throw new Error(`DB select error: ${selectError.code}; ${selectError.message}`);
  }

  let upsertError: { message: string; code?: string; details?: string; hint?: string } | null = null;

  if (existingRecord) {
    const { error } = await supabaseClient
      .from("google_workspace_credentials")
      .update({
        refresh_token: encryptedRefreshToken,
        access_token_expires_at: params.accessTokenExpiresAt.toISOString(),
        scopes: params.tokenData.scope || null,
        connected_email: params.userEmail,
        updated_at: params.now.toISOString(),
      })
      .eq("id", existingRecord.id);
    upsertError = error;
  } else {
    const { error } = await supabaseClient
      .from("google_workspace_credentials")
      .insert({
        organization_id: params.effectiveOrgId,
        domain,
        refresh_token: encryptedRefreshToken,
        access_token_expires_at: params.accessTokenExpiresAt.toISOString(),
        scopes: params.tokenData.scope || null,
        connected_email: params.userEmail,
        updated_at: params.now.toISOString(),
      });
    upsertError = error;
  }

  if (upsertError) {
    logStep("Credentials upsert failed", {
      code: upsertError.code,
      hint: upsertError.hint,
      message: upsertError.message,
    });
    if (insertedNewClaim) {
      await rollbackWorkspaceDomainClaim(supabaseClient, {
        effectiveOrgId: params.effectiveOrgId,
        domain,
      });
    }
    throw new Error("Failed to store credentials. Please try again or contact support.");
  }

  logStep("Credentials stored successfully");
}

export const __gwOauthCredentialsStoreTestables = {
  resolveWorkspaceDomainClaim,
  findOrgScopedDomainClaim,
};
