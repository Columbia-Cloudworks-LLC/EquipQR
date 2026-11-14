import type { SupabaseClient } from "npm:@supabase/supabase-js@2.45.0";
import {
  createAdminSupabaseClient,
  createErrorResponse,
} from "../_shared/supabase-clients.ts";
import {
  GoogleWorkspaceTokenError,
  GOOGLE_SCOPES,
  hasScope,
} from "../_shared/google-workspace-token.ts";
import {
  exportTokenErrorResponse,
  getGoogleAccessTokenOrError,
} from "../_shared/google-workspace-token-response.ts";
import { enforceExportAdminAndRateLimit } from "../_shared/export-request-gate.ts";
import { LOG_PREFIX, logStep } from "./gw-sheets-api.ts";

const DOCUMENT_TYPE = "work-orders-internal-packet";

export interface SheetsAuthGateSuccess {
  accessToken: string;
  organizationFolderId: string;
}

export interface SheetsAuthGateParams {
  supabase: SupabaseClient;
  userId: string;
  organizationId: string;
  corsHeaders: Record<string, string>;
  req: Request;
}

export function hasRequiredSheetsExportScopes(scopes: string | null | undefined): boolean {
  return hasScope(scopes, GOOGLE_SCOPES.SPREADSHEETS);
}

export async function runSheetsAuthGate(
  params: SheetsAuthGateParams,
): Promise<Response | SheetsAuthGateSuccess> {
  const { supabase, userId, organizationId, corsHeaders, req } = params;

  const gateResponse = await enforceExportAdminAndRateLimit({
    req,
    corsHeaders,
    supabase,
    userId,
    organizationId,
    rateLimitErrorLabel: "Rate limit check error:",
  });
  if (gateResponse) return gateResponse;

  const adminClient = createAdminSupabaseClient();
  const tokenResult = await getGoogleAccessTokenOrError(adminClient, organizationId);
  if (tokenResult instanceof GoogleWorkspaceTokenError) {
    logStep("Token error", { code: tokenResult.code, message: tokenResult.message });
    return exportTokenErrorResponse(corsHeaders, tokenResult);
  }

  if (!hasRequiredSheetsExportScopes(tokenResult.scopes)) {
    logStep("Missing spreadsheets scope", { scopes: tokenResult.scopes });
    return new Response(
      JSON.stringify({
        error: "Google Workspace is connected but does not have permission to create Sheets. Please reconnect Google Workspace in Organization Settings to grant the required permissions.",
        code: "insufficient_scopes",
      }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const { data: orgDestination, error: destinationError } = await supabase
    .from("organization_google_export_destinations")
    .select("parent_id")
    .eq("organization_id", organizationId)
    .eq("document_type", DOCUMENT_TYPE)
    .maybeSingle();

  if (destinationError) {
    console.error(`${LOG_PREFIX} Failed to load organization folder:`, destinationError);
    return createErrorResponse("An internal error occurred", 500, { req });
  }

  if (!orgDestination?.parent_id) {
    return new Response(
      JSON.stringify({
        error: "Organization Drive folder is not configured. Set an organization folder in Organization Settings before exporting.",
        code: "missing_destination",
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  return {
    accessToken: tokenResult.accessToken,
    organizationFolderId: orgDestination.parent_id,
  };
}

export const __gwSheetsAuthGateTestables = {
  hasRequiredSheetsExportScopes,
};
