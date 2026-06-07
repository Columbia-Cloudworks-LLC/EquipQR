import { isTrustedDomain, isValidRedirectUrl } from "./gw-oauth-validation.ts";

export function resolveProductionUrl(productionUrl: string | undefined): string {
  return productionUrl || "https://equipqr.app";
}

export function resolveFallbackProductionUrl(): string {
  const rawProductionUrl = Deno.env.get("PRODUCTION_URL") || "https://equipqr.app";
  // Validate PRODUCTION_URL to prevent open redirect attacks
  return isTrustedDomain(rawProductionUrl)
    ? rawProductionUrl
    : "https://equipqr.app";
}

export function buildGoogleOAuthErrorRedirectUrl(
  fallbackProductionUrl: string,
  errorCode: string,
  userMessage: string,
): string {
  return `${fallbackProductionUrl}/dashboard/onboarding/workspace?gw_error=${encodeURIComponent(
    errorCode,
  )}&gw_error_description=${encodeURIComponent(userMessage)}`;
}

export function buildGoogleAccessDeniedRedirectUrl(
  resolvedProductionUrl: string,
  error: string,
  userFriendlyError: string,
): string {
  return `${resolvedProductionUrl}/dashboard/onboarding/workspace?gw_error=${encodeURIComponent(error)}&gw_error_description=${encodeURIComponent(userFriendlyError)}`;
}

export function buildSuccessRedirectUrl(
  params: {
    originUrl: string | null;
    redirectUrl: string | null;
    resolvedProductionUrl: string;
  },
): string {
  const isOriginValid = !!params.originUrl && isValidRedirectUrl(params.originUrl, params.resolvedProductionUrl);
  const finalBaseUrl = (isOriginValid && params.originUrl ? params.originUrl : params.resolvedProductionUrl).replace(/\/+$/, "");
  const defaultRedirectPath = "/dashboard/onboarding/workspace";

  let successUrl: string;
  if (params.redirectUrl) {
    if (!isValidRedirectUrl(params.redirectUrl, params.resolvedProductionUrl)) {
      successUrl = `${finalBaseUrl}${defaultRedirectPath}?gw_connected=true`;
    } else {
      const isAbsolute = /^https?:\/\//i.test(params.redirectUrl);
      const baseSuccessUrl = isAbsolute ? params.redirectUrl : `${finalBaseUrl}${params.redirectUrl}`;
      const separator = baseSuccessUrl.includes("?") ? "&" : "?";
      successUrl = `${baseSuccessUrl}${separator}gw_connected=true`;
    }
  } else {
    successUrl = `${finalBaseUrl}${defaultRedirectPath}?gw_connected=true`;
  }

  return successUrl;
}

export const __gwOauthSuccessRedirectTestables = {
  resolveProductionUrl,
  resolveFallbackProductionUrl,
  buildGoogleOAuthErrorRedirectUrl,
  buildGoogleAccessDeniedRedirectUrl,
  buildSuccessRedirectUrl,
};
