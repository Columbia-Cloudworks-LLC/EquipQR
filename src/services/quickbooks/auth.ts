/**
 * QuickBooks OAuth Authentication Utilities
 * 
 * This module provides utilities for generating QuickBooks OAuth authorization URLs
 * and managing the OAuth flow for connecting QuickBooks Online accounts.
 * 
 * @module services/quickbooks/auth
 */

import { supabase } from '@/integrations/supabase/client';

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
}

/**
 * State object encoded in the OAuth state parameter
 * Used to maintain context through the OAuth flow
 * 
 * SECURITY: Only contains session_token and nonce - actual org/user data is stored server-side
 * This prevents state tampering attacks. The nonce provides additional CSRF protection.
 */
export interface OAuthState {
  /** Server-side session token (validated in callback) */
  sessionToken: string;
  /** Random nonce for CSRF protection (validated against session) */
  nonce: string;
  /** Timestamp when state was created */
  timestamp: number;
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
 * This function creates a server-side OAuth session to prevent state tampering.
 * The session is validated in the callback to ensure the user is authorized.
 * 
 * SECURITY: Uses server-side session storage to prevent state parameter tampering.
 * The session token in the state is validated against the database in the callback.
 * 
 * @param config - Configuration for the OAuth flow
 * @returns Promise that resolves to the full authorization URL to redirect the user to
 * @throws Error if user is not authenticated, not authorized, or if required environment variables are missing
 * 
 * @example
 * ```typescript
 * const authUrl = await generateQuickBooksAuthUrl({
 *   organizationId: 'org-uuid',
 *   redirectUrl: '/settings/integrations'
 * });
 * window.location.href = authUrl;
 * ```
 */
export async function generateQuickBooksAuthUrl(config: QuickBooksAuthConfig): Promise<string> {
  // Get environment variables
  const clientId = import.meta.env.VITE_INTUIT_CLIENT_ID;
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  // OAuth redirect base URL - defaults to VITE_SUPABASE_URL but can be overridden for local dev
  // When developing locally, set this to your production Supabase URL since Edge Functions run on production
  const oauthRedirectBaseUrl = import.meta.env.VITE_QB_OAUTH_REDIRECT_BASE_URL || supabaseUrl;

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

  // Validate oauthRedirectBaseUrl exists and is a string
  if (!oauthRedirectBaseUrl || typeof oauthRedirectBaseUrl !== 'string') {
    throw new Error(
      "OAuth redirect base URL is not configured. Set VITE_QB_OAUTH_REDIRECT_BASE_URL or ensure VITE_SUPABASE_URL is set."
    );
  }

  // Validate OAuth redirect base URL format
  
  const isLocalhost = oauthRedirectBaseUrl.includes('localhost') || oauthRedirectBaseUrl.includes('127.0.0.1');
  const isSupabaseUrl = oauthRedirectBaseUrl.match(/^https:\/\/[a-z0-9-]+\.supabase\.co$/);
  
  if (isLocalhost) {
    // Allow localhost for local development with Intuit sandbox
    // Note: The redirect URI must match EXACTLY what's registered in Intuit Developer Portal
    // Edge Functions require a valid port specification (e.g., http://localhost:54321)
    // Edge Functions typically run on port 54321 when using 'supabase functions serve'
    const localhostMatch = oauthRedirectBaseUrl.match(/^http:\/\/(localhost|127\.0\.0\.1):(\d+)$/);
    
    // Validate that localhost URL has a valid port specification
    if (!localhostMatch) {
      throw new Error(
        `Invalid localhost redirect base URL: "${oauthRedirectBaseUrl}". ` +
        `Localhost URLs must include a port number (e.g., http://localhost:54321). ` +
        `Edge Functions require a port to be accessible. ` +
        `When using 'supabase functions serve', Edge Functions run on port 54321 by default.`
      );
    }
    
    const port = parseInt(localhostMatch[2], 10);
    
    // Validate port is a valid number
    if (isNaN(port) || port < 1 || port > 65535) {
      throw new Error(
        `Invalid port number in redirect base URL: "${oauthRedirectBaseUrl}". ` +
        `Port must be a number between 1 and 65535.`
      );
    }
    
    if (port === 8080) {
      // Port 8080 is where Vite dev server runs, not Edge Functions
      // Edge Functions run on 54321 by default
      console.warn(
        `[QuickBooks OAuth] Warning: Using port 8080 for redirect base URL. ` +
        `Port 8080 is where the Vite dev server (frontend) runs. ` +
        `Edge Functions typically run on port 54321 when using 'supabase functions serve'. ` +
        `Ensure the redirect URI (${oauthRedirectBaseUrl}/functions/v1/quickbooks-oauth-callback) matches EXACTLY ` +
        `what's registered in Intuit Developer Portal. If Edge Functions are running on a different port, ` +
        `make sure you have a proxy set up or update Intuit registration accordingly.`
      );
    } else if (port !== 54321) {
      console.info(
        `[QuickBooks OAuth] Using localhost port ${port} for redirect base URL. ` +
        `Ensure this matches what's registered in Intuit Developer Portal.`
      );
    }
  } else if (!isSupabaseUrl && !oauthRedirectBaseUrl.startsWith('https://')) {
    // For non-localhost, must be HTTPS
    throw new Error(
      "QuickBooks OAuth redirect base URL must be HTTPS for production environments. " +
      "For local development, use http://localhost:<port> (typically 54321 for Edge Functions)"
    );
  } else if (!isLocalhost && !isSupabaseUrl) {
    // Warn if using a custom domain in production
    console.warn(
      `[QuickBooks OAuth] Warning: VITE_QB_OAUTH_REDIRECT_BASE_URL (${oauthRedirectBaseUrl}) does not match Supabase project URL format. ` +
      `The Edge Function callback uses SUPABASE_URL (the actual Supabase project URL like https://xxx.supabase.co). ` +
      `The redirect URI must match exactly what's registered in QuickBooks app settings. ` +
      `If you're using a custom domain, ensure it's registered in both QuickBooks and matches your Edge Function's SUPABASE_URL.`
    );
  }

  // Create server-side OAuth session (validates user is admin/owner of org)
  const { data: sessionData, error: sessionError } = await supabase
    .rpc('create_quickbooks_oauth_session', {
      p_organization_id: config.organizationId,
      p_redirect_url: config.redirectUrl || null,
    });

  if (sessionError) {
    throw new Error(
      `Failed to create OAuth session: ${sessionError.message}. ` +
      "Make sure you are authenticated and have admin/owner permissions for this organization."
    );
  }

  if (!sessionData || sessionData.length === 0 || !sessionData[0]?.session_token) {
    throw new Error("Failed to create OAuth session: No session token returned");
  }

  const sessionToken = sessionData[0].session_token;
  const nonce = sessionData[0].nonce;

  if (!nonce) {
    throw new Error("Failed to create OAuth session: No nonce returned");
  }

  // Construct the redirect URI (edge function URL)
  // 
  // ARCHITECTURE NOTE: This redirect URI MUST exactly match what's registered in QuickBooks app settings.
  //
  // For local development:
  // - Edge Functions run at http://localhost:54321/functions/v1/<function-name> when using 'supabase functions serve'
  // - Set VITE_QB_OAUTH_REDIRECT_BASE_URL=http://localhost:54321
  // - Register http://localhost:54321/functions/v1/quickbooks-oauth-callback in Intuit Developer Portal
  // - The Edge Function callback uses SUPABASE_URL (which will be http://localhost:54321 in local dev)
  //
  // For production:
  // - Edge Functions run on Supabase at https://xxx.supabase.co/functions/v1/<function-name>
  // - Set VITE_QB_OAUTH_REDIRECT_BASE_URL to your production Supabase project URL (https://xxx.supabase.co)
  // - Register https://xxx.supabase.co/functions/v1/quickbooks-oauth-callback in Intuit Developer Portal
  // - The Edge Function callback uses SUPABASE_URL (the actual project URL) for token exchange
  //
  // CRITICAL: The redirect URI sent in the authorization request must match EXACTLY what's registered in QuickBooks.
  const redirectBaseUrl = oauthRedirectBaseUrl.trim().replace(/\/+$/, '');
  const redirectUri = `${redirectBaseUrl}/functions/v1/quickbooks-oauth-callback`;

  // Log the redirect URI for debugging (safe - no secrets)
  console.log('[QuickBooks OAuth] Authorize redirect_uri:', redirectUri);

  // Create minimal state object - session token and nonce (org/user validated server-side)
  const state: OAuthState = {
    sessionToken: sessionToken,
    nonce: nonce,
    timestamp: Date.now(),
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
    if (!decoded.sessionToken || !decoded.nonce || !decoded.timestamp) {
      return null;
    }

    // Check if state is not too old (1 hour max)
    const maxAge = 60 * 60 * 1000; // 1 hour in milliseconds
    if (Date.now() - decoded.timestamp > maxAge) {
      console.error("OAuth state has expired");
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
