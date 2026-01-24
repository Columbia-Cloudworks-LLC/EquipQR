/**
 * Import Equipment CSV Edge Function
 *
 * Imports equipment from CSV data into the database.
 * Requires authenticated user with admin/owner role in the organization.
 * Uses user-scoped client so RLS policies apply.
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  createUserSupabaseClient,
  requireUser,
  verifyOrgAdmin,
  createErrorResponse,
  createJsonResponse,
  handleCorsPreflightIfNeeded,
} from "../_shared/supabase-clients.ts";

interface MappedRow {
  name?: string;
  manufacturer?: string;
  model?: string;
  serial?: string;
  location?: string;
  last_maintenance?: string;
  customAttributes: Record<string, string | number | boolean | null>;
}

interface ImportRequest {
  dryRun: boolean;
  rows: Record<string, string>[];
  mappings: Array<{
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
  }>;
  importId: string;
  teamId: string | null;
  organizationId: string;
  chunkIndex?: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCorsPreflightIfNeeded(req);
  if (corsResponse) return corsResponse;

  try {
    if (req.method !== "POST") {
      return createErrorResponse("Method not allowed", 405);
    }

    // Create user-scoped client (RLS enforced)
    const supabase = createUserSupabaseClient(req);

    // Validate user authentication
    const auth = await requireUser(req, supabase);
    if ("error" in auth) {
      return createErrorResponse(auth.error, auth.status);
    }

    const { user } = auth;

    const body: ImportRequest = await req.json();
    const { dryRun, rows, mappings, importId, teamId, organizationId } = body;

    // Verify user has admin/owner role in the organization
    const isAdmin = await verifyOrgAdmin(supabase, user.id, organizationId);
    if (!isAdmin) {
      return createErrorResponse(
        "Only organization admins can import equipment",
        403
      );
    }

    if (dryRun) {
      return await handleDryRun(supabase, organizationId, rows, mappings);
    } else {
      return await handleImport(
        supabase,
        organizationId,
        rows,
        mappings,
        importId,
        teamId
      );
    }
  } catch (error) {
    // Log the full error server-side for debugging
    console.error("[IMPORT-EQUIPMENT-CSV] Import error:", error);
    // Return generic message to client - never expose error.message directly
    return createErrorResponse("An unexpected error occurred", 500);
  }
});

async function handleDryRun(
  supabase: SupabaseClient,
  organizationId: string,
  rows: Record<string, string>[],
  mappings: Array<{
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
  }>
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

      // Check if equipment exists (RLS will apply)
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
  mappings: Array<{
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
  }>,
  importId: string,
  teamId: string | null
) {
  let created = 0;
  let merged = 0;
  let failed = 0;
  const failures: Array<{ row: number; reason: string }> = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const mappedRow = mapRow(row, mappings);

    try {
      const validation = validateRow(mappedRow);
      if (!validation.valid) {
        failed++;
        failures.push({
          row: i + 1,
          reason: validation.error || "Invalid row",
        });
        continue;
      }

      const existing = await findExistingEquipment(
        supabase,
        organizationId,
        mappedRow
      );

      if (existing) {
        // Merge logic
        const updateData: Record<
          string,
          string | Record<string, string | number | boolean | null>
        > = {
          updated_at: new Date().toISOString(),
        };

        // Update name if provided
        if (mappedRow.name && mappedRow.name.trim() !== "") {
          updateData.name = mappedRow.name.trim();
        }

        // Update location if provided
        if (mappedRow.location && mappedRow.location.trim() !== "") {
          updateData.location = mappedRow.location.trim();
        }

        // Merge custom attributes
        if (Object.keys(mappedRow.customAttributes).length > 0) {
          updateData.custom_attributes = {
            ...((existing.custom_attributes as Record<
              string,
              string | number | boolean | null
            >) || {}),
            ...mappedRow.customAttributes,
          };
        }

        // Update last_maintenance if newer
        if (mappedRow.last_maintenance) {
          const newDate = new Date(mappedRow.last_maintenance);
          const existingDate = existing.last_maintenance
            ? new Date(existing.last_maintenance as string)
            : null;

          if (!existingDate || newDate > existingDate) {
            updateData.last_maintenance = mappedRow.last_maintenance;
            // When last_maintenance is overridden from CSV data, clear any existing
            // last_maintenance_work_order_id link to avoid keeping a stale work order
            // reference that no longer matches the source of the maintenance date.
            updateData.last_maintenance_work_order_id = null;
          }
        }

        // RLS will ensure user can only update equipment in their org
        const { error: updateError } = await supabase
          .from("equipment")
          .update(updateData)
          .eq("id", existing.id);

        if (updateError) {
          throw new Error(updateError.message);
        }

        merged++;
      } else {
        // Create new equipment
        const insertData: Record<
          string,
          string | Record<string, string | number | boolean | null> | null
        > = {
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
          // When last_maintenance is set from CSV data, set last_maintenance_work_order_id
          // to null since the maintenance date comes from external data, not a work order.
          insertData.last_maintenance_work_order_id = null;
        }

        // RLS will ensure user can only insert into their org
        const { error: insertError } = await supabase
          .from("equipment")
          .insert(insertData);

        if (insertError) {
          throw new Error(insertError.message);
        }

        created++;
      }
    } catch (error) {
      failed++;
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      failures.push({ row: i + 1, reason: errorMsg });
    }
  }

  return createJsonResponse({
    created,
    merged,
    failed,
    failures,
  });
}

function mapRow(
  row: Record<string, string>,
  mappings: Array<{
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
  }>
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
      (result as Record<string, string>)[mapping.mappedTo] = value.trim();
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

  // RLS will restrict to equipment in orgs the user has access to
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

  // Boolean
  if (["true", "false", "yes", "no"].includes(trimmed.toLowerCase())) {
    return ["true", "yes"].includes(trimmed.toLowerCase());
  }

  // Number
  const num = Number(trimmed);
  if (!isNaN(num) && isFinite(num) && trimmed !== "") {
    return num;
  }

  return trimmed;
}
