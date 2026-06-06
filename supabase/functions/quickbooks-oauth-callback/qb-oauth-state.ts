import { logStep, STATE_TTL_MS } from "./qb-oauth-validation.ts";

export interface OAuthState {
  sessionToken: string;
  nonce: string;
  timestamp: number;
}

export function parseOAuthState(stateParam: string | null): OAuthState {
  let state: OAuthState;
  try {
    state = stateParam ? JSON.parse(atob(stateParam)) : null;
  } catch {
    throw new Error("Invalid state parameter");
  }

  if (!state?.sessionToken) {
    throw new Error("Missing session token in state parameter");
  }

  if (!state?.nonce) {
    throw new Error("Missing nonce in state parameter");
  }

  return state;
}

export function validateOAuthStateTimestamp(state: OAuthState, nowMs = Date.now()): void {
  const stateTimestamp = Number(state.timestamp);
  if (isNaN(stateTimestamp)) {
    throw new Error("Invalid timestamp in state parameter");
  }

  if (stateTimestamp > nowMs || nowMs - stateTimestamp > STATE_TTL_MS) {
    logStep("State timestamp validation failed", {
      stateTimestamp,
      now: nowMs,
      age: nowMs - stateTimestamp,
    });
    throw new Error("OAuth state has expired. Please try connecting again.");
  }
}

export const __qbOauthStateTestables = {
  parseOAuthState,
  validateOAuthStateTimestamp,
};
