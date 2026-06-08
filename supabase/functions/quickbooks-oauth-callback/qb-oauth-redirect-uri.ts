import { logStep } from "./qb-oauth-validation.ts";
import {
  buildOAuthCallbackRedirectUri,
  resolveOAuthRedirectBaseUrl,
} from "../_shared/oauth-redirect-base.ts";

const EXPECTED_CALLBACK_PATH = "/functions/v1/quickbooks-oauth-callback";

export { resolveOAuthRedirectBaseUrl };

export function validateOAuthRedirectBaseUrl(qbOAuthRedirectBaseUrl: string): void {
  try {
    new URL(qbOAuthRedirectBaseUrl);
  } catch {
    logStep("ERROR", { message: `Invalid OAuth redirect base URL: ${qbOAuthRedirectBaseUrl}` });
    throw new Error("Invalid OAuth redirect base URL configuration");
  }
}

export function buildOAuthRedirectUri(qbOAuthRedirectBaseUrl: string): string {
  return buildOAuthCallbackRedirectUri(qbOAuthRedirectBaseUrl, EXPECTED_CALLBACK_PATH);
}
