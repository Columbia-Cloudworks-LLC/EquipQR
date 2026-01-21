/**
 * Error Message Allowlist Configuration
 * 
 * This file contains the allowlist of safe error message patterns that can be
 * exposed to clients. Only messages matching these patterns are considered safe
 * for client exposure, preventing information disclosure (CWE-209).
 * 
 * MAINTENANCE NOTE: When adding new user-facing error messages to Edge Functions:
 * 1. Add a matching pattern to SAFE_ERROR_PATTERNS
 * 2. Ensure the pattern is specific enough to not accidentally match debug info
 * 3. Prefer explicit full-message patterns over broad prefixes when possible
 * 4. Test by calling createErrorResponse with your new message and verifying
 *    it's not replaced with the generic error
 * 
 * To validate error messages during development, check the console for
 * "[createErrorResponse] Unsafe error message blocked:" warnings.
 * 
 * SECURITY MAINTENANCE: If you modify SAFE_ERROR_PATTERNS, also update the
 * MAINTENANCE NOTE in createErrorResponse's docstring so documentation stays
 * in sync with this implementation.
 */

/**
 * Allowed field names for validation error messages.
 * This list prevents matching sensitive fields like "password" or "api_key"
 * in error messages while allowing common validation fields.
 */
export const ALLOWED_VALIDATION_FIELDS = [
  'organizationId',
  'equipmentId',
  'workOrderId',
  'userId',
  'quantity',
  'name',
  'email',
  'title',
  'description',
  'status',
] as const;

/**
 * Allowlist of safe error message prefixes/patterns.
 * Only messages matching these patterns are considered safe for client exposure.
 * This allowlist approach prevents information disclosure (CWE-209) by ensuring
 * only known-safe messages reach clients.
 */
export const SAFE_ERROR_PATTERNS: RegExp[] = [
  // Authentication/Authorization errors
  /^No authorization header provided$/,
  /^Invalid authorization header format$/,
  /^Empty token$/,
  /^Invalid or expired token$/,
  /^User email not available$/,
  /^Only organization (owners|admins|administrators) can /,
  /^Forbidden: /,
  /^Forbidden$/,
  /^You are not a member of /,
  /^Google Workspace is not connected/,
  
  // Common short HTTP-style error messages (added to allowlist instead of length check)
  /^Not found$/,
  /^Bad request$/,
  /^Unauthorized$/,
  /^Conflict$/,
  /^Gone$/,
  
  // Validation errors
  /^Method not allowed$/,
  /^Missing required field/,
  /^(Quantity|organizationId|scanned_value|input) (is|are) required$/,
  // Explicit field name allowlist to prevent matching sensitive fields like "password" or "api_key"
  // Construct regex dynamically from ALLOWED_VALIDATION_FIELDS to avoid duplication
  new RegExp(`^(${ALLOWED_VALIDATION_FIELDS.join('|')}) and (${ALLOWED_VALIDATION_FIELDS.join('|')}) are required$`),
  /^Unsupported format/,
  /^Rate limit exceeded/,
  /^Invitation not found$/,
  
  // OAuth configuration errors
  /^Invalid OAuth redirect (base URL )?configuration$/,
  
  // Safe operational messages
  /^Failed to (verify|fetch|store|decrypt|send)/,
  /^An unexpected error occurred$/,
  /^An internal error occurred$/,
  /^Internal server error$/,
  
  // Stripe-related safe messages
  /^Stripe price .+ not found/,
  
  // Google Workspace configuration errors
  /^Google Workspace encryption is not properly configured/,
  /^Failed to decrypt stored credentials\. The stored token may be corrupted/,
];

/**
 * Validates that a commonly used error message is covered by the allowlist.
 * Use this in tests to ensure new error messages are properly allowlisted.
 * 
 * @param errorMessage - The error message to validate
 * @returns true if the message matches an allowlisted pattern, false otherwise
 */
export function isErrorAllowlisted(errorMessage: string): boolean {
  return SAFE_ERROR_PATTERNS.some((pattern) => pattern.test(errorMessage));
}
