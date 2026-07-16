/**
 * Export Work Orders Excel Edge Function
 *
 * Generates a multi-worksheet Excel export for work orders with all related data.
 * Uses SheetJS (xlsx) for Excel generation.
 * Uses user-scoped client so RLS policies apply.
 */

// @deno-types="https://cdn.sheetjs.com/xlsx-0.20.3/package/types/index.d.ts"
import * as XLSX from 'https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs';
import {
  verifyOrgAdmin,
  createErrorResponse,
  handleCorsPreflightIfNeeded,
  requireAuthenticatedPost,
} from "../_shared/supabase-clients.ts";
import { corsHeaders } from "../_shared/cors.ts";
import {
  fetchWorkOrdersWithData,
  buildAllRows,
  checkRateLimit,
  createWorkOrderExportRateLimitResponse,
  WORKSHEET_NAMES,
  WORKSHEET_HEADERS,
  summaryRowToArray,
  laborRowToArray,
  costRowToArray,
  pmRowToArray,
  timelineRowToArray,
  equipmentRowToArray,
  type ExportRequest,
  type AllExportRows,
  type WorksheetKey,
} from "../_shared/work-orders-export-data.ts";

// ============================================
// Worksheet Generation (Excel / SheetJS only)
// ============================================

function createWorksheet<T>(
  headers: string[],
  rows: T[],
  rowMapper: (row: T) => (string | number | boolean | null)[]
): XLSX.WorkSheet {
  const data = [
    headers,
    ...rows.map(rowMapper),
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(data);

  const colWidths = headers.map((header, colIndex) => {
    let maxWidth = header.length;
    rows.forEach(row => {
      const cellValue = rowMapper(row)[colIndex];
      const cellLength = String(cellValue ?? '').length;
      if (cellLength > maxWidth) maxWidth = cellLength;
    });
    return { wch: Math.min(maxWidth + 2, 50) };
  });

  worksheet['!cols'] = colWidths;

  return worksheet;
}

function generateWorkbook(
  allRows: AllExportRows,
  selectedWorksheets?: WorksheetKey[],
): Uint8Array {
  const includeWorksheet = (key: WorksheetKey) =>
    !selectedWorksheets || selectedWorksheets.length === 0 || selectedWorksheets.includes(key);

  const workbook = XLSX.utils.book_new();

  if (includeWorksheet("SUMMARY")) {
    const summarySheet = createWorksheet(
      [...WORKSHEET_HEADERS.SUMMARY],
      allRows.summaryRows,
      summaryRowToArray
    );
    XLSX.utils.book_append_sheet(workbook, summarySheet, WORKSHEET_NAMES.SUMMARY);
  }

  if (includeWorksheet("LABOR")) {
    const laborSheet = createWorksheet(
      [...WORKSHEET_HEADERS.LABOR],
      allRows.laborRows,
      laborRowToArray
    );
    XLSX.utils.book_append_sheet(workbook, laborSheet, WORKSHEET_NAMES.LABOR);
  }

  if (includeWorksheet("COSTS")) {
    const costsSheet = createWorksheet(
      [...WORKSHEET_HEADERS.COSTS],
      allRows.costRows,
      costRowToArray
    );
    if (allRows.costRows.length > 0) {
      const totalQty = allRows.costRows.reduce((sum, r) => sum + r.quantity, 0);
      const totalCost = allRows.costRows.reduce((sum, r) => sum + r.totalPrice, 0);
      XLSX.utils.sheet_add_aoa(
        costsSheet,
        [['', '', '', 'TOTAL', totalQty, '', totalCost, '', '', '']],
        { origin: -1 }
      );
    }
    XLSX.utils.book_append_sheet(workbook, costsSheet, WORKSHEET_NAMES.COSTS);
  }

  if (includeWorksheet("PM_CHECKLISTS")) {
    const pmSheet = createWorksheet(
      [...WORKSHEET_HEADERS.PM_CHECKLISTS],
      allRows.pmRows,
      pmRowToArray
    );
    XLSX.utils.book_append_sheet(workbook, pmSheet, WORKSHEET_NAMES.PM_CHECKLISTS);
  }

  if (includeWorksheet("TIMELINE")) {
    const timelineSheet = createWorksheet(
      [...WORKSHEET_HEADERS.TIMELINE],
      allRows.timelineRows,
      timelineRowToArray
    );
    XLSX.utils.book_append_sheet(workbook, timelineSheet, WORKSHEET_NAMES.TIMELINE);
  }

  if (includeWorksheet("EQUIPMENT")) {
    const equipmentSheet = createWorksheet(
      [...WORKSHEET_HEADERS.EQUIPMENT],
      allRows.equipmentRows,
      equipmentRowToArray
    );
    XLSX.utils.book_append_sheet(workbook, equipmentSheet, WORKSHEET_NAMES.EQUIPMENT);
  }

  if (workbook.SheetNames.length === 0) {
    throw new Error('NO_WORKSHEETS_SELECTED');
  }

  return XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }) as Uint8Array;
}

