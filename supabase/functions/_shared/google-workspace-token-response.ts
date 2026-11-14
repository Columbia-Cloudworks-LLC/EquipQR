/**
 * Helpers for turning `getGoogleWorkspaceAccessToken` failures into HTTP responses.
 *
 * Handlers keep their own response style (CORS options, log lines); this module only
 * owns the repeated try/catch around the token lookup and the code-to-status mapping.
 */

import type { SupabaseClient } from "npm:@supabase/supabase-js@2.45.0";
import {
  getGoogleWorkspaceAccessToken,
  GoogleWorkspaceTokenError,
  type GoogleWorkspaceTokenResult,
} from "./google-workspace-token.ts";
import { createJsonResponse } from "./supabase-clients.ts";

/** HTTP status per token error code for handlers that expose the full range of token failures. */
export const GOOGLE_TOKEN_ERROR_STATUS: Record<string, number> = {
  not_connected: 400,
  oauth_not_configured: 500,
  encryption_config_error: 500,
  token_corruption: 500,
  token_refresh_failed: 502,
  token_revoked: 401,
  insufficient_scopes: 403,
};

/**
 * Resolve an access token, returning the typed `GoogleWorkspaceTokenError` instead of
 * throwing it. Any other error still propagates to the caller.
 */
export async function getGoogleAccessTokenOrError(
  adminClient: SupabaseClient,
  organizationId: string,
): Promise<GoogleWorkspaceTokenResult | GoogleWorkspaceTokenError> {
  try {
    return await getGoogleWorkspaceAccessToken(adminClient, organizationId);
  } catch (tokenError) {
    if (tokenError instanceof GoogleWorkspaceTokenError) {
      return tokenError;
    }
    throw tokenError;
  }
}

/** Export-style JSON error body: 400 when Google is not connected, otherwise 403. */
export function exportTokenErrorResponse(
  corsHeaders: Record<string, string>,
  tokenError: GoogleWorkspaceTokenError,
): Response {
  return new Response(
    JSON.stringify({ error: tokenError.message, code: tokenError.code }),
    {
      status: tokenError.code === "not_connected" ? 400 : 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
}

/** JSON `{ error, code }` response using `GOOGLE_TOKEN_ERROR_STATUS` and the request's CORS options. */
export function googleTokenErrorJsonResponse(
  tokenError: GoogleWorkspaceTokenError,
  req: Request,
): Response {
  return createJsonResponse(
    { error: tokenError.message, code: tokenError.code },
    GOOGLE_TOKEN_ERROR_STATUS[tokenError.code] ?? 500,
    { req },
  );
}
