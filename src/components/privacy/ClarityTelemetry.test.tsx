import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { CookieConsentBanner } from './CookieConsentBanner';
import { ClarityTelemetry } from './ClarityTelemetry';
import { CookieConsentProvider } from '@/contexts/CookieConsentContext';
import { TelemetryConsentSettings } from '@/components/settings/TelemetryConsentSettings';
import { COOKIE_CONSENT_STORAGE_KEY } from '@/lib/cookieConsent';
import { TELEMETRY_CONSENT_STORAGE_KEY } from '@/lib/telemetryConsent';
import {
  CLARITY_CONSENT_DENIED,
  CLARITY_CONSENT_GRANTED,
  CLARITY_SCRIPT_ID,
} from '@/lib/clarity';

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

function NavigateButton({ to, label = 'go' }: { to: string; label?: string }) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => {
        window.history.pushState({}, '', to);
        navigate(to);
      }}
    >
      {label}
    </button>
  );
}

function renderApp(children: React.ReactNode = null, initialPath = '/') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <CookieConsentProvider>
        {children}
        <CookieConsentBanner />
        <ClarityTelemetry />
      </CookieConsentProvider>
    </MemoryRouter>,
  );
}

function clarityScript() {
  return document.getElementById(CLARITY_SCRIPT_ID) as HTMLScriptElement | null;
}

/**
 * Simulates the relevant lifecycle of `@microsoft/clarity` (`clarity.ts`,
 * `data/metadata.ts`, `core/history.ts`, and `queue.ts`):
 * - `start()` activates collection, logs `window.location.href`, and proxies `history.pushState`
 * - `stop()` deactivates collection and switches `window.clarity` to queue mode until `start`
 * - `consentv2` with `analytics_Storage: 'denied'` (and `consent(false)`) stops and schedules
 *   `window.setTimeout(start, 1000)` to restart in cookieless mode
 * - `history.pushState` while active records/restarts on the new URL after 1000ms
 */
function attachFakeClarityRuntime() {
  let active = false;
  let trackCookies = true;
  let historyProxied = false;
  const observedUrls: string[] = [];
  const calls: unknown[][] = [];

  function proxyHistoryOnce() {
    if (historyProxied) return;
    historyProxied = true;
    const originalPushState = window.history.pushState;
    window.history.pushState = function (
      this: History,
      data: unknown,
      unused: string,
      url?: string | URL | null,
    ) {
      originalPushState.call(this, data, unused, url);
      if (active) {
        observedUrls.push(window.location.href);
        stop();
        window.setTimeout(start, 1000);
      }
    };
  }

  function installQueueDispatcher() {
    const queuedFn: NonNullable<Window['clarity']> = (...args: unknown[]) => {
      calls.push(args);
      (queuedFn.q = queuedFn.q ?? []).push(args);
      if (args[0] === 'start') {
        queuedFn.q.unshift(queuedFn.q.pop()!);
        processQueue();
      }
    };
    window.clarity = queuedFn;
  }

  function dispatch(method: unknown, ...rest: unknown[]) {
    if (method === 'start') {
      start();
      return;
    }
    if (method === 'stop') {
      stop();
      return;
    }
    if (method === 'consent') {
      const granted = rest[0] !== false;
      dispatch('consentv2', {
        ad_Storage: granted ? 'granted' : 'denied',
        analytics_Storage: granted ? 'granted' : 'denied',
      });
      return;
    }
    if (method === 'consentv2') {
      if (!active) return;
      const state = (rest[0] ?? {}) as { analytics_Storage?: string };
      if (state.analytics_Storage !== 'granted' && trackCookies) {
        trackCookies = false;
        stop();
        window.setTimeout(start, 1000);
        return;
      }
      if (state.analytics_Storage === 'granted') {
        trackCookies = true;
      }
    }
  }

  function processQueue() {
    const queue = window.clarity?.q ? [...window.clarity.q] : [];
    const liveFn: NonNullable<Window['clarity']> = (method?: unknown, ...rest: unknown[]) => {
      calls.push([method, ...rest]);
      dispatch(method, ...rest);
    };
    liveFn.v = '0.8.0';
    window.clarity = liveFn;
    while (queue.length > 0) {
      const item = queue.shift()!;
      dispatch(item[0], ...item.slice(1));
    }
  }

  function start() {
    if (active) return;
    active = true;
    observedUrls.push(window.location.href);
    proxyHistoryOnce();
    if (!window.clarity?.v) {
      processQueue();
    }
  }

  function stop() {
    if (!active) return;
    active = false;
    installQueueDispatcher();
  }

  start();

  return {
    isActive: () => active,
    isTrackingCookies: () => trackCookies,
    observedUrls,
    calls,
  };
}

