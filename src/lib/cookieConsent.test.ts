import { beforeEach, describe, expect, it } from 'vitest';
import {
  COOKIE_CONSENT_STORAGE_KEY,
  SIDEBAR_COOKIE_NAME,
  applyCookieConsentDecision,
  clearOptionalPreferenceStorage,
  getCookieConsentDecision,
  isPreferenceStorageAllowed,
  setPreferenceCookie,
  setPreferenceLocalStorage,
} from './cookieConsent';

describe('cookieConsent', () => {
  beforeEach(() => {
    localStorage.clear();
    if (typeof document !== 'undefined') {
      document.cookie.split(';').forEach((part) => {
        const name = part.split('=')[0]?.trim();
        if (name) {
          document.cookie = `${name}=; path=/; max-age=0`;
        }
      });
    }
  });

  it('returns null when no decision is stored', () => {
    expect(getCookieConsentDecision()).toBeNull();
    expect(isPreferenceStorageAllowed()).toBe(false);
  });

  it('persists Accept and allows preference storage', () => {
    applyCookieConsentDecision('accepted');
    expect(getCookieConsentDecision()).toBe('accepted');
    expect(localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY)).toBe('accepted');
    expect(isPreferenceStorageAllowed()).toBe(true);
    expect(setPreferenceLocalStorage('equipqr:equipment-view-mode', 'table')).toBe(true);
    expect(localStorage.getItem('equipqr:equipment-view-mode')).toBe('table');
    expect(setPreferenceCookie(SIDEBAR_COOKIE_NAME, 'true', 60)).toBe(true);
    expect(document.cookie).toContain(`${SIDEBAR_COOKIE_NAME}=true`);
  });

  it('persists Reject, blocks preference writes, and clears optional keys', () => {
    localStorage.setItem('equipqr:equipment-view-mode', 'list');
    localStorage.setItem('equipqr:selectedTeamId:org-1', 'team-A');
    localStorage.setItem('equipqr_offline_queue_u1_o1', '[]');
    document.cookie = `${SIDEBAR_COOKIE_NAME}=true; path=/; max-age=60`;

    applyCookieConsentDecision('rejected');

    expect(getCookieConsentDecision()).toBe('rejected');
    expect(isPreferenceStorageAllowed()).toBe(false);
    expect(localStorage.getItem('equipqr:equipment-view-mode')).toBeNull();
    expect(localStorage.getItem('equipqr:selectedTeamId:org-1')).toBeNull();
    expect(localStorage.getItem('equipqr_offline_queue_u1_o1')).toBe('[]');
    expect(setPreferenceLocalStorage('equipqr:equipment-view-mode', 'table')).toBe(false);
    expect(localStorage.getItem('equipqr:equipment-view-mode')).toBeNull();
    expect(document.cookie).not.toContain(`${SIDEBAR_COOKIE_NAME}=true`);
  });

  it('clearOptionalPreferenceStorage leaves consent and auth-adjacent keys alone', () => {
    localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, 'rejected');
    localStorage.setItem('equipqr_pending_terms_acceptance:user-1', '1');
    localStorage.setItem('equipqr_session_data', '{"version":2}');
    clearOptionalPreferenceStorage();
    expect(localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY)).toBe('rejected');
    expect(localStorage.getItem('equipqr_pending_terms_acceptance:user-1')).toBe('1');
    expect(localStorage.getItem('equipqr_session_data')).toBeNull();
  });
});
