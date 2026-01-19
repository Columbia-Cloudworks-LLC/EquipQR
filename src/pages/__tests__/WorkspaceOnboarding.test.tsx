import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { customRender } from '@/test/utils/renderUtils';

// Hoisted mocks
const {
  mockRequestClaim,
  mockCreateOrg,
  mockSyncUsers,
  mockSelectMembers,
  mockGenerateAuthUrl,
} = vi.hoisted(() => ({
  mockRequestClaim: vi.fn(),
  mockCreateOrg: vi.fn(),
  mockSyncUsers: vi.fn(),
  mockSelectMembers: vi.fn(),
  mockGenerateAuthUrl: vi.fn(),
}));

const mockOnboardingState = vi.hoisted(() => vi.fn());
const mockConnectionStatus = vi.hoisted(() => vi.fn());
const mockDirectoryUsers = vi.hoisted(() => vi.fn());

// Mock services
vi.mock('@/services/google-workspace', () => ({
  requestWorkspaceDomainClaim: (...args: unknown[]) => mockRequestClaim(...args),
  createWorkspaceOrganizationForDomain: (...args: unknown[]) => mockCreateOrg(...args),
  syncGoogleWorkspaceUsers: (...args: unknown[]) => mockSyncUsers(...args),
  selectGoogleWorkspaceMembers: (...args: unknown[]) => mockSelectMembers(...args),
  getGoogleWorkspaceConnectionStatus: (...args: unknown[]) => mockConnectionStatus(...args),
  listWorkspaceDirectoryUsers: (...args: unknown[]) => mockDirectoryUsers(...args),
}));

vi.mock('@/services/google-workspace/auth', () => ({
  generateGoogleWorkspaceAuthUrl: (...args: unknown[]) => mockGenerateAuthUrl(...args),
  isGoogleWorkspaceConfigured: () => true,
}));

// Mock hooks
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: {
      id: 'user-123',
      email: 'test@example.com',
      app_metadata: { provider: 'google', providers: ['google'] },
    },
  }),
}));

