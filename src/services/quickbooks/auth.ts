/**
 * QuickBooks OAuth Authentication Utilities
 * 
 * This module provides utilities for generating QuickBooks OAuth authorization URLs
 * and managing the OAuth flow for connecting QuickBooks Online accounts.
 * 
 * @module services/quickbooks/auth
 */

import { supabase } from '@/integrations/supabase/client';
import {
  decodeOAuthStatePayload,
  encodeOAuthState,
  type OAuthStatePayload,
} from '@/services/oauthStateEncoding';
import {
  assertValidOAuthRedirectBase,
  buildOAuthCallbackRedirectUri,
  createOAuthStatePayload,
  parseOAuthSessionRpcResult,
  resolveOAuthRedirectBaseUrl,
  resolveOAuthOriginUrl,
} from '@/services/oauthSessionHelpers';

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
  /** Optional origin URL to redirect back to (defaults to window.location.origin) */
  originUrl?: string;
}

/**
 * State object encoded in the OAuth state parameter
 * Used to maintain context through the OAuth flow
 * 
 * SECURITY: Only contains session_token and nonce - actual org/user data is stored server-side
 * This prevents state tampering attacks. The nonce provides additional CSRF protection.
 */
export type OAuthState = OAuthStatePayload;

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
  const oauthRedirectBaseUrl = resolveOAuthRedirectBaseUrl(
    import.meta.env.VITE_QB_OAUTH_REDIRECT_BASE_URL,
    supabaseUrl,
  );

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

  assertValidOAuthRedirectBase(oauthRedirectBaseUrl);

  const originUrl = resolveOAuthOriginUrl(config.originUrl);

  const { data: sessionData, error: sessionError } = await supabase
    .rpc('create_quickbooks_oauth_session', {
      p_organization_id: config.organizationId,
      p_redirect_url: config.redirectUrl || null,
      p_origin_url: originUrl,
    });

  const { sessionToken, nonce } = parseOAuthSessionRpcResult(
    sessionData,
    sessionError,
    'Make sure you are authenticated and have admin/owner permissions for this organization.',
  );

  const redirectUri = buildOAuthCallbackRedirectUri(
    oauthRedirectBaseUrl,
    '/functions/v1/quickbooks-oauth-callback',
  );

  const state: OAuthState = createOAuthStatePayload(sessionToken, nonce);

  // Build the authorization URL
  // Note: Intuit automatically returns refresh tokens when accounting scope is requested
  // No need for access_type parameter (not part of Intuit's OAuth 2.0 spec)
  const params = new URLSearchParams({
    client_id: clientId,
    scope: config.scopes || DEFAULT_SCOPES,
    redirect_uri: redirectUri,
    response_type: "code",
    state: encodeOAuthState(state),
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
  return decodeOAuthStatePayload(stateParam);
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
