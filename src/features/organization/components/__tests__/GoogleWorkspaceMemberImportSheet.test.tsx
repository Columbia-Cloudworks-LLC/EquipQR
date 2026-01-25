import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { customRender } from '@/test/utils/renderUtils';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => {
  const chain = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  };
  
  Object.keys(chain).forEach(k => {
    if (k !== 'single') {
      chain[k as keyof typeof chain].mockReturnValue(chain);
    }
  });
  
  return {
    supabase: {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user' } }, error: null }),
      },
      from: vi.fn(() => chain),
      rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
      functions: {
        invoke: vi.fn().mockResolvedValue({ data: { success: true, usersSynced: 5 }, error: null }),
      },
    },
  };
});

// Mock google-workspace services
const mockSyncUsers = vi.fn();
const mockSelectMembers = vi.fn();
const mockListDirectoryUsersLight = vi.fn();

vi.mock('@/services/google-workspace', () => ({
  syncGoogleWorkspaceUsers: (...args: unknown[]) => mockSyncUsers(...args),
  selectGoogleWorkspaceMembers: (...args: unknown[]) => mockSelectMembers(...args),
  listWorkspaceDirectoryUsersLight: (...args: unknown[]) => mockListDirectoryUsersLight(...args),
}));

// Mock organization members query
vi.mock('@/features/organization/hooks/useOrganizationMembers', () => ({
  useOrganizationMembersQuery: vi.fn().mockReturnValue({ data: [], isLoading: false }),
}));

// Mock GWS member claims
vi.mock('@/features/organization/hooks/useGoogleWorkspaceMemberClaims', () => ({
  useGoogleWorkspaceMemberClaims: vi.fn().mockReturnValue({ data: [], isLoading: false }),
}));

// Import after mocks
import { GoogleWorkspaceMemberImportSheet } from '../GoogleWorkspaceMemberImportSheet';
import { useOrganizationMembersQuery } from '@/features/organization/hooks/useOrganizationMembers';
import { useGoogleWorkspaceMemberClaims } from '@/features/organization/hooks/useGoogleWorkspaceMemberClaims';

