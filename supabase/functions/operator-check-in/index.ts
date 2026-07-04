/**
 * Public operator daily check-in edge function (#1091).
 */

import {
  createAdminSupabaseClient,
  createErrorResponse,
  createJsonResponse,
  handleCorsPreflightIfNeeded,
  withCorrelationId,
} from "../_shared/supabase-clients.ts";
import { optionalSecret } from "../_shared/require-secret.ts";
import {
  hashToken,
  normalizeTextValue,
  parseTemplateData,
  resolveEquipmentSnapshotValue,
  validateOperatorChecklistAnswers,
  validateOperatorInputFields,
  type CapturedFieldValue,
  type ClientContextKey,
  type OperatorChecklistAnswer,
  type OperatorChecklistDataField,
} from "../_shared/operator-checklist-validation.ts";

const RATE_LIMIT_MAX_SUBMISSIONS = 20;
const RATE_LIMIT_WINDOW_HOURS = 1;

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

async function resolveSettingsByToken(admin: ReturnType<typeof createAdminSupabaseClient>, token: string) {
  const tokenHash = await hashToken(token.trim());
  const { data, error } = await admin
    .from("equipment_operator_checkin_settings")
    .select(`
      id,
      organization_id,
      equipment_id,
      template_id,
      enabled,
      equipment:equipment_id (
        id,
        name,
        serial_number,
        manufacturer,
        model,
        status,
        location,
        working_hours,
        custom_attributes,
        organization_id,
        team:team_id ( id, name ),
        organizations:organization_id (
          id,
          name,
          scan_location_collection_enabled
        )
      ),
      template:template_id (
        id,
        name,
        description,
        template_data,
        is_active
      )
    `)
    .eq("public_token_hash", tokenHash)
    .maybeSingle();

  if (error) {
    console.error("[OPERATOR-CHECKIN] settings lookup failed:", error.message);
    return null;
  }

  return data;
}

async function checkSubmissionRateLimit(
  admin: ReturnType<typeof createAdminSupabaseClient>,
  settingsId: string,
): Promise<boolean> {
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_HOURS * 60 * 60 * 1000).toISOString();
  const { count, error } = await admin
    .from("operator_checkin_submissions")
    .select("id", { count: "exact", head: true })
    .eq("settings_id", settingsId)
    .gte("submitted_at", windowStart);

  if (error) {
    console.error("[OPERATOR-CHECKIN] rate limit check failed:", error.message);
    return false;
  }

  return (count ?? 0) < RATE_LIMIT_MAX_SUBMISSIONS;
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

  const admin = createAdminSupabaseClient();
  const settings = await resolveSettingsByToken(admin, body.token);

  if (!settings || !settings.enabled || !settings.template) {
    return createErrorResponse("Check-in is not available", 404, { req });
  }

  const equipment = settings.equipment as Record<string, unknown> | null;
  const template = settings.template as Record<string, unknown>;
  if (template.is_active === false) {
    return createErrorResponse("Check-in is not available", 404, { req });
  }
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

  const rateOk = await checkSubmissionRateLimit(admin, settings.id as string);
  if (!rateOk) {
    return createErrorResponse("Too many check-ins. Please try again later.", 429, { req });
  }

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

  const { data: inserted, error: insertError } = await admin
    .from("operator_checkin_submissions")
    .insert({
      organization_id: settings.organization_id,
      equipment_id: settings.equipment_id,
      template_id: settings.template_id,
      settings_id: settings.id,
      submitted_at: submittedAt,
      template_snapshot: templateSnapshot,
      operator_field_values: operatorFieldValues,
      client_field_values: clientFieldValues,
      equipment_field_values: equipmentFieldValues,
      checklist_answers: body.checklistAnswers,
      is_complete: true,
      required_item_count: checklistValidation.requiredItemCount,
      answered_required_count: checklistValidation.answeredRequiredCount,
      request_fingerprint: body.requestFingerprint?.slice(0, 128) ?? null,
    })
    .select("id, submitted_at")
    .single();

  if (insertError || !inserted) {
    console.error("[OPERATOR-CHECKIN] insert failed:", insertError?.message);
    return createErrorResponse("Unable to save check-in", 500, { req });
  }

  return createJsonResponse({
    success: true,
    submissionId: inserted.id,
    submittedAt: inserted.submitted_at,
  }, 200, { req });
}));
