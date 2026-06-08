import { resolvePublicSiteUrl } from "../_shared/public-site-url.ts";

export const STATE_TTL_MS = 60 * 60 * 1000;

export const logStep = (step: string, details?: Record<string, unknown>) => {
  const safeDetails = details ? { ...details } : undefined;
  if (safeDetails) {
    delete safeDetails.access_token;
    delete safeDetails.refresh_token;
    delete safeDetails.nonce;
  }
  const detailsStr = safeDetails ? ` - ${JSON.stringify(safeDetails)}` : "";
  console.log(`[QUICKBOOKS-OAUTH-CALLBACK] ${step}${detailsStr}`);
};

function resolveHostname(urlString: string): string | null {
  try {
    return new URL(urlString).hostname;
  } catch {
    return null;
  }
}

function isLoopbackHostname(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

function isLocalDevelopmentContext(): boolean {
  const publicSiteHostname = resolveHostname(resolvePublicSiteUrl());
  return !!publicSiteHostname && isLoopbackHostname(publicSiteHostname);
}

/**
 * Validates a redirect URL against exact configured app origins.
 * Loopback redirects are only valid when the public site URL is local/dev.
 */
export function isValidRedirectUrl(redirectUrl: string | null, productionUrl: string): boolean {
  if (!redirectUrl) {
    return true;
  }

  try {
    if (redirectUrl.startsWith("/") && !redirectUrl.startsWith("//")) {
      return true;
    }

    const url = new URL(redirectUrl);
    const productionDomain = new URL(productionUrl).hostname;
    const publicSiteDomain = resolveHostname(resolvePublicSiteUrl());
    const isLoopbackRedirect = isLoopbackHostname(url.hostname);

    if (isLoopbackRedirect) {
      return isLocalDevelopmentContext();
    }

    const allowedDomains = new Set([
      productionDomain,
      publicSiteDomain,
    ].filter((domain): domain is string => !!domain));

    if (allowedDomains.has(url.hostname)) {
      return true;
    }

    logStep("Redirect URL validation failed", {
      redirectUrl: redirectUrl.substring(0, 100),
      hostname: url.hostname,
      productionDomain,
      publicSiteDomain,
    });
    return false;
  } catch {
    logStep("Redirect URL is malformed", { redirectUrl: redirectUrl.substring(0, 100) });
    return false;
  }
}
