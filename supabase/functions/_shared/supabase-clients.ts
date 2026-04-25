/**
 * Supabase Client Utilities for Edge Functions
 *
 * This module provides standardized client creation patterns:
 * - User-scoped clients (RLS enforced via JWT)
 * - Admin clients (service role, bypasses RLS - use sparingly)
 * - User extraction and validation
 */

import {
  createClient,
  SupabaseClient,
  User,
} from "npm:@supabase/supabase-js@2.45.0";
import { corsHeaders, getCorsHeaders } from "./cors.ts";
import { SAFE_ERROR_PATTERNS } from "./error-message-allowlist.ts";
import { MissingSecretError, requireSecret } from "./require-secret.ts";

/**
 * Tag used in MISSING_REQUIRED_SECRET log lines emitted by helpers in
 * this module so an operator grepping the logs can locate the call site
 * without ambiguity.
 */
const SUPABASE_CLIENTS_FUNCTION_TAG = "_shared/supabase-clients";

/**
 * Options for `createErrorResponse` / `createJsonResponse`. When `req` is
 * provided the response uses origin-validated CORS headers via
 * `getCorsHeaders(req)`; otherwise it falls back to the static `corsHeaders`
 * (wildcard origin) for backward compatibility.
 */
export interface ResponseOptions {
  req?: Request;
}

function resolveCorsHeaders(opts?: ResponseOptions): Record<string, string> {
  if (opts?.req) return getCorsHeaders(opts.req);
  return corsHeaders;
}

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
  // Route through requireSecret so a missing SUPABASE_URL or
  // SUPABASE_ANON_KEY produces the standardized
  // MISSING_REQUIRED_SECRET structured log line. The thrown
  // MissingSecretError propagates to the caller, which (when wrapped
  // in withCorrelationId) returns the generic 500 with correlation_id.
  const supabaseUrl = requireSecret("SUPABASE_URL", {
    functionName: SUPABASE_CLIENTS_FUNCTION_TAG,
  });
  const supabaseAnonKey = requireSecret("SUPABASE_ANON_KEY", {
    functionName: SUPABASE_CLIENTS_FUNCTION_TAG,
  });

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
  // Route through requireSecret so a missing SUPABASE_URL or
  // SUPABASE_SERVICE_ROLE_KEY produces the standardized
  // MISSING_REQUIRED_SECRET structured log line. Critical for ops
  // visibility: the service role key powering admin/webhook/cron paths
  // missing was previously a silent generic Error.
  const supabaseUrl = requireSecret("SUPABASE_URL", {
    functionName: SUPABASE_CLIENTS_FUNCTION_TAG,
  });
  const supabaseServiceKey = requireSecret("SUPABASE_SERVICE_ROLE_KEY", {
    functionName: SUPABASE_CLIENTS_FUNCTION_TAG,
  });

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
  supabaseClient: SupabaseClient,
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
  const { data: { user }, error } = await supabaseClient.auth.getUser(
    credentials,
  );

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
  organizationId: string,
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
  organizationId: string,
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
 * 2. Add a canonical literal mapping in normalizeAllowlistedErrorMessage below
 * 3. Ensure the pattern is specific enough to not accidentally match debug info
 * 4. Prefer explicit full-message patterns over broad prefixes when possible
 * 5. Test by calling createErrorResponse with your new message and verifying
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
 * Map allowlisted error inputs to canonical static messages.
 *
 * SECURITY NOTE:
 * - This function must never return untrusted input directly.
 * - Every returned value is a string literal chosen from this table.
 * - Dynamic allowlist patterns are intentionally collapsed to canonical
 *   messages to keep response bodies free of attacker-controlled substrings.
 */
