import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  isSafeRedirectPath,
  getSafeRedirectPath,
  buildGoogleOAuthRedirectTo,
  getSafeNextParam,
  getPendingRedirect,
  clearPendingRedirect,
  toSameOriginPath,
} from './redirectValidation';

describe('redirectValidation', () => {
  describe('isSafeRedirectPath', () => {
    it('accepts same-origin relative paths', () => {
      expect(isSafeRedirectPath('/qr/equipment/abc?qr=true')).toBe(true);
      expect(isSafeRedirectPath('/dashboard')).toBe(true);
    });

    it('rejects absolute, protocol-relative, and scheme URLs', () => {
      expect(isSafeRedirectPath('https://evil.com')).toBe(false);
      expect(isSafeRedirectPath('//evil.com')).toBe(false);
      expect(isSafeRedirectPath('javascript:alert(1)')).toBe(false);
      expect(isSafeRedirectPath('')).toBe(false);
    });
  });

  describe('getSafeRedirectPath', () => {
    it('returns path when safe and fallback otherwise', () => {
      expect(getSafeRedirectPath('/qr/equipment/1')).toBe('/qr/equipment/1');
      expect(getSafeRedirectPath('https://evil.com', '/dashboard')).toBe('/dashboard');
    });
  });

  describe('buildGoogleOAuthRedirectTo', () => {
    const origin = 'http://localhost:8080';

    it('returns /auth when pendingRedirect is missing or unsafe', () => {
      expect(buildGoogleOAuthRedirectTo(origin, null)).toBe('http://localhost:8080/auth');
      expect(buildGoogleOAuthRedirectTo(origin, undefined)).toBe('http://localhost:8080/auth');
      expect(buildGoogleOAuthRedirectTo(origin, 'https://evil.com')).toBe(
        'http://localhost:8080/auth',
      );
    });

    it('appends encoded next for a safe pendingRedirect', () => {
      const pending = '/qr/equipment/abc-123?qr=true&org=org-1';
      expect(buildGoogleOAuthRedirectTo(origin, pending)).toBe(
        `http://localhost:8080/auth?next=${encodeURIComponent(pending)}`,
      );
    });
  });

  describe('getSafeNextParam', () => {
    it('returns a safe next path from a query string', () => {
      const next = '/qr/equipment/abc?qr=true';
      expect(getSafeNextParam(`?next=${encodeURIComponent(next)}`)).toBe(next);
      expect(getSafeNextParam(`next=${encodeURIComponent(next)}`)).toBe(next);
    });

    it('returns null for missing or unsafe next values', () => {
      expect(getSafeNextParam('')).toBeNull();
      expect(getSafeNextParam('?tab=signin')).toBeNull();
      expect(getSafeNextParam('?next=https%3A%2F%2Fevil.com')).toBeNull();
      expect(getSafeNextParam('?next=%2F%2Fevil.com')).toBeNull();
    });
  });

  describe('toSameOriginPath', () => {
    it('rebuilds a safe relative path with query', () => {
      expect(toSameOriginPath('/qr/equipment/abc?qr=true')).toBe(
        '/qr/equipment/abc?qr=true',
      );
    });

    it('falls back for unsafe inputs', () => {
      expect(toSameOriginPath('https://evil.com', '/dashboard')).toBe('/dashboard');
      expect(toSameOriginPath('//evil.com', '/')).toBe('/');
    });
  });

  describe('getPendingRedirect / clearPendingRedirect', () => {
    afterEach(() => {
      vi.unstubAllGlobals();
      sessionStorage.clear();
    });

    it('reads and clears pendingRedirect', () => {
      sessionStorage.setItem('pendingRedirect', '/qr/equipment/1');
      expect(getPendingRedirect()).toBe('/qr/equipment/1');
      clearPendingRedirect();
      expect(getPendingRedirect()).toBeNull();
    });

    it('returns null when sessionStorage.getItem throws', () => {
      vi.stubGlobal('sessionStorage', {
        getItem: () => {
          throw new Error('blocked');
        },
        removeItem: () => {
          throw new Error('blocked');
        },
      });
      expect(getPendingRedirect()).toBeNull();
      expect(() => clearPendingRedirect()).not.toThrow();
    });
  });
});
