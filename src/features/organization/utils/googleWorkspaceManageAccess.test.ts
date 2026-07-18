import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  assertCanManageGoogleWorkspaceIntegration,
  canManageGoogleWorkspaceIntegration,
  getOrganizationRoleFromSession,
  GOOGLE_WORKSPACE_MANAGE_DENIED_MESSAGE,
  resolveGoogleWorkspaceManageAccess,
} from './googleWorkspaceManageAccess';
import type { SessionData } from '@/types/session';

const mockGetUser = vi.fn();
const mockMaybeSingle = vi.fn();
const mockEqStatus = vi.fn(() => ({ maybeSingle: mockMaybeSingle }));
const mockEqUser = vi.fn(() => ({ eq: mockEqStatus }));
const mockEqOrg = vi.fn(() => ({ eq: mockEqUser }));
const mockSelect = vi.fn(() => ({ eq: mockEqOrg }));
const mockFrom = vi.fn(() => ({ select: mockSelect }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: (...args: unknown[]) => mockGetUser(...args),
    },
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

const sessionData: SessionData = {
  organizations: [
    {
      id: 'org-123',
      name: 'Workspace Org',
      plan: 'free',
      memberCount: 1,
      maxMembers: 25,
      features: [],
      scanLocationCollectionEnabled: false,
      userRole: 'member',
      userStatus: 'active',
    },
    {
      id: 'org-admin',
      name: 'Admin Org',
      plan: 'free',
      memberCount: 1,
      maxMembers: 25,
      features: [],
      scanLocationCollectionEnabled: false,
      userRole: 'admin',
      userStatus: 'active',
    },
  ],
  currentOrganizationId: 'org-123',
  teamMemberships: [],
  lastUpdated: new Date().toISOString(),
  version: 2,
};

describe('googleWorkspaceManageAccess', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows owner and admin roles only', () => {
    expect(canManageGoogleWorkspaceIntegration('owner')).toBe(true);
    expect(canManageGoogleWorkspaceIntegration('admin')).toBe(true);
    expect(canManageGoogleWorkspaceIntegration('member')).toBe(false);
    expect(canManageGoogleWorkspaceIntegration(undefined)).toBe(false);
  });

  it('resolves manage access from session organization membership', () => {
    expect(getOrganizationRoleFromSession(sessionData, 'org-123')).toBe('member');
    expect(resolveGoogleWorkspaceManageAccess('org-admin', sessionData)).toBe(true);
    expect(resolveGoogleWorkspaceManageAccess('org-123', sessionData)).toBe(false);
  });

  it('assertCanManageGoogleWorkspaceIntegration rejects non-admin members', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    mockMaybeSingle.mockResolvedValue({ data: { role: 'member' }, error: null });

    await expect(assertCanManageGoogleWorkspaceIntegration('org-123')).rejects.toThrow(
      GOOGLE_WORKSPACE_MANAGE_DENIED_MESSAGE,
    );
  });

  it('assertCanManageGoogleWorkspaceIntegration allows admins before disconnect', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    mockMaybeSingle.mockResolvedValue({ data: { role: 'admin' }, error: null });

    await expect(assertCanManageGoogleWorkspaceIntegration('org-123')).resolves.toBeUndefined();
  });
});