function normalizeAllowlistedErrorMessage(error: string): string {
  switch (error) {
    case "No authorization header provided":
      return "No authorization header provided";
    case "Invalid authorization header format":
      return "Invalid authorization header format";
    case "Invalid or expired token":
      return "Invalid or expired token";
    case "Authentication failed":
      return "Authentication failed";
    case "Token has expired":
      return "Token has expired";
    case "Invalid token format":
      return "Invalid token format";
    case "User session not found for provided token":
      return "User session not found for provided token";
    case "User not found for provided token":
      return "User not found for provided token";
    case "Unauthorized: Empty token":
      return "Unauthorized: Empty token";
    case "User email not available":
      return "User email not available";
    case "Forbidden":
      return "Forbidden";
    case "Google Workspace is not connected":
      return "Google Workspace is not connected";
    case "Not found":
      return "Not found";
    case "Bad request":
      return "Bad request";
    case "Unauthorized":
      return "Unauthorized";
    case "Conflict":
      return "Conflict";
    case "Gone":
      return "Gone";
    case "Method not allowed":
      return "Method not allowed";
    case "Invalid JSON body":
      return "Invalid JSON body";
    case "Invitation not found":
      return "Invitation not found";
    case "Invalid base64 content. The file data may be corrupted or incorrectly encoded.":
      return "Invalid base64 content. The file data may be corrupted or incorrectly encoded.";
    case "An unexpected error occurred":
      return "An unexpected error occurred";
    case "An internal error occurred":
      return "An internal error occurred";
    case "Internal server error":
      return "Internal server error";
    case "Invalid price selected":
      return "Invalid price selected";
    case "Google Workspace OAuth is not configured":
      return "Google Workspace OAuth is not configured";
    case "Failed to refresh Google access token":
      return "Failed to refresh Google access token";
    case "Failed to send push notification":
      return "Failed to send push notification";
    case "Failed to fetch push subscriptions":
      return "Failed to fetch push subscriptions";
    case "Missing required fields: user_id, title, body":
      return "Missing required fields: user_id, title, body";
    case "Failed to create GitHub issue":
      return "Failed to create GitHub issue";
    case "Failed to create ticket record":
      return "Failed to create ticket record";
    case "title and description are required":
      return "title and description are required";
    case "QuickBooks returned a validation error for the customer query. Please adjust your search and try again.":
      return "QuickBooks returned a validation error for the customer query. Please adjust your search and try again.";
    case "Not a user-reported issue":
      return "Not a user-reported issue";
    case "No issue in payload":
      return "No issue in payload";
    case "No matching ticket found":
      return "No matching ticket found";
    case "No comment in payload":
      return "No comment in payload";
    case "Place not found":
      return "Place not found";
    case "Invalid action. Use 'autocomplete' or 'details'.":
      return "Invalid action. Use 'autocomplete' or 'details'.";
    case "CAPTCHA verification is required":
      return "CAPTCHA verification is required";
    case "CAPTCHA verification failed":
      return "CAPTCHA verification failed";
    case "A valid email address is required":
      return "A valid email address is required";
    case "Name is required":
      return "Name is required";
    case "Invalid request type":
      return "Invalid request type";
    case "Failed to submit privacy request":
      return "Failed to submit privacy request";
    case "A similar request was already submitted recently. Please wait before submitting again":
      return "A similar request was already submitted recently. Please wait before submitting again";
    case "Invalid action":
      return "Invalid action";
    case "Invalid notice action":
      return "Invalid notice action";
    case "Invalid verification method":
      return "Invalid verification method";
    case "Request is not in a verifiable state":
      return "Request is not in a verifiable state";
    case "Request is already closed":
      return "Request is already closed";
    case "Required checklist steps are incomplete":
      return "Required checklist steps are incomplete";
    case "Denial reason is required":
      return "Denial reason is required";
    case "Extension reason is required":
      return "Extension reason is required";
    case "Request must be verified before processing":
      return "Request must be verified before processing";
    case "Request must be in processing state":
      return "Request must be in processing state";
    case "Fulfillment step summary is required":
      return "Fulfillment step summary is required";
    case "Request must be in processing state to complete":
      return "Request must be in processing state to complete";
    case "Note text is required":
      return "Note text is required";
    case "Export retry limit reached":
      return "Export retry limit reached";
    case "scanned_value is required":
      return "scanned_value is required";
    case "organizationId and input are required":
      return "organizationId and input are required";
    case "organizationId is required":
      return "organizationId is required";
    case "expected_updated_at is required":
      return "expected_updated_at is required";
    case "Missing required field: dsrRequestId":
      return "Missing required field: dsrRequestId";
    case "Fulfillment engine only handles deletion requests":
      return "Fulfillment engine only handles deletion requests";
    case "Fulfillment succeeded but completion update failed":
      return "Fulfillment succeeded but completion update failed";
    default:
      break;
  }

  if (
    /^Only organization (owners|admins|administrators) can /.test(error) ||
    /^Forbidden: /.test(error) ||
    /^You are not a member of /.test(error)
  ) {
    return "Forbidden";
  }

  if (/^Google Workspace is not connected/.test(error)) {
    return "Google Workspace is not connected";
  }

  if (/^Missing required field/.test(error)) {
    return "Missing required field";
  }

  if (
    /^(organizationId|equipmentId|workOrderId|userId|quantity|Quantity|scanned_value|input|name|email|title|description|status) (is|are) required$/
      .test(error)
  ) {
    return "Required field is missing";
  }

  if (
    /^(organizationId|equipmentId|workOrderId|userId|quantity|Quantity|scanned_value|input|name|email|title|description|status) and (organizationId|equipmentId|workOrderId|userId|quantity|Quantity|scanned_value|input|name|email|title|description|status) are required$/
      .test(error)
  ) {
    return "Required fields are missing";
  }

  if (/^Unsupported format/.test(error)) {
    return "Unsupported format";
  }

  if (/^Title must be between \d+ and \d+ characters$/.test(error)) {
    return "Title must be between allowed length limits";
  }

  if (/^Description must be between \d+ and \d+ characters$/.test(error)) {
    return "Description must be between allowed length limits";
  }

  if (
    /^Rate limit exceeded\. You can submit up to \d+ reports per hour$/.test(
      error,
    )
  ) {
    return "Rate limit exceeded. Please try again later";
  }

  if (
    /^Rate limit exceeded\. Maximum \d+ privacy requests per \d+ hours$/.test(
      error,
    )
  ) {
    return "Rate limit exceeded. Please try again later";
  }

  if (/^Rate limit exceeded/.test(error)) {
    return "Rate limit exceeded";
  }

  if (/^Invalid OAuth redirect (base URL )?configuration$/.test(error)) {
    return "Invalid OAuth redirect configuration";
  }

  if (/^File too large\./.test(error)) {
    return "File too large.";
  }

  if (/^Stripe price .+ not found/.test(error)) {
    return "Invalid price selected";
  }

  if (/^Google Workspace encryption is not properly configured/.test(error)) {
    return "Google Workspace encryption is not properly configured. Please contact your administrator.";
  }

  if (
    /^Failed to decrypt stored credentials\. The stored token may be corrupted/
      .test(error)
  ) {
    return "Failed to decrypt stored credentials. The stored token may be corrupted.";
  }

  if (
    /^Your Google Workspace connection has expired or been revoked\./.test(
      error,
    )
  ) {
    return "Your Google Workspace connection has expired or been revoked. Please reconnect Google Workspace in Organization Settings.";
  }

  if (
    /^Insufficient permissions\. Please reconnect Google Workspace/.test(error)
  ) {
    return "Insufficient permissions. Please reconnect Google Workspace to grant the required permissions.";
  }

  if (/^Failed to decrypt stored Google Workspace credentials\./.test(error)) {
    return "Failed to decrypt stored Google Workspace credentials. Please reconnect Google Workspace to generate new credentials.";
  }

  if (/^Invalid request body: /.test(error)) {
    return "Invalid request body";
  }

  if (/^Failed to fetch Google Workspace users/.test(error)) {
    return "Failed to fetch Google Workspace users";
  }

  if (/^Failed to store directory users$/.test(error)) {
    return "Failed to store directory users";
  }

  if (/^Failed to send invitation email$/.test(error)) {
    return "Failed to send invitation email";
  }

  if (/^Failed to (fetch queue|fetch case details)$/.test(error)) {
    return "Failed to fetch privacy request data";
  }

  if (/^Failed to (request export|retry export|resend notice)$/.test(error)) {
    return "Failed to manage privacy request export";
  }

  if (
    /^Failed to (verify|deny|extend|start processing|complete|manage privacy) request$/
      .test(error)
  ) {
    return "Failed to manage privacy request";
  }

  if (
    /^Failed to (record fulfillment step|extend deadline|add note)$/.test(error)
  ) {
    return "Failed to update privacy request";
  }

  if (/^Failed to execute deletion fulfillment$/.test(error)) {
    return "Failed to execute deletion fulfillment";
  }

  if (/^Failed to /.test(error)) {
    return "Operation failed";
  }

  return GENERIC_ERROR_MESSAGE;
}

