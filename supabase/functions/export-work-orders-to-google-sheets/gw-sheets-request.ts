import { createErrorResponse } from "../_shared/supabase-clients.ts";
import type { ExportRequest, WorkOrderExcelFilters } from "../_shared/work-orders-export-data.ts";

export const VALID_SHEETS_EXPORT_DATE_FIELDS = ["created_date", "completed_date"] as const;

export type ValidSheetsExportDateField = (typeof VALID_SHEETS_EXPORT_DATE_FIELDS)[number];

export interface ParsedSheetsExportRequest {
  organizationId: string;
  filters: WorkOrderExcelFilters;
}

export function isValidSheetsExportDateField(
  value: unknown,
): value is ValidSheetsExportDateField {
  return typeof value === "string"
    && VALID_SHEETS_EXPORT_DATE_FIELDS.includes(value as ValidSheetsExportDateField);
}

export function validateSheetsExportRequest(
  body: unknown,
): Response | ParsedSheetsExportRequest {
  if (!body || typeof body !== "object") {
    return createErrorResponse("Missing required field: organizationId", 400);
  }

  const { organizationId, filters } = body as ExportRequest;

  if (!organizationId) {
    return createErrorResponse("Missing required field: organizationId", 400);
  }

  if (!filters || typeof filters !== "object") {
    return createErrorResponse("Missing required field: filters", 400);
  }

  if (filters.dateField && !isValidSheetsExportDateField(filters.dateField)) {
    return createErrorResponse(
      "Invalid filters.dateField: must be 'created_date' or 'completed_date'",
      400,
    );
  }

  return { organizationId, filters };
}

export async function parseSheetsExportRequest(
  req: Request,
): Promise<Response | ParsedSheetsExportRequest> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return createErrorResponse("Invalid JSON body", 400);
  }

  return validateSheetsExportRequest(body);
}

export const __gwSheetsRequestTestables = {
  VALID_SHEETS_EXPORT_DATE_FIELDS,
  isValidSheetsExportDateField,
  validateSheetsExportRequest,
};