// ============================================
// Main Handler
// ============================================

Deno.serve(async (req) => {
  const corsResponse = handleCorsPreflightIfNeeded(req);
  if (corsResponse) return corsResponse;

  try {
    const authContext = await requireAuthenticatedPost(req);
    if (authContext instanceof Response) {
      return authContext;
    }

    const { supabase, user } = authContext;

    const body: ExportRequest = await req.json();
    const { organizationId, filters } = body;

    if (!organizationId) {
      return createErrorResponse('Missing required field: organizationId', 400);
    }

    const isAdmin = await verifyOrgAdmin(supabase, user.id, organizationId);
    if (!isAdmin) {
      return createErrorResponse('Forbidden: Only owners and admins can export reports', 403);
    }

    let rateLimitOk: boolean;
    try {
      rateLimitOk = await checkRateLimit(supabase, user.id, organizationId);
    } catch (rateLimitError) {
      console.error('[EXPORT-WORK-ORDERS-EXCEL] Rate limit check error:', rateLimitError);
      return createErrorResponse('An internal error occurred', 500);
    }
    if (!rateLimitOk) {
      return createWorkOrderExportRateLimitResponse(corsHeaders);
    }

    const { data: exportLog } = await supabase
      .from('export_request_log')
      .insert({
        user_id: user.id,
        organization_id: organizationId,
        report_type: 'work-orders-detailed',
        row_count: 0,
        status: 'pending',
      })
      .select('id')
      .single();

    const exportLogId = exportLog?.id;

    try {
      const data = await fetchWorkOrdersWithData(supabase, organizationId, filters);

      if (data.workOrders.length === 0) {
        if (exportLogId) {
          await supabase
            .from('export_request_log')
            .update({ status: 'completed', row_count: 0, completed_at: new Date().toISOString() })
            .eq('id', exportLogId);
        }
        return new Response(
          JSON.stringify({ error: 'No work orders found matching the filters' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const allRows = buildAllRows(data);
      const xlsxBuffer = generateWorkbook(allRows, filters.worksheets);

      if (exportLogId) {
        await supabase
          .from('export_request_log')
          .update({
            status: 'completed',
            row_count: data.workOrders.length,
            completed_at: new Date().toISOString(),
          })
          .eq('id', exportLogId);
      }

      const dateStr = new Date().toISOString().split('T')[0];
      return new Response(xlsxBuffer as unknown as BodyInit, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="work-orders-export-${dateStr}.xlsx"`,
        },
      });
    } catch (exportError) {
      if (exportLogId) {
        await supabase
          .from('export_request_log')
          .update({ status: 'failed', completed_at: new Date().toISOString() })
          .eq('id', exportLogId);
      }
      if (exportError instanceof Error && exportError.message === 'NO_WORKSHEETS_SELECTED') {
        return createErrorResponse(
          'No worksheets available for the selected export options',
          400,
        );
      }
      throw exportError;
    }
  } catch (error) {
    console.error('[EXPORT-WORK-ORDERS-EXCEL] Export error:', error);
    return createErrorResponse("An unexpected error occurred", 500);
  }
});
