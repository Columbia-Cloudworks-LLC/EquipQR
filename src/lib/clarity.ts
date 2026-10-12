/**
 * Microsoft Clarity loader. Only called after explicit telemetry consent —
 * see `ClarityTelemetry` and `telemetryConsent.ts`.
 *
 * Mirrors Clarity's official snippet (queue stub + async tag) without eval.
 */

type ClarityFn = ((...args: unknown[]) => void) & { q?: unknown[][] };

declare global {
  interface Window {
    clarity?: ClarityFn;
  }
}

export const CLARITY_SCRIPT_ID = 'equipqr-clarity-script';

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
    window.clarity?.('consent');
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
  window.clarity('consent');
}

/** Revoke consent for the running session and clear Clarity cookies. */
export function stopClarity(): void {
  if (typeof window === 'undefined') return;
  try {
    // consent(false) tells Clarity to stop tracking and erase its cookies.
    window.clarity?.('consent', false);
  } catch {
    // ignore — best-effort
  }
  clearClarityCookies();
}

function clearClarityCookies(): void {
  if (typeof document === 'undefined') return;
  const host = globalThis.location?.hostname ?? '';
  // Clarity scopes cookies to the registrable domain, so try host and parent.
  const parts = host.split('.');
  const domains = new Set<string>(['']);
  for (let i = 0; i < parts.length - 1; i += 1) {
    domains.add(`; domain=.${parts.slice(i).join('.')}`);
  }
  for (const name of CLARITY_COOKIE_NAMES) {
    for (const domain of domains) {
      try {
        document.cookie = `${name}=; path=/; max-age=0${domain}`;
      } catch {
        // ignore
      }
    }
  }
}
