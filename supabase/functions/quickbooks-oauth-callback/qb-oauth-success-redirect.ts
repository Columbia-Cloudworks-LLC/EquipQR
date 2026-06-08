import { isValidRedirectUrl } from "./qb-oauth-validation.ts";
import { logStep } from "./qb-oauth-validation.ts";
import { resolvePublicSiteUrl } from "../_shared/public-site-url.ts";

export function resolveProductionUrl(): string {
  return resolvePublicSiteUrl();
}

export function buildAccessDeniedRedirectUrl(
  productionUrl: string,
  error: string,
  userFriendlyError: string,
): string {
  return `${productionUrl}/dashboard/organization?qb_error=${encodeURIComponent(error)}&qb_error_description=${encodeURIComponent(userFriendlyError)}`;
}

export function buildOAuthErrorRedirectUrl(
  productionUrl: string,
  userMessage: string,
): string {
  return `${productionUrl}/dashboard/organization?qb_error=oauth_failed&qb_error_description=${encodeURIComponent(userMessage)}`;
}

export function buildSuccessRedirectUrl(params: {
  productionUrl: string;
  originUrl: string | null;
  redirectUrl: string | null;
  realmId: string;
}): string {
  const isOriginValidRedirect = !!params.originUrl &&
    isValidRedirectUrl(params.originUrl, params.productionUrl);

  if (params.originUrl && !isOriginValidRedirect) {
    logStep("Invalid origin URL rejected, using production URL", {
      originUrl: params.originUrl.substring(0, 100),
    });
  }

  const finalBaseUrl = (isOriginValidRedirect ? params.originUrl! : params.productionUrl)
    .replace(/\/+$/, "");

  const defaultRedirectPath = "/dashboard/organization";
  const connectedParams = `qb_connected=true&realm_id=${params.realmId}`;

  if (params.redirectUrl) {
    if (!isValidRedirectUrl(params.redirectUrl, params.productionUrl)) {
      logStep("Invalid redirect URL rejected", {
        redirectUrl: params.redirectUrl.substring(0, 100),
      });
      return `${finalBaseUrl}${defaultRedirectPath}?${connectedParams}`;
    }

    const isAbsoluteRedirectUrl = /^https?:\/\//i.test(params.redirectUrl);
    const baseSuccessUrl = isAbsoluteRedirectUrl
      ? params.redirectUrl
      : `${finalBaseUrl}${params.redirectUrl}`;
    const separator = baseSuccessUrl.includes("?") ? "&" : "?";
    return `${baseSuccessUrl}${separator}${connectedParams}`;
  }

  return `${finalBaseUrl}${defaultRedirectPath}?${connectedParams}`;
}
