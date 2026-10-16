/**
 * Google Analytics 4 loader. Only called after explicit telemetry consent —
 * see `GoogleAnalyticsTelemetry` and `telemetryConsent.ts`.
 *
 * Basic Consent Mode v2: gtag.js is never requested before consent, and the
 * first queued command still defaults every consent type to `denied` before it
 * is updated. EquipQR runs no ads, so the ad_* types are never granted.
 *
 * Page views are sent manually with a sanitized URL (ids and tokens replaced,
 * query reduced to UTM tags) so invitation and QR form tokens never reach Google.
 */

import { clearCookiesOnParentDomains } from '@/lib/clearCookies';

type GtagFn = (...args: unknown[]) => void;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: GtagFn;
  }
}

export const GA_SCRIPT_ID = 'equipqr-ga4-script';

export const GA_CONSENT_DENIED = {
  analytics_storage: 'denied',
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
} as const;

export const GA_CONSENT_GRANTED = { ...GA_CONSENT_DENIED, analytics_storage: 'granted' } as const;

export const UTM_PARAM_NAMES = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
] as const;

/** Holds landing-page UTM tags until the first consented page view (tab-scoped). */
export const LANDING_UTM_STORAGE_KEY = 'equipqr:landing-utm';

const UUID_SEGMENT = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Long opaque segments (tokens, hashes) that are not human-readable slugs. */
const OPAQUE_SEGMENT = /^(?=.*\d)[A-Za-z0-9_-]{20,}$/;
/** Route prefixes whose next path segment is a bearer token. */
const TOKEN_ROUTE_PREFIXES = ['/invitation/', '/qr/operator-check-in/', '/qr/quick-form/'] as const;

/** GA4 measurement id from build-time env; analytics is unavailable without it. */
export function getGaMeasurementId(): string | null {
  const raw = import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined;
  const trimmed = raw?.trim();
  return trimmed ? trimmed : null;
}

/** True when a route path carries a bearer token segment that must never reach session replay. */
export function isTokenBearingPath(pathname: string): boolean {
  return TOKEN_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

/** Replace ids and tokens in a pathname so page paths are aggregate and secret-free. */
export function sanitizeAnalyticsPath(pathname: string): string {
  for (const prefix of TOKEN_ROUTE_PREFIXES) {
    if (pathname.startsWith(prefix)) {
      return `${prefix}:token`;
    }
  }
  return pathname
    .split('/')
    .map((segment) => {
      if (UUID_SEGMENT.test(segment)) return ':id';
      if (OPAQUE_SEGMENT.test(segment)) return ':token';
      return segment;
    })
    .join('/');
}

/** Only UTM tags from a query string, in a stable order. Empty string when none. */
export function pickUtmParams(search: string): string {
  const source = new URLSearchParams(search);
  const kept = new URLSearchParams();
  for (const name of UTM_PARAM_NAMES) {
    const value = source.get(name);
    if (value) kept.set(name, value);
  }
  return kept.toString();
}

function getSessionStorage(): Storage | null {
  try {
    if (typeof globalThis !== 'undefined' && 'sessionStorage' in globalThis) {
      return globalThis.sessionStorage;
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Remember UTM tags from the landing URL for this tab so a visitor who consents
 * later (or after the sign-in redirect) is still attributed to the campaign.
 * Never overwrites earlier tags with an untagged URL.
 */
export function captureLandingUtm(search: string): void {
  const utm = pickUtmParams(search);
  if (!utm) return;
  try {
    getSessionStorage()?.setItem(LANDING_UTM_STORAGE_KEY, utm);
  } catch {
    // ignore — attribution is best-effort
  }
}

/** Read and clear the stored landing UTM tags. */
export function consumeLandingUtm(): string {
  const storage = getSessionStorage();
  if (!storage) return '';
  try {
    const value = storage.getItem(LANDING_UTM_STORAGE_KEY) ?? '';
    storage.removeItem(LANDING_UTM_STORAGE_KEY);
    return pickUtmParams(value);
  } catch {
    return '';
  }
}

function gtag(...args: unknown[]): void {
  window.gtag?.(...args);
}

export function isGoogleAnalyticsLoaded(): boolean {
  return typeof document !== 'undefined' && document.getElementById(GA_SCRIPT_ID) !== null;
}

function setGaDisabled(measurementId: string, disabled: boolean): void {
  // Documented gtag opt-out flag: blocks hits for this id while true.
  Reflect.set(window, `ga-disable-${measurementId}`, disabled);
}

/** Inject gtag.js once with consent granted for analytics only. */
export function loadGoogleAnalytics(measurementId: string): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  setGaDisabled(measurementId, false);
  if (isGoogleAnalyticsLoaded()) {
    // Re-granted consent after a mid-session revoke.
    gtag('consent', 'update', GA_CONSENT_GRANTED);
    return;
  }

  window.dataLayer = window.dataLayer ?? [];
  if (!window.gtag) {
    // gtag.js expects the `arguments` object itself, not an array copy.
    window.gtag = function gtagStub() {
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer?.push(arguments);
    };
  }

  gtag('consent', 'default', GA_CONSENT_DENIED);
  gtag('consent', 'update', GA_CONSENT_GRANTED);
  gtag('js', new Date());
  gtag('config', measurementId, {
    send_page_view: false,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
  });

  const script = document.createElement('script');
  script.id = GA_SCRIPT_ID;
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  document.head.appendChild(script);
}

/**
 * Send a page view for the current route with a sanitized location. UTM tags
 * captured on the landing page ride along on the first page view only.
 */
export function trackGooglePageView(pathname: string, search: string, title: string): void {
  if (typeof window === 'undefined' || !window.gtag) return;
  // Always consume the stored copy so it rides on one page view only.
  const storedUtm = consumeLandingUtm();
  const utm = pickUtmParams(search) || storedUtm;
  const origin = globalThis.location?.origin ?? '';
  const pageLocation = `${origin}${sanitizeAnalyticsPath(pathname)}${utm ? `?${utm}` : ''}`;
  // `set` also covers enhanced-measurement events that read page_location.
  gtag('set', { page_location: pageLocation, page_title: title });
  gtag('event', 'page_view', { page_location: pageLocation, page_title: title });
}

/** Revoke consent for the running session and clear GA cookies. */
export function stopGoogleAnalytics(measurementId: string): void {
  if (typeof window === 'undefined') return;
  try {
    gtag('consent', 'update', GA_CONSENT_DENIED);
  } catch {
    // ignore — best-effort
  }
  setGaDisabled(measurementId, true);
  clearGoogleAnalyticsCookies();
}

function clearGoogleAnalyticsCookies(): void {
  if (typeof document === 'undefined') return;
  const names = document.cookie
    .split(';')
    .map((part) => part.split('=')[0]?.trim() ?? '')
    .filter((name) => name === '_ga' || name.startsWith('_ga_'));
  clearCookiesOnParentDomains(names);
}
