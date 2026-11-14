export interface OAuthState {
  sessionToken: string;
  nonce: string;
  timestamp: number;
}

/**
 * Decodes the base64 JSON `state` query parameter of an OAuth callback.
 * Performs no field validation: callers enforce their own required fields.
 * Throws a generic error when the value is not valid base64 JSON.
 */
export function decodeOAuthStateParam(stateParam: string): OAuthState {
  try {
    return JSON.parse(atob(stateParam));
  } catch {
    throw new Error("Invalid state parameter");
  }
}

/**
 * Coerces the state timestamp to a number, rejecting non-numeric values.
 */
export function parseOAuthStateTimestamp(state: OAuthState): number {
  const stateTimestamp = Number(state.timestamp);
  if (isNaN(stateTimestamp)) {
    throw new Error("Invalid timestamp in state parameter");
  }
  return stateTimestamp;
}
