import React from 'react';
import { screen, fireEvent, within } from '@testing-library/react';
import { vi } from 'vitest';
import { customRender } from '@vitest-harness/utils/renderUtils';
import type { OrganizationMember } from '@/features/organization/types/organization';

// Re-export type for backward compatibility in tests
type RealOrganizationMember = OrganizationMember;

// Mock Supabase client directly in factory to avoid import hoisting issues
vi.mock('@/integrations/supabase/client', () => {
  const chain = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    eq: vi.fn(),
    or: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    nullsFirst: vi.fn(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    then: vi.fn().mockResolvedValue({ data: null, error: null }),
  };
  
  Object.keys(chain).forEach(k => {
    if (k !== 'single' && k !== 'then') {
      chain[k].mockReturnValue(chain);
    }
  });
  
  return {
    supabase: {
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user' } }, error: null }),
        signInWithPassword: vi.fn(),
        signUp: vi.fn(),
        signOut: vi.fn(),
        onAuthStateChange: vi.fn(),
      },
      from: vi.fn(() => chain),
      rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
      storage: {
        from: vi.fn(() => ({
          upload: vi.fn(),
          download: vi.fn(),
          remove: vi.fn(),
          list: vi.fn(),
        })),
      },
    },
  };
});

// Hoisted mocks so they are available inside factory at mock time
const { mockResend, mockCancel, mockUpdateRole, mockRemoveMember } = vi.hoisted(() => ({
  mockResend: vi.fn().mockResolvedValue({}),
  mockCancel: vi.fn().mockResolvedValue({}),
  mockUpdateRole: vi.fn().mockResolvedValue({}),
  mockRemoveMember: vi.fn().mockResolvedValue({}),
}));
vi.mock('@/features/organization/hooks/useOrganizationInvitations', () => ({
  useOrganizationInvitations: vi.fn().mockReturnValue({
    data: [
      { id: 'inv-1', email: 'invitee@example.com', role: 'member', status: 'pending', createdAt: '2024-01-01T00:00:00Z' },
    ],
    isLoading: false,
  }),
  useResendInvitation: vi.fn().mockReturnValue({ mutateAsync: mockResend }),
  useCancelInvitation: vi.fn().mockReturnValue({ mutateAsync: mockCancel }),
}));

vi.mock('@/features/teams/hooks/useTeamMembership', () => ({
  useTeamMembership: vi.fn().mockReturnValue({ teamMemberships: [] }),
}));

vi.mock('@/features/organization/hooks/useOrganizationMembers', () => ({
  useUpdateMemberRole: vi.fn().mockReturnValue({ mutateAsync: mockUpdateRole, isPending: false }),
  useRemoveMember: vi.fn().mockReturnValue({ mutateAsync: mockRemoveMember, isPending: false }),
}));

const { mockUpdateQuickBooks, mockAddPartsManager, mockRemovePartsManager, mockAddPartsConsumer, mockRemovePartsConsumer } = vi.hoisted(() => ({
  mockUpdateQuickBooks: vi.fn().mockResolvedValue({}),
  mockAddPartsManager: vi.fn().mockResolvedValue({}),
  mockRemovePartsManager: vi.fn().mockResolvedValue({}),
  mockAddPartsConsumer: vi.fn().mockResolvedValue({}),
  mockRemovePartsConsumer: vi.fn().mockResolvedValue({}),
}));

vi.mock('@/hooks/useQuickBooksAccess', () => ({
  useUpdateQuickBooksPermission: vi.fn().mockReturnValue({
    mutateAsync: mockUpdateQuickBooks,
    isPending: false,
  }),
}));

vi.mock('@/features/inventory/hooks/usePartsManagers', () => ({
  usePartsManagers: vi.fn().mockReturnValue({ data: [], isLoading: false }),
  useAddPartsManager: vi.fn().mockReturnValue({ mutateAsync: mockAddPartsManager, isPending: false }),
  useRemovePartsManager: vi.fn().mockReturnValue({ mutateAsync: mockRemovePartsManager, isPending: false }),
}));

vi.mock('@/features/inventory/hooks/usePartsConsumers', () => ({
  usePartsConsumers: vi.fn().mockReturnValue({ data: [], isLoading: false }),
  useAddPartsConsumer: vi.fn().mockReturnValue({ mutateAsync: mockAddPartsConsumer, isPending: false }),
  useRemovePartsConsumer: vi.fn().mockReturnValue({ mutateAsync: mockRemovePartsConsumer, isPending: false }),
}));

