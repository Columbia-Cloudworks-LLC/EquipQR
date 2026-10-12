import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { CookieConsentBanner } from './CookieConsentBanner';
import { ClarityTelemetry } from './ClarityTelemetry';
import { CookieConsentProvider } from '@/contexts/CookieConsentContext';
import { TelemetryConsentSettings } from '@/components/settings/TelemetryConsentSettings';
import { COOKIE_CONSENT_STORAGE_KEY } from '@/lib/cookieConsent';
import { TELEMETRY_CONSENT_STORAGE_KEY } from '@/lib/telemetryConsent';
import { CLARITY_SCRIPT_ID } from '@/lib/clarity';

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

function renderApp(children: React.ReactNode = null) {
  return render(
    <MemoryRouter>
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

describe('ClarityTelemetry consent gating', () => {
  beforeEach(() => {
    localStorage.clear();
    clarityScript()?.remove();
    delete window.clarity;
    vi.stubEnv('VITE_CLARITY_PROJECT_ID', 'testproj123');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
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
    await user.click(screen.getByRole('button', { name: 'Essential Only' }));

    // Earlier preference Accept is preserved; only telemetry is declined.
    expect(localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY)).toBe('accepted');
    expect(localStorage.getItem(TELEMETRY_CONSENT_STORAGE_KEY)).toBe('rejected');
    expect(clarityScript()).toBeNull();
  });

  it('Settings toggle revokes consent and tells Clarity to stop', async () => {
    const user = userEvent.setup();
    localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, 'accepted');
    localStorage.setItem(TELEMETRY_CONSENT_STORAGE_KEY, 'accepted');
    renderApp(<TelemetryConsentSettings />);
    const clarity = vi.fn();
    window.clarity = clarity;

    const toggle = screen.getByRole('switch', {
      name: 'Help improve EquipQR with diagnostic session data',
    });
    expect(toggle).toBeChecked();
    await user.click(toggle);

    expect(localStorage.getItem(TELEMETRY_CONSENT_STORAGE_KEY)).toBe('rejected');
    expect(toggle).not.toBeChecked();
    expect(clarity).toHaveBeenCalledWith('consent', false);
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