/**
 * Create a JSON error response with CORS headers.
 *
 * Security (CWE-209 mitigation): only known-safe message strings (matching
 * SAFE_ERROR_PATTERNS in `error-message-allowlist.ts`) are exposed to
 * clients. All other strings are replaced with a generic error and the
 * original is logged server-side for debugging.
 *
 * **Type contract — narrowed deliberately for static-analyzer cleanliness:**
 * The `error` parameter accepts only `string | MissingSecretError`. Generic
 * `Error` objects are not accepted because:
 *   1. `Error.message` is a value developers control and may include stack
 *      trace data, internal identifiers, or query fragments. Static
 *      analyzers (CodeQL `js/stack-trace-exposure`) flag any `Error.message`
 *      → response-body data flow even when an allowlist filter sits in
 *      between, because the allowlist returns a boolean, not a derived
 *      sanitized string.
 *   2. `MissingSecretError` is special: its constructor has already emitted
 *      the structured `MISSING_REQUIRED_SECRET` log line and the secret
 *      name must never reach the client, so this function forces the
 *      generic message for it. No `error.message` extraction happens.
 *   3. For any other Error you want to surface, the caller extracts the
 *      message themselves — making the data flow explicit at the call
 *      site where the developer can decide whether the message is safe.
 *
 * **MAINTENANCE — adding new user-facing error messages**: update both
 * SAFE_ERROR_PATTERNS in `error-message-allowlist.ts` and
 * normalizeAllowlistedErrorMessage above, then verify with
 * `isErrorAllowlisted()` and `createErrorResponse()` tests. Otherwise the
 * message may be replaced with the generic constant or a broader canonical
 * message.
 *
 * @param error - A string literal (validated against allowlist) or a
 *                MissingSecretError (forces generic message).
 * @param status - HTTP status code (default: 500)
 * @param opts - Optional CORS settings (uses validated origin when req is supplied)
 */
