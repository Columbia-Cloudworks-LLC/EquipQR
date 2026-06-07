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

/**
 * Validates a redirect URL against allowed domains.
 * Only allows redirects to the same domain as the production URL, relative paths,
 * localhost, or allowed preview domains.
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

    if (url.hostname === productionDomain) {
      return true;
    }

    const allowedDomains = [
      productionDomain,
      "localhost",
      "127.0.0.1",
    ];

    for (const domain of allowedDomains) {
      if (url.hostname === domain) {
        return true;
      }
    }

    const vercelSlug = Deno.env.get("VERCEL_PROJECT_SLUG") || "equip-qr";
    if (
      url.hostname.endsWith(".vercel.app") &&
      url.hostname.startsWith(`${vercelSlug}-`)
    ) {
      return true;
    }

    logStep("Redirect URL validation failed", {
      redirectUrl: redirectUrl.substring(0, 100),
      hostname: url.hostname,
      productionDomain,
    });
    return false;
  } catch {
    logStep("Redirect URL is malformed", { redirectUrl: redirectUrl.substring(0, 100) });
    return false;
  }
}
