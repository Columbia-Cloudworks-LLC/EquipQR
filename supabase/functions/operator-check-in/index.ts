/**
 * Public operator daily check-in edge function (#1091).
 *
 * Public endpoint (no Supabase session required): callers authenticate with the
 * per-assignment QR token. CAPTCHA and rate limits apply on submit.
 * Optional Bearer JWT is accepted for observability only and does not grant access
 * without a valid assignment token (same contract as submit-privacy-request).
 */

import {
  createAdminSupabaseClient,
  createErrorResponse,
  createJsonResponse,
  createUserSupabaseClient,
  handleCorsPreflightIfNeeded,
  withCorrelationId,
} from "../_shared/supabase-clients.ts";
import { optionalSecret } from "../_shared/require-secret.ts";
import { requireOperatorCheckinAssignmentToken } from "../_shared/operator-checkin-public-auth.ts";
import {
  normalizeTextValue,
  parseTemplateData,
  resolveEquipmentSnapshotValue,
  validateOperatorChecklistAnswers,
  validateOperatorInputFields,
  sanitizeOperatorChecklistAnswers,
  type CapturedFieldValue,
  type ClientContextKey,
  type OperatorChecklistAnswer,
  type OperatorChecklistDataField,
} from "../_shared/operator-checklist-validation.ts";

/** Public endpoint: Supabase session auth is intentionally omitted; access is gated by the assignment token hash. */

interface LoadRequest {
  action: "load";
  token: string;
}

interface SubmitRequest {
  action: "submit";
  token: string;
  operatorFieldValues: Record<string, unknown>;
  checklistAnswers: OperatorChecklistAnswer[];
  clientTimezone?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  location?: string | null;
  captchaToken?: string;
  requestFingerprint?: string | null;
}

type OperatorCheckInRequest = LoadRequest | SubmitRequest;

function getHcaptchaSiteKey(): string | null {
  return optionalSecret("HCAPTCHA_SITE_KEY", { legacyAliases: ["VITE_HCAPTCHA_SITEKEY"] });
}

/** CAPTCHA is enforced only when both secret and site key are configured. */
function isCaptchaFullyConfigured(): boolean {
  return Boolean(optionalSecret("HCAPTCHA_SECRET_KEY") && getHcaptchaSiteKey());
}

async function verifyCaptcha(token: string | undefined): Promise<boolean> {
  if (!isCaptchaFullyConfigured()) return true;
  const secret = optionalSecret("HCAPTCHA_SECRET_KEY");
  if (!secret || !token) return false;

  const form = new FormData();
  form.append("secret", secret);
  form.append("response", token);

  try {
    const res = await fetch("https://hcaptcha.com/siteverify", { method: "POST", body: form });
    const result = await res.json();
    return result.success === true;
  } catch {
    console.error("[OPERATOR-CHECKIN] hCaptcha verification failed");
    return false;
  }
}

function buildEquipmentPreviewFields(
  dataFields: OperatorChecklistDataField[],
  equipment: Record<string, unknown>,
): CapturedFieldValue[] {
  return dataFields
    .filter((field) => field.source === "equipment_snapshot" && field.equipmentKey)
    .map((field) => ({
      field_id: field.id,
      label: field.label,
      source: "equipment_snapshot" as const,
      value: resolveEquipmentSnapshotValue(field.equipmentKey!, equipment),
    }));
}

function buildClientFieldValues(
  dataFields: OperatorChecklistDataField[],
  input: {
    submittedAt: string;
    clientTimezone?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    location?: string | null;
    locationEnabled: boolean;
  },
): CapturedFieldValue[] {
  const captured: CapturedFieldValue[] = [];

  for (const field of dataFields.filter((f) => f.source === "client_context" && f.clientKey)) {
    let value: string | null = null;
    const key = field.clientKey as ClientContextKey;

    if (key === "submitted_timestamp") {
      value = input.submittedAt;
    } else if (key === "browser_timezone") {
      value = normalizeTextValue(input.clientTimezone, 100);
    } else if (key === "gps_location" && input.locationEnabled) {
      if (typeof input.latitude === "number" && typeof input.longitude === "number") {
        value = input.location ?? `${input.latitude}, ${input.longitude}`;
      } else {
        value = "Not provided";
      }
    }

    captured.push({
      field_id: field.id,
      label: field.label,
      source: "client_context",
      value,
    });
  }

  return captured;
}

function buildOperatorFieldValues(
  dataFields: OperatorChecklistDataField[],
  rawValues: Record<string, unknown>,
): CapturedFieldValue[] {
  return dataFields
    .filter((field) => field.source === "operator_input")
    .map((field) => {
      const raw = rawValues[field.id];
      let value: string | number | boolean | null = null;
      const inputType = field.inputType ?? "text";

      if (inputType === "checkbox" && typeof raw === "boolean") {
        value = raw;
      } else if (inputType === "number" && typeof raw === "number" && Number.isFinite(raw)) {
        value = raw;
      } else if (typeof raw === "string") {
        value = normalizeTextValue(raw, inputType === "textarea" ? 2000 : 500);
      }

      return {
        field_id: field.id,
        label: field.label,
        source: "operator_input" as const,
        value,
      };
    });
}

function buildEquipmentFieldValues(
  dataFields: OperatorChecklistDataField[],
  equipment: Record<string, unknown>,
): CapturedFieldValue[] {
  return dataFields
    .filter((field) => field.source === "equipment_snapshot" && field.equipmentKey)
    .map((field) => ({
      field_id: field.id,
      label: field.label,
      source: "equipment_snapshot" as const,
      value: resolveEquipmentSnapshotValue(field.equipmentKey!, equipment),
    }));
}

