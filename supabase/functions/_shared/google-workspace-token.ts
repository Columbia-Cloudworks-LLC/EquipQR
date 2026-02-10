/**
 * Shared Google Workspace access token helper for Edge Functions.
 * 
 * Provides a reusable function to get a valid Google Workspace access token
 * for an organization by:
 * 1. Fetching encrypted credentials from google_workspace_credentials
 * 2. Decrypting the refresh token
 * 3. Exchanging the refresh token for a fresh access token
 * 4. Optionally updating the credentials row with new expiry/scopes
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decryptToken, getTokenEncryptionKey } from "./crypto.ts";

const TOKEN_URL = "https://oauth2.googleapis.com/token";

/**
 * Response from Google OAuth token endpoint when refreshing tokens.
 */
interface GoogleRefreshResponse {
  access_token: string;
  expires_in: number;
  scope?: string;
  token_type?: string;
}

/**
 * Result returned by getGoogleWorkspaceAccessToken.
 */
export interface GoogleWorkspaceTokenResult {
  /** The access token to use for Google API calls */
  accessToken: string;
  /** The domain associated with these credentials */
  domain: string;
  /** When the access token expires */
  expiresAt: Date;
  /** Scopes granted for this token (may be undefined if not returned) */
  scopes?: string;
}

/**
 * Error codes that can be returned by getGoogleWorkspaceAccessToken.
 * Frontend can use these to show appropriate messaging.
 */
export type GoogleWorkspaceTokenErrorCode =
  | "not_connected"
  | "encryption_config_error"
  | "token_corruption"
  | "oauth_not_configured"
  | "token_refresh_failed"
  | "token_revoked"
  | "insufficient_scopes";

/**
 * Custom error class for Google Workspace token operations.
 * Includes a code field to help frontend show appropriate messaging.
 */
export class GoogleWorkspaceTokenError extends Error {
  code: GoogleWorkspaceTokenErrorCode;
  
  constructor(message: string, code: GoogleWorkspaceTokenErrorCode) {
    super(message);
    this.name = "GoogleWorkspaceTokenError";
    this.code = code;
  }
}

const logStep = (step: string, details?: Record<string, unknown>) => {
  const safeDetails = details ? { ...details } : undefined;
  // Never log tokens
  if (safeDetails) {
    delete safeDetails.access_token;
    delete safeDetails.refresh_token;
  }
  const detailsStr = safeDetails ? ` - ${JSON.stringify(safeDetails)}` : "";
  console.log(`[GOOGLE-WORKSPACE-TOKEN] ${step}${detailsStr}`);
};

/**
 * Refreshes a Google OAuth access token using a refresh token.
 */
async function refreshAccessToken(refreshToken: string): Promise<GoogleRefreshResponse> {
  const clientId = Deno.env.get("GOOGLE_WORKSPACE_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_WORKSPACE_CLIENT_SECRET");

  if (!clientId || !clientSecret) {
    throw new GoogleWorkspaceTokenError(
      "Google Workspace OAuth is not configured",
      "oauth_not_configured"
    );
  }

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) {
    // Check for specific error responses from Google
    let errorDetails: { error?: string; error_description?: string } = {};
    try {
      errorDetails = await response.json();
    } catch {
      // Response wasn't JSON
    }
    
    logStep("Token refresh failed", {
      status: response.status,
      error: errorDetails.error,
      error_description: errorDetails.error_description,
    });
    
    // Check for insufficient scopes (happens when org needs to reconnect)
    if (response.status === 403 || errorDetails.error === "access_denied") {
      throw new GoogleWorkspaceTokenError(
        "Insufficient permissions. Please reconnect Google Workspace to grant the required permissions.",
        "insufficient_scopes"
      );
    }

    // Check for revoked or expired refresh token.
    // Google returns 400 with error "invalid_grant" when:
    // - The refresh token was revoked (user changed password, admin revoked access)
    // - The refresh token expired (6 months of inactivity)
    // - The user removed the app's access in Google Account settings
    if (errorDetails.error === "invalid_grant") {
      throw new GoogleWorkspaceTokenError(
        "Your Google Workspace connection has expired or been revoked. Please reconnect Google Workspace in Organization Settings.",
        "token_revoked"
      );
    }
    
    throw new GoogleWorkspaceTokenError(
      "Failed to refresh Google access token",
      "token_refresh_failed"
    );
  }

  return await response.json();
}

