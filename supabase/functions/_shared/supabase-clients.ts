/**
 * Supabase Client Utilities for Edge Functions
 * 
 * This module provides standardized client creation patterns:
 * - User-scoped clients (RLS enforced via JWT)
 * - Admin clients (service role, bypasses RLS - use sparingly)
 * - User extraction and validation
 */

import { createClient, SupabaseClient, User } from "npm:@supabase/supabase-js@2.45.0";
import { corsHeaders } from "./cors.ts";
import { SAFE_ERROR_PATTERNS } from "./error-message-allowlist.ts";
import { MissingSecretError } from "./require-secret.ts";

// =============================================================================
// Constants
// =============================================================================

/**
 * Maximum length for error messages before they're considered to contain debug info.
 *
 * Rationale for 200 characters:
 * - In our API and edge functions, user-facing error messages are intentionally short
 *   (typically < 120 characters) and do not include stack traces or SQL/query details.
 * - Messages significantly longer than ~200 characters are more likely to contain
 *   debug information (stack traces, SQL fragments, internal identifiers) that we
 *   don't want to surface directly to clients or log in full.
 * - This limit also reduces the risk and impact of log injection / log flooding
 *   by constraining the amount of untrusted text we propagate.
 *
 * If product requirements change and we need to show more verbose messages, update
 * this threshold in tandem with a review of error-sanitization and logging behavior.
 */
const MAX_ERROR_MESSAGE_LENGTH = 200;

/** 
 * Minimum safe error message length for messages that are NOT explicitly allowlisted.
 * Messages shorter than this (that do not match SAFE_ERROR_PATTERNS) are likely
 * system error codes or stack trace fragments that could leak debug information.
 * 
 * Examples of unsafe short messages that would be blocked when not allowlisted:
 * - 'err', 'bad' - vague codes that may come from internal systems
 * - 'E_FAIL', 'EPERM' - system error codes
 * - 'null', 'undefined' - JavaScript runtime errors converted to strings
 * - Stack trace line numbers like '42' or 'L123'
 * 
 * Known-safe short messages like 'Gone' or 'Not found' are explicitly allowlisted
 * in SAFE_ERROR_PATTERNS and therefore bypass this minimum-length check.
 */
const MIN_SAFE_ERROR_LENGTH = 10;

// =============================================================================
// Types
// =============================================================================

export interface AuthResult {
  user: User;
  token: string;
}

export interface AuthError {
  error: string;
  status: number;
}

// =============================================================================
// Client Creation
// =============================================================================

/**
 * Create a user-scoped Supabase client that enforces RLS.
 * 
 * Uses SUPABASE_ANON_KEY and forwards the user's Authorization header.
 * All queries will be subject to RLS policies as that user.
 * 
 * @param req - The incoming request (to extract Authorization header)
 * @returns SupabaseClient configured for the user's session
 * 
 * @example
 * const supabase = createUserSupabaseClient(req);
 * const { data } = await supabase.from('equipment').select('*');
 * // Only returns equipment the user has access to via RLS
 */
export function createUserSupabaseClient(req: Request): SupabaseClient {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_ANON_KEY");
  }

  const authHeader = req.headers.get("Authorization") ?? "";

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: { Authorization: authHeader },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * Create an admin Supabase client that bypasses RLS.
 * 
 * Uses SUPABASE_SERVICE_ROLE_KEY. 
 * 
 * WARNING: Only use for true system operations:
 * - Webhooks (Stripe, etc.) where there's no user context
 * - Cron jobs / background tasks
 * - Super-admin operations (after verifying super-admin access)
 * 
 * DO NOT use for user-facing operations where RLS should apply.
 * 
 * @returns SupabaseClient with service role privileges
 */
