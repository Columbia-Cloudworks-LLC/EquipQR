/**
 * Microsoft Clarity loader. Only called after explicit telemetry consent —
 * see `ClarityTelemetry` and `telemetryConsent.ts`.
 *
 * Mirrors Clarity's official snippet (queue stub + async tag) without eval.
 */

import { clearCookiesOnParentDomains } from '@/lib/clearCookies';

type ClarityFn = ((...args: unknown[]) => void) & { q?: unknown[][] };

declare global {
  interface Window {
    clarity?: ClarityFn;
  }
}

export const CLARITY_SCRIPT_ID = 'equipqr-clarity-script';

/**
 * Consent API v2 signal (required for EEA/UK/CH sessions since 2025-10-31).
 * EquipQR runs no ads, so ad storage is always denied.
 */
export const CLARITY_CONSENT_GRANTED = { ad_Storage: 'denied', analytics_Storage: 'granted' } as const;
export const CLARITY_CONSENT_DENIED = { ad_Storage: 'denied', analytics_Storage: 'denied' } as const;

/** First-party cookies Clarity sets on the app domain. */
const CLARITY_COOKIE_NAMES = ['_clck', '_clsk'] as const;

export function isClarityLoaded(): boolean {
  return typeof document !== 'undefined' && document.getElementById(CLARITY_SCRIPT_ID) !== null;
}

/** Inject the Clarity tag once. No-op when already injected. */
export function loadClarity(projectId: string): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (isClarityLoaded()) {
    // Re-granted consent after a mid-session revoke.
    window.clarity?.('consentv2', CLARITY_CONSENT_GRANTED);
    return;
  }

  if (!window.clarity) {
    const stub: ClarityFn = (...args: unknown[]) => {
      (stub.q = stub.q ?? []).push(args);
    };
    window.clarity = stub;
  }

  const script = document.createElement('script');
  script.id = CLARITY_SCRIPT_ID;
  script.async = true;
  script.src = `https://www.clarity.ms/tag/${encodeURIComponent(projectId)}`;
  document.head.appendChild(script);
  window.clarity('consentv2', CLARITY_CONSENT_GRANTED);
}

/** Revoke consent for the running session and clear Clarity cookies. */
export function stopClarity(): void {
  if (typeof window === 'undefined') return;
  try {
    window.clarity?.('consentv2', CLARITY_CONSENT_DENIED);
    // Documented erase call: clears Clarity cookies and stops tracking until
    // consent is granted again.
    window.clarity?.('consent', false);
  } catch {
    // ignore — best-effort
  }
  clearClarityCookies();
}

function clearClarityCookies(): void {
  clearCookiesOnParentDomains(CLARITY_COOKIE_NAMES);
}
