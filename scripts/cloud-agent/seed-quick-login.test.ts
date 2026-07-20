import { afterEach, describe, expect, it } from 'vitest';
import {
  PARENT_PROJECT_REF,
  assertBranchSafeTarget,
  extractCliJson,
  findBranchByName,
  normalizeBranchList,
  parseProjectApiKeys,
  CLOUD_AGENT_EQUIPMENT_SERIAL,
  QUICK_LOGIN_PERSONAS,
  resolveDevPassword,
} from './seed-quick-login.mjs';

describe('cloud-agent seed-quick-login helpers', () => {
  afterEach(() => {
    delete process.env.CLOUD_AGENT_QUICK_LOGIN_PASSWORD;
    delete process.env.VITE_DEV_TEST_PASSWORD;
  });

  it('exposes Dev Quick Login personas and password contract via env', () => {
    expect(() => resolveDevPassword()).toThrow(/CLOUD_AGENT_QUICK_LOGIN_PASSWORD/);
    process.env.CLOUD_AGENT_QUICK_LOGIN_PASSWORD = 'override-pass';
    expect(resolveDevPassword()).toBe('override-pass');
    expect(QUICK_LOGIN_PERSONAS.some((p) => p.email === 'owner@apex.test')).toBe(
      true,
    );
    expect(QUICK_LOGIN_PERSONAS.find((p) => p.email === 'owner@apex.test')?.seedFleet).toBe(
      true,
    );
    expect(QUICK_LOGIN_PERSONAS.some((p) => p.email === 'owner@freshstart.test')).toBe(
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

  it('refuses parent/production and spoofed hosts', () => {
    expect(() =>
      assertBranchSafeTarget({
        projectRef: PARENT_PROJECT_REF,
        apiUrl: 'https://ymxkzronkhwxzcdcbnwq.supabase.co',
      }),
    ).toThrow(/parent\/production/);

    expect(() =>
      assertBranchSafeTarget({
        projectRef: 'abcdefghijklmnop',
        apiUrl: 'https://supabase.equipqr.app',
      }),
    ).toThrow(/supabase\.equipqr\.app/);

    expect(() =>
      assertBranchSafeTarget({
        projectRef: 'abcdefghijklmnop',
        apiUrl: 'https://supabase.co.attacker.tld',
      }),
    ).toThrow(/does not match expected branch host/);

    expect(() =>
      assertBranchSafeTarget({
        projectRef: 'abcdefghijklmnop',
        apiUrl: 'https://evil.tld/localhost',
      }),
    ).toThrow(/does not match expected branch host/);
  });

  it('allows exact ephemeral supabase.co branch hosts and localhost', () => {
    expect(() =>
      assertBranchSafeTarget({
        projectRef: 'abcdefghijklmnop',
        apiUrl: 'https://abcdefghijklmnop.supabase.co',
      }),
    ).not.toThrow();
    expect(() =>
      assertBranchSafeTarget({
        projectRef: 'abcdefghijklmnop',
        apiUrl: 'http://localhost:54321',
      }),
    ).not.toThrow();
  });

  it('normalizes branch list shapes for lookup', () => {
    const branch = { name: 'agent-demo', project_ref: 'abcdefghijklmnop' };
    expect(normalizeBranchList([branch])).toEqual([branch]);
    expect(normalizeBranchList({ branches: [branch] })).toEqual([branch]);
    expect(normalizeBranchList({ data: [branch] })).toEqual([branch]);
    expect(findBranchByName({ data: [branch] }, 'agent-demo')?.project_ref).toBe(
      'abcdefghijklmnop',
    );
    expect(findBranchByName({ branches: [] }, 'missing')).toBeNull();
  });

  it('uses a cloud-agent equipment serial instead of local fixture UUIDs', () => {
    expect(CLOUD_AGENT_EQUIPMENT_SERIAL).toBe('CAT320GC-CLOUD-AGENT-001');
    // Canonical local seed fixture IDs must not be reused (upsert overwrite risk).
    expect(CLOUD_AGENT_EQUIPMENT_SERIAL).not.toMatch(/880e8400|aa0e8400|dd0e8400/);
  });

  it('extracts branch JSON despite ANSI spinner noise', () => {
    const noisy = [
      '\u001b[1G\u001b[J[ spinner noise',
      'Created preview branch:',
      '{',
      '  "name": "agent-demo",',
      '  "project_ref": "abcdefghijklmnop",',
      '  "status": "FUNCTIONS_DEPLOYED"',
      '}',
    ].join('\n');
    expect(extractCliJson(noisy).project_ref).toBe('abcdefghijklmnop');
  });
});
