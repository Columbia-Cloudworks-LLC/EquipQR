import {
  createUserSupabaseClient,
  createAdminSupabaseClient,
  requireUser,
  verifyOrgAdmin,
  createErrorResponse,
  handleCorsPreflightIfNeeded,
} from "../_shared/supabase-clients.ts";
import { corsHeaders } from "../_shared/cors.ts";
import {
  getGoogleWorkspaceAccessToken,
  GoogleWorkspaceTokenError,
  GOOGLE_SCOPES,
  hasScope,
} from "../_shared/google-workspace-token.ts";
import { googleApiFetch } from "../_shared/google-api-retry.ts";
import {
  fetchWorkOrdersWithData,
  buildAllRows,
  checkRateLimit,
  type ExportRequest,
} from "../_shared/work-orders-export-data.ts";
import { buildInternalPacketHtml } from "../_shared/work-order-google-docs.ts";

const GOOGLE_DOC_MIME_TYPE = "application/vnd.google-apps.document";
const DRIVE_UPLOAD_URL = "https://www.googleapis.com/upload/drive/v3/files";
const DOCUMENT_TYPE = "work-orders-internal-packet";

interface ExportToDocsResponse {
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string;
  workOrderCount: number;
}

interface GoogleDriveCreateResponse {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
}

