import type { OAuthStatePayload } from '@/services/oauthStateEncoding';

export type OAuthSessionRpcRow = {
  session_token: string;
  nonce: string;
};

export function assertValidOAuthRedirectBase(oauthRedirectBaseUrl: string): void {
  try {
    new URL(oauthRedirectBaseUrl);
  } catch {
    throw new Error(`Invalid OAuth redirect base URL: "${oauthRedirectBaseUrl}"`);
  }
}

export function resolveOAuthOriginUrl(
  originUrl: string | undefined,
  options?: { missingMessage?: string },
): string {
  const resolved =
    originUrl ?? (typeof window !== 'undefined' ? window.location.origin : null);

  if (!resolved) {
    throw new Error(
      options?.missingMessage ??
        'originUrl is required when generating an OAuth URL outside the browser.',
    );
  }

  return resolved;
}

export function parseOAuthSessionRpcResult(
  sessionData: OAuthSessionRpcRow[] | null | undefined,
  sessionError: { message: string } | null,
  authErrorMessage: string,
): { sessionToken: string; nonce: string } {
  if (sessionError) {
    throw new Error(`Failed to create OAuth session: ${sessionError.message}. ${authErrorMessage}`);
  }

  if (!sessionData?.length || !sessionData[0]?.session_token) {
    throw new Error('Failed to create OAuth session: No session token returned');
  }

  const sessionToken = sessionData[0].session_token;
  const nonce = sessionData[0].nonce;

  if (!nonce) {
    throw new Error('Failed to create OAuth session: No nonce returned');
  }

  return { sessionToken, nonce };
}

export function buildOAuthCallbackRedirectUri(
  oauthRedirectBaseUrl: string,
  callbackPath: string,
): string {
  const redirectBaseUrl = oauthRedirectBaseUrl.trim().replace(/\/+$/, '');
  return `${redirectBaseUrl}${callbackPath.startsWith('/') ? callbackPath : `/${callbackPath}`}`;
}

export function createOAuthStatePayload(
  sessionToken: string,
  nonce: string,
): OAuthStatePayload {
  return { sessionToken, nonce, timestamp: Date.now() };
}