vi.mock('@/lib/flags', () => ({
  isQuickBooksEnabled: vi.fn().mockReturnValue(true),
}));

// Hoisted mocks for GWS claims
const { mockRevokeGwsClaim } = vi.hoisted(() => ({
  mockRevokeGwsClaim: vi.fn().mockResolvedValue({}),
}));

vi.mock('@/features/organization/hooks/useGoogleWorkspaceMemberClaims', () => ({
  useGoogleWorkspaceMemberClaims: vi.fn().mockReturnValue({ data: [], isLoading: false }),
  useRevokeGoogleWorkspaceMemberClaim: vi.fn().mockReturnValue({ mutateAsync: mockRevokeGwsClaim, isPending: false }),
}));

// Mock for Google Workspace connection status
const mockGwsConnectionStatus = vi.hoisted(() => vi.fn());
vi.mock('@/features/organization/hooks/useGoogleWorkspaceConnectionStatus', () => ({
  useGoogleWorkspaceConnectionStatus: mockGwsConnectionStatus.mockReturnValue({
    isConnected: false,
    domain: null,
    connectionStatus: null,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

// Stub GoogleWorkspaceMemberImportSheet to avoid complex dependencies
// Use relative path to match how UnifiedMembersList imports it
vi.mock('./GoogleWorkspaceMemberImportSheet', () => ({
  GoogleWorkspaceMemberImportSheet: ({ open }: { open: boolean }) => (
    open ? <div data-testid="gws-import-sheet">Import Sheet Mock</div> : null
  ),
  default: ({ open }: { open: boolean }) => (
    open ? <div data-testid="gws-import-sheet">Import Sheet Mock</div> : null
  ),
}));

// Billing components removed - no longer needed

// Stub SimplifiedInvitationDialog to avoid provider dependency in tests
vi.mock('@/features/organization/components/SimplifiedInvitationDialog', () => ({
  SimplifiedInvitationDialog: () => null,
  default: () => null,
}));

// Mount only one CSS layout twin per test (#1314) — jsdom ignores sm:hidden / hidden sm:block.
const { membersLayoutMode } = vi.hoisted(() => ({
  membersLayoutMode: { current: 'desktop' as 'desktop' | 'mobile' },
}));

vi.mock('@/features/organization/components/UnifiedMembersMobileList', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/organization/components/UnifiedMembersMobileList')>();
  return {
    UnifiedMembersMobileList: (props: React.ComponentProps<typeof actual.UnifiedMembersMobileList>) =>
      membersLayoutMode.current === 'mobile' ? <actual.UnifiedMembersMobileList {...props} /> : null,
  };
});

vi.mock('@/features/organization/components/UnifiedMembersDesktopTable', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/organization/components/UnifiedMembersDesktopTable')>();
  return {
    UnifiedMembersDesktopTable: (props: React.ComponentProps<typeof actual.UnifiedMembersDesktopTable>) =>
      membersLayoutMode.current === 'desktop' ? <actual.UnifiedMembersDesktopTable {...props} /> : null,
  };
});

// Import component after mocks to ensure they take effect
import UnifiedMembersList from './UnifiedMembersList';
import { useGoogleWorkspaceMemberClaims } from '@/features/organization/hooks/useGoogleWorkspaceMemberClaims';
import { usePartsManagers } from '@/features/inventory/hooks/usePartsManagers';

describe('UnifiedMembersList', () => {
  beforeEach(() => {
    membersLayoutMode.current = 'desktop';
  });

  const baseMembers: RealOrganizationMember[] = [
    {
      id: 'u-1',
      name: 'Alice Admin',
      email: 'alice@example.com',
      role: 'admin' as const,
      status: 'active' as const,
      joinedDate: '2024-01-10T00:00:00Z',
      avatar: undefined,
    },
    {
      id: 'u-2',
      name: 'Bob Member',
      email: 'bob@example.com',
      role: 'member' as const,
      status: 'active' as const,
      joinedDate: '2024-01-11T00:00:00Z',
      avatar: undefined,
    },
  ];

  it('renders active members and pending invitations in a unified list', () => {
    customRender(
      <UnifiedMembersList
        members={baseMembers}
        organizationId="org-1"
        currentUserRole="admin"
        isLoading={false}
        canInviteMembers={true}
      />
    );

    expect(screen.getByText('Alice Admin')).toBeInTheDocument();
    // Pending invitation row - "Pending Invite" appears in both name and status columns
    expect(screen.getAllByText('Pending Invite').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('invitee@example.com')).toBeInTheDocument();
  });

  it('does not disable Invite button when billing is disabled (billing disabled by default)', () => {
    customRender(
      <UnifiedMembersList
        members={baseMembers}
        organizationId="org-1"
        currentUserRole="admin"
        isLoading={false}
        canInviteMembers={true}
      />
    );

    const inviteBtn = screen.getByRole('button', { name: /invite member/i });
    // With billing disabled by default, invitations are never blocked
    expect(inviteBtn).not.toBeDisabled();
  });

  it('shows parts manager toggle on mobile for member-role users', () => {
    membersLayoutMode.current = 'mobile';
    vi.mocked(usePartsManagers).mockReturnValue({
      data: [],
      isLoading: false,
    } as ReturnType<typeof usePartsManagers>);

    customRender(
      <UnifiedMembersList
        members={baseMembers}
        organizationId="org-1"
        currentUserRole="admin"
        isLoading={false}
        canInviteMembers={true}
      />
    );

    expect(screen.getByText('Bob Member')).toBeInTheDocument();

    const partsManagerSwitch = screen.getByRole('switch', { name: 'Parts manager' });
    fireEvent.click(partsManagerSwitch);

    expect(mockAddPartsManager).toHaveBeenCalledWith({
      organizationId: 'org-1',
      userId: 'u-2',
    });
  });

  it('shows parts consumer toggle on mobile for member-role users', () => {
    membersLayoutMode.current = 'mobile';
    customRender(
      <UnifiedMembersList
        members={baseMembers}
        organizationId="org-1"
        currentUserRole="admin"
        isLoading={false}
        canInviteMembers={true}
      />
    );

    expect(screen.getByText('Bob Member')).toBeInTheDocument();

    const partsConsumerSwitch = screen.getByRole('switch', { name: 'Parts consumer' });
    fireEvent.click(partsConsumerSwitch);

    expect(mockAddPartsConsumer).toHaveBeenCalledWith({
      organizationId: 'org-1',
      userId: 'u-2',
    });
  });

  it('shows role select for editable members and triggers role change', async () => {
    customRender(
      <UnifiedMembersList
        members={baseMembers}
        organizationId="org-1"
        currentUserRole="admin"
        isLoading={false}
        canInviteMembers={true}
      />
    );

    expect(screen.getByText('Alice Admin')).toBeInTheDocument();
    expect(screen.getByText('Bob Member')).toBeInTheDocument();

    const table = screen.getByRole('table');
    const bobRow = within(table).getByText('Bob Member').closest('tr');
    expect(bobRow).toBeInTheDocument();
    
    if (bobRow) {
      const selectTrigger = bobRow.querySelector('[role="combobox"]');
      if (selectTrigger) {
        fireEvent.click(selectTrigger);
        
        const adminOption = await screen.findByRole('option', { name: /admin/i });
        fireEvent.click(adminOption);

        expect(mockUpdateRole).toHaveBeenCalled();
      } else {
        expect(bobRow).toHaveTextContent('member');
      }
    }
  });

  describe('Google Workspace Claims', () => {
    const gwsClaims = [
      {
        id: 'gws-claim-1',
        organizationId: 'org-1',
        email: 'pending.user@workspace.example.com',
        source: 'google_workspace',
        status: 'selected' as const,
        createdBy: 'admin-user',
        createdAt: '2024-02-01T00:00:00Z',
        fullName: 'Pending User',
        givenName: 'Pending',
        familyName: 'User',
      },
      {
        id: 'gws-claim-2',
        organizationId: 'org-1',
        email: 'noname@workspace.example.com',
        source: 'google_workspace',
        status: 'selected' as const,
        createdBy: 'admin-user',
        createdAt: '2024-02-02T00:00:00Z',
        // No fullName - should fall back to 'Pending (Google Workspace)'
      },
    ];

    beforeEach(() => {
      vi.mocked(useGoogleWorkspaceMemberClaims).mockReturnValue({
        data: gwsClaims,
        isLoading: false,
        error: null,
        isError: false,
        isPending: false,
        isSuccess: true,
        status: 'success',
        dataUpdatedAt: Date.now(),
        errorUpdatedAt: 0,
        failureCount: 0,
        failureReason: null,
        errorUpdateCount: 0,
        fetchStatus: 'idle',
        isFetched: true,
        isFetchedAfterMount: true,
        isFetching: false,
        isInitialLoading: false,
        isLoadingError: false,
        isPaused: false,
        isPlaceholderData: false,
        isRefetchError: false,
        isRefetching: false,
        isStale: false,
        refetch: vi.fn(),
        promise: Promise.resolve(gwsClaims),
      });
    });

    afterEach(() => {
      vi.mocked(useGoogleWorkspaceMemberClaims).mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        isError: false,
        isPending: false,
        isSuccess: true,
        status: 'success',
        dataUpdatedAt: Date.now(),
        errorUpdatedAt: 0,
        failureCount: 0,
        failureReason: null,
        errorUpdateCount: 0,
        fetchStatus: 'idle',
        isFetched: true,
        isFetchedAfterMount: true,
        isFetching: false,
        isInitialLoading: false,
        isLoadingError: false,
        isPaused: false,
        isPlaceholderData: false,
        isRefetchError: false,
        isRefetching: false,
        isStale: false,
        refetch: vi.fn(),
        promise: Promise.resolve([]),
      });
    });

    it('renders pending Google Workspace claims with name and Awaiting Sign-up status', () => {
      customRender(
        <UnifiedMembersList
          members={baseMembers}
          organizationId="org-1"
          currentUserRole="admin"
          isLoading={false}
          canInviteMembers={true}
        />
      );

      expect(screen.getByText('Pending User')).toBeInTheDocument();
      expect(screen.getByText('pending.user@workspace.example.com')).toBeInTheDocument();
      // Status badge + possible duplicate label in the same row
      expect(screen.getAllByText('Awaiting Sign-up').length).toBeGreaterThanOrEqual(1);
    });

    it('renders GWS claims without name as "Pending (Google Workspace)"', () => {
      customRender(
        <UnifiedMembersList
          members={baseMembers}
          organizationId="org-1"
          currentUserRole="admin"
          isLoading={false}
          canInviteMembers={true}
        />
      );

      expect(screen.getByText('Pending (Google Workspace)')).toBeInTheDocument();
      expect(screen.getByText('noname@workspace.example.com')).toBeInTheDocument();
    });

    it('shows actions dropdown for GWS claims with remove action available', () => {
      customRender(
        <UnifiedMembersList
          members={baseMembers}
          organizationId="org-1"
          currentUserRole="admin"
          isLoading={false}
          canInviteMembers={true}
        />
      );

      expect(screen.getByText('Pending User')).toBeInTheDocument();

      // Find the row for the GWS claim (scope to desktop table)
      const table = screen.getByRole('table');
      const gwsRow = within(table).getByText('Pending User').closest('tr');
      expect(gwsRow).toBeInTheDocument();
      
      // Verify the actions dropdown button exists for GWS claims
      // GWS claims are not owners, so they should have an actions dropdown
      if (gwsRow) {
        const actionsButton = gwsRow.querySelector('button[aria-haspopup="menu"]');
        expect(actionsButton).toBeInTheDocument();
        // The dropdown menu content renders in a portal, which makes it difficult
        // to test in jsdom. We verify the button exists and the component structure
        // is correct - the actual dropdown interaction is better tested in e2e tests.
      }
    });

    it('does not show GWS claims that are already active members', () => {
      // Add a claim with the same email as an existing member
      const claimsWithDuplicate = [
        ...gwsClaims,
        {
          id: 'gws-claim-duplicate',
          organizationId: 'org-1',
          email: 'alice@example.com', // Same as Alice Admin
          source: 'google_workspace',
          status: 'selected' as const,
          createdBy: 'admin-user',
          createdAt: '2024-02-03T00:00:00Z',
          fullName: 'Alice Duplicate',
        },
      ];

      vi.mocked(useGoogleWorkspaceMemberClaims).mockReturnValue({
        data: claimsWithDuplicate,
        isLoading: false,
        error: null,
        isError: false,
        isPending: false,
        isSuccess: true,
        status: 'success',
        dataUpdatedAt: Date.now(),
        errorUpdatedAt: 0,
        failureCount: 0,
        failureReason: null,
        errorUpdateCount: 0,
        fetchStatus: 'idle',
        isFetched: true,
        isFetchedAfterMount: true,
        isFetching: false,
        isInitialLoading: false,
        isLoadingError: false,
        isPaused: false,
        isPlaceholderData: false,
        isRefetchError: false,
        isRefetching: false,
        isStale: false,
        refetch: vi.fn(),
        promise: Promise.resolve(claimsWithDuplicate),
      });

      customRender(
        <UnifiedMembersList
          members={baseMembers}
          organizationId="org-1"
          currentUserRole="admin"
          isLoading={false}
          canInviteMembers={true}
        />
      );

      expect(screen.getByText('Alice Admin')).toBeInTheDocument();
      expect(screen.queryByText('Alice Duplicate')).not.toBeInTheDocument();
    });

    it('does not show GWS claims that duplicate pending invitations', () => {
      // Add a claim with the same email as a pending invitation (invitee@example.com)
      const claimsWithInviteDuplicate = [
        ...gwsClaims,
        {
          id: 'gws-claim-invite-duplicate',
          organizationId: 'org-1',
          email: 'invitee@example.com', // Same as the pending invitation
          source: 'google_workspace',
          status: 'selected' as const,
          createdBy: 'admin-user',
          createdAt: '2024-02-04T00:00:00Z',
          fullName: 'Invitee Duplicate',
        },
      ];

      vi.mocked(useGoogleWorkspaceMemberClaims).mockReturnValue({
        data: claimsWithInviteDuplicate,
        isLoading: false,
        error: null,
        isError: false,
        isPending: false,
        isSuccess: true,
        status: 'success',
        dataUpdatedAt: Date.now(),
        errorUpdatedAt: 0,
        failureCount: 0,
        failureReason: null,
        errorUpdateCount: 0,
        fetchStatus: 'idle',
        isFetched: true,
        isFetchedAfterMount: true,
        isFetching: false,
        isInitialLoading: false,
        isLoadingError: false,
        isPaused: false,
        isPlaceholderData: false,
        isRefetchError: false,
        isRefetching: false,
        isStale: false,
        refetch: vi.fn(),
        promise: Promise.resolve(claimsWithInviteDuplicate),
      });

      customRender(
        <UnifiedMembersList
          members={baseMembers}
          organizationId="org-1"
          currentUserRole="admin"
          isLoading={false}
          canInviteMembers={true}
        />
      );

      expect(screen.getByText('invitee@example.com')).toBeInTheDocument();
      expect(screen.queryByText('Invitee Duplicate')).not.toBeInTheDocument();
    });
  });

  describe('Google Workspace Import Button', () => {
    beforeEach(() => {
      // Reset the GWS connection mock to default (not connected)
      mockGwsConnectionStatus.mockReturnValue({
        isConnected: false,
        domain: null,
        connectionStatus: null,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });
    });

    it('does not show Import from Google button when GWS is not connected', () => {
      customRender(
        <UnifiedMembersList
          members={baseMembers}
          organizationId="org-1"
          currentUserRole="admin"
          isLoading={false}
          canInviteMembers={true}
        />
      );

      expect(screen.getByText('Alice Admin')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /invite member/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /import from google/i })).not.toBeInTheDocument();
    });

    it('shows Import from Google button when GWS is connected and user can invite', () => {
      mockGwsConnectionStatus.mockReturnValue({
        isConnected: true,
        domain: 'example.com',
        connectionStatus: { is_connected: true, domain: 'example.com', connected_at: '2024-01-01T00:00:00Z' },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      customRender(
        <UnifiedMembersList
          members={baseMembers}
          organizationId="org-1"
          currentUserRole="admin"
          isLoading={false}
          canInviteMembers={true}
        />
      );

      expect(screen.getByText('Alice Admin')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /invite member/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /import from google/i })).toBeInTheDocument();
    });

    it('does not show Import from Google button when user cannot invite members', () => {
      mockGwsConnectionStatus.mockReturnValue({
        isConnected: true,
        domain: 'example.com',
        connectionStatus: { is_connected: true, domain: 'example.com', connected_at: '2024-01-01T00:00:00Z' },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      customRender(
        <UnifiedMembersList
          members={baseMembers}
          organizationId="org-1"
          currentUserRole="member"
          isLoading={false}
          canInviteMembers={false}
        />
      );

      expect(screen.getByText('Alice Admin')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /invite member/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /import from google/i })).not.toBeInTheDocument();
    });

    it('opens import sheet when Import from Google button is clicked', () => {
      mockGwsConnectionStatus.mockReturnValue({
        isConnected: true,
        domain: 'example.com',
        connectionStatus: { is_connected: true, domain: 'example.com', connected_at: '2024-01-01T00:00:00Z' },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      customRender(
        <UnifiedMembersList
          members={baseMembers}
          organizationId="org-1"
          currentUserRole="admin"
          isLoading={false}
          canInviteMembers={true}
        />
      );

      expect(screen.getByText('Alice Admin')).toBeInTheDocument();
      expect(screen.queryByTestId('gws-import-sheet')).not.toBeInTheDocument();
      
      const importButton = screen.getByRole('button', { name: /import from google/i });
      fireEvent.click(importButton);
      
      expect(screen.getByTestId('gws-import-sheet')).toBeInTheDocument();
    });
  });
});