async function createGoogleDocFromHtml(
  accessToken: string,
  title: string,
  html: string,
  parentId: string,
): Promise<GoogleDriveCreateResponse> {
  const boundary = `----EquipQRGoogleDocBoundary${Date.now()}`;
  const encoder = new TextEncoder();

  const metadata = {
    name: title,
    mimeType: GOOGLE_DOC_MIME_TYPE,
    parents: [parentId],
  };

  const multipartBody =
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: text/html\r\n\r\n` +
    `${html}\r\n` +
    `--${boundary}--`;

  const response = await googleApiFetch(
    `${DRIVE_UPLOAD_URL}?uploadType=multipart&supportsAllDrives=true&fields=id,name,mimeType,webViewLink`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body: encoder.encode(multipartBody),
    },
    { label: "drive-create-google-doc" },
  );

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    console.error("[EXPORT-WORK-ORDERS-TO-GOOGLE-DOCS] Drive create failed", {
      status: response.status,
      errorBody,
    });

    if (response.status === 403) {
      throw new GoogleWorkspaceTokenError(
        "Google Workspace does not have permission to create files in the selected destination.",
        "insufficient_scopes",
      );
    }

    throw new Error("Failed to create Google Doc.");
  }

  return await response.json();
}

Deno.serve(async (req) => {
  const corsResponse = handleCorsPreflightIfNeeded(req);
  if (corsResponse) return corsResponse;

  try {
    if (req.method !== "POST") {
      return createErrorResponse("Method not allowed", 405);
    }

    const supabase = createUserSupabaseClient(req);
    const auth = await requireUser(req, supabase);
    if ("error" in auth) {
      return createErrorResponse(auth.error, auth.status);
    }

    let body: ExportRequest;
    try {
      body = await req.json();
    } catch {
      return createErrorResponse("Invalid JSON body", 400);
    }

    const { organizationId, filters } = body;
    if (!organizationId) {
      return createErrorResponse("Missing required field: organizationId", 400);
    }
    if (!filters || typeof filters !== "object") {
      return createErrorResponse("Missing required field: filters", 400);
    }
    if (filters.dateField && !["created_date", "completed_date"].includes(filters.dateField)) {
      return createErrorResponse("Invalid filters.dateField: must be 'created_date' or 'completed_date'", 400);
    }

    const isAdmin = await verifyOrgAdmin(supabase, auth.user.id, organizationId);
    if (!isAdmin) {
      return createErrorResponse("Forbidden: Only owners and admins can export reports", 403);
    }

    let rateLimitOk: boolean;
    try {
      rateLimitOk = await checkRateLimit(supabase, auth.user.id, organizationId);
    } catch (rateLimitError) {
      console.error("[EXPORT-WORK-ORDERS-TO-GOOGLE-DOCS] Rate limit check error:", rateLimitError);
      return createErrorResponse("An internal error occurred", 500);
    }
    if (!rateLimitOk) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Please wait before requesting another export." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: destination, error: destinationError } = await supabase
      .from("organization_google_export_destinations")
      .select("parent_id, display_name")
      .eq("organization_id", organizationId)
      .eq("document_type", DOCUMENT_TYPE)
      .maybeSingle();

    if (destinationError) {
      console.error("[EXPORT-WORK-ORDERS-TO-GOOGLE-DOCS] Failed to load destination:", destinationError);
      return createErrorResponse("An internal error occurred", 500);
    }

    if (!destination?.parent_id) {
      return new Response(
        JSON.stringify({
          error: "Google Docs destination is not configured. Set a destination in Organization Settings before exporting.",
          code: "missing_destination",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const adminClient = createAdminSupabaseClient();
    let tokenResult;
    try {
      tokenResult = await getGoogleWorkspaceAccessToken(adminClient, organizationId);
    } catch (tokenError) {
      if (tokenError instanceof GoogleWorkspaceTokenError) {
        return new Response(
          JSON.stringify({ error: tokenError.message, code: tokenError.code }),
          { status: tokenError.code === "not_connected" ? 400 : 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      throw tokenError;
    }

    if (!hasScope(tokenResult.scopes, GOOGLE_SCOPES.DRIVE_FILE)) {
      return new Response(
        JSON.stringify({
          error: "Google Workspace is connected but does not have permission to create Drive documents. Please reconnect Google Workspace in Organization Settings.",
          code: "insufficient_scopes",
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: exportLog } = await supabase
      .from("export_request_log")
      .insert({
        user_id: auth.user.id,
        organization_id: organizationId,
        report_type: "work-orders-google-docs",
        row_count: 0,
        status: "pending",
      })
      .select("id")
      .single();
    const exportLogId = exportLog?.id;

    try {
      const data = await fetchWorkOrdersWithData(supabase, organizationId, filters);
      if (data.workOrders.length === 0) {
        if (exportLogId) {
          await supabase
            .from("export_request_log")
            .update({ status: "completed", row_count: 0, completed_at: new Date().toISOString() })
            .eq("id", exportLogId);
        }
        return new Response(
          JSON.stringify({ error: "No work orders found matching the filters" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const allRows = buildAllRows(data);
      const { data: orgRow } = await supabase
        .from("organizations")
        .select("name")
        .eq("id", organizationId)
        .maybeSingle();

      const html = buildInternalPacketHtml({
        allRows,
        organizationName: orgRow?.name ?? "Organization",
        workOrderCount: data.workOrders.length,
      });

      const dateStr = new Date().toISOString().split("T")[0];
      const title = `Internal Work Order Packet ${dateStr}`;
      const doc = await createGoogleDocFromHtml(
        tokenResult.accessToken,
        title,
        html,
        destination.parent_id,
      );

      if (exportLogId) {
        await supabase
          .from("export_request_log")
          .update({
            status: "completed",
            row_count: data.workOrders.length,
            file_url: doc.webViewLink ?? null,
            completed_at: new Date().toISOString(),
          })
          .eq("id", exportLogId);
      }

      const webViewLink = doc.webViewLink
        ?? `https://docs.google.com/document/d/${doc.id}/edit`;

      const response: ExportToDocsResponse = {
        id: doc.id,
        name: doc.name,
        mimeType: doc.mimeType,
        webViewLink,
        workOrderCount: data.workOrders.length,
      };

      return new Response(
        JSON.stringify(response),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    } catch (exportError) {
      if (exportLogId) {
        await supabase
          .from("export_request_log")
          .update({
            status: "failed",
            error_message: exportError instanceof Error ? exportError.message : "Export failed",
            completed_at: new Date().toISOString(),
          })
          .eq("id", exportLogId);
      }

      if (exportError instanceof GoogleWorkspaceTokenError) {
        return new Response(
          JSON.stringify({ error: exportError.message, code: exportError.code }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      throw exportError;
    }
  } catch (error) {
    console.error("[EXPORT-WORK-ORDERS-TO-GOOGLE-DOCS] Export error:", error);
    return createErrorResponse("An unexpected error occurred", 500);
  }
});
