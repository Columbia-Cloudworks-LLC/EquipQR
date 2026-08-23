import { describe, it, expect } from 'vitest';
import {
  marker,
  normalizeSupabaseUrl,
  pickRecordedAuthResponse,
  redactConsoleErrorText,
} from './previewAccessProbe.mjs';

describe('marker', () => {
  it('reports set vs missing env values', () => {
    expect(marker('secret')).toBe('[set]');
    expect(marker('')).toBe('[missing]');
    expect(marker(undefined)).toBe('[missing]');
  });
});

describe('normalizeSupabaseUrl', () => {
  it('adds https scheme when missing', () => {
    expect(normalizeSupabaseUrl('example.supabase.co')).toBe('https://example.supabase.co');
  });

  it('preserves explicit http(s) URLs', () => {
    expect(normalizeSupabaseUrl('https://example.supabase.co/')).toBe('https://example.supabase.co/');
  });
});

describe('pickRecordedAuthResponse', () => {
  it('prefers the latest response that created a session', () => {
    const responses = [
      { hasSession: false, status: 400 },
      { hasSession: true, status: 200 },
      { hasSession: false, status: 200 },
    ];
    expect(pickRecordedAuthResponse(responses)).toEqual({ hasSession: true, status: 200 });
  });

  it('falls back to the last response when none have sessions', () => {
    const responses = [{ hasSession: false, status: 401 }, { hasSession: false, status: 403 }];
    expect(pickRecordedAuthResponse(responses)).toEqual({ hasSession: false, status: 403 });
  });
});

describe('redactConsoleErrorText', () => {
  it('redacts secrets, JWTs, and sb auth token keys longest-first', () => {
    const email = 'agent@example.com';
    const password = 'SuperSecretPassword123!';
    const anonKey = 'eyJhbGciOiJIUzI1NiJ9.anon.key.segment';
    const jwt = 'eyJhbGciOiJIUzI1NiJ9.user.claims';
    const raw = `login failed for ${email} token ${jwt} key ${anonKey} pass ${password} sb-project-auth-token`;

    const { text, redactedCount } = redactConsoleErrorText(raw, {
      signupEmail: email,
      signupPassword: password,
      supabaseAnonKey: anonKey,
    });

    expect(text).not.toContain(email);
    expect(text).not.toContain(password);
    expect(text).not.toContain(anonKey);
    expect(text).not.toContain(jwt);
    expect(text).toContain('[redacted-email]');
    expect(text).toContain('[redacted-jwt]');
    expect(text).toContain('[redacted-sb-auth-key]');
    expect(redactedCount).toBeGreaterThan(0);
  });
});
