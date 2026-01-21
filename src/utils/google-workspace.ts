/**
 * Google Workspace utility functions.
 * Shared logic for determining Google user status and onboarding requirements.
 */

import type { User } from '@supabase/supabase-js';

/**
 * Default consumer Google domains that don't support Workspace features.
 * Users with these domains are personal accounts, not Workspace accounts.
 */
const DEFAULT_CONSUMER_GOOGLE_DOMAINS = [
  'gmail.com',
  'googlemail.com',
] as const;

/**
 * Checks if code is running in a Node.js/server environment where process.env is available.
 * In browser contexts, process is undefined and this returns false.
 * 
 * @returns true if running in a server environment with process.env available, false otherwise
 */
function isServerEnvironment(): boolean {
  return typeof process !== 'undefined' && typeof process.env !== 'undefined';
}

/**
 * Logs a warning message. Extracted to a separate function for testability.
 * Can be mocked in test environments to verify warning behavior.
 * 
 * @param message - The warning message to log
 */
function logWarning(message: string): void {
  // eslint-disable-next-line no-console
  console.warn(message);
}

/**
 * Load consumer Google domains, optionally extending with environment configuration.
 * 
 * Known regional variants (e.g., gmail.co.uk, googlemail.de) are intentionally excluded
 * from defaults because:
 * 1. Google has largely consolidated these to gmail.com
 * 2. Historical regional variants are rare in practice
 * 3. If encountered, they can be added via CONSUMER_GOOGLE_DOMAINS environment variable
 * 
 * **Environment Variable Extension (Server-Side Only)**:
 * You can extend this list at runtime by setting a comma-separated list of
 * domains in the CONSUMER_GOOGLE_DOMAINS environment variable (e.g.,
 * "gmail.co.uk,googlemail.de"). These will be merged with the defaults.
 * 
 * **IMPORTANT - Server-Side Only**: The `process.env.CONSUMER_GOOGLE_DOMAINS` check
 * only works in Node.js/server-side environments (Edge Functions, server-side rendering).
 * In browser contexts (Vite builds), `process.env` is undefined and this environment
 * variable extension will NOT work - only the default domains will apply.
 * 
 * For browser-based customization, consider:
 * - Build-time configuration via Vite's `import.meta.env` (not `process.env`)
 * - A server endpoint that returns the domain list
 * - Updating the DEFAULT_CONSUMER_GOOGLE_DOMAINS array directly in code
 */
function loadConsumerGoogleDomains(): readonly string[] {
  let configuredDomains: string[] = [];

  // Allow deployments to extend the default list via environment variable.
  // NOTE: This only works in Node.js/server-side environments (Edge Functions, SSR).
  // In browser contexts (Vite builds), process.env is undefined and this block is skipped,
  // meaning only DEFAULT_CONSUMER_GOOGLE_DOMAINS will be used.
  if (isServerEnvironment() && process.env.CONSUMER_GOOGLE_DOMAINS) {
    // If this is executing in a browser, having a runtime environment variable here
    // indicates a build configuration issue (env should be injected at build time).
    if (typeof window !== 'undefined' && typeof window.document !== 'undefined') {
      logWarning(
        '[google-workspace] CONSUMER_GOOGLE_DOMAINS is set at runtime in a browser environment. ' +
          'This likely indicates a build configuration issue. Prefer build-time configuration ' +
          'via Vite\'s import.meta.env or a server-provided domain list instead of relying on process.env in the browser.'
      );
    }
    // Type guard ensures process.env.CONSUMER_GOOGLE_DOMAINS is a string here
    const envValue = process.env.CONSUMER_GOOGLE_DOMAINS;
    const parsed = envValue
      .split(',')
      .map((domain) => domain.toLowerCase().trim())
      .filter((domain) => domain.length > 0);

    // Keep configured domains as-is; final deduplication on the combined array is sufficient
    configuredDomains = parsed;
  }

  const combined = [
    ...DEFAULT_CONSUMER_GOOGLE_DOMAINS,
    ...configuredDomains,
  ];

  // Deduplicate while preserving order (in case defaults overlap with configured)
  return Array.from(new Set(combined));
}

/**
 * Consumer Google domains that don't support Workspace features.
 * 
 * Users with these domains are personal accounts, not Workspace accounts.
 * This list can be extended at runtime via the CONSUMER_GOOGLE_DOMAINS environment variable,
 * which should be a comma-separated list of domains (e.g., 'gmail.co.uk,googlemail.de').
 * 
 * @example
 * // In production, extend via environment variable:
 * // CONSUMER_GOOGLE_DOMAINS='gmail.co.uk,googlemail.de'
 */
export const CONSUMER_GOOGLE_DOMAINS = loadConsumerGoogleDomains();

/**
 * Check if an email domain is a consumer Google domain (not a Workspace domain).
 */
export function isConsumerGoogleDomain(domain: string | undefined | null): boolean {
  if (!domain) return false;
  const normalizedDomain = domain.toLowerCase().trim();
  return CONSUMER_GOOGLE_DOMAINS.includes(normalizedDomain);
}

/**
 * Check if a user authenticated via Google OAuth.
 */
export function isGoogleUser(user: User | null): boolean {
  if (!user) return false;
  const metadata = user.app_metadata || {};
  const provider = metadata.provider as string | undefined;
  const providers = (metadata.providers as string[]) || [];
  return provider === 'google' || providers.includes('google');
}

/**
 * Onboarding state from the get_workspace_onboarding_state RPC.
 * Simplified: domain_status is either 'unclaimed' or 'claimed'.
 */
export interface WorkspaceOnboardingState {
  email: string | null;
  domain: string | null;
  domain_status: 'unclaimed' | 'claimed' | null;
  workspace_org_id: string | null;
  is_workspace_connected: boolean;
}

/**
 * Determine if a Google Workspace user needs to complete onboarding.
 * 
 * A user needs onboarding if:
 * 1. They are a Google OAuth user
 * 2. They are NOT using a consumer domain (gmail.com, googlemail.com)
 * 3. Their domain is not claimed OR Workspace is not connected
 */
export function needsWorkspaceOnboarding(
  user: User | null,
  onboardingState: WorkspaceOnboardingState | null | undefined
): boolean {
  // Not a Google user - no workspace onboarding needed
  if (!isGoogleUser(user)) {
    return false;
  }

  // No onboarding state available
  if (!onboardingState) {
    return false;
  }

  // Consumer domain users don't need workspace onboarding
  if (isConsumerGoogleDomain(onboardingState.domain)) {
    return false;
  }

  // Check if domain is fully set up with connected workspace
  const domainFullySetUp = 
    onboardingState.domain_status === 'claimed' && 
    onboardingState.is_workspace_connected;

  // User needs onboarding if domain is NOT fully set up
  return !domainFullySetUp;
}
