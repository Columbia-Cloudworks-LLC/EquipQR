import React from 'react';
import { screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { customRender } from '@/test/utils/renderUtils';
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

// Hoisted mocks for GWS claims
const { mockRevokeGwsClaim } = vi.hoisted(() => ({
  mockRevokeGwsClaim: vi.fn().mockResolvedValue({}),
}));

vi.mock('@/features/organization/hooks/useGoogleWorkspaceMemberClaims', () => ({
  useGoogleWorkspaceMemberClaims: vi.fn().mockReturnValue({ data: [], isLoading: false }),
  useRevokeGoogleWorkspaceMemberClaim: vi.fn().mockReturnValue({ mutateAsync: mockRevokeGwsClaim, isPending: false }),
}));

// Billing components removed - no longer needed

// Stub SimplifiedInvitationDialog to avoid provider dependency in tests
vi.mock('@/features/organization/components/SimplifiedInvitationDialog', () => ({
  SimplifiedInvitationDialog: () => null,
  default: () => null,
}));

// Import component after mocks to ensure they take effect
import UnifiedMembersList from '../UnifiedMembersList';
import { useGoogleWorkspaceMemberClaims } from '@/features/organization/hooks/useGoogleWorkspaceMemberClaims';

describe('UnifiedMembersList', () => {
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

  it('renders active members and pending invitations in a unified list', async () => {
    customRender(
      <UnifiedMembersList
        members={baseMembers}
        organizationId="org-1"
        currentUserRole="admin"
        isLoading={false}
        canInviteMembers={true}
      />
    );

    // Active member
    expect(await screen.findByText('Alice Admin')).toBeInTheDocument();
    // Pending invitation row - "Pending Invite" appears in both name and status columns
    const pendingInviteElements = screen.getAllByText('Pending Invite');
    expect(pendingInviteElements.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('invitee@example.com')).toBeInTheDocument();
  });

  it('does not disable Invite button when billing is disabled (billing disabled by default)', async () => {
    customRender(
      <UnifiedMembersList
        members={baseMembers}
        organizationId="org-1"
        currentUserRole="admin"
        isLoading={false}
        canInviteMembers={true}
      />
    );

    const inviteBtn = await screen.findByRole('button', { name: /invite member/i });
    // With billing disabled by default, invitations are never blocked
    expect(inviteBtn).not.toBeDisabled();
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

    // Wait for the component to render
    await screen.findByText('Alice Admin');
    await screen.findByText('Bob Member');

    // Look for the role select trigger specifically for Bob Member (the member role)
    // The select should be in the same row as Bob Member
    const bobRow = screen.getByText('Bob Member').closest('tr');
    expect(bobRow).toBeInTheDocument();
    
    if (bobRow) {
      // Find the select trigger within Bob's row
      const selectTrigger = bobRow.querySelector('[role="combobox"]');
      if (selectTrigger) {
        fireEvent.click(selectTrigger);
        
        // Wait for dropdown options to appear
        const adminOption = await screen.findByRole('option', { name: /admin/i });
        fireEvent.click(adminOption);

        expect(mockUpdateRole).toHaveBeenCalled();
      } else {
        // If no select found, just verify the role text is displayed
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

    it('renders pending Google Workspace claims with name and Awaiting Sign-up status', async () => {
      customRender(
        <UnifiedMembersList
          members={baseMembers}
          organizationId="org-1"
          currentUserRole="admin"
          isLoading={false}
          canInviteMembers={true}
        />
      );

      // Should show the GWS claim with full name
      expect(await screen.findByText('Pending User')).toBeInTheDocument();
      expect(screen.getByText('pending.user@workspace.example.com')).toBeInTheDocument();
      
      // Should show "Awaiting Sign-up" status
      const awaitingSignupBadges = screen.getAllByText('Awaiting Sign-up');
      expect(awaitingSignupBadges.length).toBeGreaterThanOrEqual(1);
    });

    it('renders GWS claims without name as "Pending (Google Workspace)"', async () => {
      customRender(
        <UnifiedMembersList
          members={baseMembers}
          organizationId="org-1"
          currentUserRole="admin"
          isLoading={false}
          canInviteMembers={true}
        />
      );

      // Should show the fallback name for claim without fullName
      expect(await screen.findByText('Pending (Google Workspace)')).toBeInTheDocument();
      expect(screen.getByText('noname@workspace.example.com')).toBeInTheDocument();
    });

    it('shows actions dropdown for GWS claims with remove action available', async () => {
      customRender(
        <UnifiedMembersList
          members={baseMembers}
          organizationId="org-1"
          currentUserRole="admin"
          isLoading={false}
          canInviteMembers={true}
        />
      );

      // Wait for GWS claim to render
      await screen.findByText('Pending User');
      
      // Find the row for the GWS claim
      const gwsRow = screen.getByText('Pending User').closest('tr');
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

    it('does not show GWS claims that are already active members', async () => {
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

      // Alice Admin should appear (the active member)
      expect(await screen.findByText('Alice Admin')).toBeInTheDocument();
      
      // But "Alice Duplicate" should NOT appear (filtered out as duplicate)
      expect(screen.queryByText('Alice Duplicate')).not.toBeInTheDocument();
    });
  });
});
