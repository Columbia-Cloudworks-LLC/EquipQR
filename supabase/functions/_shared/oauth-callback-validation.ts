import { isAllowedOrigin } from "./origin-validation.ts";
import { resolvePublicSiteUrl } from "./public-site-url.ts";
import { createRedactedLogStep } from "./redacted-logger.ts";

type LogStep = (step: string, details?: Record<string, unknown>) => void;

/**
 * Creates the step logger used by OAuth callback functions. In addition to the
 * token redaction done by createRedactedLogStep, the OAuth state nonce is never
 * logged.
 */
export function createOAuthCallbackLogStep(tag: string): LogStep {
  const redactedLogStep = createRedactedLogStep(tag);
  return (step, details) => {
    const safeDetails = details ? { ...details } : undefined;
    if (safeDetails) {
      delete safeDetails.nonce;
    }
    redactedLogStep(step, safeDetails);
  };
}

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
 * Validates a post-OAuth redirect URL against exact configured app origins.
 * Relative paths are allowed; loopback redirects are only valid when the
 * public site URL is local/dev; cloud preview and PR deployments are accepted
 * via isAllowedOrigin.
 */
export function isValidOAuthRedirectUrl(
  redirectUrl: string | null,
  productionUrl: string,
  logStep: LogStep,
): boolean {
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

    // Cloud preview and PR deployments store window.location.origin even when
    // PUBLIC_SITE_URL points at production (shared Supabase project post-#1033).
    if (isAllowedOrigin(url.origin)) {
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