describe('GoogleWorkspaceMemberImportSheet', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    organizationId: 'org-123',
    domain: 'example.com',
  };

  const mockDirectoryUsers = [
    { id: 'user-1', primary_email: 'alice@example.com', full_name: 'Alice Smith', suspended: false },
    { id: 'user-2', primary_email: 'bob@example.com', full_name: 'Bob Jones', suspended: false },
    { id: 'user-3', primary_email: 'charlie@example.com', full_name: 'Charlie Brown', suspended: false },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockListDirectoryUsersLight.mockResolvedValue(mockDirectoryUsers);
    mockSyncUsers.mockResolvedValue({ usersSynced: 5 });
    mockSelectMembers.mockResolvedValue({ members_added: 2, admin_applied: 1, admin_pending: 0 });
    
    vi.mocked(useOrganizationMembersQuery).mockReturnValue({
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
    } as ReturnType<typeof useOrganizationMembersQuery>);
    
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

  it('renders the sheet with title and description', async () => {
    customRender(<GoogleWorkspaceMemberImportSheet {...defaultProps} />);

    expect(await screen.findByText('Import from Google Workspace')).toBeInTheDocument();
    expect(screen.getByText(/Select users from/)).toBeInTheDocument();
    expect(screen.getByText('example.com')).toBeInTheDocument();
  });

  it('shows sync directory button', async () => {
    customRender(<GoogleWorkspaceMemberImportSheet {...defaultProps} />);

    expect(await screen.findByRole('button', { name: /sync directory/i })).toBeInTheDocument();
  });

  describe('filtering existing members', () => {
    it('filters out existing organization members', async () => {
      vi.mocked(useOrganizationMembersQuery).mockReturnValue({
        data: [{ id: 'm-1', email: 'alice@example.com', name: 'Alice', role: 'member', status: 'active', joinedDate: '2024-01-01' }],
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
      } as ReturnType<typeof useOrganizationMembersQuery>);

      customRender(<GoogleWorkspaceMemberImportSheet {...defaultProps} />);

      await waitFor(() => {
        // Alice should be filtered out
        expect(screen.queryByText('alice@example.com')).not.toBeInTheDocument();
        // Bob and Charlie should still be visible
        expect(screen.getByText('bob@example.com')).toBeInTheDocument();
        expect(screen.getByText('charlie@example.com')).toBeInTheDocument();
      });

      // Should show info about filtered users
      expect(screen.getByText(/1 user.*already in organization/i)).toBeInTheDocument();
    });

    it('filters out pending GWS claims', async () => {
      vi.mocked(useGoogleWorkspaceMemberClaims).mockReturnValue({
        data: [{ id: 'claim-1', email: 'bob@example.com', organizationId: 'org-123', source: 'google_workspace', status: 'selected', createdBy: 'admin', createdAt: '2024-01-01' }],
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

      customRender(<GoogleWorkspaceMemberImportSheet {...defaultProps} />);

      await waitFor(() => {
        // Bob should be filtered out (pending claim)
        expect(screen.queryByText('bob@example.com')).not.toBeInTheDocument();
        // Alice and Charlie should still be visible
        expect(screen.getByText('alice@example.com')).toBeInTheDocument();
        expect(screen.getByText('charlie@example.com')).toBeInTheDocument();
      });
    });
  });

  describe('search functionality', () => {
    it('filters users by search query', async () => {
      customRender(<GoogleWorkspaceMemberImportSheet {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('alice@example.com')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search by name or email/i);
      fireEvent.change(searchInput, { target: { value: 'bob' } });

      await waitFor(() => {
        expect(screen.queryByText('alice@example.com')).not.toBeInTheDocument();
        expect(screen.getByText('bob@example.com')).toBeInTheDocument();
        expect(screen.queryByText('charlie@example.com')).not.toBeInTheDocument();
      });
    });
  });

  describe('selection functionality', () => {
    it('allows selecting individual users', async () => {
      customRender(<GoogleWorkspaceMemberImportSheet {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('alice@example.com')).toBeInTheDocument();
      });

      // Find Alice's row and click the checkbox
      const aliceRow = screen.getByText('alice@example.com').closest('tr');
      const checkbox = aliceRow?.querySelector('button[role="checkbox"]');
      if (checkbox) fireEvent.click(checkbox);

      // Should show 1 selected
      expect(screen.getByText(/1 selected/i)).toBeInTheDocument();
    });

    it('allows selecting all users with select-all checkbox', async () => {
      customRender(<GoogleWorkspaceMemberImportSheet {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('alice@example.com')).toBeInTheDocument();
      });

      // Find the select-all checkbox (first checkbox in table header)
      const selectAllCheckbox = screen.getByLabelText(/select all/i);
      fireEvent.click(selectAllCheckbox);

      // Should show all 3 selected
      expect(screen.getByText(/3 selected/i)).toBeInTheDocument();
    });
  });

  describe('adding members', () => {
    it('calls selectGoogleWorkspaceMembers with selected emails', async () => {
      customRender(<GoogleWorkspaceMemberImportSheet {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('alice@example.com')).toBeInTheDocument();
      });

      // Select Alice
      const aliceRow = screen.getByText('alice@example.com').closest('tr');
      const checkbox = aliceRow?.querySelector('button[role="checkbox"]');
      if (checkbox) fireEvent.click(checkbox);

      // Click Add button
      const addButton = screen.getByRole('button', { name: /add.*member/i });
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(mockSelectMembers).toHaveBeenCalledWith(
          'org-123',
          ['alice@example.com'],
          []
        );
      });
    });

    it('includes admin emails when marking users as admin', async () => {
      customRender(<GoogleWorkspaceMemberImportSheet {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('alice@example.com')).toBeInTheDocument();
      });

      // Select Alice
      const aliceRow = screen.getByText('alice@example.com').closest('tr');
      const checkboxes = aliceRow?.querySelectorAll('button[role="checkbox"]');
      // First checkbox is "include", second is "admin"
      if (checkboxes && checkboxes.length >= 2) {
        fireEvent.click(checkboxes[0]); // Select
        fireEvent.click(checkboxes[1]); // Make admin
      }

      // Should show 1 selected as admin
      expect(screen.getByText(/1 selected.*1 as admin/i)).toBeInTheDocument();

      // Click Add button
      const addButton = screen.getByRole('button', { name: /add.*member/i });
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(mockSelectMembers).toHaveBeenCalledWith(
          'org-123',
          ['alice@example.com'],
          ['alice@example.com']
        );
      });
    });
  });

  describe('sheet state management', () => {
    it('does not render content when closed', () => {
      customRender(<GoogleWorkspaceMemberImportSheet {...defaultProps} open={false} />);

      expect(screen.queryByText('Import from Google Workspace')).not.toBeInTheDocument();
    });
  });
});
