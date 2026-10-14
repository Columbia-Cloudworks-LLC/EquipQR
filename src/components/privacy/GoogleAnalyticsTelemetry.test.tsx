import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { CookieConsentBanner } from './CookieConsentBanner';
import { GoogleAnalyticsTelemetry } from './GoogleAnalyticsTelemetry';
import { CookieConsentProvider } from '@/contexts/CookieConsentContext';
import { TelemetryConsentSettings } from '@/components/settings/TelemetryConsentSettings';
import { COOKIE_CONSENT_STORAGE_KEY } from '@/lib/cookieConsent';
import {
  TELEMETRY_CONSENT_SCOPE_STORAGE_KEY,
  TELEMETRY_CONSENT_STORAGE_KEY,
} from '@/lib/telemetryConsent';
import {
  GA_CONSENT_DENIED,
  GA_CONSENT_GRANTED,
  GA_SCRIPT_ID,
  LANDING_UTM_STORAGE_KEY,
} from '@/lib/googleAnalytics';

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

const MEASUREMENT_ID = 'G-TEST12345';

function NavigateButton({ to }: { to: string }) {
  const navigate = useNavigate();
  return (
    <button type="button" onClick={() => navigate(to)}>
      go
    </button>
  );
}

function renderApp(initialPath = '/', children: React.ReactNode = null) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <CookieConsentProvider>
        {children}
        <CookieConsentBanner />
        <GoogleAnalyticsTelemetry />
      </CookieConsentProvider>
    </MemoryRouter>,
  );
}

function gaScript() {
  return document.getElementById(GA_SCRIPT_ID) as HTMLScriptElement | null;
}

/** dataLayer entries are `arguments` objects; normalise them to arrays. */
function dataLayerCalls(): unknown[][] {
  return (window.dataLayer ?? []).map((entry) => Array.from(entry as ArrayLike<unknown>));
}

function pageViews(): Record<string, unknown>[] {
  return dataLayerCalls()
    .filter((call) => call[0] === 'event' && call[1] === 'page_view')
    .map((call) => call[2] as Record<string, unknown>);
}

