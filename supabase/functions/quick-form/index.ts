/**
 * Public quick form edge function (#1184).
 *
 * Public endpoint (no Supabase session required): callers authenticate with the
 * per-form QR token. CAPTCHA and rate limits apply on submit. Same contract as
 * the operator-check-in function, but forms are standalone org objects with no
 * equipment or team linkage.
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
import { hashToken, normalizeTextValue } from "../_shared/operator-checklist-validation.ts";
import {
  buildQuickFormFieldValues,
  parseQuickFormData,
  validateQuickFormValues,
} from "../_shared/quick-form-validation.ts";

/** Public endpoint: Supabase session auth is intentionally omitted; access is gated by the form token hash. */

interface LoadRequest {
  action: "load";
  token: string;
}

interface SubmitRequest {
  action: "submit";
  token: string;
  fieldValues: Record<string, unknown>;
  clientTimezone?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  captchaToken?: string;
  requestFingerprint?: string | null;
}

type QuickFormRequest = LoadRequest | SubmitRequest;

const MIN_TOKEN_LENGTH = 32;
const MAX_TOKEN_LENGTH = 128;

function isValidPublicQuickFormToken(token: string): boolean {
  const trimmed = token.trim();
  return (
    trimmed.length >= MIN_TOKEN_LENGTH &&
    trimmed.length <= MAX_TOKEN_LENGTH &&
    /^[a-zA-Z0-9_-]+$/.test(trimmed)
  );
}

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
    console.error("[QUICK-FORM] hCaptcha verification failed");
    return false;
  }
}

interface ResolvedQuickForm {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  form_data: unknown;
  is_active: boolean;
  organization_name: string;
}

Deno.serve(withCorrelationId(async (req, _ctx) => {
  const corsResponse = handleCorsPreflightIfNeeded(req);
  if (corsResponse) return corsResponse;

  if (req.method !== "POST") {
    return createErrorResponse("Method not allowed", 405, { req });
  }

  let body: QuickFormRequest;
  try {
    body = await req.json();
  } catch {
    return createErrorResponse("Invalid JSON body", 400, { req });
  }

  if (!body?.action || !body.token || typeof body.token !== "string") {
    return createErrorResponse("Missing action or token", 400, { req });
  }

  if (!isValidPublicQuickFormToken(body.token)) {
    return createErrorResponse("Form is not available", 404, { req });
  }

  const tokenHash = await hashToken(body.token.trim());
  const supabase = createUserSupabaseClient(req);
  const { data: resolved, error: resolveError } = await supabase.rpc(
    "resolve_quick_form_by_token",
    { p_token_hash: tokenHash },
  );

  if (resolveError) {
    console.error("[QUICK-FORM] form lookup failed:", resolveError.message);
    return createErrorResponse("Form is not available", 404, { req });
  }

  const form = resolved as ResolvedQuickForm | null;
  if (!form || form.is_active === false) {
    return createErrorResponse("Form is not available", 404, { req });
  }

  const formData = parseQuickFormData(form.form_data);

  if (body.action === "load") {
    return createJsonResponse({
      form: {
        id: form.id,
        name: form.name,
        description: form.description,
        organizationName: form.organization_name,
        fields: formData.fields,
        collectLocation: formData.collectLocation === true,
      },
      captchaRequired: isCaptchaFullyConfigured(),
    }, 200, { req });
  }

  if (body.action !== "submit") {
    return createErrorResponse("Unsupported action", 400, { req });
  }

  const captchaOk = await verifyCaptcha(body.captchaToken);
  if (!captchaOk) {
    return createErrorResponse("CAPTCHA verification failed", 403, { req });
  }

  const validation = validateQuickFormValues(formData.fields, body.fieldValues ?? {});
  if (!validation.isComplete) {
    return createErrorResponse(validation.errors[0] ?? "Required fields missing", 400, { req });
  }

  const submittedAt = new Date().toISOString();
  const fieldValues = buildQuickFormFieldValues(formData.fields, body.fieldValues ?? {});

  const clientContext: Record<string, unknown> = {
    submitted_timestamp: submittedAt,
    browser_timezone: normalizeTextValue(body.clientTimezone, 100),
  };
  if (
    formData.collectLocation === true &&
    typeof body.latitude === "number" &&
    typeof body.longitude === "number" &&
    Number.isFinite(body.latitude) &&
    Number.isFinite(body.longitude)
  ) {
    clientContext.gps = { latitude: body.latitude, longitude: body.longitude };
  }

  const formSnapshot = {
    id: form.id,
    name: form.name,
    description: form.description,
    fields: formData.fields,
    collectLocation: formData.collectLocation === true,
  };

  const { data: inserted, error: insertError } = await createAdminSupabaseClient().rpc(
    "submit_quick_form_public",
    {
      p_token_hash: tokenHash,
      p_field_values: fieldValues,
      p_client_context: clientContext,
      p_form_snapshot: formSnapshot,
      p_request_fingerprint:
        typeof body.requestFingerprint === "string"
          ? body.requestFingerprint.slice(0, 128)
          : null,
    },
  );

  if (insertError) {
    console.error("[QUICK-FORM] insert failed:", insertError.message);
    if (insertError.message.includes("Too many submissions")) {
      return createErrorResponse("Too many submissions. Please try again later.", 429, { req });
    }
    if (insertError.message.includes("not available")) {
      return createErrorResponse("Form is not available", 404, { req });
    }
    return createErrorResponse("Unable to save submission", 500, { req });
  }

  const insertedRow = inserted as { id?: string; submitted_at?: string } | null;
  if (!insertedRow?.id) {
    return createErrorResponse("Unable to save submission", 500, { req });
  }

  return createJsonResponse({
    success: true,
    submissionId: insertedRow.id,
    submittedAt: insertedRow.submitted_at,
  }, 200, { req });
}));
