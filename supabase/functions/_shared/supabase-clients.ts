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
 * Create a JSON error response with CORS headers.
 * 
 * Note: Only pass user-safe error messages. Internal details and stack traces
 * should be logged server-side but never exposed to clients.
 * 
 * Security: This function sanitizes all error messages via sanitizeErrorMessage()
 * to prevent information disclosure (CWE-209). Stack traces, file paths, and
 * overly long messages are detected and replaced with generic responses.
 */
export function createErrorResponse(
  error: string,
  status: number = 500
): Response {
  // Sanitize error message to prevent information disclosure (CWE-209)
  // This catches stack traces, file paths, and internal details
  // Always sanitize regardless of input to ensure defense-in-depth
  const sanitizedError = sanitizeErrorMessage(error);
  
  // Log the original error server-side before returning sanitized version
  // This ensures we have debug info in logs without exposing it to clients
  if (sanitizedError !== error) {
    console.error("[createErrorResponse] Original error sanitized:", error);
  }
  
  // lgtm[js/stack-trace-exposure] - sanitizeErrorMessage() prevents stack trace exposure
  return new Response(
    JSON.stringify({ error: sanitizedError }),
    {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}

/**
 * Sanitizes error messages to prevent information disclosure (CWE-209).
 * Removes stack traces, file paths, and internal implementation details.
 * 
 * This is the primary defense against stack trace exposure in error responses.
 * All error messages pass through this function before being sent to clients.
 */
function sanitizeErrorMessage(error: string): string {
  // Patterns that indicate sensitive internal information
  const sensitivePatterns = [
    // Stack trace patterns
    /at\s+\w+\s+\(/i,           // "at functionName ("
    /at\s+<anonymous>/i,         // "at <anonymous>"
    /\s+at\s+.*:\d+:\d+/i,       // " at file.ts:10:5"
    /Error:\s*\n/i,              // "Error:\n" followed by stack
    /^\s+at\s+/m,                // Lines starting with "at " (stack frames)
    // File path patterns
    /\/[a-z_-]+\/[a-z_-]+\.(ts|js|tsx|jsx)/i,  // Unix file paths
    /[A-Z]:\\[^\\]+\\/i,         // Windows file paths
    // Internal error patterns
    /node_modules/i,             // Node modules paths
    /internal\/|_internal\//i,   // Internal paths
  ];

  for (const pattern of sensitivePatterns) {
    if (pattern.test(error)) {
      console.error("[SANITIZED] Original error contained sensitive info:", error);
      return "An internal error occurred";
    }
  }

  // Truncate overly long error messages that might contain debug info
  const MAX_ERROR_LENGTH = 200;
  if (error.length > MAX_ERROR_LENGTH) {
    console.error("[TRUNCATED] Original error:", error);
    return error.substring(0, MAX_ERROR_LENGTH) + "...";
  }

  return error;
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