describe('GoogleAnalyticsTelemetry consent gating', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    gaScript()?.remove();
    delete window.gtag;
    delete window.dataLayer;
    Reflect.deleteProperty(window, `ga-disable-${MEASUREMENT_ID}`);
    vi.stubEnv('VITE_GA_MEASUREMENT_ID', MEASUREMENT_ID);
    vi.stubEnv('VITE_CLARITY_PROJECT_ID', '');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('does not load gtag.js before a decision and names Google Analytics in the banner', () => {
    renderApp();

    expect(gaScript()).toBeNull();
    expect(window.gtag).toBeUndefined();
    expect(screen.getByText(/Google Analytics to see how visitors find and use EquipQR/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Accept All (Help Us Improve)' })).toBeInTheDocument();
  });

  it('Essential Only never loads gtag.js', async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole('button', { name: 'Essential Only' }));

    expect(localStorage.getItem(TELEMETRY_CONSENT_STORAGE_KEY)).toBe('rejected');
    expect(gaScript()).toBeNull();
    expect(window.dataLayer).toBeUndefined();
  });

  it('Accept All defaults Consent Mode v2 to denied, grants analytics only, then loads gtag.js', async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole('button', { name: 'Accept All (Help Us Improve)' }));

    expect(gaScript()?.src).toBe(`https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`);
    const calls = dataLayerCalls();
    expect(calls[0]).toEqual(['consent', 'default', GA_CONSENT_DENIED]);
    expect(calls[1]).toEqual(['consent', 'update', GA_CONSENT_GRANTED]);
    expect(GA_CONSENT_GRANTED).toEqual({
      analytics_storage: 'granted',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
    });
    expect(calls).toContainEqual([
      'config',
      MEASUREMENT_ID,
      { send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false },
    ]);
    expect(pageViews()).toHaveLength(1);
  });

  it('stays inert without a measurement id even when consent was accepted', () => {
    vi.stubEnv('VITE_GA_MEASUREMENT_ID', '');
    localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, 'accepted');
    localStorage.setItem(TELEMETRY_CONSENT_STORAGE_KEY, 'accepted');
    renderApp();

    expect(gaScript()).toBeNull();
    expect(window.gtag).toBeUndefined();
  });

  it('carries landing UTM tags to the first page view sent after a later consent', async () => {
    const user = userEvent.setup();
    renderApp('/?utm_source=google&utm_medium=gbp&utm_campaign=profile&fbclid=x', <NavigateButton to="/auth" />);

    expect(sessionStorage.getItem(LANDING_UTM_STORAGE_KEY)).toBe(
      'utm_source=google&utm_medium=gbp&utm_campaign=profile',
    );
    await user.click(screen.getByRole('button', { name: 'go' }));
    await user.click(screen.getByRole('button', { name: 'Accept All (Help Us Improve)' }));

    const [first] = pageViews();
    expect(first.page_location).toBe(
      `${window.location.origin}/auth?utm_source=google&utm_medium=gbp&utm_campaign=profile`,
    );
    expect(sessionStorage.getItem(LANDING_UTM_STORAGE_KEY)).toBeNull();
  });

  it('asks again instead of loading GA for a Clarity-only acceptance saved before GA', async () => {
    const user = userEvent.setup();
    vi.stubEnv('VITE_CLARITY_PROJECT_ID', 'clarityproj');
    localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, 'accepted');
    // Legacy acceptance: no scope key, so it covered Clarity only.
    localStorage.setItem(TELEMETRY_CONSENT_STORAGE_KEY, 'accepted');
    renderApp();

    expect(gaScript()).toBeNull();
    expect(screen.getByText('Help improve EquipQR')).toBeInTheDocument();
    expect(screen.getByText(/Google Analytics/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Yes, Help Us Improve' }));

    expect(localStorage.getItem(TELEMETRY_CONSENT_SCOPE_STORAGE_KEY)).toBe('clarity,ga');
    expect(gaScript()).not.toBeNull();
  });

  it('keeps a legacy rejection without asking again', () => {
    localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, 'accepted');
    localStorage.setItem(TELEMETRY_CONSENT_STORAGE_KEY, 'rejected');
    renderApp();

    expect(screen.queryByRole('region', { name: /cookie consent/i })).not.toBeInTheDocument();
    expect(gaScript()).toBeNull();
  });

  it('sends landing UTM tags once when consent is given on the tagged URL itself', async () => {
    const user = userEvent.setup();
    renderApp('/?utm_source=google&utm_medium=gbp', <NavigateButton to="/features/quickbooks" />);

    await user.click(screen.getByRole('button', { name: 'Accept All (Help Us Improve)' }));
    await user.click(screen.getByRole('button', { name: 'go' }));

    expect(pageViews().map((view) => view.page_location)).toEqual([
      `${window.location.origin}/?utm_source=google&utm_medium=gbp`,
      `${window.location.origin}/features/quickbooks`,
    ]);
  });

  it.each([
    ['/solutions/repair-shops', 'Repair Shops | EquipQR'],
    ['/releases', 'Releases | EquipQR'],
    ['/dashboard/work-orders', 'EquipQR'],
    ['/qr/equipment/abc', 'EquipQR'],
  ])('uses the real title only on public pages (%s)', (path, expected) => {
    document.title = expected === 'EquipQR' ? 'Customer Truck 12 | EquipQR' : expected;
    localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, 'accepted');
    localStorage.setItem(TELEMETRY_CONSENT_STORAGE_KEY, 'accepted');
    localStorage.setItem(TELEMETRY_CONSENT_SCOPE_STORAGE_KEY, 'ga');
    renderApp(path);

    expect(pageViews()[0].page_title).toBe(expected);
  });

  it('sends one sanitized page view per route change without ids or tokens', async () => {
    const user = userEvent.setup();
    localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, 'accepted');
    localStorage.setItem(TELEMETRY_CONSENT_STORAGE_KEY, 'accepted');
    localStorage.setItem(TELEMETRY_CONSENT_SCOPE_STORAGE_KEY, 'ga');
    renderApp(
      '/invitation/abc123secrettoken?email=a@b.co',
      <NavigateButton to="/dashboard/equipment/0f8fad5b-d9cb-469f-a165-70867728950e?tab=notes" />,
    );
    await user.click(screen.getByRole('button', { name: 'go' }));

    const locations = pageViews().map((view) => view.page_location);
    expect(locations).toEqual([
      `${window.location.origin}/invitation/:token`,
      `${window.location.origin}/dashboard/equipment/:id`,
    ]);
    expect(pageViews()[1].page_title).toBe('EquipQR');
  });

  it('Settings toggle revokes consent, disables the id, and clears GA cookies', async () => {
    const user = userEvent.setup();
    localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, 'accepted');
    localStorage.setItem(TELEMETRY_CONSENT_STORAGE_KEY, 'accepted');
    localStorage.setItem(TELEMETRY_CONSENT_SCOPE_STORAGE_KEY, 'ga');
    document.cookie = '_ga=GA1.1.123; path=/';
    document.cookie = '_ga_TEST12345=GS1.1.456; path=/';
    renderApp('/', <TelemetryConsentSettings />);
    const gtag = vi.fn();
    window.gtag = gtag;

    await user.click(screen.getByRole('switch', { name: 'Help improve EquipQR with usage analytics' }));

    expect(localStorage.getItem(TELEMETRY_CONSENT_STORAGE_KEY)).toBe('rejected');
    expect(gtag).toHaveBeenCalledWith('consent', 'update', GA_CONSENT_DENIED);
    expect(Reflect.get(window, `ga-disable-${MEASUREMENT_ID}`)).toBe(true);
    expect(document.cookie).not.toMatch(/_ga/);
  });
});
