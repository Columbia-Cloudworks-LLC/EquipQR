/**
 * Import Equipment CSV Edge Function
 *
 * Imports equipment from CSV data into the database.
 * Requires authenticated user with admin/owner role in the organization.
 * Uses user-scoped client so RLS policies apply.
 */

import { SupabaseClient } from "npm:@supabase/supabase-js@2.45.0";
import {
  verifyOrgAdmin,
  requireAuthenticatedPost,
  createErrorResponse,
  createJsonResponse,
  handleCorsPreflightIfNeeded,
} from "../_shared/supabase-clients.ts";

/** Chunk size for bulk inserts - provides better error isolation while maintaining performance */
const BULK_INSERT_CHUNK_SIZE = 50;

interface MappedRow {
  name?: string;
  manufacturer?: string;
  model?: string;
  serial?: string;
  location?: string;
  last_maintenance?: string;
  customAttributes: Record<string, string | number | boolean | null>;
}

type ColumnMapping = {
  header: string;
  mappedTo:
    | "name"
    | "manufacturer"
    | "model"
    | "serial"
    | "location"
    | "last_maintenance"
    | "custom"
    | "skip";
  customKey?: string;
};

type EquipmentWritePayload = Record<
  string,
  string | Record<string, string | number | boolean | null> | null
>;

interface ExistingEquipmentRow {
  id: string;
  last_maintenance?: string | null;
  custom_attributes?: Record<string, string | number | boolean | null> | null;
}

interface PreparedRow {
  rowIndex: number;
  mappedRow: MappedRow;
  existing: ExistingEquipmentRow | null;
}

interface UpdateOp {
  rowIndex: number;
  existingId: string;
  updateData: EquipmentWritePayload;
}

interface ImportRequest {
  dryRun: boolean;
  rows: Record<string, string>[];
  mappings: ColumnMapping[];
  importId: string;
  teamId: string | null;
  organizationId: string;
  chunkIndex?: number;
}

interface ImportFailure {
  row: number;
  reason: string;
}

Deno.serve(async (req) => {
  const corsResponse = handleCorsPreflightIfNeeded(req);
  if (corsResponse) return corsResponse;

  try {
    const authContext = await requireAuthenticatedPost(req);
    if (authContext instanceof Response) {
      return authContext;
    }

    const { supabase, user } = authContext;

    const body: ImportRequest = await req.json();
    const { dryRun, rows, mappings, importId, teamId, organizationId } = body;

    const isAdmin = await verifyOrgAdmin(supabase, user.id, organizationId);
    if (!isAdmin) {
      return createErrorResponse(
        "Only organization admins can import equipment",
        403
      );
    }

    if (dryRun) {
      return await handleDryRun(supabase, organizationId, rows, mappings);
    }

    return await handleImport(
      supabase,
      organizationId,
      rows,
      mappings,
      importId,
      teamId
    );
  } catch (error) {
    console.error("[IMPORT-EQUIPMENT-CSV] Import error:", error);
    return createErrorResponse("An unexpected error occurred", 500);
  }
});

async function handleDryRun(
  supabase: SupabaseClient,
  organizationId: string,
  rows: Record<string, string>[],
  mappings: ColumnMapping[]
) {
  let validCount = 0;
  let willCreate = 0;
  let willMerge = 0;
  let errorCount = 0;
  const sample: Array<{
    rowIndex: number;
    action: "create" | "merge" | "error";
    name?: string;
    manufacturer?: string;
    model?: string;
    serial?: string;
    location?: string;
    last_maintenance?: string;
    customAttributes: Record<string, string | number | boolean | null>;
    error?: string;
  }> = [];
  const warnings: string[] = [];
  const errors: Array<{ row: number; reason: string }> = [];

  for (let i = 0; i < Math.min(rows.length, 100); i++) {
    const row = rows[i];
    const mappedRow = mapRow(row, mappings);

    try {
      const validation = validateRow(mappedRow);
      if (!validation.valid) {
        errorCount++;
        errors.push({ row: i + 1, reason: validation.error || "Invalid row" });
        sample.push({
          rowIndex: i,
          action: "error",
          ...mappedRow,
          error: validation.error,
        });
        continue;
      }

      const existing = await findExistingEquipment(
        supabase,
        organizationId,
        mappedRow
      );

      if (existing) {
        willMerge++;
        sample.push({
          rowIndex: i,
          action: "merge",
          ...mappedRow,
        });
      } else {
        willCreate++;
        sample.push({
          rowIndex: i,
          action: "create",
          ...mappedRow,
        });
      }

      validCount++;
    } catch (error) {
      errorCount++;
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      errors.push({ row: i + 1, reason: errorMsg });
      sample.push({
        rowIndex: i,
        action: "error",
        ...mappedRow,
        error: errorMsg,
      });
    }
  }

  return createJsonResponse({
    validCount,
    willCreate,
    willMerge,
    errorCount,
    sample,
    warnings,
    errors,
  });
}

