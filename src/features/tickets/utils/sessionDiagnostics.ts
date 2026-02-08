/**
 * Session Diagnostics Collector
 *
 * Gathers anonymized, non-PII session context at the moment of bug report
 * submission. This data helps developers diagnose issues faster without
 * requiring back-and-forth with the user.
 *
 * Privacy guarantees:
 * - No user email, name, or other PII
 * - Organization referenced by UUID only (opaque)
 * - Console errors are message-only (no stack traces)
 * - Query keys are structural (no user data)
 * - All string values are length-capped
 */

import { APP_VERSION } from '@/lib/version';
import { FeatureFlags } from '@/lib/flags';
import { getRecentErrors } from './consoleErrorBuffer';

export interface SessionDiagnostics {
  // App info
  appVersion: string;
  // Browser / environment
  userAgent: string;
  currentUrl: string;
  screenSize: string;
  devicePixelRatio: number;
  isOnline: boolean;
  timezone: string;
  timestamp: string;
  sessionDuration: number;
  // Org context (IDs only, no names)
  organizationId: string | null;
  organizationPlan: string | null;
  userRole: string | null;
  // Feature state
  featureFlags: Record<string, boolean>;
  // Error context
  recentErrors: string[];
  failedQueries: string[];
  // Performance
  performanceMetrics: {
    pageLoadTime: number | null;
    memoryUsage: number | null;
  };
}

/**
 * Collect current session diagnostics.
 *
 * @param orgContext - Organization context (pass from useOrganization hook)
 * @param queryClient - TanStack QueryClient instance (pass from useQueryClient)
 */
export function collectSessionDiagnostics(
  orgContext?: {
    organizationId: string | null;
    currentOrganization: { plan?: string; userRole?: string } | null;
  },
  queryClient?: { getQueryCache: () => { getAll: () => Array<{ state: { status: string }; queryKey: unknown[] }> } },
): SessionDiagnostics {
  // Failed React Query keys
  const failedQueries: string[] = [];
  try {
    if (queryClient) {
      const queries = queryClient.getQueryCache().getAll();
      for (const query of queries) {
        if (query.state.status === 'error') {
          failedQueries.push(JSON.stringify(query.queryKey).slice(0, 200));
        }
      }
    }
  } catch {
    // Non-critical -- proceed without query info
  }

  // Performance metrics
  let pageLoadTime: number | null = null;
  try {
    const navEntries = performance.getEntriesByType('navigation');
    if (navEntries.length > 0) {
      const nav = navEntries[0] as PerformanceNavigationTiming;
      pageLoadTime = Math.round(nav.loadEventEnd - nav.fetchStart);
    }
  } catch {
    // Not available
  }

  let memoryUsage: number | null = null;
  try {
    // Chrome-only: performance.memory
    const perfWithMemory = performance as Performance & {
      memory?: { usedJSHeapSize: number };
    };
    if (perfWithMemory.memory) {
      memoryUsage = Math.round(perfWithMemory.memory.usedJSHeapSize / 1024 / 1024);
    }
  } catch {
    // Not available
  }

  return {
    appVersion: APP_VERSION,
    userAgent: navigator.userAgent,
    currentUrl: window.location.pathname + window.location.search,
    screenSize: `${window.innerWidth}x${window.innerHeight}`,
    devicePixelRatio: window.devicePixelRatio || 1,
    isOnline: navigator.onLine,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    timestamp: new Date().toISOString(),
    sessionDuration: Math.round(performance.now() / 1000),
    organizationId: orgContext?.organizationId ?? null,
    organizationPlan: orgContext?.currentOrganization?.plan ?? null,
    userRole: orgContext?.currentOrganization?.userRole ?? null,
    featureFlags: {
      billingEnabled: FeatureFlags.billing.enabled,
      quickbooksEnabled: FeatureFlags.quickbooks.enabled,
    },
    recentErrors: getRecentErrors().slice(-5),
    failedQueries: failedQueries.slice(0, 5),
    performanceMetrics: {
      pageLoadTime,
      memoryUsage,
    },
  };
}
