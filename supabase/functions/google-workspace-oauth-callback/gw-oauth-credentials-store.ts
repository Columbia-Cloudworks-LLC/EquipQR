import type { SupabaseClient } from "npm:@supabase/supabase-js@2.45.0";
import { encryptToken, getTokenEncryptionKey } from "../_shared/crypto.ts";
import type { GoogleTokenResponse } from "./gw-oauth-google-api.ts";
import { logStep, normalizeDomain } from "./gw-oauth-validation.ts";

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

  let refreshToken = params.tokenData.refresh_token || null;
  if (!refreshToken) {
    // Look up existing credentials using normalized domain for consistency
    const { data: existingCreds } = await supabaseClient
      .from("google_workspace_credentials")
      .select("refresh_token")
      .eq("organization_id", params.effectiveOrgId)
      .eq("domain", domain)
      .maybeSingle();

    refreshToken = existingCreds?.refresh_token || null;
  }

  if (!refreshToken) {
    throw new Error(
      "Google Workspace refresh token missing. Revoke EquipQR at myaccount.google.com/permissions and reconnect.",
    );
  }

  // Encrypt the refresh token before storing
  let encryptionKey: string;
  try {
    encryptionKey = getTokenEncryptionKey();
  } catch (keyError) {
    const keyErrorMsg = keyError instanceof Error ? keyError.message : String(keyError);
    logStep("Encryption key configuration error", { error: keyErrorMsg });
    throw new Error(`Encryption key error: ${keyErrorMsg}`);
  }

  let encryptedRefreshToken: string;
  try {
    encryptedRefreshToken = await encryptToken(refreshToken, encryptionKey);
  } catch (encryptError) {
    const encryptErrorMsg = encryptError instanceof Error ? encryptError.message : String(encryptError);
    logStep("Token encryption failed", { error: encryptErrorMsg });
    throw new Error(`Encryption failed: ${encryptErrorMsg}`);
  }

  // Manual upsert: The functional index on (organization_id, normalize_domain(domain))
  // cannot be used with Supabase JS client's onConflict (it only supports column names).
  // So we first check if a record exists, then update or insert accordingly.
  const { data: existingRecord, error: selectError } = await supabaseClient
    .from("google_workspace_credentials")
    .select("id")
    .eq("organization_id", params.effectiveOrgId)
    .eq("domain", normalizeDomain(domain))
    .maybeSingle();

  if (selectError) {
    logStep("Credentials lookup failed", { 
      error: selectError.message, 
      code: selectError.code,
    });
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
        domain: normalizeDomain(domain),
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
    // Use a generic user-facing message — detailed DB errors are logged above
    throw new Error("Failed to store credentials. Please try again or contact support.");
  }
  
  logStep("Credentials stored successfully");
}