async function handleImport(
  supabase: SupabaseClient,
  organizationId: string,
  rows: Record<string, string>[],
  mappings: ColumnMapping[],
  importId: string,
  teamId: string | null
) {
  const { preparedRows, failures: prepFailures } = await prepareImportRows(
    supabase,
    organizationId,
    rows,
    mappings
  );

  const { toInsert, toInsertRowIndices, updateOps } = partitionPreparedRows(
    preparedRows,
    organizationId,
    importId,
    teamId
  );

  const insertResult = await insertEquipmentChunks(
    supabase,
    toInsert,
    toInsertRowIndices
  );
  const updateResult = await updateExistingEquipmentBatch(
    supabase,
    organizationId,
    updateOps
  );

  return createJsonResponse({
    created: insertResult.created,
    merged: updateResult.merged,
    failed: prepFailures.length + insertResult.failed + updateResult.failed,
    failures: [...prepFailures, ...insertResult.failures, ...updateResult.failures],
  });
}

async function prepareImportRows(
  supabase: SupabaseClient,
  organizationId: string,
  rows: Record<string, string>[],
  mappings: ColumnMapping[]
): Promise<{ preparedRows: PreparedRow[]; failures: ImportFailure[] }> {
  const preparedRows: PreparedRow[] = [];
  const failures: ImportFailure[] = [];

  for (let i = 0; i < rows.length; i++) {
    const mappedRow = mapRow(rows[i], mappings);
    const validation = validateRow(mappedRow);

    if (!validation.valid) {
      failures.push({
        row: i + 1,
        reason: validation.error || "Invalid row",
      });
      continue;
    }

    try {
      const existing = await findExistingEquipment(
        supabase,
        organizationId,
        mappedRow
      );
      preparedRows.push({ rowIndex: i, mappedRow, existing });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      failures.push({ row: i + 1, reason: errorMsg });
    }
  }

  return { preparedRows, failures };
}

function buildUpdateData(
  mappedRow: MappedRow,
  existing: ExistingEquipmentRow
): EquipmentWritePayload {
  const updateData: EquipmentWritePayload = {
    updated_at: new Date().toISOString(),
  };

  if (mappedRow.name && mappedRow.name.trim() !== "") {
    updateData.name = mappedRow.name.trim();
  }

  if (mappedRow.location && mappedRow.location.trim() !== "") {
    updateData.location = mappedRow.location.trim();
  }

  if (Object.keys(mappedRow.customAttributes).length > 0) {
    updateData.custom_attributes = {
      ...((existing.custom_attributes as Record<
        string,
        string | number | boolean | null
      >) || {}),
      ...mappedRow.customAttributes,
    };
  }

  if (mappedRow.last_maintenance) {
    const newDate = new Date(mappedRow.last_maintenance);
    const existingDate = existing.last_maintenance
      ? new Date(existing.last_maintenance as string)
      : null;

    if (!existingDate || newDate > existingDate) {
      updateData.last_maintenance = mappedRow.last_maintenance;
      updateData.last_maintenance_work_order_id = null;
    }
  }

  return updateData;
}

function buildInsertData(
  mappedRow: MappedRow,
  organizationId: string,
  importId: string,
  teamId: string | null
): EquipmentWritePayload {
  const insertData: EquipmentWritePayload = {
    organization_id: organizationId,
    name:
      mappedRow.name ||
      `${mappedRow.manufacturer || ""} ${mappedRow.model || ""}`.trim() ||
      "Imported Equipment",
    manufacturer: mappedRow.manufacturer || "",
    model: mappedRow.model || "",
    serial_number: mappedRow.serial || "",
    status: "active",
    location: mappedRow.location || "Unknown",
    installation_date: new Date().toISOString().split("T")[0],
    custom_attributes: mappedRow.customAttributes,
    import_id: importId,
    team_id: teamId,
  };

  if (mappedRow.last_maintenance) {
    insertData.last_maintenance = mappedRow.last_maintenance;
    insertData.last_maintenance_work_order_id = null;
  }

  return insertData;
}

function partitionPreparedRows(
  preparedRows: PreparedRow[],
  organizationId: string,
  importId: string,
  teamId: string | null
): {
  toInsert: EquipmentWritePayload[];
  toInsertRowIndices: number[];
  updateOps: UpdateOp[];
} {
  const toInsert: EquipmentWritePayload[] = [];
  const toInsertRowIndices: number[] = [];
  const updateOps: UpdateOp[] = [];

  for (const { rowIndex, mappedRow, existing } of preparedRows) {
    if (existing) {
      updateOps.push({
        rowIndex,
        existingId: existing.id,
        updateData: buildUpdateData(mappedRow, existing),
      });
      continue;
    }

    toInsert.push(buildInsertData(mappedRow, organizationId, importId, teamId));
    toInsertRowIndices.push(rowIndex);
  }

  return { toInsert, toInsertRowIndices, updateOps };
}

function formatChunkInsertFailureReason(
  chunkLength: number,
  chunkRowIndices: number[],
  errorDetails: string
): string {
  const firstRow = chunkRowIndices[0] + 1;
  const lastRow = chunkRowIndices[chunkRowIndices.length - 1] + 1;
  return `Bulk insert failed for chunk of ${chunkLength} row${chunkLength === 1 ? "" : "s"} (rows ${firstRow}-${lastRow}). Error: ${errorDetails}`;
}

