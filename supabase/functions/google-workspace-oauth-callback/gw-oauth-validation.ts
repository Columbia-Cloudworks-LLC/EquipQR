// OAuth state validation constants
// STATE_TTL_MS: Maximum age of OAuth state parameter (15 minutes)
// MAX_CLOCK_SKEW_MS: Tolerance for clock drift between servers (2 minutes)
export const STATE_TTL_MS = 15 * 60 * 1000;
export const MAX_CLOCK_SKEW_MS = 2 * 60 * 1000;

export const logStep = (step: string, details?: Record<string, unknown>) => {
  const safeDetails = details ? { ...details } : undefined;
  if (safeDetails) {
    delete safeDetails.access_token;
    delete safeDetails.refresh_token;
    delete safeDetails.nonce;
  }
  const detailsStr = safeDetails ? ` - ${JSON.stringify(safeDetails)}` : "";
  console.log(`[GOOGLE-WORKSPACE-OAUTH-CALLBACK] ${step}${detailsStr}`);
};

/**
 * This mirrors the SQL normalize_domain() function for non-null inputs.
 * Expects a defined domain string; callers should provide a fallback if needed.
 */
export function normalizeDomain(domain: string): string {
  return domain.toLowerCase().trim();
}

/**
 * Validates that an email address is well-formed.
 *
 * Uses a regex pattern to ensure:
 * - At least one non-whitespace, non-@ character before @
 * - Exactly one @ symbol
 * - At least one non-whitespace, non-@ character after @
 * - At least one dot after @
 * - At least one character after the dot
 *
 * This prevents malformed emails like:
 * - @domain.com (missing local part)
 * - user@@domain.com (multiple @ symbols)
 * - user@ (missing domain)
 * - @domain (missing local part and TLD)
 *
 * @param email - The email address to validate
 * @returns true if the email is well-formed, false otherwise
 */
export function isValidEmail(email: string | null | undefined): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }
  // Regex pattern matching the frontend validation: /[^\s@]+@[^\s@]+\.[^\s@]+/
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}


/**
 * Checks if we're running in a production environment.
 * In production, localhost redirects should not be allowed.
 */
export function isProductionEnvironment(): boolean {
  const productionUrl = Deno.env.get("PRODUCTION_URL");
  // If PRODUCTION_URL is set and doesn't contain localhost, we're in production
  return !!productionUrl && !productionUrl.includes("localhost");
}

/**
 * Checks if this is a preview/staging environment (not production).
 * Preview environments allow additional trusted domains like Vercel preview URLs.
 */
export function isPreviewEnvironment(): boolean {
  const productionUrl = Deno.env.get("PRODUCTION_URL") || "";
  // If PRODUCTION_URL contains "preview" in the hostname, we're in preview/staging
  return productionUrl.includes("preview.");
}

export function isValidRedirectUrl(urlToValidate: string | null, productionUrl: string): boolean {
  if (!urlToValidate) return true;

  try {
    if (urlToValidate.startsWith("/") && !urlToValidate.startsWith("//")) {
      return true;
    }

    const url = new URL(urlToValidate);
    const productionDomain = new URL(productionUrl).hostname;

    // In production, only allow the production domain
    // localhost/127.0.0.1 are ONLY allowed in non-production environments
    const isProduction = isProductionEnvironment();
    const isPreview = isPreviewEnvironment();
    
    // Build list of allowed domains
    const allowedDomains = isProduction
      ? [productionDomain]
      : [productionDomain, "localhost", "127.0.0.1"];
    
    // In preview environments, also allow Vercel preview deployment URLs
    // scoped to our project slug to prevent open-redirect via arbitrary Vercel sites.
    const vercelSlug = Deno.env.get("VERCEL_PROJECT_SLUG") || "equip-qr";
    const allowedSuffixes = isPreview ? [`.vercel.app`] : [];
    const vercelPrefix = `${vercelSlug}-`;

    for (const domain of allowedDomains) {
      if (domain.startsWith(".")) {
        if (url.hostname.endsWith(domain) || url.hostname === domain.slice(1)) {
          return true;
        }
      } else if (url.hostname === domain) {
        return true;
      }
    }
    
    // Check suffix-based allowed domains, scoped to our Vercel project slug
    for (const suffix of allowedSuffixes) {
      if (url.hostname.endsWith(suffix) && url.hostname.startsWith(vercelPrefix)) {
        return true;
      }
    }

    logStep("Redirect URL validation failed", {
      redirectUrl: urlToValidate.substring(0, 100),
      hostname: url.hostname,
      productionDomain,
      isProduction,
      isPreview,
    });
    return false;
  } catch {
    logStep("Redirect URL is malformed", { redirectUrl: urlToValidate.substring(0, 100) });
    return false;
  }
}

/**
 * Validates that a URL is from a trusted domain to prevent open redirect attacks.
 * Only allows URLs from equipqr.app and its subdomains.
 *
 * @param urlString - The URL string to validate
 * @returns true if the URL is from a trusted domain, false otherwise
 */
export function isTrustedDomain(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    const hostname = url.hostname.toLowerCase();
    
    // Allow exact match for equipqr.app
    if (hostname === "equipqr.app") {
      return true;
    }
    
    // Allow subdomains of equipqr.app (e.g., preview.equipqr.app, staging.equipqr.app)
    if (hostname.endsWith(".equipqr.app")) {
      return true;
    }
    
    // In non-production, also allow localhost for development
    if (!isProductionEnvironment()) {
      if (hostname === "localhost" || hostname === "127.0.0.1") {
        return true;
      }
    }
    
    return false;
  } catch {
    // Invalid URL format
    return false;
  }
}

export const __gwOauthValidationTestables = {
  normalizeDomain,
  isValidEmail,
  isProductionEnvironment,
  isPreviewEnvironment,
  isValidRedirectUrl,
  isTrustedDomain,
  STATE_TTL_MS,
  MAX_CLOCK_SKEW_MS,
};
