/**
 * QuickBooks OAuth Authentication Utilities
 * 
 * This module provides utilities for generating QuickBooks OAuth authorization URLs
 * and managing the OAuth flow for connecting QuickBooks Online accounts.
 * 
 * @module services/quickbooks/auth
 */

// QuickBooks OAuth endpoints
const INTUIT_AUTHORIZATION_URL = "https://appcenter.intuit.com/connect/oauth2";

// Default scopes for QuickBooks accounting access
const DEFAULT_SCOPES = "com.intuit.quickbooks.accounting";

/**
 * Configuration for generating QuickBooks OAuth URL
 */
export interface QuickBooksAuthConfig {
  /** The organization ID to connect QuickBooks to */
  organizationId: string;
  /** Optional custom redirect URL after successful connection */
  redirectUrl?: string;
  /** Optional custom scopes (defaults to accounting scope) */
  scopes?: string;
  /** 
   * User ID for authorization validation in callback.
   * REQUIRED for authenticated contexts - the callback will validate that this user
   * is an admin/owner of the organization before storing credentials.
   * Without userId, the callback cannot verify authorization, creating a security risk.
   */
  userId: string;
}

/**
 * State object encoded in the OAuth state parameter
 * Used to maintain context through the OAuth flow
 */
export interface OAuthState {
  organizationId: string;
  redirectUrl?: string;
  /** Random nonce for CSRF protection */
  nonce: string;
  /** Timestamp when state was created */
  timestamp: number;
  /** User ID for authorization validation (required) */
  userId: string;
}

/**
 * Generates a random nonce for CSRF protection
 */
function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Encodes the OAuth state object to a base64 string
 */
function encodeState(state: OAuthState): string {
  return btoa(JSON.stringify(state));
}

/**
 * Generates the QuickBooks OAuth authorization URL
 * 
 * This URL should be used to redirect the user to QuickBooks for authorization.
 * After authorization, the user will be redirected back to the OAuth callback
 * edge function with an authorization code.
 * 
 * SECURITY: The userId parameter is REQUIRED. The callback validates that the user
 * is an admin/owner of the organization before storing credentials. Without userId,
 * unauthorized users could potentially connect QuickBooks to organizations they don't belong to.
 * 
 * @param config - Configuration for the OAuth flow (userId is required)
 * @returns The full authorization URL to redirect the user to
 * @throws Error if userId is not provided or if required environment variables are missing
 * 
 * @example
 * ```typescript
 * const { user } = useAuth(); // Get current user from auth context
 * const authUrl = generateQuickBooksAuthUrl({
 *   organizationId: 'org-uuid',
 *   userId: user.id, // REQUIRED for security
 *   redirectUrl: '/settings/integrations'
 * });
 * window.location.href = authUrl;
 * ```
 */
export function generateQuickBooksAuthUrl(config: QuickBooksAuthConfig): string {
  // Validate userId is provided for security
  if (!config.userId) {
    throw new Error(
      "userId is required for QuickBooks OAuth. The callback validates that the user " +
      "is an admin/owner of the organization before storing credentials. " +
      "Get the current user ID from your auth context (e.g., useAuth hook)."
    );
  }

  // Get environment variables
  const clientId = import.meta.env.VITE_INTUIT_CLIENT_ID;
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

  if (!clientId) {
    throw new Error(
      "QuickBooks integration is not configured. Missing VITE_INTUIT_CLIENT_ID environment variable."
    );
  }

  if (!supabaseUrl) {
    throw new Error(
      "Supabase URL is not configured. Missing VITE_SUPABASE_URL environment variable."
    );
  }

  // Construct the redirect URI (edge function URL)
  const redirectUri = `${supabaseUrl}/functions/v1/quickbooks-oauth-callback`;

  // Create state object for CSRF protection and context preservation
  const state: OAuthState = {
    organizationId: config.organizationId,
    redirectUrl: config.redirectUrl,
    nonce: generateNonce(),
    timestamp: Date.now(),
    userId: config.userId, // Required for authorization validation
  };

  // Build the authorization URL
  // Note: Intuit automatically returns refresh tokens when accounting scope is requested
  // No need for access_type parameter (not part of Intuit's OAuth 2.0 spec)
  const params = new URLSearchParams({
    client_id: clientId,
    scope: config.scopes || DEFAULT_SCOPES,
    redirect_uri: redirectUri,
    response_type: "code",
    state: encodeState(state),
  });

  return `${INTUIT_AUTHORIZATION_URL}?${params.toString()}`;
}

/**
 * Validates and decodes the OAuth state parameter
 * 
 * @param stateParam - The base64-encoded state parameter from the OAuth callback
 * @returns The decoded state object, or null if invalid
 */
export function decodeOAuthState(stateParam: string): OAuthState | null {
  try {
    const decoded = JSON.parse(atob(stateParam));
    
    // Validate required fields
    if (!decoded.organizationId || !decoded.nonce || !decoded.timestamp || !decoded.userId) {
      return null;
    }

    // Check if state is not too old (1 hour max)
    const maxAge = 60 * 60 * 1000; // 1 hour in milliseconds
    if (Date.now() - decoded.timestamp > maxAge) {
      console.warn("OAuth state has expired");
      return null;
    }

    return decoded as OAuthState;
  } catch {
    console.error("Failed to decode OAuth state");
    return null;
  }
}

/**
 * Checks if QuickBooks integration is configured
 * 
 * @returns True if the necessary environment variables are set
 */
export function isQuickBooksConfigured(): boolean {
  const clientId = import.meta.env.VITE_INTUIT_CLIENT_ID;
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  return Boolean(clientId && supabaseUrl);
}

/**
 * Gets the QuickBooks disconnect URL (for UI display)
 * 
 * Note: Actual disconnection should be done through the Supabase client
 * by deleting the credentials record. This is just for display purposes.
 */
export function getQuickBooksAppCenterUrl(): string {
  return "https://appcenter.intuit.com/app/connect";
}
