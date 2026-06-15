import type { SupabaseClient } from "npm:@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";
import { moveGoogleDriveFileToParent } from "../_shared/google-docs-api.ts";
import { GoogleWorkspaceTokenError } from "../_shared/google-workspace-token.ts";
import { createAdminSupabaseClient } from "../_shared/supabase-clients.ts";
import { trackGoogleDriveExportArtifact } from "../_shared/record-export-artifacts.ts";
import {
  fetchWorkOrdersWithData,
  buildAllRows,
  WORKSHEET_NAMES,
  type WorkOrderExcelFilters,
} from "../_shared/work-orders-export-data.ts";
import {
  createSpreadsheet,
  formatSpreadsheet,
  logStep,
  populateSpreadsheet,
} from "./gw-sheets-api.ts";

const REPORT_TYPE = "work-orders-google-sheets";
const SHEETS_EXPORT_CHANNEL = "google_sheets";
const SHEETS_ARTIFACT_KIND = "internal_packet";

export interface SheetsExportRunParams {
  supabase: SupabaseClient;
  userId: string;
  organizationId: string;
  filters: WorkOrderExcelFilters;
  accessToken: string;
  organizationFolderId: string;
}

interface SheetsExportRunSuccess {
  spreadsheetId: string;
  spreadsheetUrl: string;
  workOrderCount: number;
  replacedPrevious?: boolean;
  warnings?: string[];
}

export function buildSpreadsheetTitle(date = new Date()): string {
  const dateStr = date.toISOString().split("T")[0];
  return `Work Orders Export ${dateStr}`;
}

export function resolveSheetNames(pmRowCount: number): string[] {
  return [
    WORKSHEET_NAMES.SUMMARY,
    WORKSHEET_NAMES.LABOR,
    WORKSHEET_NAMES.COSTS,
    ...(pmRowCount > 0 ? [WORKSHEET_NAMES.PM_CHECKLISTS] : []),
    WORKSHEET_NAMES.TIMELINE,
    WORKSHEET_NAMES.EQUIPMENT,
  ];
}

async function createExportLog(
  supabase: SupabaseClient,
  userId: string,
  organizationId: string,
): Promise<string | undefined> {
  const { data: exportLog } = await supabase
    .from("export_request_log")
    .insert({
      user_id: userId,
      organization_id: organizationId,
      report_type: REPORT_TYPE,
      row_count: 0,
      status: "pending",
    })
    .select("id")
    .single();

  return exportLog?.id;
}

async function markExportLogCompleted(
  supabase: SupabaseClient,
  exportLogId: string,
  rowCount: number,
): Promise<void> {
  await supabase
    .from("export_request_log")
    .update({
      status: "completed",
      row_count: rowCount,
      completed_at: new Date().toISOString(),
    })
    .eq("id", exportLogId);
}

async function markExportLogFailed(
  supabase: SupabaseClient,
  exportLogId: string,
): Promise<void> {
  await supabase
    .from("export_request_log")
    .update({ status: "failed", completed_at: new Date().toISOString() })
    .eq("id", exportLogId);
}

async function markExportLogCompletedEmpty(
  supabase: SupabaseClient,
  exportLogId: string,
): Promise<void> {
  await supabase
    .from("export_request_log")
    .update({ status: "completed", row_count: 0, completed_at: new Date().toISOString() })
    .eq("id", exportLogId);
}

export async function runSheetsExport(
  params: SheetsExportRunParams,
): Promise<Response> {
  const {
    supabase,
    userId,
    organizationId,
    filters,
    accessToken,
    organizationFolderId,
  } = params;

  const exportLogId = await createExportLog(supabase, userId, organizationId);

  try {
    logStep("Fetching work order data", { organizationId });
    const data = await fetchWorkOrdersWithData(supabase, organizationId, filters);

    if (data.workOrders.length === 0) {
      if (exportLogId) {
        await markExportLogCompletedEmpty(supabase, exportLogId);
      }
      return new Response(
        JSON.stringify({ error: "No work orders found matching the filters" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    logStep("Building row data", { workOrderCount: data.workOrders.length });
    const allRows = buildAllRows(data);
    const sheetNames = resolveSheetNames(allRows.pmRows.length);
    const spreadsheetTitle = buildSpreadsheetTitle();

    logStep("Creating spreadsheet", { title: spreadsheetTitle, sheetCount: sheetNames.length });
    const { spreadsheetId, spreadsheetUrl } = await createSpreadsheet(
      accessToken,
      spreadsheetTitle,
      sheetNames,
    );

    await moveGoogleDriveFileToParent(
      accessToken,
      spreadsheetId,
      organizationFolderId,
    );

    logStep("Populating spreadsheet", { spreadsheetId });
    await populateSpreadsheet(accessToken, spreadsheetId, allRows);
    await formatSpreadsheet(accessToken, spreadsheetId, sheetNames.length);

    let replacedPrevious = false;
    const warnings: string[] = [];

    if (filters.workOrderId) {
      const adminClient = createAdminSupabaseClient();
      const artifactResult = await trackGoogleDriveExportArtifact(adminClient, {
        organizationId,
        recordId: filters.workOrderId,
        exportChannel: SHEETS_EXPORT_CHANNEL,
        artifactKind: SHEETS_ARTIFACT_KIND,
        providerFileId: spreadsheetId,
        webViewLink: spreadsheetUrl,
        providerParentId: organizationFolderId,
        userId,
        accessToken,
      });
      replacedPrevious = artifactResult.replacedPrevious;
      warnings.push(...artifactResult.warnings);
    }

    if (exportLogId) {
      await markExportLogCompleted(supabase, exportLogId, data.workOrders.length);
    }

    logStep("Export complete", { spreadsheetId, workOrderCount: data.workOrders.length, replacedPrevious });

    return new Response(
      JSON.stringify({
        spreadsheetId,
        spreadsheetUrl,
        workOrderCount: data.workOrders.length,
        replacedPrevious,
        warnings: warnings.length > 0 ? warnings : undefined,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (exportError) {
    if (exportLogId) {
      await markExportLogFailed(supabase, exportLogId);
    }

    if (exportError instanceof GoogleWorkspaceTokenError) {
      return new Response(
        JSON.stringify({
          error: exportError.message,
          code: exportError.code,
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    throw exportError;
  }
}

export const __gwSheetsExportRunTestables = {
  buildSpreadsheetTitle,
  resolveSheetNames,
  REPORT_TYPE,
};
