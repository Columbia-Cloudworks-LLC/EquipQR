export interface OAuthStatePayload {
  sessionToken: string;
  nonce: string;
  timestamp: number;
}

export function encodeOAuthState(state: OAuthStatePayload): string {
  return btoa(JSON.stringify(state));
}

const OAUTH_STATE_MAX_AGE_MS = 60 * 60 * 1000;

/** Validates and decodes a base64 OAuth state parameter (session token + nonce + timestamp). */
export function decodeOAuthStatePayload(stateParam: string): OAuthStatePayload | null {
  try {
    const decoded = JSON.parse(atob(stateParam)) as Partial<OAuthStatePayload>;

    if (!decoded.sessionToken || !decoded.nonce || !decoded.timestamp) {
      return null;
    }

    if (Date.now() - decoded.timestamp > OAUTH_STATE_MAX_AGE_MS) {
      console.error('OAuth state has expired');
      return null;
    }

    return decoded as OAuthStatePayload;
  } catch {
    console.error('Failed to decode OAuth state');
    return null;
  }
}
