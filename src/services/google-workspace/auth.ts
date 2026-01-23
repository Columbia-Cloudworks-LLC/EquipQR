import { supabase } from '@/integrations/supabase/client';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const DEFAULT_SCOPES = [
  'https://www.googleapis.com/auth/admin.directory.user.readonly'
].join(' ');

export interface GoogleWorkspaceAuthConfig {
  /** Organization ID - optional for first-time setup, required for reconnecting existing orgs */
  organizationId?: string;
  redirectUrl?: string;
  scopes?: string;
  originUrl?: string;
}

interface OAuthState {
  sessionToken: string;
  nonce: string;
  timestamp: number;
}

function encodeState(state: OAuthState): string {
  return btoa(JSON.stringify(state));
}

export async function generateGoogleWorkspaceAuthUrl(
  config: GoogleWorkspaceAuthConfig
): Promise<string> {
  const clientId = import.meta.env.VITE_GOOGLE_WORKSPACE_CLIENT_ID;
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const explicitBaseUrl = import.meta.env.VITE_GW_OAUTH_REDIRECT_BASE_URL;
  const oauthRedirectBaseUrl = explicitBaseUrl || supabaseUrl;

  if (!clientId) {
    throw new Error('Google Workspace integration is not configured. Missing VITE_GOOGLE_WORKSPACE_CLIENT_ID.');
  }

  if (!supabaseUrl) {
    throw new Error('Supabase URL is not configured. Missing VITE_SUPABASE_URL.');
  }

  try {
    new URL(oauthRedirectBaseUrl);
  } catch {
    throw new Error(`Invalid OAuth redirect base URL: "${oauthRedirectBaseUrl}"`);
  }

  const originUrl = config.originUrl ?? (typeof window !== 'undefined' ? window.location.origin : null);

  if (!originUrl) {
    throw new Error(
      'originUrl is required when generating the Google Workspace auth URL in a non-browser context. ' +
      'Provide originUrl in the config parameter when calling from Edge Functions or server-side code.'
    );
  }

  const { data: sessionData, error: sessionError } = await supabase.rpc(
    'create_google_workspace_oauth_session',
    {
      p_organization_id: config.organizationId || null,
      p_redirect_url: config.redirectUrl || null,
      p_origin_url: originUrl,
    }
  );

  if (sessionError) {
    throw new Error(
      `Failed to create OAuth session: ${sessionError.message}. ` +
      'Make sure you are authenticated.'
    );
  }

  if (!sessionData || sessionData.length === 0 || !sessionData[0]?.session_token) {
    throw new Error('Failed to create OAuth session: No session token returned');
  }

  const sessionToken = sessionData[0].session_token;
  const nonce = sessionData[0].nonce;

  if (!nonce) {
    throw new Error('Failed to create OAuth session: No nonce returned');
  }

  const redirectBaseUrl = oauthRedirectBaseUrl.trim().replace(/\/+$/, '');
  const redirectUri = `${redirectBaseUrl}/functions/v1/google-workspace-oauth-callback`;

  const state: OAuthState = {
    sessionToken,
    nonce,
    timestamp: Date.now(),
  };

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: config.scopes || DEFAULT_SCOPES,
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    state: encodeState(state),
  });

  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

export function isGoogleWorkspaceConfigured(): boolean {
  const clientId = import.meta.env.VITE_GOOGLE_WORKSPACE_CLIENT_ID;
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  return Boolean(clientId && supabaseUrl);
}

