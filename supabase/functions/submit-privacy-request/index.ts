/**
 * Submit Privacy Request Edge Function
 *
 * Public endpoint (no auth required) for CCPA/CPRA Data Subject Requests.
 * Authenticated users may also call this; if a valid JWT is present the
 * request is linked to their user_id automatically.
 *
 * Abuse controls:
 *   - hCaptcha verification (when HCAPTCHA_SECRET_KEY is configured)
 *   - Per-email rate limiting (max 3 requests per email per 24 hours)
 *   - Duplicate suppression (same email + type within 1 hour)
 */

import {
  createAdminSupabaseClient,
  createUserSupabaseClient,
  createErrorResponse,
  createJsonResponse,
  handleCorsPreflightIfNeeded,
  withCorrelationId,
} from "../_shared/supabase-clients.ts";
import { optionalSecret } from "../_shared/require-secret.ts";

const VALID_TYPES = ["access", "deletion", "correction", "opt_out", "limit_use"] as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const RATE_LIMIT_MAX_REQUESTS = 3;
const RATE_LIMIT_WINDOW_HOURS = 24;
const DEDUPE_WINDOW_MINUTES = 60;

async function verifyCaptcha(token: string): Promise<boolean> {
  // hCaptcha is optional for this endpoint; absent secret means
  // CAPTCHA verification is skipped in dev / test environments.
  const secret = optionalSecret("HCAPTCHA_SECRET_KEY");
  if (!secret) return true;

  const form = new FormData();
  form.append("secret", secret);
  form.append("response", token);

  try {
    const res = await fetch("https://hcaptcha.com/siteverify", {
      method: "POST",
      body: form,
    });
    const result = await res.json();
    return result.success === true;
  } catch {
    console.error("[PRIVACY-REQUEST] hCaptcha verification failed");
    return false;
  }
}

async function checkRateLimit(
  admin: ReturnType<typeof createAdminSupabaseClient>,
  email: string,
): Promise<boolean> {
  const windowStart = new Date(
    Date.now() - RATE_LIMIT_WINDOW_HOURS * 60 * 60 * 1000,
  ).toISOString();

  const { count, error } = await admin
    .from("dsr_requests")
    .select("id", { count: "exact", head: true })
    .eq("requester_email", email)
    .gte("created_at", windowStart);

  if (error) {
    console.error("[PRIVACY-REQUEST] Rate limit check failed:", error.message);
    return true;
  }

  return (count ?? 0) < RATE_LIMIT_MAX_REQUESTS;
}

async function checkDuplicate(
  admin: ReturnType<typeof createAdminSupabaseClient>,
  email: string,
  requestType: string,
): Promise<boolean> {
  const windowStart = new Date(
    Date.now() - DEDUPE_WINDOW_MINUTES * 60 * 1000,
  ).toISOString();

  const { count, error } = await admin
    .from("dsr_requests")
    .select("id", { count: "exact", head: true })
    .eq("requester_email", email)
    .eq("request_type", requestType)
    .gte("created_at", windowStart);

  if (error) return false;
  return (count ?? 0) > 0;
}

async function getPrimaryOrganizationIdForUser(
  admin: ReturnType<typeof createAdminSupabaseClient>,
  userId: string,
): Promise<string | null> {
  const { data, error } = await admin
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !data?.organization_id) {
    return null;
  }

  return data.organization_id as string;
}

Deno.serve(withCorrelationId(async (req, _ctx) => {
  const corsResponse = handleCorsPreflightIfNeeded(req);
  if (corsResponse) return corsResponse;

  if (req.method !== "POST") {
    return createErrorResponse("Method not allowed", 405);
  }

  try {
    const body = await req.json();
    const { name, email, requestType, details, captchaToken } = body as {
      name?: string;
      email?: string;
      requestType?: string;
      details?: string;
      captchaToken?: string;
    };

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return createErrorResponse("Name is required", 400);
    }
    if (!email || typeof email !== "string" || !EMAIL_RE.test(email)) {
      return createErrorResponse("A valid email address is required", 400);
    }
    if (
      !requestType ||
      !VALID_TYPES.includes(requestType as typeof VALID_TYPES[number])
    ) {
      return createErrorResponse("Invalid request type", 400);
    }

    const hcaptchaConfigured = Boolean(optionalSecret("HCAPTCHA_SECRET_KEY"));
    if (hcaptchaConfigured) {
      if (!captchaToken || typeof captchaToken !== "string") {
        return createErrorResponse("CAPTCHA verification is required", 400);
      }
      const captchaValid = await verifyCaptcha(captchaToken);
      if (!captchaValid) {
        return createErrorResponse("CAPTCHA verification failed", 400);
      }
    }

    const normalizedEmail = email.trim().toLowerCase();

    let userId: string | null = null;
    try {
      const userClient = createUserSupabaseClient(req);
      const authHeader = req.headers.get("Authorization");
      if (authHeader) {
        const parts = authHeader.trim().split(/\s+/);
        if (parts.length === 2 && parts[0]?.toLowerCase() === "bearer" && parts[1]) {
          const { data: { user } } = await userClient.auth.getUser(parts[1]);
          if (user) {
            userId = user.id;
          }
        }
      }
    } catch {
      // No auth is fine — this is a public endpoint
    }

    const admin = createAdminSupabaseClient();

    const withinRateLimit = await checkRateLimit(admin, normalizedEmail);
    if (!withinRateLimit) {
      return createErrorResponse(
        `Rate limit exceeded. Maximum ${RATE_LIMIT_MAX_REQUESTS} privacy requests per ${RATE_LIMIT_WINDOW_HOURS} hours`,
        429,
      );
    }

    const isDuplicate = await checkDuplicate(admin, normalizedEmail, requestType);
    if (isDuplicate) {
      return createErrorResponse(
        "A similar request was already submitted recently. Please wait before submitting again",
        429,
      );
    }

    const organizationId = userId
      ? await getPrimaryOrganizationIdForUser(admin, userId)
      : null;

    const { data, error } = await admin
      .from("dsr_requests")
      .insert({
        requester_name: name.trim(),
        requester_email: normalizedEmail,
        request_type: requestType,
        details: details?.trim() || null,
        user_id: userId,
        organization_id: organizationId,
        status: userId ? "verifying" : "received",
      })
      .select("id, due_at")
      .single();

    if (error) {
      console.error("[PRIVACY-REQUEST] Insert failed:", error.message);
      return createErrorResponse("Failed to submit privacy request", 500);
    }

    return createJsonResponse({
      success: true,
      requestId: data.id,
      dueDate: data.due_at,
      message: "Your privacy request has been received. We will respond within 45 calendar days.",
    });
  } catch (err) {
    console.error("[PRIVACY-REQUEST] Unexpected error:", err);
    return createErrorResponse("Failed to submit privacy request", 500);
  }
}));