export function createErrorResponse(
  error: string | MissingSecretError,
  status: number = 500,
  opts?: ResponseOptions,
): Response {
  // Use allowlist approach: only known-safe messages are exposed
  // This ensures defense-in-depth against stack trace exposure
  let safeMessage: string;

  if (error instanceof MissingSecretError) {
    // The MissingSecretError constructor has already emitted a structured
    // MISSING_REQUIRED_SECRET log line server-side. The client must never
    // see the secret name, so force the generic message.
    safeMessage = GENERIC_ERROR_MESSAGE;
  } else if (isErrorMessageSafe(error)) {
    // Use canonical literals only (no direct reflection of the incoming
    // string), so response JSON never contains attacker-controlled
    // substrings even for allowlisted patterns.
    safeMessage = normalizeAllowlistedErrorMessage(error);
  } else {
    // Log the original (unsafe) string server-side for debugging.
    console.error("[createErrorResponse] Unsafe error message blocked:", error);
    // Return a static generic message - no dynamic content from the error
    safeMessage = GENERIC_ERROR_MESSAGE;
  }

  // Create response with only the safe static message
  // The safeMessage is either from the allowlist or a constant string literal
  const responseBody = JSON.stringify({ error: safeMessage });

  return new Response(
    responseBody,
    {
      status,
      headers: {
        ...resolveCorsHeaders(opts),
        "Content-Type": "application/json",
      },
    },
  );
}

/**
 * Create a JSON success response with CORS headers.
 *
 * When `opts.req` is supplied the response uses origin-validated CORS
 * headers; otherwise it falls back to the static wildcard headers for
 * backward compatibility with existing callers.
 */
export function createJsonResponse<T>(
  data: T,
  status: number = 200,
  opts?: ResponseOptions,
): Response {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: {
        ...resolveCorsHeaders(opts),
        "Content-Type": "application/json",
      },
    },
  );
}

/**
 * Handle CORS preflight requests.
 * Returns a preflight response when applicable, otherwise null.
 *
 * When `opts.useValidatedOrigin` is true, the preflight response uses
 * `getCorsHeaders(req)` so the `Access-Control-Allow-Origin` header
 * reflects the validated request origin instead of `*`.
 */
