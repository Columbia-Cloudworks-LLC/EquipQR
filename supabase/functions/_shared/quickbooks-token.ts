import type { SupabaseClient } from "npm:@supabase/supabase-js@2.45.0";
import { QBO_TOKEN_URL } from "./quickbooks-config.ts";

export interface QuickBooksCredential {
  id: string;
  organization_id: string;
  realm_id: string;
  access_token: string;
  refresh_token: string;
  access_token_expires_at: string;
  refresh_token_expires_at: string;
}

interface IntuitTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  x_refresh_token_expires_in: number;
}

export type QuickBooksPersistErrorPolicy = "throw" | "logAndContinue" | "silent";

export interface RefreshQuickBooksTokenOptions {
  /** How to handle database persistence failures after a successful Intuit refresh. */
  onPersistError?: QuickBooksPersistErrorPolicy;
  /** When true, return rotated credential alongside the access token. */
  returnCredential?: boolean;
  log?: (step: string, details?: Record<string, unknown>) => void;
}

export type RefreshQuickBooksTokenResult =
  | { accessToken: string }
  | { accessToken: string; credential: QuickBooksCredential };

const TOKEN_REFRESH_WINDOW_MS = 5 * 60 * 1000;

/**
 * Returns a valid QuickBooks access token, refreshing and persisting when needed.
 */
export async function refreshQuickBooksAccessTokenIfNeeded(
  credential: QuickBooksCredential,
  supabaseClient: SupabaseClient,
  clientId: string,
  clientSecret: string,
  options: RefreshQuickBooksTokenOptions = {},
): Promise<RefreshQuickBooksTokenResult> {
  const {
    onPersistError = "logAndContinue",
    returnCredential = false,
    log,
  } = options;

  const now = new Date();
  const accessTokenExpiresAt = new Date(credential.access_token_expires_at);

  if (accessTokenExpiresAt > new Date(now.getTime() + TOKEN_REFRESH_WINDOW_MS)) {
    return returnCredential
      ? { accessToken: credential.access_token, credential }
      : { accessToken: credential.access_token };
  }

  log?.("Access token expired or expiring soon, refreshing...");

  const refreshTokenExpiresAt = new Date(credential.refresh_token_expires_at);
  if (refreshTokenExpiresAt <= now) {
    throw new Error("Refresh token has expired. Please reconnect QuickBooks.");
  }

  const tokenResponse = await fetch(QBO_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      Accept: "application/json",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: credential.refresh_token,
    }).toString(),
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    console.error("QuickBooks token refresh failed:", tokenResponse.status, errorText);
    throw new Error("Failed to refresh QuickBooks access token");
  }

  const tokenData: IntuitTokenResponse = await tokenResponse.json();
  const newAccessExpiresAt = new Date(now.getTime() + tokenData.expires_in * 1000).toISOString();
  const newRefreshExpiresAt = new Date(
    now.getTime() + tokenData.x_refresh_token_expires_in * 1000,
  ).toISOString();

  const { error: updateError } = await supabaseClient
    .from("quickbooks_credentials")
    .update({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      access_token_expires_at: newAccessExpiresAt,
      refresh_token_expires_at: newRefreshExpiresAt,
      updated_at: now.toISOString(),
    })
    .eq("id", credential.id)
    .eq("organization_id", credential.organization_id);

  if (updateError) {
    const message = `Failed to update QuickBooks credentials after refresh: ${updateError.message}`;
    if (onPersistError === "throw") {
      throw new Error(message);
    }
    if (onPersistError === "logAndContinue") {
      console.error(message);
    }
  } else {
    log?.("Token refreshed successfully");
  }

  const refreshedCredential: QuickBooksCredential = {
    ...credential,
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token,
    access_token_expires_at: newAccessExpiresAt,
    refresh_token_expires_at: newRefreshExpiresAt,
  };

  return returnCredential
    ? { accessToken: tokenData.access_token, credential: refreshedCredential }
    : { accessToken: tokenData.access_token };
}
