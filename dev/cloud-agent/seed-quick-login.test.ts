import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getPrioritizedOrganizationId,
  withPersonalOrgFlag,
} from '@/utils/prioritizeOrganizations';
import {
  PARENT_PROJECT_REF,
  assertBranchSafeTarget,
  extractCliJson,
  findBranchByName,
  normalizeBranchList,
  parseProjectApiKeys,
  CLOUD_AGENT_EQUIPMENT_SERIAL,
  CLOUD_AGENT_METRO_EQUIPMENT_SERIAL,
  CLOUD_AGENT_SHARED_ORG_FIXTURES,
  CLOUD_AGENT_WORK_ORDER_LOOKUP_ORDER_COLUMN,
  ensureWorkspaceOrgIsNotPersonal,
  formatAnonKeyAssignment,
  QUICK_LOGIN_PERSONAS,
  resolveDevPassword,
  resolveKeysFromPayload,
} from './seed-quick-login.mjs';

describe('cloud-agent seed-quick-login helpers', () => {
  beforeEach(() => {
    delete process.env.CLOUD_AGENT_QUICK_LOGIN_PASSWORD;
    delete process.env.VITE_DEV_TEST_PASSWORD;
  });

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
    expect(QUICK_LOGIN_PERSONAS.some((p) => p.email === 'viewer@apex.test')).toBe(
      true,
    );
  });

  it('encodes the Apex shared-org viewer and work-order preview contract', () => {
    const apex = CLOUD_AGENT_SHARED_ORG_FIXTURES.find((fixture) => fixture.key === 'apex');
    expect(apex).toBeDefined();
    expect(apex?.organizationMemberships).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ email: 'owner@apex.test', role: 'owner' }),
        expect.objectContaining({ email: 'admin@apex.test', role: 'admin' }),
        expect.objectContaining({ email: 'tech@apex.test', role: 'member' }),
        expect.objectContaining({ email: 'viewer@apex.test', role: 'member' }),
      ]),
    );
    expect(apex?.teamMemberships).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ email: 'owner@apex.test', role: 'manager' }),
        expect.objectContaining({ email: 'admin@apex.test', role: 'requestor' }),
        expect.objectContaining({ email: 'tech@apex.test', role: 'technician' }),
        expect.objectContaining({ email: 'viewer@apex.test', role: 'viewer' }),
      ]),
    );
    expect(apex?.workOrder).toEqual(
      expect.objectContaining({
        createdByEmail: 'admin@apex.test',
        assigneeEmail: 'tech@apex.test',
      }),
    );
  });

  it('removes Alex Apex personal-org flag once Apex becomes a shared workspace', async () => {
    const selectMaybeSingle = vi.fn().mockResolvedValue({
      data: { organization_id: 'org-apex' },
      error: null,
    });
    const selectEq = vi.fn(() => ({ maybeSingle: selectMaybeSingle }));
    const selectSelect = vi.fn(() => ({ eq: selectEq }));
    const deleteEqOrganization = vi.fn().mockResolvedValue({ error: null });
    const deleteEqUser = vi.fn(() => ({ eq: deleteEqOrganization }));
    const deleteDelete = vi.fn(() => ({ eq: deleteEqUser }));
    const from = vi.fn((table: string) => {
      if (table === 'personal_organizations') {
        return {
          select: selectSelect,
          delete: deleteDelete,
        };
      }
      throw new Error(`Unexpected table ${table}`);
    });
    const admin = { from };

    const changed = await ensureWorkspaceOrgIsNotPersonal(
      admin,
      'user-alex',
      'org-apex',
    );

    expect(changed).toBe(true);
    expect(from).toHaveBeenCalledWith('personal_organizations');
    expect(selectSelect).toHaveBeenCalledWith('organization_id');
    expect(selectEq).toHaveBeenCalledWith('user_id', 'user-alex');
    expect(deleteEqUser).toHaveBeenCalledWith('user_id', 'user-alex');
    expect(deleteEqOrganization).toHaveBeenCalledWith('organization_id', 'org-apex');
  });

  it('aligns the cloud seed with the app preference path so Apex outranks Metro', () => {
    const organizations = [
      { id: 'org-apex', userRole: 'owner' },
      { id: 'org-metro', userRole: 'member' },
      { id: 'org-industrial', userRole: 'member' },
    ];

    const beforeSeedFix = getPrioritizedOrganizationId(
      withPersonalOrgFlag(organizations, 'org-apex'),
    );
    const afterSeedFix = getPrioritizedOrganizationId(
      withPersonalOrgFlag(organizations, null),
    );

    expect(beforeSeedFix).toBe('org-metro');
    expect(afterSeedFix).toBe('org-apex');
  });

  it('seeds an isolated Metro org fixture with its own equipment and work order', () => {
    const metro = CLOUD_AGENT_SHARED_ORG_FIXTURES.find((fixture) => fixture.key === 'metro');
    expect(metro).toBeDefined();
    expect(metro?.organizationMemberships.map((membership) => membership.email)).toEqual([
      'owner@metro.test',
      'tech@metro.test',
    ]);
    expect(metro?.equipment.serialNumber).toBe(CLOUD_AGENT_METRO_EQUIPMENT_SERIAL);
    expect(metro?.workOrder.title).toBe('Cloud Preview Seed - Metro Bobcat S770');
  });

  it('looks up seeded work orders by created_date', () => {
    expect(CLOUD_AGENT_WORK_ORDER_LOOKUP_ORDER_COLUMN).toBe('created_date');
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
    expect(
      resolveKeysFromPayload([
        { name: 'anon', api_key: 'anon-key-value' },
        { name: 'service_role', api_key: 'service-key-value' },
      ]),
    ).toEqual(parsed);
    expect(
      resolveKeysFromPayload({
        SUPABASE_ANON_KEY: 'anon-from-branch',
        SUPABASE_SERVICE_ROLE_KEY: 'service-from-branch',
      }),
    ).toEqual({
      anonKey: 'anon-from-branch',
      serviceRoleKey: 'service-from-branch',
    });
    expect(formatAnonKeyAssignment('anon-key-value')).toBe(
      "anon_key='anon-key-value'",
    );
    expect(formatAnonKeyAssignment('anon-key-value')).not.toMatch(/service/i);
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
    expect(CLOUD_AGENT_METRO_EQUIPMENT_SERIAL).toBe('S770-CLOUD-AGENT-001');
    // Canonical local seed fixture IDs must not be reused (upsert overwrite risk).
    expect(CLOUD_AGENT_EQUIPMENT_SERIAL).not.toMatch(/880e8400|aa0e8400|dd0e8400/);
    expect(CLOUD_AGENT_METRO_EQUIPMENT_SERIAL).not.toMatch(/880e8400|aa0e8400|dd0e8400/);
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
