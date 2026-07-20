import { describe, expect, it } from 'vitest';
import {
  PARENT_PROJECT_REF,
  assertBranchSafeTarget,
  parseProjectApiKeys,
  QUICK_LOGIN_PERSONAS,
  DEV_PASSWORD,
} from './seed-quick-login.mjs';

describe('cloud-agent seed-quick-login helpers', () => {
  it('exposes Dev Quick Login password contract', () => {
    expect(DEV_PASSWORD).toBe('password123');
    expect(QUICK_LOGIN_PERSONAS.some((p) => p.email === 'owner@apex.test')).toBe(
      true,
    );
    expect(QUICK_LOGIN_PERSONAS.find((p) => p.email === 'owner@apex.test')?.seedFleet).toBe(
      true,
    );
  });

  it('parses legacy anon and service_role api keys', () => {
    const parsed = parseProjectApiKeys([
      { name: 'anon', api_key: 'anon-key-value' },
      { name: 'service_role', api_key: 'service-key-value' },
    ]);
    expect(parsed).toEqual({
      anonKey: 'anon-key-value',
      serviceRoleKey: 'service-key-value',
    });
  });

  it('refuses parent/production targets', () => {
    expect(() =>
      assertBranchSafeTarget({
        projectRef: PARENT_PROJECT_REF,
        apiUrl: 'https://ymxkzronkhwxzcdcbnwq.supabase.co',
      }),
    ).toThrow(/parent\/production/);

    expect(() =>
      assertBranchSafeTarget({
        projectRef: 'branchref1234567',
        apiUrl: 'https://supabase.equipqr.app',
      }),
    ).toThrow(/supabase\.equipqr\.app/);
  });

  it('allows ephemeral supabase.co branch hosts', () => {
    expect(() =>
      assertBranchSafeTarget({
        projectRef: 'abcdefghijklmnop',
        apiUrl: 'https://abcdefghijklmnop.supabase.co',
      }),
    ).not.toThrow();
  });
});