Deno.serve(withCorrelationId(async (req, _ctx) => {
  const corsResponse = handleCorsPreflightIfNeeded(req);
  if (corsResponse) return corsResponse;

  if (req.method !== "POST") {
    return createErrorResponse("Method not allowed", 405, { req });
  }

  let body: OperatorCheckInRequest;
  try {
    body = await req.json();
  } catch {
    return createErrorResponse("Invalid JSON body", 400, { req });
  }

  if (!body?.action || !body.token || typeof body.token !== "string") {
    return createErrorResponse("Missing action or token", 400, { req });
  }

  const supabase = createUserSupabaseClient(req);
  const tokenAuth = await requireOperatorCheckinAssignmentToken(supabase, body.token);
  if (!tokenAuth.ok) {
    return createErrorResponse(tokenAuth.error, tokenAuth.status, { req });
  }

  const settings = tokenAuth.settings;
  const equipment = settings.equipment as Record<string, unknown> | null;
  const template = settings.template as Record<string, unknown>;
  const org = equipment?.organizations as Record<string, unknown> | null;
  const templateData = parseTemplateData(template.template_data);
  const locationEnabled = org?.scan_location_collection_enabled === true;
  const gpsFieldSelected = templateData.dataFields.some(
    (field) => field.source === "client_context" && field.clientKey === "gps_location",
  );

  if (body.action === "load") {
    const captchaRequired = isCaptchaFullyConfigured();
    return createJsonResponse({
      template: {
        id: template.id,
        name: template.name,
        description: template.description,
        checklistItems: templateData.checklistItems,
        dataFields: templateData.dataFields,
      },
      equipmentPreviewFields: equipment ? buildEquipmentPreviewFields(templateData.dataFields, equipment) : [],
      locationCollectionEnabled: locationEnabled && gpsFieldSelected,
      captchaRequired,
      complianceNotice:
        "This record supports safety and audit documentation. It does not certify legal or regulatory compliance.",
    }, 200, { req });
  }

  if (body.action !== "submit") {
    return createErrorResponse("Unsupported action", 400, { req });
  }

  const captchaOk = await verifyCaptcha(body.captchaToken);
  if (!captchaOk) {
    return createErrorResponse("CAPTCHA verification failed", 403, { req });
  }

  const tokenHash = tokenAuth.tokenHash;

  const operatorValidation = validateOperatorInputFields(
    templateData.dataFields,
    body.operatorFieldValues ?? {},
  );
  if (!operatorValidation.isComplete) {
    return createErrorResponse(operatorValidation.errors[0] ?? "Required fields missing", 400, { req });
  }

  const checklistValidation = validateOperatorChecklistAnswers(
    templateData.checklistItems,
    body.checklistAnswers ?? [],
  );
  if (!checklistValidation.isComplete) {
    return createErrorResponse(checklistValidation.errors[0] ?? "Checklist incomplete", 400, { req });
  }

  const sanitizedChecklistAnswers = sanitizeOperatorChecklistAnswers(
    templateData.checklistItems,
    body.checklistAnswers ?? [],
  );

  const submittedAt = new Date().toISOString();
  const operatorFieldValues = buildOperatorFieldValues(templateData.dataFields, body.operatorFieldValues ?? {});
  const clientFieldValues = buildClientFieldValues(templateData.dataFields, {
    submittedAt,
    clientTimezone: body.clientTimezone,
    latitude: body.latitude,
    longitude: body.longitude,
    location: body.location,
    locationEnabled: locationEnabled && gpsFieldSelected,
  });
  const equipmentFieldValues = equipment
    ? buildEquipmentFieldValues(templateData.dataFields, equipment)
    : [];

  const templateSnapshot = {
    id: template.id,
    name: template.name,
    description: template.description,
    checklistItems: templateData.checklistItems,
    dataFields: templateData.dataFields,
  };

  const { data: inserted, error: insertError } = await createAdminSupabaseClient().rpc(
    "submit_operator_checkin_public",
    {
      p_token_hash: tokenHash,
    p_operator_field_values: operatorFieldValues,
    p_client_field_values: clientFieldValues,
    p_equipment_field_values: equipmentFieldValues,
    p_checklist_answers: sanitizedChecklistAnswers,
    p_template_snapshot: templateSnapshot,
    p_is_complete: true,
    p_required_item_count: checklistValidation.requiredItemCount,
    p_answered_required_count: checklistValidation.answeredRequiredCount,
      p_request_fingerprint: body.requestFingerprint?.slice(0, 128) ?? null,
    },
  );

  if (insertError) {
    console.error("[OPERATOR-CHECKIN] insert failed:", insertError.message);
    if (insertError.message.includes("Too many check-ins")) {
      return createErrorResponse("Too many check-ins. Please try again later.", 429, { req });
    }
    if (insertError.message.includes("not available")) {
      return createErrorResponse("Check-in is not available", 404, { req });
    }
    return createErrorResponse("Unable to save check-in", 500, { req });
  }

  const insertedRow = inserted as { id?: string; submitted_at?: string } | null;
  if (!insertedRow?.id) {
    return createErrorResponse("Unable to save check-in", 500, { req });
  }

  return createJsonResponse({
    success: true,
    submissionId: insertedRow.id,
    submittedAt: insertedRow.submitted_at,
  }, 200, { req });
}));
