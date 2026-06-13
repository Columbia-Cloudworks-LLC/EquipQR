import { supabase } from '@/integrations/supabase/client';
import {
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

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
export const GOOGLE_PICKER_SCOPE = 'https://www.googleapis.com/auth/drive.readonly';
export const GOOGLE_WORKSPACE_REQUIRED_SCOPES = [
  // Required for oauth2/v3 userinfo in the Edge callback after a fresh consent
  // (include_granted_scopes no longer backfills these once the grant is revoked).
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/admin.directory.user.readonly',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/documents',
] as const;
export const GOOGLE_EXPORT_DESTINATION_REQUIRED_SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/documents',
] as const;

/**
 * Default OAuth scopes for Google Workspace integration.
 * 
 * - admin.directory.user.readonly: Read user directory for member import
 * - spreadsheets: Create and write to Google Sheets (for work order exports)
 * - drive.file: Create/update files in Google Drive (for PDF uploads)
 * - drive.readonly: Validate and read selected Drive destination metadata
 * - documents: Create and format Google Docs (for polished work order packets)
 * 
 * **Grant permissions for existing organizations:**
 * Organizations that connected before these scopes were added will only have
 * admin.directory.user.readonly. When they try to use Sheets/Drive features,
 * the backend will return a 403 with code "insufficient_scopes". The frontend
 * should prompt them to use Grant permissions on Organization Integrations
 * to authorize the additional scopes.
 */
const DEFAULT_SCOPES = GOOGLE_WORKSPACE_REQUIRED_SCOPES.join(' ');

export function hasAllGoogleScopes(
  currentScopes: string | null | undefined,
  requiredScopes: readonly string[]
): boolean {
  if (!currentScopes) return false;

  const grantedScopes = new Set(
    currentScopes
      .split(' ')
      .map((scope) => scope.trim())
      .filter(Boolean)
  );

  return requiredScopes.every((scope) => grantedScopes.has(scope));
}

export type GoogleWorkspaceConnectionHealth = 'disconnected' | 'healthy' | 'missing_permissions';

export function evaluateGoogleWorkspaceConnectionHealth(
  status: { is_connected: boolean; scopes: string | null } | null | undefined,
): GoogleWorkspaceConnectionHealth {
  if (!status?.is_connected) {
    return 'disconnected';
  }

  if (hasAllGoogleScopes(status.scopes, GOOGLE_WORKSPACE_REQUIRED_SCOPES)) {
    return 'healthy';
  }

  return 'missing_permissions';
}

export interface GoogleWorkspaceAuthConfig {
  /** Organization ID - optional for first-time setup, required for reconnecting existing orgs */
  organizationId?: string;
  /** URL to redirect to after OAuth flow completes */
  redirectUrl?: string;
  /** OAuth scopes to request (defaults to directory + spreadsheets + drive.file) */
  scopes?: string;
  /** 
   * Origin URL of the caller. Required when calling from non-browser contexts 
   * (e.g., Edge Functions or server-side code). In browsers, defaults to window.location.origin.
   */
  originUrl?: string;
}

export type OAuthState = OAuthStatePayload;

/**
 * Generates the Google Workspace OAuth authorization URL for the current organization.
 *
 * **OAuth Redirect Base URL Resolution:**
 * The redirect URI is derived from `VITE_SUPABASE_URL` by default. A deprecated
 * `VITE_GW_OAUTH_REDIRECT_BASE_URL` override is still normalized for legacy deploys.
 *
 * @param config - Configuration options for OAuth URL generation
 * @returns A fully formed Google OAuth 2.0 authorization URL
 * @throws If required environment variables are missing or the redirect base URL is invalid
 */
export async function generateGoogleWorkspaceAuthUrl(
  config: GoogleWorkspaceAuthConfig
): Promise<string> {
  const clientId = import.meta.env.VITE_GOOGLE_WORKSPACE_CLIENT_ID;
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const oauthRedirectBaseUrl = resolveOAuthRedirectBaseUrl(
    import.meta.env.VITE_GW_OAUTH_REDIRECT_BASE_URL,
    supabaseUrl,
  );

  if (!clientId) {
    throw new Error('Google Workspace integration is not configured. Missing VITE_GOOGLE_WORKSPACE_CLIENT_ID.');
  }

  if (!supabaseUrl) {
    throw new Error('Supabase URL is not configured. Missing VITE_SUPABASE_URL.');
  }

  assertValidOAuthRedirectBase(oauthRedirectBaseUrl);

  const originUrl = resolveOAuthOriginUrl(config.originUrl, {
    missingMessage:
      'originUrl is required when generating the Google Workspace auth URL in a non-browser context. ' +
      'Provide originUrl in the config parameter when calling from Edge Functions or server-side code.',
  });

  const { data: sessionData, error: sessionError } = await supabase.rpc(
    'create_google_workspace_oauth_session',
    {
      p_organization_id: config.organizationId || null,
      p_redirect_url: config.redirectUrl || null,
      p_origin_url: originUrl,
    }
  );

  const { sessionToken, nonce } = parseOAuthSessionRpcResult(
    sessionData,
    sessionError,
    'Make sure you are authenticated.',
  );

  const redirectUri = buildOAuthCallbackRedirectUri(
    oauthRedirectBaseUrl,
    '/functions/v1/google-workspace-oauth-callback',
  );

  const state: OAuthState = createOAuthStatePayload(sessionToken, nonce);

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: config.scopes || DEFAULT_SCOPES,
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    state: encodeOAuthState(state),
  });

  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

export function isGoogleWorkspaceConfigured(): boolean {
  const clientId = import.meta.env.VITE_GOOGLE_WORKSPACE_CLIENT_ID;
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  return Boolean(clientId && supabaseUrl);
}

export interface GooglePickerConfig {
  apiKey: string;
  appId: string;
  /** Shared OAuth web client ID used by Workspace and Picker token flow. */
  clientId: string;
  scope: string;
}

function getGooglePickerConfig(): GooglePickerConfig {
  const apiKey = import.meta.env.VITE_GOOGLE_PICKER_API_KEY;
  const appId = import.meta.env.VITE_GOOGLE_PICKER_APP_ID;
  const clientId = import.meta.env.VITE_GOOGLE_WORKSPACE_CLIENT_ID;

  if (!apiKey || !appId || !clientId) {
    throw new Error(
      'Google Picker is not configured. Missing VITE_GOOGLE_PICKER_API_KEY, VITE_GOOGLE_PICKER_APP_ID, or VITE_GOOGLE_WORKSPACE_CLIENT_ID (shared OAuth client; VITE_GOOGLE_PICKER_CLIENT_ID is not used).'
    );
  }

  return {
    apiKey,
    appId,
    clientId,
    scope: GOOGLE_PICKER_SCOPE,
  };
}

function isGooglePickerConfigured(): boolean {
  return Boolean(
    import.meta.env.VITE_GOOGLE_PICKER_API_KEY &&
    import.meta.env.VITE_GOOGLE_PICKER_APP_ID &&
    import.meta.env.VITE_GOOGLE_WORKSPACE_CLIENT_ID
  );
}