function syncMockedWindowLocation(url?: string | URL | null) {
  if (url == null) return;
  const resolved = new URL(String(url), window.location.origin || 'http://localhost:3000');
  window.location.href = resolved.href;
  window.location.pathname = resolved.pathname;
  window.location.search = resolved.search;
  window.location.hash = resolved.hash;
}

const nativePushState = History.prototype.pushState;
const nativeReplaceState = History.prototype.replaceState;
History.prototype.pushState = function (
  this: History,
  data: unknown,
  unused: string,
  url?: string | URL | null,
) {
  nativePushState.call(this, data, unused, url);
  syncMockedWindowLocation(url);
};
History.prototype.replaceState = function (
  this: History,
  data: unknown,
  unused: string,
  url?: string | URL | null,
) {
  nativeReplaceState.call(this, data, unused, url);
  syncMockedWindowLocation(url);
};

describe('ClarityTelemetry consent gating', () => {
  beforeEach(() => {
    localStorage.clear();
    clarityScript()?.remove();
    delete window.clarity;
    window.history.replaceState({}, '', '/');
    vi.stubEnv('VITE_CLARITY_PROJECT_ID', 'testproj123');
    vi.stubEnv('VITE_GA_MEASUREMENT_ID', '');
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    window.history.replaceState({}, '', '/');
  });

  it('does not load Clarity before a decision and offers Accept All / Essential Only', () => {
    renderApp();

    expect(clarityScript()).toBeNull();
    expect(window.clarity).toBeUndefined();
    expect(screen.getByRole('button', { name: 'Accept All (Help Us Improve)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Essential Only' })).toBeInTheDocument();
  });

  it('Essential Only stores rejection and never loads Clarity', async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole('button', { name: 'Essential Only' }));

    expect(localStorage.getItem(TELEMETRY_CONSENT_STORAGE_KEY)).toBe('rejected');
    expect(localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY)).toBe('rejected');
    expect(screen.queryByRole('region', { name: /cookie consent/i })).not.toBeInTheDocument();
    expect(clarityScript()).toBeNull();
  });

  it('Accept All injects Clarity immediately and persists acceptance', async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole('button', { name: 'Accept All (Help Us Improve)' }));

    expect(localStorage.getItem(TELEMETRY_CONSENT_STORAGE_KEY)).toBe('accepted');
    expect(localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY)).toBe('accepted');
    expect(clarityScript()?.src).toBe('https://www.clarity.ms/tag/testproj123');
    // Consent API v2 grant is queued for the tag to pick up.
    expect(window.clarity?.q).toContainEqual(['consentv2', CLARITY_CONSENT_GRANTED]);
  });

  it('loads Clarity on mount when acceptance was stored previously', () => {
    localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, 'accepted');
    localStorage.setItem(TELEMETRY_CONSENT_STORAGE_KEY, 'accepted');
    renderApp();

    expect(clarityScript()).not.toBeNull();
    expect(screen.queryByRole('region', { name: /cookie consent/i })).not.toBeInTheDocument();
  });

  it('asks only about diagnostics when the cookie notice was already answered', async () => {
    const user = userEvent.setup();
    localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, 'accepted');
    renderApp();

    expect(screen.getByText('Help improve EquipQR')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'No Thanks' }));

    // Earlier preference Accept is preserved; only telemetry is declined.
    expect(localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY)).toBe('accepted');
    expect(localStorage.getItem(TELEMETRY_CONSENT_STORAGE_KEY)).toBe('rejected');
    expect(clarityScript()).toBeNull();
  });

  it('keeps an earlier cookie Reject when diagnostics are accepted later', async () => {
    const user = userEvent.setup();
    localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, 'rejected');
    renderApp();

    await user.click(screen.getByRole('button', { name: 'Yes, Help Us Improve' }));

    expect(localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY)).toBe('rejected');
    expect(localStorage.getItem(TELEMETRY_CONSENT_STORAGE_KEY)).toBe('accepted');
    expect(clarityScript()).not.toBeNull();
  });

  it('Settings toggle revokes consent, prevents delayed cookieless restart, and restarts on renewed acceptance', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, 'accepted');
    localStorage.setItem(TELEMETRY_CONSENT_STORAGE_KEY, 'accepted');
    renderApp(<TelemetryConsentSettings />);

    const runtime = attachFakeClarityRuntime();
    expect(runtime.isActive()).toBe(true);
    expect(runtime.observedUrls).toHaveLength(1);

    const toggle = screen.getByRole('switch', {
      name: 'Help improve EquipQR with usage analytics',
    });
    expect(toggle).toBeChecked();
    await user.click(toggle);

    expect(localStorage.getItem(TELEMETRY_CONSENT_STORAGE_KEY)).toBe('rejected');
    expect(toggle).not.toBeChecked();
    expect(runtime.calls).toContainEqual(['consentv2', CLARITY_CONSENT_DENIED]);
    expect(runtime.calls).toContainEqual(['consent', false]);
    expect(runtime.isActive()).toBe(false);

    // Advance past Clarity's 1000ms RestartDelay: collection must stay stopped.
    vi.advanceTimersByTime(2000);
    expect(runtime.isActive()).toBe(false);
    expect(runtime.observedUrls).toHaveLength(1);

    // Renewed acceptance restarts Clarity and restores cookie tracking consent.
    await user.click(toggle);
    expect(localStorage.getItem(TELEMETRY_CONSENT_STORAGE_KEY)).toBe('accepted');
    expect(toggle).toBeChecked();
    expect(runtime.isActive()).toBe(true);
    expect(runtime.isTrackingCookies()).toBe(true);
    expect(runtime.observedUrls).toHaveLength(2);
  });

  it.each([
    '/invitation/secret-invite-token-123',
    '/qr/quick-form/secret-quick-form-token-456',
    '/qr/operator-check-in/secret-checkin-token-789',
  ])('does not initialize Clarity on direct load of token-bearing route %s even when consented', async (tokenPath) => {
    const user = userEvent.setup();
    window.history.replaceState({}, '', tokenPath);
    renderApp(<NavigateButton to="/dashboard" label="to-dashboard" />, tokenPath);

    await user.click(screen.getByRole('button', { name: 'Accept All (Help Us Improve)' }));

    expect(localStorage.getItem(TELEMETRY_CONSENT_STORAGE_KEY)).toBe('accepted');
    expect(clarityScript()).toBeNull();
    expect(window.clarity).toBeUndefined();

    // Navigating away to a non-token route starts Clarity safely.
    window.history.replaceState({}, '', '/dashboard');
    await user.click(screen.getByRole('button', { name: 'to-dashboard' }));
    expect(clarityScript()).not.toBeNull();
  });

  it.each([
    '/invitation/secret-invite-token-123',
    '/qr/quick-form/secret-quick-form-token-456',
    '/qr/operator-check-in/secret-checkin-token-789',
  ])('stops Clarity before navigating into token-bearing route %s so the token URL is never observed', async (tokenPath) => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, 'accepted');
    localStorage.setItem(TELEMETRY_CONSENT_STORAGE_KEY, 'accepted');
    window.history.replaceState({}, '', '/');

    renderApp(<NavigateButton to={tokenPath} label="go-token" />);
    const runtime = attachFakeClarityRuntime();
    expect(runtime.isActive()).toBe(true);

    await user.click(screen.getByRole('button', { name: 'go-token' }));
    expect(window.location.pathname).toBe(tokenPath);
    expect(runtime.isActive()).toBe(false);

    // Even after Clarity's 1000ms SPA navigation restart delay, it stays stopped and never sees the token URL.
    vi.advanceTimersByTime(2000);
    expect(runtime.isActive()).toBe(false);
    expect(runtime.observedUrls.some((url) => url.includes(tokenPath))).toBe(false);
  });

  it('keeps the classic Accept / Reject banner and hides the toggle without a project id', () => {
    vi.stubEnv('VITE_CLARITY_PROJECT_ID', '');
    renderApp(<TelemetryConsentSettings />);

    expect(screen.getByRole('button', { name: /^accept$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^reject$/i })).toBeInTheDocument();
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
    expect(clarityScript()).toBeNull();
  });
});
