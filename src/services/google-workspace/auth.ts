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
const GOOGLE_PICKER_SCOPE = 'https://www.googleapis.com/auth/drive.readonly';
export const GOOGLE_WORKSPACE_IDENTITY_SCOPES = ['openid', 'email', 'profile'] as const;
export const GOOGLE_WORKSPACE_FEATURE_SCOPES = [
  'https://www.googleapis.com/auth/admin.directory.user.readonly',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/documents',
] as const;
export const GOOGLE_WORKSPACE_DIRECTORY_SCOPE =
  'https://www.googleapis.com/auth/admin.directory.user.readonly' as const;
export const GOOGLE_EXPORT_DESTINATION_REQUIRED_SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/documents',
] as const;
export const GOOGLE_WORKSPACE_DIRECTORY_CONSENT_SCOPES = [
  ...GOOGLE_WORKSPACE_IDENTITY_SCOPES,
  GOOGLE_WORKSPACE_DIRECTORY_SCOPE,
] as const;
export const GOOGLE_EXPORT_CONSENT_SCOPES = [
  ...GOOGLE_WORKSPACE_IDENTITY_SCOPES,
  'https://www.googleapis.com/auth/spreadsheets',
  ...GOOGLE_EXPORT_DESTINATION_REQUIRED_SCOPES,
] as const;

export type GoogleWorkspaceConsentMode = 'directory' | 'export';

function scopesForConsentMode(consentMode: GoogleWorkspaceConsentMode): string {
  if (consentMode === 'export') {
    return GOOGLE_EXPORT_CONSENT_SCOPES.join(' ');
  }

  return GOOGLE_WORKSPACE_DIRECTORY_CONSENT_SCOPES.join(' ');
}

/**
 * OAuth scopes for Google Workspace integration use incremental authorization.
 *
 * - **Directory connect** (default): identity scopes plus admin.directory.user.readonly
 *   for member import and directory sync during onboarding or first Connect.
 * - **Export consent**: Drive, Docs, and Sheets scopes requested in context when admins
 *   finish authorization or grant export permissions.
 *
 * Identity scopes (openid/email/profile) support the OAuth callback userinfo step and
 * are not shown in the Integrations health badge.
 */
const DEFAULT_CONSENT_MODE: GoogleWorkspaceConsentMode = 'directory';

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

  if (hasAllGoogleScopes(status.scopes, GOOGLE_WORKSPACE_FEATURE_SCOPES)) {
    return 'healthy';
  }

  return 'missing_permissions';
}

export function canSyncGoogleWorkspaceDirectory(
  status: { is_connected: boolean; scopes: string | null } | null | undefined,
): boolean {
  if (!status?.is_connected) {
    return false;
  }

  if (!status.scopes?.trim()) {
    return true;
  }

  return hasAllGoogleScopes(status.scopes, [GOOGLE_WORKSPACE_DIRECTORY_SCOPE]);
}

export interface GoogleWorkspaceAuthConfig {
  /** Organization ID - optional for first-time setup, required for reconnecting existing orgs */
  organizationId?: string;
  /** URL to redirect to after OAuth flow completes */
  redirectUrl?: string;
  /** OAuth scopes to request (overrides consentMode when set explicitly) */
  scopes?: string;
  /**
   * Incremental consent stage. Directory connect is the default; export requests
   * Drive/Docs/Sheets scopes in context after directory access is granted.
   */
  consentMode?: GoogleWorkspaceConsentMode;
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

  const consentMode = config.consentMode ?? DEFAULT_CONSENT_MODE;
  const scope = config.scopes ?? scopesForConsentMode(consentMode);

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope,
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

