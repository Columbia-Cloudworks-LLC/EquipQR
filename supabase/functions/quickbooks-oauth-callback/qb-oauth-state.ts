import {
  decodeOAuthStateParam,
  parseOAuthStateTimestamp,
  type OAuthState,
} from "../_shared/oauth-state.ts";
import { logStep, STATE_TTL_MS } from "./qb-oauth-validation.ts";

export type { OAuthState };

export function parseOAuthState(stateParam: string | null): OAuthState {
  const state = stateParam ? decodeOAuthStateParam(stateParam) : null;

  if (!state?.sessionToken) {
    throw new Error("Missing session token in state parameter");
  }

  if (!state?.nonce) {
    throw new Error("Missing nonce in state parameter");
  }

  return state;
}

export function validateOAuthStateTimestamp(state: OAuthState, nowMs = Date.now()): void {
  const stateTimestamp = parseOAuthStateTimestamp(state);

  if (stateTimestamp > nowMs || nowMs - stateTimestamp > STATE_TTL_MS) {
    logStep("State timestamp validation failed", {
      stateTimestamp,
      now: nowMs,
      age: nowMs - stateTimestamp,
    });
    throw new Error("OAuth state has expired. Please try connecting again.");
  }
}
