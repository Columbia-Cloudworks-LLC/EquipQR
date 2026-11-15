export interface OAuthStatePayload {
  sessionToken: string;
  nonce: string;
  timestamp: number;
}

export function encodeOAuthState(state: OAuthStatePayload): string {
  return btoa(JSON.stringify(state));
}