export function handleCorsPreflightIfNeeded(
  req: Request,
  opts?: { useValidatedOrigin?: boolean },
): Response | null {
  if (req.method === "OPTIONS") {
    const headers = opts?.useValidatedOrigin
      ? getCorsHeaders(req)
      : corsHeaders;
    return new Response(null, { headers });
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
 * Maximum accepted length for an inbound correlation id. Anything longer
 * is treated as untrusted/oversized input and replaced with a fresh UUID
 * to prevent header-limit failures, log bloat, and response-body bloat
 * (correlation_id is reflected into JSON error bodies).
 */
const CORRELATION_ID_MAX_LENGTH = 128;

/**
 * Allowed character set for inbound correlation ids: alphanumerics plus
 * a small set of separators commonly used by tracing systems (UUIDs,
 * trace ids like `00-...-...-01`, request ids with colons/underscores).
 * Anything outside this set is rejected and replaced with a fresh UUID.
 */
const CORRELATION_ID_PATTERN = /^[A-Za-z0-9._:-]+$/;

/**
 * Returns the value if it is a non-empty, length- and character-bounded
 * inbound correlation id; otherwise returns null. Correlation ids are
 * not secrets but are reflected back to clients (header + JSON error
 * bodies) and persisted in logs, so we apply defense-in-depth to limit
 * the impact of malformed or hostile upstream values.
 */
function sanitizeInboundCorrelationId(value: string | null): string | null {
  if (value === null) return null;
  if (value.length === 0 || value.length > CORRELATION_ID_MAX_LENGTH) {
    return null;
  }
  if (!CORRELATION_ID_PATTERN.test(value)) return null;
  return value;
}

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
    // Inbound headers are untrusted: only honor a value that's bounded in
    // length and uses a safe character set. Otherwise mint a fresh UUID.
    // Precedence: X-Correlation-Id > X-Request-Id > new UUID.
    const correlationId =
      sanitizeInboundCorrelationId(req.headers.get(CORRELATION_HEADER)) ??
        sanitizeInboundCorrelationId(req.headers.get(REQUEST_ID_HEADER)) ??
        crypto.randomUUID();

    const ctx: RequestContext = { correlationId };

    let response: Response;
    try {
      response = await handler(req, ctx);
    } catch (err) {
      // The handler threw without producing a Response. Log the diagnostic
      // info server-side (including the correlation id) and return the
      // generic error message to the client. We do NOT pass the caught
      // error object to createErrorResponse — uncaught handler errors are
      // exactly the case where we don't want to leak any details, and
      // limiting createErrorResponse to (string | MissingSecretError)
      // makes that contract explicit and static-analyzer-clean.
      // MissingSecretError-specific logging has already been emitted by
      // the helper's constructor; the UNCAUGHT_HANDLER_ERROR line below
      // adds the correlation id for cross-log pivoting.
      console.error(
        JSON.stringify({
          level: "error",
          code: "UNCAUGHT_HANDLER_ERROR",
          correlation_id: correlationId,
          errorName: err instanceof Error ? err.name : "unknown",
          // err.message is intentionally NOT serialised here — the caught
          // error is unstructured and may contain stack/SQL/PII fragments.
        }),
      );
      response = createErrorResponse(GENERIC_ERROR_MESSAGE, 500);
    }

    return decorateResponseWithCorrelationId(response, correlationId);
  };
}

/**
 * Adds the correlation header to a response and, for JSON error
 * responses only, injects a `correlation_id` field into the body.
 * Returns a new Response — does not mutate the original (Response
 * headers are immutable once a Response is constructed in some
 * runtimes).
 *
 * Performance note: we only buffer the body when we actually need to
 * mutate it (JSON error case). For all other responses (success bodies,
 * non-JSON like CSV exports, redirects, empty responses) we re-emit
 * with the original `response.body` ReadableStream so large payloads
 * are not double-buffered just to add a header.
 */
async function decorateResponseWithCorrelationId(
  response: Response,
  correlationId: string,
): Promise<Response> {
  const headers = new Headers(response.headers);
  headers.set(CORRELATION_HEADER, correlationId);

  const isJson = (headers.get("Content-Type") ?? "").includes(
    "application/json",
  );
  const isError = response.status >= 400;

  if (!(isJson && isError)) {
    // No body mutation needed — pass the original ReadableStream through
    // so we don't buffer (e.g. CSV exports go through this path).
    // `response.body` is null for empty responses (e.g. 204, OPTIONS
    // preflight); `new Response(null, ...)` handles that correctly.
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }

  // JSON error body — buffer just this small payload to inject
  // correlation_id without breaking ill-formed bodies. If parsing fails
  // (non-object body), pass through unchanged.
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