/**
 * Gets a valid Google Workspace access token for the specified organization.
 * 
 * This function:
 * 1. Fetches the encrypted credentials for the organization
 * 2. Decrypts the refresh token
 * 3. Exchanges it for a fresh access token via Google OAuth
 * 4. Updates the credentials row with the new expiry (optional)
 * 
 * @param adminClient - Supabase admin client (has access to credentials table)
 * @param organizationId - The organization to get the token for
 * @param updateCredentials - Whether to update the credentials row with new expiry (default: true)
 * @returns The access token result including token, domain, and expiry
 * @throws GoogleWorkspaceTokenError with appropriate error code
 */
export async function getGoogleWorkspaceAccessToken(
  adminClient: SupabaseClient,
  organizationId: string,
  updateCredentials = true
): Promise<GoogleWorkspaceTokenResult> {
  // Fetch credentials for the organization
  const { data: creds, error: credsError } = await adminClient
    .from("google_workspace_credentials")
    .select("domain, refresh_token")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (credsError || !creds?.refresh_token || !creds?.domain) {
    throw new GoogleWorkspaceTokenError(
      "Google Workspace is not connected for this organization",
      "not_connected"
    );
  }

  // Get encryption key
  let encryptionKey: string;
  try {
    encryptionKey = getTokenEncryptionKey();
  } catch (keyError) {
    const errorMessage = keyError instanceof Error ? keyError.message : String(keyError);
    logStep("Encryption key configuration error", { error: errorMessage });
    throw new GoogleWorkspaceTokenError(
      "Google Workspace encryption is not properly configured. Please contact your administrator.",
      "encryption_config_error"
    );
  }

  // Decrypt the stored refresh token
  let decryptedRefreshToken: string;
  try {
    decryptedRefreshToken = await decryptToken(creds.refresh_token, encryptionKey);
    logStep("Refresh token decrypted successfully");
  } catch (decryptError) {
    const errorType = decryptError instanceof Error ? decryptError.name : "UnknownError";
    const errorMessage = decryptError instanceof Error ? decryptError.message : String(decryptError);
    logStep("Failed to decrypt refresh token", { errorType, errorMessage, organizationId });
    
    throw new GoogleWorkspaceTokenError(
      "Failed to decrypt stored Google Workspace credentials. Please reconnect Google Workspace to generate new credentials.",
      "token_corruption"
    );
  }

  // Refresh the access token
  const tokenData = await refreshAccessToken(decryptedRefreshToken);
  const accessTokenExpiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

  // Optionally update credentials with new expiry
  if (updateCredentials) {
    await adminClient
      .from("google_workspace_credentials")
      .update({
        access_token_expires_at: accessTokenExpiresAt.toISOString(),
        scopes: tokenData.scope || null,
        updated_at: new Date().toISOString(),
      })
      .eq("organization_id", organizationId)
      .eq("domain", creds.domain);
  }

  logStep("Access token obtained successfully", { organizationId, domain: creds.domain });

  return {
    accessToken: tokenData.access_token,
    domain: creds.domain,
    expiresAt: accessTokenExpiresAt,
    scopes: tokenData.scope,
  };
}

/**
 * Checks if the current scopes include the required scope.
 * Scopes are space-separated strings.
 * 
 * @param currentScopes - The scopes string from the token response or stored credentials
 * @param requiredScope - The scope to check for (e.g., "https://www.googleapis.com/auth/spreadsheets")
 * @returns true if the required scope is present
 */
export function hasScope(currentScopes: string | undefined | null, requiredScope: string): boolean {
  if (!currentScopes) return false;
  const scopeList = currentScopes.split(" ");
  return scopeList.includes(requiredScope);
}

/**
 * Google API scope constants for convenience.
 */
export const GOOGLE_SCOPES = {
  DIRECTORY_READONLY: "https://www.googleapis.com/auth/admin.directory.user.readonly",
  SPREADSHEETS: "https://www.googleapis.com/auth/spreadsheets",
  DRIVE_FILE: "https://www.googleapis.com/auth/drive.file",
} as const;
