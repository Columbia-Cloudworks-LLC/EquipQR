/**
 * Microsoft Clarity loader. Only called after explicit telemetry consent —
 * see `ClarityTelemetry` and `telemetryConsent.ts`.
 *
 * Mirrors Clarity's official snippet (queue stub + async tag) without eval,
 * terminates collection (including Clarity's delayed cookieless restart) on
 * revocation, and prevents Clarity from observing token-bearing routes.
 */

import { clearCookiesOnParentDomains } from '@/lib/clearCookies';
import { isTokenBearingPath } from '@/lib/googleAnalytics';

type ClarityFn = ((...args: unknown[]) => void) & { q?: unknown[][]; v?: string };
type HistoryMethod = 'pushState' | 'replaceState';
type HistoryStateFn = History['pushState'];

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

let bootstrapStub: ClarityFn | null = null;
const pendingClarityTimers = new Set<ReturnType<typeof globalThis.setTimeout>>();
const guardedHistories = new WeakSet<History>();
const guardedWindows = new WeakSet<Window>();
const knownHistoryWrappers = new WeakSet<HistoryStateFn>();

function isTokenBearingUrl(url: string | URL | null | undefined): boolean {
  if (url === null || url === undefined || typeof window === 'undefined') return false;
  try {
    const resolved = new URL(String(url), window.location.href);
    return isTokenBearingPath(resolved.pathname);
  } catch {
    return isTokenBearingPath(String(url));
  }
}

/**
 * Clarity's `consentv2` (when denied) and `history` module schedule a delayed
 * `window.setTimeout(clarity.start, 1000)` after calling `clarity.stop()`.
 * Capture timers scheduled during Clarity lifecycle transitions so revocation
 * or entering a token-bearing route can cancel the delayed cookieless restart.
 */
function runWithClarityTimerCapture<T>(fn: () => T, cancelImmediately: boolean): T {
  if (typeof window === 'undefined') return fn();
  const originalDescriptor = Object.getOwnPropertyDescriptor(window, 'setTimeout');
  const originalSetTimeout = window.setTimeout.bind(window);
  const captured: ReturnType<typeof globalThis.setTimeout>[] = [];

  const intercept = (...args: Parameters<typeof globalThis.setTimeout>) => {
    const id = originalSetTimeout(...args);
    if (cancelImmediately) {
      captured.push(id);
    } else {
      pendingClarityTimers.add(id);
    }
    return id;
  };

  Object.defineProperty(window, 'setTimeout', {
    configurable: true,
    writable: true,
    value: intercept,
  });

  try {
    return fn();
  } finally {
    if (originalDescriptor) {
      Object.defineProperty(window, 'setTimeout', originalDescriptor);
    }
    for (const id of captured) {
      window.clearTimeout(id);
      pendingClarityTimers.delete(id);
    }
  }
}

function clearPendingClarityTimers(): void {
  if (typeof window === 'undefined') return;
  for (const id of pendingClarityTimers) {
    window.clearTimeout(id);
  }
  pendingClarityTimers.clear();
}

function createGuardedHistoryWrapper(targetFn: HistoryStateFn): HistoryStateFn {
  const wrapper: HistoryStateFn = function (
    this: History,
    data: unknown,
    unused: string,
    url?: string | URL | null,
  ) {
    const enteringTokenRoute = isTokenBearingUrl(url);
    if (enteringTokenRoute) {
      stopClarity();
    }
    runWithClarityTimerCapture(
      () => targetFn.call(this, data, unused, url),
      enteringTokenRoute,
    );
    if (typeof window !== 'undefined' && isTokenBearingPath(window.location.pathname)) {
      stopClarity();
    }
  };
  knownHistoryWrappers.add(wrapper);
  return wrapper;
}

function wrapHistoryMethod(historyObj: History, method: HistoryMethod): void {
  const nativeFn: HistoryStateFn = historyObj[method].bind(historyObj);
  let currentGuardedFn: HistoryStateFn = createGuardedHistoryWrapper(nativeFn);

  Object.defineProperty(historyObj, method, {
    configurable: true,
    enumerable: true,
    get(): HistoryStateFn {
      return currentGuardedFn;
    },
    set(nextFn: HistoryStateFn) {
      if (typeof nextFn !== 'function') return;
      currentGuardedFn = knownHistoryWrappers.has(nextFn)
        ? nextFn
        : createGuardedHistoryWrapper(nextFn);
    },
  });
}

function installClarityNavigationGuard(): void {
  if (typeof window === 'undefined') return;
  if (window.history && !guardedHistories.has(window.history)) {
    guardedHistories.add(window.history);
    try {
      wrapHistoryMethod(window.history, 'pushState');
      wrapHistoryMethod(window.history, 'replaceState');
    } catch {
      // ignore if History methods are non-configurable in this environment
    }
  }
  if (!guardedWindows.has(window)) {
    guardedWindows.add(window);
    window.addEventListener(
      'popstate',
      () => {
        if (isTokenBearingPath(window.location.pathname)) {
          stopClarity();
        }
      },
      { capture: true },
    );
  }
}

export function isClarityLoaded(): boolean {
  return typeof document !== 'undefined' && document.getElementById(CLARITY_SCRIPT_ID) !== null;
}

/** Inject the Clarity tag once, or restart a stopped instance. No-op on token routes. */
export function loadClarity(projectId: string): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  installClarityNavigationGuard();
  if (isTokenBearingPath(window.location.pathname)) {
    stopClarity();
    return;
  }
  if (isClarityLoaded()) {
    // Re-granted consent after a mid-session revoke or after leaving a token route.
    window.clarity?.('start');
    window.clarity?.('consentv2', CLARITY_CONSENT_GRANTED);
    return;
  }

  if (!window.clarity) {
    const stub: ClarityFn = (...args: unknown[]) => {
      (stub.q = stub.q ?? []).push(args);
    };
    bootstrapStub = stub;
    window.clarity = stub;
  }

  const script = document.createElement('script');
  script.id = CLARITY_SCRIPT_ID;
  script.async = true;
  script.src = `https://www.clarity.ms/tag/${encodeURIComponent(projectId)}`;
  document.head.appendChild(script);
  window.clarity('consentv2', CLARITY_CONSENT_GRANTED);
}

/** Revoke consent or pause collection for the running session and clear Clarity cookies. */
export function stopClarity(): void {
  if (typeof window === 'undefined') return;
  clearPendingClarityTimers();
  const isUnloadedStub = bootstrapStub !== null && window.clarity === bootstrapStub;
  runWithClarityTimerCapture(() => {
    try {
      window.clarity?.('consentv2', CLARITY_CONSENT_DENIED);
      window.clarity?.('consent', false);
      window.clarity?.('stop');
    } catch {
      // ignore — best-effort
    }
  }, true);
  if (window.clarity && Array.isArray(window.clarity.q)) {
    window.clarity.q.length = 0;
  }
  if (isUnloadedStub) {
    document.getElementById(CLARITY_SCRIPT_ID)?.remove();
    delete window.clarity;
    bootstrapStub = null;
  }
  clearClarityCookies();
}

function clearClarityCookies(): void {
  clearCookiesOnParentDomains(CLARITY_COOKIE_NAMES);
}
