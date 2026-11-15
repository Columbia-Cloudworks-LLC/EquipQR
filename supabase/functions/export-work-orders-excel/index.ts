/**
 * Export Work Orders Excel Edge Function
 *
 * Generates a multi-worksheet Excel export for work orders with all related data.
 * Uses SheetJS (xlsx) for Excel generation.
 * Uses user-scoped client so RLS policies apply.
 */

// @deno-types="https://cdn.sheetjs.com/xlsx-0.20.3/package/types/index.d.ts"
import * as XLSX from 'https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs';
import { createErrorResponse } from "../_shared/supabase-clients.ts";
import {
  enforceExportAdminAndRateLimit,
  handleAuthenticatedExportPost,
  unexpectedExportErrorResponse,
} from "../_shared/export-request-gate.ts";
import {
  finishExportRequestLog,
  insertPendingExportRequestLog,
} from "../_shared/export-request-log.ts";
import {
  fetchWorkOrdersWithData,
  buildAllRows,
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
  parseWorksheetSelection,
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
    throw new Error('Workbook generation produced no worksheets');
  }

  return XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }) as Uint8Array;
}

// ============================================
// Main Handler
// ============================================

Deno.serve((req) => handleAuthenticatedExportPost(
  req,
  async ({ corsHeaders, supabase, user }) => {
    let parsedBody: unknown;
    try {
      parsedBody = await req.json();
    } catch {
      return createErrorResponse('Invalid JSON body', 400, { req });
    }

    if (parsedBody == null || typeof parsedBody !== 'object' || Array.isArray(parsedBody)) {
      return createErrorResponse('Invalid request body', 400, { req });
    }

    const body = parsedBody as ExportRequest;
    const { organizationId, filters: requestFilters } = body;

    if (requestFilters != null && (typeof requestFilters !== 'object' || Array.isArray(requestFilters))) {
      return createErrorResponse('Invalid filters', 400, { req });
    }

    const filters = requestFilters ?? { dateField: 'created_date' as const };

    if (!organizationId) {
      return createErrorResponse('Missing required field: organizationId', 400, { req });
    }

    const worksheetSelection = parseWorksheetSelection(filters.worksheets);
    if (!worksheetSelection.ok) {
      return createErrorResponse('Invalid worksheets selection', 400, { req });
    }

    const normalizedFilters = {
      ...filters,
      worksheets: worksheetSelection.worksheets,
    };

    const gateResponse = await enforceExportAdminAndRateLimit({
      req,
      corsHeaders,
      supabase,
      userId: user.id,
      organizationId,
      rateLimitErrorLabel: '[EXPORT-WORK-ORDERS-EXCEL] Rate limit check error:',
    });
    if (gateResponse) return gateResponse;

    const { id: exportLogId } = await insertPendingExportRequestLog(supabase, {
      userId: user.id,
      organizationId,
      reportType: 'work-orders-detailed',
    });

    try {
      const data = await fetchWorkOrdersWithData(supabase, organizationId, normalizedFilters);

      if (data.workOrders.length === 0) {
        if (exportLogId) {
          await finishExportRequestLog(supabase, exportLogId, { status: 'completed', rowCount: 0 });
        }
        return new Response(
          JSON.stringify({ error: 'No work orders found matching the filters' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const allRows = buildAllRows(data);
      const xlsxBuffer = generateWorkbook(allRows, normalizedFilters.worksheets);

      if (exportLogId) {
        await finishExportRequestLog(supabase, exportLogId, {
          status: 'completed',
          rowCount: data.workOrders.length,
        });
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
        await finishExportRequestLog(supabase, exportLogId, { status: 'failed' });
      }
      throw exportError;
    }
  },
  (error) => unexpectedExportErrorResponse(req, '[EXPORT-WORK-ORDERS-EXCEL] Export error:', error),
));
