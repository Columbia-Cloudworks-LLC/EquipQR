import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  COOKIE_CONSENT_STORAGE_KEY,
  SIDEBAR_COOKIE_NAME,
  applyCookieConsentDecision,
  clearOptionalPreferenceStorage,
  getCookieConsentDecision,
  getPreferenceLocalStorage,
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
    localStorage.setItem('equipqr:equipment-view-mode', 'table');
    expect(getPreferenceLocalStorage('equipqr:equipment-view-mode')).toBeNull();
  });

  it('persists Accept and allows preference storage', () => {
    expect(applyCookieConsentDecision('accepted')).toBe(true);
    expect(getCookieConsentDecision()).toBe('accepted');
    expect(localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY)).toBe('accepted');
    expect(isPreferenceStorageAllowed()).toBe(true);
    expect(setPreferenceLocalStorage('equipqr:equipment-view-mode', 'table')).toBe(true);
    expect(localStorage.getItem('equipqr:equipment-view-mode')).toBe('table');
    expect(setPreferenceCookie(SIDEBAR_COOKIE_NAME, 'true', 60)).toBe(true);
    expect(document.cookie).toContain(`${SIDEBAR_COOKIE_NAME}=true`);
  });

  it('returns false when consent cannot be persisted', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    expect(applyCookieConsentDecision('accepted')).toBe(false);
    expect(getCookieConsentDecision()).toBeNull();
    vi.restoreAllMocks();
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

  it('clearOptionalPreferenceStorage leaves consent and necessary keys alone', () => {
    localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, 'rejected');
    localStorage.setItem('equipqr_pending_terms_acceptance:user-1', '1');
    localStorage.setItem('equipqr_session_data', '{"version":3}');
    localStorage.setItem('equipqr_current_organization', 'org-1');
    localStorage.setItem('equipqr:equipment-view-mode', 'table');
    clearOptionalPreferenceStorage();
    expect(localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY)).toBe('rejected');
    expect(localStorage.getItem('equipqr_pending_terms_acceptance:user-1')).toBe('1');
    expect(localStorage.getItem('equipqr_session_data')).toBe('{"version":3}');
    expect(localStorage.getItem('equipqr_current_organization')).toBe('org-1');
    expect(localStorage.getItem('equipqr:equipment-view-mode')).toBeNull();
  });
});
