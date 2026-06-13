import { isTrustedDomain, isValidRedirectUrl } from "./gw-oauth-validation.ts";
import { resolvePublicSiteUrl } from "../_shared/public-site-url.ts";

export interface GoogleWorkspaceCallbackRedirectContext {
  originUrl: string | null;
  redirectUrl: string | null;
  resolvedProductionUrl: string;
}

const DEFAULT_REDIRECT_PATH = "/dashboard/onboarding/workspace";

export function resolveProductionUrl(productionUrl?: string): string {
  return productionUrl || resolvePublicSiteUrl();
}

export function resolveFallbackProductionUrl(): string {
  const rawProductionUrl = resolvePublicSiteUrl();
  return isTrustedDomain(rawProductionUrl)
    ? rawProductionUrl
    : "https://equipqr.app";
}

function resolveCallbackTargetUrl(
  params: GoogleWorkspaceCallbackRedirectContext,
): string {
  const isOriginValid = !!params.originUrl &&
    isValidRedirectUrl(params.originUrl, params.resolvedProductionUrl);
  const finalBaseUrl = (
    isOriginValid && params.originUrl ? params.originUrl : params.resolvedProductionUrl
  ).replace(/\/+$/, "");

  if (params.redirectUrl) {
    if (!isValidRedirectUrl(params.redirectUrl, params.resolvedProductionUrl)) {
      return `${finalBaseUrl}${DEFAULT_REDIRECT_PATH}`;
    }

    const isAbsolute = /^https?:\/\//i.test(params.redirectUrl);
    return isAbsolute ? params.redirectUrl : `${finalBaseUrl}${params.redirectUrl}`;
  }

  return `${finalBaseUrl}${DEFAULT_REDIRECT_PATH}`;
}

function buildCallbackRedirectUrl(
  params: GoogleWorkspaceCallbackRedirectContext,
  queryParams: Record<string, string>,
): string {
  const targetUrl = resolveCallbackTargetUrl(params);
  const separator = targetUrl.includes("?") ? "&" : "?";
  const search = new URLSearchParams(queryParams).toString();
  return `${targetUrl}${separator}${search}`;
}

export function buildGoogleOAuthErrorRedirectUrl(
  params: GoogleWorkspaceCallbackRedirectContext & {
    errorCode: string;
    supportRef?: string | null;
  },
): string {
  const queryParams: Record<string, string> = { gw_error: params.errorCode };
  if (params.supportRef) {
    queryParams.gw_ref = params.supportRef;
  }
  return buildCallbackRedirectUrl(params, queryParams);
}

export function buildGoogleAccessDeniedRedirectUrl(
  params: GoogleWorkspaceCallbackRedirectContext,
  errorCode: string,
  supportRef?: string | null,
): string {
  return buildGoogleOAuthErrorRedirectUrl({
    ...params,
    errorCode,
    supportRef,
  });
}

export function buildSuccessRedirectUrl(
  params: GoogleWorkspaceCallbackRedirectContext,
): string {
  return buildCallbackRedirectUrl(params, { gw_connected: "true" });
}

export const __gwOauthSuccessRedirectTestables = {
  resolveProductionUrl,
  resolveFallbackProductionUrl,
  buildGoogleOAuthErrorRedirectUrl,
  buildGoogleAccessDeniedRedirectUrl,
  buildSuccessRedirectUrl,
  resolveCallbackTargetUrl,
};