async function insertEquipmentChunks(
  supabase: SupabaseClient,
  toInsert: EquipmentWritePayload[],
  toInsertRowIndices: number[]
): Promise<{ created: number; failed: number; failures: ImportFailure[] }> {
  let created = 0;
  let failed = 0;
  const failures: ImportFailure[] = [];

  for (
    let chunkStart = 0;
    chunkStart < toInsert.length;
    chunkStart += BULK_INSERT_CHUNK_SIZE
  ) {
    const chunkEnd = Math.min(
      chunkStart + BULK_INSERT_CHUNK_SIZE,
      toInsert.length
    );
    const chunk = toInsert.slice(chunkStart, chunkEnd);
    const chunkRowIndices = toInsertRowIndices.slice(chunkStart, chunkEnd);

    const { error: insertError } = await supabase.from("equipment").insert(chunk);

    if (insertError) {
      const detailParts = [
        insertError.message,
        insertError.details,
        insertError.hint,
      ].filter(Boolean);
      const chunkReason = formatChunkInsertFailureReason(
        chunk.length,
        chunkRowIndices,
        detailParts.join(" | ")
      );

      for (const rowIndex of chunkRowIndices) {
        failed++;
        failures.push({ row: rowIndex + 1, reason: chunkReason });
      }
      continue;
    }

    created += chunk.length;
  }

  return { created, failed, failures };
}

async function updateExistingEquipmentBatch(
  supabase: SupabaseClient,
  organizationId: string,
  updateOps: UpdateOp[]
): Promise<{ merged: number; failed: number; failures: ImportFailure[] }> {
  let merged = 0;
  let failed = 0;
  const failures: ImportFailure[] = [];

  for (
    let batchStart = 0;
    batchStart < updateOps.length;
    batchStart += BULK_INSERT_CHUNK_SIZE
  ) {
    const batch = updateOps.slice(
      batchStart,
      batchStart + BULK_INSERT_CHUNK_SIZE
    );
    const updateResults = await Promise.allSettled(
      batch.map(async ({ rowIndex, existingId, updateData }) => {
        const { error: updateError } = await supabase
          .from("equipment")
          .update(updateData)
          .eq("id", existingId)
          .eq("organization_id", organizationId);

        if (updateError) {
          throw { rowIndex, message: updateError.message };
        }
        return { rowIndex };
      })
    );

    for (const result of updateResults) {
      if (result.status === "fulfilled") {
        merged++;
      } else {
        failed++;
        const reason = result.reason as { rowIndex: number; message: string };
        failures.push({ row: reason.rowIndex + 1, reason: reason.message });
      }
    }
  }

  return { merged, failed, failures };
}

function mapRow(
  row: Record<string, string>,
  mappings: ColumnMapping[]
): MappedRow {
  const result: MappedRow = {
    customAttributes: {},
  };

  for (const mapping of mappings) {
    const value = row[mapping.header];
    if (!value || value.trim() === "") continue;

    if (mapping.mappedTo === "custom") {
      result.customAttributes[mapping.customKey || mapping.header] =
        inferType(value);
    } else if (mapping.mappedTo !== "skip") {
      switch (mapping.mappedTo) {
        case "name":
          result.name = value.trim();
          break;
        case "manufacturer":
          result.manufacturer = value.trim();
          break;
        case "model":
          result.model = value.trim();
          break;
        case "serial":
          result.serial = value.trim();
          break;
        case "location":
          result.location = value.trim();
          break;
        case "last_maintenance":
          result.last_maintenance = value.trim();
          break;
      }
    }
  }

  return result;
}

function validateRow(row: MappedRow): { valid: boolean; error?: string } {
  const hasSerial = !!row.serial;
  const hasManufacturer = !!row.manufacturer;
  const hasModel = !!row.model;

  if (hasSerial || (hasManufacturer && hasModel)) {
    return { valid: true };
  }

  return {
    valid: false,
    error:
      "Provide a serial or both manufacturer and model to create a new asset",
  };
}

async function findExistingEquipment(
  supabase: SupabaseClient,
  organizationId: string,
  row: MappedRow
) {
  if (!row.manufacturer || !row.model || !row.serial) {
    return null;
  }

  const { data } = await supabase
    .from("equipment")
    .select("*")
    .eq("organization_id", organizationId)
    .ilike("manufacturer", row.manufacturer)
    .ilike("model", row.model)
    .ilike("serial_number", row.serial)
    .single();

  return data;
}

function inferType(value: string): string | number | boolean {
  const trimmed = value.trim();

  if (["true", "false", "yes", "no"].includes(trimmed.toLowerCase())) {
    return ["true", "yes"].includes(trimmed.toLowerCase());
  }

  const num = Number(trimmed);
  if (!isNaN(num) && isFinite(num) && trimmed !== "") {
    return num;
  }

  return trimmed;
}

export const __testables = {
  mapRow,
  validateRow,
  inferType,
  buildUpdateData,
  buildInsertData,
  formatChunkInsertFailureReason,
};
