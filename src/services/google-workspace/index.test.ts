import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getWorkspaceOnboardingState,
  createWorkspaceOrganizationForDomain,
  getGoogleWorkspaceConnectionStatus,
  syncGoogleWorkspaceUsers,
  listWorkspaceDirectoryUsers,
  listWorkspaceDirectoryUsersLight,
  selectGoogleWorkspaceMembers,
} from './index';

const rpcMock = vi.fn();
const fromMock = vi.fn();
const invokeMock = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpcMock(...args),
    from: (...args: unknown[]) => fromMock(...args),
    functions: {
      invoke: (...args: unknown[]) => invokeMock(...args),
    },
  },
}));

describe('Google Workspace Service Functions', () => {
  beforeEach(() => {
    rpcMock.mockReset();
    fromMock.mockReset();
    invokeMock.mockReset();
  });

  describe('getWorkspaceOnboardingState', () => {
    it('returns onboarding state for a user', async () => {
      const mockState = {
        email: 'user@example.com',
        domain: 'example.com',
        domain_status: 'unclaimed',
        workspace_org_id: null,
        is_workspace_connected: false,
      };

      rpcMock.mockResolvedValue({ data: [mockState], error: null });

      const result = await getWorkspaceOnboardingState('user-123');

      expect(rpcMock).toHaveBeenCalledWith('get_workspace_onboarding_state', {
        p_user_id: 'user-123',
      });
      expect(result).toEqual(mockState);
    });

    it('returns null when no data is returned', async () => {
      rpcMock.mockResolvedValue({ data: [], error: null });

      const result = await getWorkspaceOnboardingState('user-123');

      expect(result).toBeNull();
    });

    it('throws an error on RPC failure', async () => {
      rpcMock.mockResolvedValue({ data: null, error: { message: 'RPC failed' } });

      await expect(getWorkspaceOnboardingState('user-123')).rejects.toThrow('RPC failed');
    });
  });

  describe('createWorkspaceOrganizationForDomain', () => {
    it('returns organization data on success', async () => {
      const mockOrg = { organization_id: 'org-123', domain: 'example.com' };
      rpcMock.mockResolvedValue({ data: [mockOrg], error: null });

      const result = await createWorkspaceOrganizationForDomain('example.com', 'Example Org');

      expect(rpcMock).toHaveBeenCalledWith('create_workspace_organization_for_domain', {
        p_domain: 'example.com',
        p_organization_name: 'Example Org',
      });
      expect(result).toEqual(mockOrg);
    });

    it('throws an error when no data returned', async () => {
      rpcMock.mockResolvedValue({ data: [], error: null });

      await expect(
        createWorkspaceOrganizationForDomain('example.com', 'Example Org')
      ).rejects.toThrow('Failed to create workspace organization');
    });
  });

  describe('getGoogleWorkspaceConnectionStatus', () => {
    it('returns connection status when connected', async () => {
      const mockStatus = {
        is_connected: true,
        domain: 'example.com',
        connected_at: '2026-01-18T00:00:00Z',
        access_token_expires_at: '2026-01-18T01:00:00Z',
        scopes: 'admin.directory.user.readonly',
      };
      rpcMock.mockResolvedValue({ data: [mockStatus], error: null });

      const result = await getGoogleWorkspaceConnectionStatus('org-123');

      expect(rpcMock).toHaveBeenCalledWith('get_google_workspace_connection_status', {
        p_organization_id: 'org-123',
      });
      expect(result).toEqual(mockStatus);
    });

    it('returns disconnected status when no data', async () => {
      rpcMock.mockResolvedValue({ data: [], error: null });

      const result = await getGoogleWorkspaceConnectionStatus('org-123');

      expect(result).toEqual({
        is_connected: false,
        domain: null,
        connected_at: null,
        access_token_expires_at: null,
        scopes: null,
      });
    });
  });

  describe('syncGoogleWorkspaceUsers', () => {
    it('returns synced user count on success', async () => {
      invokeMock.mockResolvedValue({
        data: { success: true, usersSynced: 25 },
        error: null,
      });

      const result = await syncGoogleWorkspaceUsers('org-123');

      expect(invokeMock).toHaveBeenCalledWith('google-workspace-sync-users', {
        body: { organizationId: 'org-123' },
      });
      expect(result).toEqual({ usersSynced: 25 });
    });

    it('throws an error on invoke failure', async () => {
      invokeMock.mockResolvedValue({
        data: null,
        error: { message: 'Function invocation failed' },
      });

      await expect(syncGoogleWorkspaceUsers('org-123')).rejects.toThrow('Function invocation failed');
    });

    it('throws an error when success is false', async () => {
      invokeMock.mockResolvedValue({
        data: { success: false },
        error: null,
      });

      await expect(syncGoogleWorkspaceUsers('org-123')).rejects.toThrow(
        'Failed to sync Google Workspace users'
      );
    });
  });

  describe('listWorkspaceDirectoryUsers', () => {
    it('returns list of directory users', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          organization_id: 'org-123',
          google_user_id: 'google-1',
          primary_email: 'alice@example.com',
          full_name: 'Alice Smith',
          given_name: 'Alice',
          family_name: 'Smith',
          suspended: false,
          org_unit_path: '/',
          last_synced_at: '2026-01-18T00:00:00Z',
        },
        {
          id: 'user-2',
          organization_id: 'org-123',
          google_user_id: 'google-2',
          primary_email: 'bob@example.com',
          full_name: 'Bob Jones',
          given_name: 'Bob',
          family_name: 'Jones',
          suspended: false,
          org_unit_path: '/',
          last_synced_at: '2026-01-18T00:00:00Z',
        },
      ];

      const selectMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: mockUsers, error: null }),
        }),
      });
      fromMock.mockReturnValue({ select: selectMock });

      const result = await listWorkspaceDirectoryUsers('org-123');

      expect(fromMock).toHaveBeenCalledWith('google_workspace_directory_users');
      expect(result).toEqual(mockUsers);
      expect(result).toHaveLength(2);
    });

    it('returns empty array when no users found', async () => {
      const selectMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      });
      fromMock.mockReturnValue({ select: selectMock });

      const result = await listWorkspaceDirectoryUsers('org-123');

      expect(result).toEqual([]);
    });

    it('throws an error on query failure', async () => {
      const selectMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: null, error: { message: 'Query failed' } }),
        }),
      });
      fromMock.mockReturnValue({ select: selectMock });

      await expect(listWorkspaceDirectoryUsers('org-123')).rejects.toThrow('Query failed');
    });
  });

  describe('listWorkspaceDirectoryUsersLight', () => {
    it('returns list of directory users with only essential fields', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          primary_email: 'alice@example.com',
          full_name: 'Alice Smith',
          suspended: false,
        },
        {
          id: 'user-2',
          primary_email: 'bob@example.com',
          full_name: 'Bob Jones',
          suspended: false,
        },
      ];

      const selectMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: mockUsers, error: null }),
        }),
      });
      fromMock.mockReturnValue({ select: selectMock });

      const result = await listWorkspaceDirectoryUsersLight('org-123');

      expect(fromMock).toHaveBeenCalledWith('google_workspace_directory_users');
      expect(selectMock).toHaveBeenCalledWith('id, primary_email, full_name, suspended');
      expect(result).toEqual(mockUsers);
      expect(result).toHaveLength(2);
    });

    it('returns empty array when no users found', async () => {
      const selectMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      });
      fromMock.mockReturnValue({ select: selectMock });

      const result = await listWorkspaceDirectoryUsersLight('org-123');

      expect(result).toEqual([]);
    });

    it('throws an error on query failure', async () => {
      const selectMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: null, error: { message: 'Query failed' } }),
        }),
      });
      fromMock.mockReturnValue({ select: selectMock });

      await expect(listWorkspaceDirectoryUsersLight('org-123')).rejects.toThrow('Query failed');
    });
  });

  describe('selectGoogleWorkspaceMembers', () => {
    it('returns member selection result with members and admins', async () => {
      const mockResult = {
        members_added: 5,
        admin_applied: 2,
        admin_pending: 1,
      };
      rpcMock.mockResolvedValue({ data: mockResult, error: null });

      const result = await selectGoogleWorkspaceMembers(
        'org-123',
        ['alice@example.com', 'bob@example.com'],
        ['alice@example.com']
      );

      expect(rpcMock).toHaveBeenCalledWith('select_google_workspace_members', {
        p_organization_id: 'org-123',
        p_emails: ['alice@example.com', 'bob@example.com'],
        p_admin_emails: ['alice@example.com'],
      });
      expect(result).toEqual(mockResult);
    });

    it('handles empty email arrays', async () => {
      const mockResult = {
        members_added: 0,
        admin_applied: 0,
        admin_pending: 0,
      };
      rpcMock.mockResolvedValue({ data: mockResult, error: null });

      const result = await selectGoogleWorkspaceMembers('org-123', [], []);

      expect(result).toEqual(mockResult);
    });

    it('throws an error on RPC failure', async () => {
      rpcMock.mockResolvedValue({
        data: null,
        error: { message: 'Only organization administrators can add members' },
      });

      await expect(
        selectGoogleWorkspaceMembers('org-123', ['alice@example.com'], [])
      ).rejects.toThrow('Only organization administrators can add members');
    });
  });
});
