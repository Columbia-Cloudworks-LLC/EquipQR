import React from 'react';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { CookieConsentBanner } from './CookieConsentBanner';
import {
  CookieConsentProvider,
  useWhenPreferenceStorageAllowed,
} from '@/contexts/CookieConsentContext';
import { COOKIE_CONSENT_STORAGE_KEY, getPreferenceLocalStorage } from '@/lib/cookieConsent';

const toastError = vi.fn();
vi.mock('sonner', () => ({
  toast: {
    error: (...args: unknown[]) => toastError(...args),
  },
}));

const ROUTER_FUTURE = {
  v7_startTransition: true,
  v7_relativeSplatPath: true,
} as const;

function renderBanner() {
  return render(
    <MemoryRouter future={ROUTER_FUTURE}>
      <CookieConsentProvider>
        <CookieConsentBanner />
      </CookieConsentProvider>
    </MemoryRouter>,
  );
}

function PreferenceProbe({ onRehydrate }: { onRehydrate: (value: string | null) => void }) {
  useWhenPreferenceStorageAllowed(() => {
    onRehydrate(getPreferenceLocalStorage('equipqr:equipment-view-mode'));
  });
  return null;
}

describe('CookieConsentBanner', () => {
  beforeEach(() => {
    localStorage.clear();
    toastError.mockClear();
  });

  it('shows Accept and Reject with a privacy cookies link on first visit', () => {
    renderBanner();

    expect(screen.getByRole('region', { name: /cookie consent/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^accept$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^reject$/i })).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /privacy policy — cookies/i }),
    ).toHaveAttribute('href', '/privacy-policy#cookies');
  });

  it('hides after Accept and persists the decision', async () => {
    const user = userEvent.setup();
    renderBanner();

    await user.click(screen.getByRole('button', { name: /^accept$/i }));

    expect(screen.queryByRole('region', { name: /cookie consent/i })).not.toBeInTheDocument();
    expect(localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY)).toBe('accepted');
  });

  it('hides after Reject and does not reappear when remounted', async () => {
    const user = userEvent.setup();
    const { unmount } = renderBanner();

    await user.click(screen.getByRole('button', { name: /^reject$/i }));
    expect(localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY)).toBe('rejected');
    unmount();

    renderBanner();
    expect(screen.queryByRole('region', { name: /cookie consent/i })).not.toBeInTheDocument();
  });

  it('does not render when a prior decision exists', () => {
    localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, 'accepted');
    renderBanner();
    expect(screen.queryByRole('region', { name: /cookie consent/i })).not.toBeInTheDocument();
  });

  it('keeps the banner and toasts when persistence fails', async () => {
    const user = userEvent.setup();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    renderBanner();

    await user.click(screen.getByRole('button', { name: /^accept$/i }));

    expect(screen.getByRole('region', { name: /cookie consent/i })).toBeInTheDocument();
    expect(toastError).toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  it('rehydrates stored preferences when Accept is clicked mid-session', async () => {
    const user = userEvent.setup();
    const onRehydrate = vi.fn();
    // Legacy preference present before consent — gated until Accept.
    localStorage.setItem('equipqr:equipment-view-mode', 'table');

    render(
      <MemoryRouter future={ROUTER_FUTURE}>
        <CookieConsentProvider>
          <PreferenceProbe onRehydrate={onRehydrate} />
          <CookieConsentBanner />
        </CookieConsentProvider>
      </MemoryRouter>,
    );

    expect(getPreferenceLocalStorage('equipqr:equipment-view-mode')).toBeNull();
    await user.click(screen.getByRole('button', { name: /^accept$/i }));
    expect(onRehydrate).toHaveBeenCalledWith('table');
  });
});