export function createAdminSupabaseClient(): SupabaseClient {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

// =============================================================================
// User Extraction & Validation
// =============================================================================

/**
 * Extract and validate the user from the request's Authorization header.
 * 
 * @param req - The incoming request
 * @param supabaseClient - A Supabase client (user-scoped or admin)
 * @returns AuthResult with user and token, or AuthError
 * 
 * @example
 * const supabase = createUserSupabaseClient(req);
 * const auth = await requireUser(req, supabase);
 * if ('error' in auth) {
 *   return createErrorResponse(auth.error, auth.status);
 * }
 * const { user, token } = auth;
 */
export async function requireUser(
  req: Request,
  supabaseClient: SupabaseClient
): Promise<AuthResult | AuthError> {
  const authHeader = req.headers.get("Authorization");

  if (!authHeader) {
    return { error: "No authorization header provided", status: 401 };
  }

  // Parse Authorization header with case-insensitive scheme detection
  // JWTs and API tokens should not contain spaces, so we require exactly 2 parts
  const parts = authHeader.trim().split(/\s+/);

  // Fail fast if the basic structure is not exactly "Bearer <token>"
  if (!parts[0] || !parts[1] || parts.length !== 2) {
    return { error: "Invalid authorization header format", status: 401 };
  }

  const [scheme, credentials] = parts;

  if (
    !scheme ||
    scheme.toLowerCase() !== "bearer" ||
    !credentials ||
    /\s/.test(credentials)
  ) {
    return { error: "Invalid authorization header format", status: 401 };
  }

  // Validate token with Supabase Auth
  const { data: { user }, error } = await supabaseClient.auth.getUser(credentials);

  if (error || !user) {
    // Provide user-friendly error messages based on the error type
    let authErrorMessage = "Authentication failed";

    if (error && typeof error.message === "string") {
      const normalizedMessage = error.message.toLowerCase();

      if (normalizedMessage.includes("expired")) {
        authErrorMessage = "Token has expired";
      } else if (
        normalizedMessage.includes("jwt malformed") ||
        normalizedMessage.includes("invalid token") ||
        normalizedMessage.includes("invalid jwt")
      ) {
        authErrorMessage = "Invalid token format";
      } else if (
        normalizedMessage.includes("session not found") ||
        normalizedMessage.includes("user not found")
      ) {
        authErrorMessage = "User session not found for provided token";
      }
    } else if (!user) {
      authErrorMessage = "User not found for provided token";
    }

    return {
      error: authErrorMessage,
      status: 401,
    };
  }

  return { user, token: credentials };
}

/**
 * Verify the user is a member of the specified organization.
 * 
 * @param supabaseClient - A Supabase client (should be user-scoped for RLS)
 * @param userId - The user's ID
 * @param organizationId - The organization ID to check
 * @returns Object with isMember boolean and optional role
 */
export async function verifyOrgMembership(
  supabaseClient: SupabaseClient,
  userId: string,
  organizationId: string
): Promise<{ isMember: boolean; role?: string }> {
  const { data, error } = await supabaseClient
    .from("organization_members")
    .select("role")
    .eq("user_id", userId)
    .eq("organization_id", organizationId)
    .eq("status", "active")
    .maybeSingle();

  if (error || !data) {
    return { isMember: false };
  }

  return { isMember: true, role: data.role };
}

/**
 * Verify the user has admin or owner role in the specified organization.
 * 
 * @param supabaseClient - A Supabase client
 * @param userId - The user's ID
 * @param organizationId - The organization ID to check
 * @returns true if user is admin or owner
 */
export async function verifyOrgAdmin(
  supabaseClient: SupabaseClient,
  userId: string,
  organizationId: string
): Promise<boolean> {
  const { data, error } = await supabaseClient
    .from("organization_members")
    .select("role")
    .eq("user_id", userId)
    .eq("organization_id", organizationId)
    .eq("status", "active")
    .in("role", ["owner", "admin"])
    .maybeSingle();

  return !error && !!data;
}

// =============================================================================
// Response Helpers
// =============================================================================

/**
 * MAINTENANCE NOTE: The error message allowlist has been moved to a separate
 * configuration file: `error-message-allowlist.ts`
 * 
 * When adding new user-facing error messages to Edge Functions:
 * 1. Add a matching pattern to SAFE_ERROR_PATTERNS in error-message-allowlist.ts
 * 2. Ensure the pattern is specific enough to not accidentally match debug info
 * 3. Prefer explicit full-message patterns over broad prefixes when possible
 * 4. Test by calling createErrorResponse with your new message and verifying
 *    it's not replaced with the generic error
 * 
 * To validate error messages during development, check the console for
 * "[createErrorResponse] Unsafe error message blocked:" warnings.
 * 
 * Use the `isErrorAllowlisted()` helper function from error-message-allowlist.ts
 * in tests to validate that commonly returned errors are covered.
 */

/** Default generic error message when the original is not allowlisted */
const GENERIC_ERROR_MESSAGE = "An internal error occurred";

/**
 * Checks if an error message is safe to expose to clients.
 * Uses an allowlist approach - only explicitly safe messages pass through.
 */
function isErrorMessageSafe(error: string): boolean {
  // Messages over MAX_ERROR_MESSAGE_LENGTH chars likely contain debug info
  if (error.length > MAX_ERROR_MESSAGE_LENGTH) {
    return false;
  }

  // First, allow explicitly safe messages regardless of minimum length.
  // This ensures short but known-safe messages (e.g., "Gone") are not blocked.
  if (SAFE_ERROR_PATTERNS.some((pattern) => pattern.test(error))) {
    return true;
  }

  // Empty or very short messages are suspicious and may leak information.
  // Messages shorter than MIN_SAFE_ERROR_LENGTH are likely system error codes
  // or stack trace fragments (e.g., 'err', 'bad') that could leak debug info.
  if (error.length < MIN_SAFE_ERROR_LENGTH) {
    return false;
  }

  // If the message is not explicitly allowlisted, treat it as unsafe by default.
  return false;
}

/**
 * Create a JSON error response with CORS headers.
 * 
 * Security (CWE-209 mitigation): This function uses an allowlist approach to
 * prevent information disclosure. Only error messages matching known-safe
 * patterns are exposed to clients. All other messages are replaced with a
 * generic error and the original is logged server-side for debugging.
 * 
 * **IMPORTANT - MAINTENANCE REQUIREMENT**: When adding new user-facing error
 * messages to Edge Functions, you MUST update the SAFE_ERROR_PATTERNS allowlist
 * in `error-message-allowlist.ts`. Failure to do so will cause your error message
 * to be replaced with a generic "An internal error occurred" message, hiding the
 * actual error from users.
 * 
 * **Steps to add a new error message**:
 * 1. Add a matching RegExp pattern to SAFE_ERROR_PATTERNS in error-message-allowlist.ts
 * 2. Ensure the pattern is specific enough to not accidentally match debug info
 * 3. Prefer explicit full-message patterns over broad prefixes when possible
 * 4. Test by calling createErrorResponse with your new message and verifying
 *    it's not replaced with the generic error
 * 5. Use `isErrorAllowlisted()` from error-message-allowlist.ts in tests to validate
 *    that commonly returned errors are covered
 * 6. Check the console for "[createErrorResponse] Unsafe error message blocked:"
 *    warnings during development
 * 
 * CALLER RESPONSIBILITY: While this function sanitizes unknown error messages,
 * callers should prefer passing known-safe string literals when possible.
 * For dynamic errors from external sources (database, third-party APIs), this
 * function provides defense-in-depth by blocking unrecognized messages.
 * 
 * TypeScript cannot enforce that only allowlisted strings are passed at compile
 * time without significant complexity (template literal types for each pattern).
 * Instead, this runtime validation ensures safety while keeping the API simple.
 * 
 * @param error - The error message (will be validated against allowlist)
 * @param status - HTTP status code (default: 500)
 */
export function createErrorResponse(
  error: string | Error,
  status: number = 500
): Response {
  // Use allowlist approach: only known-safe messages are exposed
  // This ensures defense-in-depth against stack trace exposure
  let safeMessage: string;

  if (error instanceof MissingSecretError) {
    // The MissingSecretError constructor has already emitted a structured
    // MISSING_REQUIRED_SECRET log line server-side. The client must never
    // see the secret name, so force the generic message.
    safeMessage = GENERIC_ERROR_MESSAGE;
  } else {
    const messageString = typeof error === "string" ? error : error.message;
    if (isErrorMessageSafe(messageString)) {
      safeMessage = messageString;
    } else {
      // Log the original error server-side for debugging
      console.error("[createErrorResponse] Unsafe error message blocked:", messageString);
      // Return a static generic message - no dynamic content from the error
      safeMessage = GENERIC_ERROR_MESSAGE;
    }
  }

  // Create response with only the safe static message
  // The safeMessage is either from the allowlist or a constant string literal
  const responseBody = JSON.stringify({ error: safeMessage });

  return new Response(
    responseBody,
    {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}

/**
 * Create a JSON success response with CORS headers.
 */
export function createJsonResponse<T>(
  data: T,
  status: number = 200
): Response {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}

/**
 * Handle CORS preflight requests.
 * Returns true if this was a preflight request (and response was sent).
 */
export function handleCorsPreflightIfNeeded(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  return null;
}

// =============================================================================
// Correlation ID
// =============================================================================

/**
 * Per-request context passed into handlers wrapped with `withCorrelationId`.
 * Today this just carries the correlation id; new fields can be added without
 * breaking existing handlers (the second arg is optional in the wrapper type).
 */
export interface RequestContext {
  /** Stable identifier for this request, suitable for cross-log correlation. */
  correlationId: string;
}

/**
 * Header read on inbound requests to reuse an upstream-supplied id.
 * Emitted on every outbound response so callers can correlate logs.
 */
const CORRELATION_HEADER = "X-Correlation-Id";
const REQUEST_ID_HEADER = "X-Request-Id";

/**
 * Wraps a `Deno.serve` handler so every request gets a correlation id,
 * every response carries an `X-Correlation-Id` header, and every JSON
 * error body is augmented with a `correlation_id` field for in-app
 * support flows.
 *
 * Behaviour:
 *   - The id is taken from an inbound `X-Correlation-Id` header (preferred,
 *     in case the platform already minted one), then `X-Request-Id`, then
 *     a fresh `crypto.randomUUID()`.
 *   - The response header is set on every response (success or error).
 *   - For error responses (status >= 400) with `Content-Type: application/json`
 *     and a JSON object body, a `correlation_id` field is injected. Success
 *     bodies are never modified — preserving wire-format compatibility for
 *     existing clients.
 *   - The id is also passed to the handler via the second argument so
 *     handlers can include it in their own structured log lines.
 *
 * @example
 * Deno.serve(withCorrelationId(async (req, ctx) => {
 *   console.log(JSON.stringify({ correlation_id: ctx.correlationId, ... }));
 *   return createJsonResponse({ ok: true });
 * }));
 */
export function withCorrelationId(
  handler: (req: Request, ctx: RequestContext) => Promise<Response>,
): (req: Request) => Promise<Response> {
  return async (req: Request): Promise<Response> => {
    const correlationId =
      req.headers.get(CORRELATION_HEADER) ??
      req.headers.get(REQUEST_ID_HEADER) ??
      crypto.randomUUID();

    const ctx: RequestContext = { correlationId };

    let response: Response;
    try {
      response = await handler(req, ctx);
    } catch (err) {
      // The handler threw without producing a Response. Convert to a
      // generic error response so the correlation id still reaches the
      // client. createErrorResponse handles MissingSecretError specially.
      console.error(
        JSON.stringify({
          level: "error",
          code: "UNCAUGHT_HANDLER_ERROR",
          correlation_id: correlationId,
          message: err instanceof Error ? err.name : "unknown",
        }),
      );
      response = createErrorResponse(err instanceof Error ? err : String(err), 500);
    }

    return decorateResponseWithCorrelationId(response, correlationId);
  };
}

/**
 * Adds the correlation header to a response and, for JSON error
 * responses, injects a `correlation_id` field into the body. Returns
 * a new Response — does not mutate the original (Response headers
 * are immutable once a Response is constructed in some runtimes).
 */
async function decorateResponseWithCorrelationId(
  response: Response,
  correlationId: string,
): Promise<Response> {
  const headers = new Headers(response.headers);
  headers.set(CORRELATION_HEADER, correlationId);

  const isJson = (headers.get("Content-Type") ?? "").includes("application/json");
  const isError = response.status >= 400;

  if (!isJson || !isError) {
    // Re-emit the response with the new header. We must clone the body
    // because Response bodies are single-use streams.
    const body = await response.arrayBuffer();
    return new Response(body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }

  // Error JSON body — try to inject correlation_id without breaking
  // ill-formed payloads. If parsing fails (non-object body), pass the
  // body through unchanged.
  const text = await response.text();
  let injected = text;
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      injected = JSON.stringify({ ...parsed, correlation_id: correlationId });
    }
  } catch {
    // Leave body as-is when it isn't a JSON object.
  }

  return new Response(injected, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
