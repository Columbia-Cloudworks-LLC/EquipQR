import { describe, it, expect } from 'vitest';
import {
  isSafeRedirectPath,
  getSafeRedirectPath,
  buildGoogleOAuthRedirectTo,
  getSafeNextParam,
} from '../redirectValidation';

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
});
