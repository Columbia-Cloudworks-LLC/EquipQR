/**
 * Export Work Orders to Google Sheets Edge Function
 *
 * Creates a Google Sheets spreadsheet with work order data for organizations
 * that have connected their Google Workspace.
 */

import {
  handleAuthenticatedExportPost,
  unexpectedExportErrorResponse,
} from "../_shared/export-request-gate.ts";
import { runSheetsAuthGate } from "./gw-sheets-auth-gate.ts";
import { runSheetsExport } from "./gw-sheets-export-run.ts";
import { parseSheetsExportRequest } from "./gw-sheets-request.ts";

Deno.serve((req) => handleAuthenticatedExportPost(
  req,
  async ({ corsHeaders, supabase, user }) => {
    const parsedRequest = await parseSheetsExportRequest(req);
    if (parsedRequest instanceof Response) {
      return parsedRequest;
    }

    const { organizationId, filters } = parsedRequest;

    const authGate = await runSheetsAuthGate({
      supabase,
      userId: user.id,
      organizationId,
      corsHeaders,
      req,
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
      corsHeaders,
    });
  },
  (error) => unexpectedExportErrorResponse(req, "[EXPORT-TO-GOOGLE-SHEETS] Export error:", error),
));
