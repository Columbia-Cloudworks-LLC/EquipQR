/**
 * Export Work Orders to Google Sheets Edge Function
 *
 * Creates a Google Sheets spreadsheet with work order data for organizations
 * that have connected their Google Workspace.
 */

import {
  createErrorResponse,
  handleCorsPreflightIfNeeded,
  requireAuthenticatedPost,
} from "../_shared/supabase-clients.ts";
import { runSheetsAuthGate } from "./gw-sheets-auth-gate.ts";
import { runSheetsExport } from "./gw-sheets-export-run.ts";
import { parseSheetsExportRequest } from "./gw-sheets-request.ts";

Deno.serve(async (req) => {
  const corsResponse = handleCorsPreflightIfNeeded(req);
  if (corsResponse) return corsResponse;

  try {
    const authContext = await requireAuthenticatedPost(req);
    if (authContext instanceof Response) {
      return authContext;
    }

    const { supabase, user } = authContext;

    const parsedRequest = await parseSheetsExportRequest(req);
    if (parsedRequest instanceof Response) {
      return parsedRequest;
    }

    const { organizationId, filters } = parsedRequest;

    const authGate = await runSheetsAuthGate({
      supabase,
      userId: user.id,
      organizationId,
    });
    if (authGate instanceof Response) {
      return authGate;
    }

    return await runSheetsExport({
      supabase,
      userId: user.id,
      organizationId,
      filters,
      accessToken: authGate.accessToken,
      organizationFolderId: authGate.organizationFolderId,
    });
  } catch (error) {
    console.error("[EXPORT-TO-GOOGLE-SHEETS] Export error:", error);
    return createErrorResponse("An unexpected error occurred", 500);
  }
});