vi.mock('@/hooks/useSession', () => ({
  useSession: () => ({
    refreshSession: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock('@/contexts/OrganizationContext', () => ({
  useOrganization: () => ({
    switchOrganization: vi.fn(),
  }),
}));

const mockRefetch = vi.fn().mockResolvedValue(undefined);

vi.mock('@/hooks/useWorkspaceOnboarding', () => ({
  useWorkspaceOnboardingState: () => ({
    data: mockOnboardingState(),
    isLoading: false,
    refetch: mockRefetch,
  }),
}));

// Mock useAppToast
const mockToast = vi.fn();
vi.mock('@/hooks/useAppToast', () => ({
  useAppToast: () => ({ toast: mockToast }),
}));

// Mock TanStack Query
vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-query')>('@tanstack/react-query');
  return {
    ...actual,
    useQueryClient: () => ({
      invalidateQueries: vi.fn(),
    }),
    useQuery: ({ queryKey, enabled }: { queryKey: string[]; enabled: boolean }) => {
      if (!enabled) {
        return { data: undefined, isLoading: false };
      }
      if (queryKey.includes('connection')) {
        return { data: mockConnectionStatus(), isLoading: false };
      }
      if (queryKey.includes('directory-users')) {
        return { data: mockDirectoryUsers() || [], isLoading: false };
      }
      return { data: undefined, isLoading: false };
    },
  };
});

// Import after mocks
import WorkspaceOnboarding from '../WorkspaceOnboarding';

describe('WorkspaceOnboarding', () => {
  beforeEach(() => {
    mockRequestClaim.mockReset();
    mockCreateOrg.mockReset();
    mockSyncUsers.mockReset();
    mockSelectMembers.mockReset();
    mockGenerateAuthUrl.mockReset();
    mockToast.mockReset();
    mockRefetch.mockReset();
    mockOnboardingState.mockReset();
    mockConnectionStatus.mockReset();
    mockDirectoryUsers.mockReset();
  });

  it('shows domain claim request card for unclaimed domain', () => {
    mockOnboardingState.mockReturnValue({
      email: 'test@example.com',
      domain: 'example.com',
      domain_status: 'unclaimed',
      claim_status: null,
      claim_id: null,
      workspace_org_id: null,
      is_workspace_connected: false,
    });

    customRender(<WorkspaceOnboarding />);

    expect(screen.getByText(/request domain setup/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /request approval/i })).toBeInTheDocument();
  });

  it('shows pending approval message for pending domain', () => {
    mockOnboardingState.mockReturnValue({
      email: 'test@example.com',
      domain: 'example.com',
      domain_status: 'pending',
      claim_status: 'pending',
      claim_id: 'claim-123',
      workspace_org_id: null,
      is_workspace_connected: false,
    });

    customRender(<WorkspaceOnboarding />);

    expect(screen.getByText(/domain approval pending/i)).toBeInTheDocument();
  });

  it('shows create organization form for approved domain', () => {
    mockOnboardingState.mockReturnValue({
      email: 'test@example.com',
      domain: 'example.com',
      domain_status: 'approved',
      claim_status: 'approved',
      claim_id: 'claim-123',
      workspace_org_id: null,
      is_workspace_connected: false,
    });

    customRender(<WorkspaceOnboarding />);

    expect(screen.getByText(/create workspace organization/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/organization name/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create organization/i })).toBeInTheDocument();
  });

  it('handles domain claim request', async () => {
    mockOnboardingState.mockReturnValue({
      email: 'test@example.com',
      domain: 'example.com',
      domain_status: 'unclaimed',
      claim_status: null,
      claim_id: null,
      workspace_org_id: null,
      is_workspace_connected: false,
    });
    mockRequestClaim.mockResolvedValue('claim-uuid');

    customRender(<WorkspaceOnboarding />);

    const button = screen.getByRole('button', { name: /request approval/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockRequestClaim).toHaveBeenCalledWith('example.com');
    });

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Domain claim requested',
        description: 'We will notify you once it is approved.',
      });
    });
  });

  it('handles organization creation', async () => {
    mockOnboardingState.mockReturnValue({
      email: 'test@example.com',
      domain: 'example.com',
      domain_status: 'approved',
      claim_status: 'approved',
      claim_id: 'claim-123',
      workspace_org_id: null,
      is_workspace_connected: false,
    });
    mockCreateOrg.mockResolvedValue({ organization_id: 'org-123', domain: 'example.com' });

    customRender(<WorkspaceOnboarding />);

    const input = screen.getByLabelText(/organization name/i);
    fireEvent.change(input, { target: { value: 'Test Company' } });

    const button = screen.getByRole('button', { name: /create organization/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockCreateOrg).toHaveBeenCalledWith('example.com', 'Test Company');
    });

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({ title: 'Workspace organization created' });
    });
  });

  it('shows connect workspace button for claimed domain without connection', () => {
    mockOnboardingState.mockReturnValue({
      email: 'test@example.com',
      domain: 'example.com',
      domain_status: 'claimed',
      claim_status: null,
      claim_id: null,
      workspace_org_id: 'org-123',
      is_workspace_connected: false,
    });
    mockConnectionStatus.mockReturnValue({
      is_connected: false,
      domain: null,
    });

    customRender(<WorkspaceOnboarding />);

    expect(screen.getByText(/connect google workspace/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /connect google workspace/i })).toBeInTheDocument();
  });

  it('shows sync and member selection for connected workspace', () => {
    mockOnboardingState.mockReturnValue({
      email: 'test@example.com',
      domain: 'example.com',
      domain_status: 'claimed',
      claim_status: null,
      claim_id: null,
      workspace_org_id: 'org-123',
      is_workspace_connected: true,
    });
    mockConnectionStatus.mockReturnValue({
      is_connected: true,
      domain: 'example.com',
      connected_at: '2026-01-18T00:00:00Z',
    });
    mockDirectoryUsers.mockReturnValue([
      {
        id: 'user-1',
        organization_id: 'org-123',
        google_user_id: 'google-1',
        primary_email: 'alice@example.com',
        full_name: 'Alice Smith',
        suspended: false,
      },
    ]);

    customRender(<WorkspaceOnboarding />);

    expect(screen.getByText(/connected domain: example.com/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sync directory/i })).toBeInTheDocument();
    expect(screen.getByText('alice@example.com')).toBeInTheDocument();
    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
  });

  it('handles directory sync', async () => {
    mockOnboardingState.mockReturnValue({
      email: 'test@example.com',
      domain: 'example.com',
      domain_status: 'claimed',
      claim_status: null,
      claim_id: null,
      workspace_org_id: 'org-123',
      is_workspace_connected: true,
    });
    mockConnectionStatus.mockReturnValue({
      is_connected: true,
      domain: 'example.com',
    });
    mockDirectoryUsers.mockReturnValue([]);
    mockSyncUsers.mockResolvedValue({ usersSynced: 10 });

    customRender(<WorkspaceOnboarding />);

    const syncButton = screen.getByRole('button', { name: /sync directory/i });
    fireEvent.click(syncButton);

    await waitFor(() => {
      expect(mockSyncUsers).toHaveBeenCalledWith('org-123');
    });

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Directory synced',
        description: '10 users loaded.',
      });
    });
  });

  it('handles error during domain claim request', async () => {
    mockOnboardingState.mockReturnValue({
      email: 'test@example.com',
      domain: 'example.com',
      domain_status: 'unclaimed',
      claim_status: null,
      claim_id: null,
      workspace_org_id: null,
      is_workspace_connected: false,
    });
    mockRequestClaim.mockRejectedValue(new Error('Domain already claimed'));

    customRender(<WorkspaceOnboarding />);

    const button = screen.getByRole('button', { name: /request approval/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Failed to request domain claim',
        description: 'Domain already claimed',
        variant: 'error',
      });
    });
  });

  it('shows message for consumer domains', () => {
    mockOnboardingState.mockReturnValue({
      email: 'test@gmail.com',
      domain: 'gmail.com',
      domain_status: 'unclaimed',
      claim_status: null,
      claim_id: null,
      workspace_org_id: null,
      is_workspace_connected: false,
    });

    customRender(<WorkspaceOnboarding />);

    expect(screen.getByText(/google workspace onboarding is available for business google accounts/i)).toBeInTheDocument();
  });
});
