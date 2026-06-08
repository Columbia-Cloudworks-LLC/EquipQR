import type { SupabaseClient } from "npm:@supabase/supabase-js@2.45.0";
import {
  createAdminSupabaseClient,
  createErrorResponse,
  verifyOrgAdmin,
} from "../_shared/supabase-clients.ts";
import { corsHeaders } from "../_shared/cors.ts";
import {
  getGoogleWorkspaceAccessToken,
  GoogleWorkspaceTokenError,
  GOOGLE_SCOPES,
  hasScope,
} from "../_shared/google-workspace-token.ts";
import {
  checkRateLimit,
  createWorkOrderExportRateLimitResponse,
} from "../_shared/work-orders-export-data.ts";

const DOCUMENT_TYPE = "work-orders-internal-packet";
const LOG_PREFIX = "[EXPORT-TO-GOOGLE-SHEETS]";

const logStep = (step: string, details?: Record<string, unknown>) => {
  const safeDetails = details ? { ...details } : undefined;
  if (safeDetails) {
    delete safeDetails.access_token;
  }
  const detailsStr = safeDetails ? ` - ${JSON.stringify(safeDetails)}` : "";
  console.log(`${LOG_PREFIX} ${step}${detailsStr}`);
};

export interface SheetsAuthGateSuccess {
  accessToken: string;
  organizationFolderId: string;
}

export interface SheetsAuthGateParams {
  supabase: SupabaseClient;
  userId: string;
  organizationId: string;
}

export function hasRequiredSheetsExportScopes(scopes: string | null | undefined): boolean {
  return hasScope(scopes, GOOGLE_SCOPES.SPREADSHEETS);
}

export async function runSheetsAuthGate(
  params: SheetsAuthGateParams,
): Promise<Response | SheetsAuthGateSuccess> {
  const { supabase, userId, organizationId } = params;

  const isAdmin = await verifyOrgAdmin(supabase, userId, organizationId);
  if (!isAdmin) {
    return createErrorResponse("Forbidden: Only owners and admins can export reports", 403);
  }

  let rateLimitOk: boolean;
  try {
    rateLimitOk = await checkRateLimit(supabase, userId, organizationId);
  } catch (rateLimitError) {
    console.error("Rate limit check error:", rateLimitError);
    return createErrorResponse("An internal error occurred", 500);
  }
  if (!rateLimitOk) {
    return createWorkOrderExportRateLimitResponse(corsHeaders);
  }

  const adminClient = createAdminSupabaseClient();
  let tokenResult;
  try {
    tokenResult = await getGoogleWorkspaceAccessToken(adminClient, organizationId);
  } catch (tokenError) {
    if (tokenError instanceof GoogleWorkspaceTokenError) {
      logStep("Token error", { code: tokenError.code, message: tokenError.message });
      return new Response(
        JSON.stringify({
          error: tokenError.message,
          code: tokenError.code,
        }),
        {
          status: tokenError.code === "not_connected" ? 400 : 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
    throw tokenError;
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
    return createErrorResponse("An internal error occurred", 500);
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
  DOCUMENT_TYPE,
};
