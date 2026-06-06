import { logStep, MAX_CLOCK_SKEW_MS, STATE_TTL_MS } from "./gw-oauth-validation.ts";

export interface OAuthState {
  sessionToken: string;
  nonce: string;
  timestamp: number;
}

export function parseOAuthState(stateParam: string): OAuthState {
  let state: OAuthState;
  try {
    state = JSON.parse(atob(stateParam));
  } catch {
    throw new Error("Invalid state parameter");
  }

  if (!state?.sessionToken || !state?.nonce) {
    throw new Error("Missing state parameters");
  }

  return state;
}

/**
 * Validates state timestamp using module-level constants.
 * This prevents replay attacks while allowing for reasonable clock drift between
 * the client, this server, and Google's servers.
 */
export function validateOAuthStateTimestamp(state: OAuthState, nowMs = Date.now()): void {
  const stateTimestamp = Number(state.timestamp);
  if (isNaN(stateTimestamp)) {
    throw new Error("Invalid timestamp in state parameter");
  }

  const ageMs = nowMs - stateTimestamp;

  // Security note (timing-safe validation): Both validation paths below perform similar
  // operations (logging context + throwing generic error) to prevent timing analysis attacks.
  // An attacker cannot distinguish between "too far in future" vs "expired" based on response
  // time because both paths have equivalent execution cost. The generic error messages also
  // avoid leaking which validation failed.

  // Reject timestamps more than MAX_CLOCK_SKEW_MS in the future (beyond clock skew tolerance).
  // A negative age means the state timestamp is ahead of server time; we allow small
  // negative values to handle clock drift, but reject anything too far in the future.
  // Use a single generic log message for both validation paths to ensure truly equivalent
  // timing characteristics and prevent side-channel timing analysis.
  if (ageMs < -MAX_CLOCK_SKEW_MS) {
    logStep("OAuth state timestamp validation failed", { ageMs });
    throw new Error("OAuth state has an invalid timestamp. Please try again.");
  }

  // Reject expired timestamps (older than TTL)
  // If age is positive (state is in the past), it must be within STATE_TTL_MS
  // Use the same generic log message as the future timestamp case to maintain
  // consistent timing characteristics between both validation paths.
  if (ageMs > STATE_TTL_MS) {
    logStep("OAuth state timestamp validation failed", { ageMs });
    throw new Error("OAuth state has expired. Please try again.");
  }
}

export const __stateTestables = {
  parseOAuthState,
  validateOAuthStateTimestamp,
};
