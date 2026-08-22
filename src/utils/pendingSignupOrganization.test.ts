import { beforeEach, describe, expect, it, vi } from 'vitest';

const maybeSingle = vi.fn();
const eq = vi.fn();
const select = vi.fn();
const update = vi.fn();
const from = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...args: unknown[]) => from(...args),
  },
}));

vi.mock('@/utils/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import {
  applyPendingSignupOrganizationName,
  clearPendingSignupOrganizationName,
  DEFAULT_PERSONAL_ORGANIZATION_NAME,
  getPendingSignupOrganizationName,
  PENDING_SIGNUP_ORGANIZATION_STORAGE_KEY,
  setPendingSignupOrganizationName,
} from './pendingSignupOrganization';

function mockQuery(result: { data: unknown; error: unknown }) {
  maybeSingle.mockResolvedValue(result);
  eq.mockReturnValue({ maybeSingle, eq });
  select.mockReturnValue({ eq });
  update.mockReturnValue({ eq });
  from.mockReturnValue({ select, update });
}

describe('pendingSignupOrganization', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.clearAllMocks();
    mockQuery({ data: null, error: null });
  });

  it('stores and clears a trimmed organization name', () => {
    setPendingSignupOrganizationName('  Fleet Co  ');
    expect(sessionStorage.getItem(PENDING_SIGNUP_ORGANIZATION_STORAGE_KEY)).toBe('Fleet Co');
    expect(getPendingSignupOrganizationName()).toBe('Fleet Co');

    setPendingSignupOrganizationName('   ');
    expect(getPendingSignupOrganizationName()).toBeNull();
  });

  it('renames a brand-new default personal organization', async () => {
    setPendingSignupOrganizationName('Fleet Co');
    from.mockImplementation((table: string) => {
      if (table === 'personal_organizations') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: { organization_id: 'org-1' }, error: null }),
            }),
          }),
        };
      }
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: () =>
              Promise.resolve({
                data: {
                  id: 'org-1',
                  name: DEFAULT_PERSONAL_ORGANIZATION_NAME,
                  created_at: new Date().toISOString(),
                },
                error: null,
              }),
          }),
        }),
        update: (payload: { name: string }) => {
          expect(payload.name).toBe('Fleet Co');
          return {
            eq: () => Promise.resolve({ error: null }),
          };
        },
      };
    });

    await applyPendingSignupOrganizationName('user-1');

    expect(getPendingSignupOrganizationName()).toBeNull();
  });

  it('does not rename an already customized organization', async () => {
    setPendingSignupOrganizationName('Fleet Co');
    const updateFn = vi.fn();
    from.mockImplementation((table: string) => {
      if (table === 'personal_organizations') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: { organization_id: 'org-1' }, error: null }),
            }),
          }),
        };
      }
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: () =>
              Promise.resolve({
                data: {
                  id: 'org-1',
                  name: 'Existing Fleet',
                  created_at: new Date().toISOString(),
                },
                error: null,
              }),
          }),
        }),
        update: updateFn,
      };
    });

    await applyPendingSignupOrganizationName('user-1');

    expect(updateFn).not.toHaveBeenCalled();
    expect(getPendingSignupOrganizationName()).toBeNull();
  });

  it('leaves the pending name in place when the personal org query fails', async () => {
    setPendingSignupOrganizationName('Fleet Co');
    from.mockImplementation(() => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve({ data: null, error: { message: 'boom' } }),
        }),
      }),
    }));

    await applyPendingSignupOrganizationName('user-1');

    expect(getPendingSignupOrganizationName()).toBe('Fleet Co');
    clearPendingSignupOrganizationName();
    expect(getPendingSignupOrganizationName()).toBeNull();
  });
});
