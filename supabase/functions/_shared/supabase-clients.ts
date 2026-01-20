/**
 * Supabase Client Utilities for Edge Functions
 * 
 * This module provides standardized client creation patterns:
 * - User-scoped clients (RLS enforced via JWT)
 * - Admin clients (service role, bypasses RLS - use sparingly)
 * - User extraction and validation
 */

import { createClient, SupabaseClient, User } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "./cors.ts";

// =============================================================================
// Constants
// =============================================================================

/** Maximum length for error messages before they're considered to contain debug info */
const MAX_ERROR_MESSAGE_LENGTH = 200;

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
  const parts = authHeader.split(" ");
  const scheme = parts[0];
  const credentials = parts.slice(1).join(" ");

  if (!scheme || scheme.toLowerCase() !== "bearer" || !credentials) {
    return { error: "Invalid authorization header format", status: 401 };
  }

  const token = credentials.trim();

  if (!token) {
    return { error: "Empty token", status: 401 };
  }

  const { data: { user }, error } = await supabaseClient.auth.getUser(token);

  if (error || !user) {
    return { 
      error: error?.message || "Invalid or expired token", 
      status: 401 
    };
  }

  return { user, token };
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
 * Allowlist of safe error message prefixes/patterns.
 * Only messages matching these patterns are considered safe for client exposure.
 * This allowlist approach prevents information disclosure (CWE-209) by ensuring
 * only known-safe messages reach clients.
 */
const SAFE_ERROR_PATTERNS: RegExp[] = [
  // Authentication/Authorization errors
  /^No authorization header provided$/,
  /^Invalid authorization header format$/,
  /^Empty token$/,
  /^Invalid or expired token$/,
  /^User email not available$/,
  /^Only organization (owners|admins|administrators) can /,
  /^Forbidden: /,
  /^You are not a member of /,
  /^Google Workspace is not connected/,
  
  // Validation errors
  /^Method not allowed$/,
  /^Missing required field/,
  /^(Quantity|organizationId|scanned_value|input) (is|are) required$/,
  /^\w+ and \w+ are required$/,
  /^Unsupported format/,
  /^Rate limit exceeded/,
  /^Invitation not found$/,
  
  // Safe operational messages
  /^Failed to (verify|fetch|store|decrypt|send)/,
  /^An unexpected error occurred$/,
  /^An internal error occurred$/,
  /^Internal server error$/,
  
  // Stripe-related safe messages
  /^Stripe price .+ not found/,
];

/** Default generic error message when the original is not allowlisted */
const GENERIC_ERROR_MESSAGE = "An internal error occurred";

/**
 * Checks if an error message is safe to expose to clients.
 * Uses an allowlist approach - only explicitly safe messages pass through.
 */
function isErrorMessageSafe(error: string): boolean {
  // Empty or very short messages are suspicious and may leak information.
  // Require at least 10 characters to filter out potential stack trace fragments
  // or system error codes (e.g., 'err', 'bad') that could leak debug info.
  if (!error || error.length < 10) {
    return false;
  }
  
  // Messages over MAX_ERROR_MESSAGE_LENGTH chars likely contain debug info
  if (error.length > MAX_ERROR_MESSAGE_LENGTH) {
    return false;
  }
  
  // Check against allowlist
  return SAFE_ERROR_PATTERNS.some(pattern => pattern.test(error));
}

/**
 * Create a JSON error response with CORS headers.
 * 
 * Security (CWE-209 mitigation): This function uses an allowlist approach to
 * prevent information disclosure. Only error messages matching known-safe
 * patterns are exposed to clients. All other messages are replaced with a
 * generic error and the original is logged server-side for debugging.
 * 
 * @param error - The error message (will be validated against allowlist)
 * @param status - HTTP status code (default: 500)
 */
export function createErrorResponse(
  error: string,
  status: number = 500
): Response {
  // Use allowlist approach: only known-safe messages are exposed
  // This ensures defense-in-depth against stack trace exposure
  let safeMessage: string;
  
  if (isErrorMessageSafe(error)) {
    safeMessage = error;
  } else {
    // Log the original error server-side for debugging
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
