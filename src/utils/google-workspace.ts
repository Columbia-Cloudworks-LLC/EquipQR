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
 * Load consumer Google domains, optionally extending with environment configuration.
 * 
 * Known regional variants (e.g., gmail.co.uk, googlemail.de) are intentionally excluded
 * from defaults because:
 * 1. Google has largely consolidated these to gmail.com
 * 2. Historical regional variants are rare in practice
 * 3. If encountered, they can be added via CONSUMER_GOOGLE_DOMAINS environment variable
 * 
 * You can extend this list at runtime by setting a comma-separated list of
 * domains in the CONSUMER_GOOGLE_DOMAINS environment variable (e.g.,
 * "gmail.co.uk,googlemail.de"). These will be merged with the defaults.
 */
function loadConsumerGoogleDomains(): readonly string[] {
  let configuredDomains: string[] = [];

  // Allow deployments to extend the default list via environment variable.
  // This check is safe in both Node and browser environments.
  if (
    typeof process !== 'undefined' &&
    typeof process.env !== 'undefined' &&
    typeof process.env.CONSUMER_GOOGLE_DOMAINS === 'string'
  ) {
    configuredDomains = process.env.CONSUMER_GOOGLE_DOMAINS
      .split(',')
      .map((domain) => domain.toLowerCase().trim())
      .filter((domain) => domain.length > 0);
  }

  const combined = [
    ...DEFAULT_CONSUMER_GOOGLE_DOMAINS,
    ...configuredDomains,
  ];

  // Deduplicate while preserving order
  return Array.from(new Set(combined));
}

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
 */
export interface WorkspaceOnboardingState {
  email: string | null;
  domain: string | null;
  domain_status: 'unclaimed' | 'pending' | 'approved' | 'claimed' | null;
  claim_status: 'pending' | 'approved' | 'rejected' | null;
  claim_id: string | null;
  workspace_org_id: string | null;
  is_workspace_connected: boolean;
}

/**
 * Determine if a Google Workspace user needs to complete onboarding.
 * 
 * A user needs onboarding if:
 * 1. They are a Google OAuth user
 * 2. They are NOT using a consumer domain (gmail.com, googlemail.com)
 * 3. Their domain is not yet claimed OR their domain is claimed but Workspace is not connected
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
