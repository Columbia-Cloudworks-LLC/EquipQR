import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { customRender } from '@/test/utils/renderUtils';

// Hoisted mocks
const {
  mockSyncUsers,
  mockSelectMembers,
  mockGenerateAuthUrl,
} = vi.hoisted(() => ({
  mockSyncUsers: vi.fn(),
  mockSelectMembers: vi.fn(),
  mockGenerateAuthUrl: vi.fn(),
}));

const mockOnboardingState = vi.hoisted(() => vi.fn());
const mockConnectionStatus = vi.hoisted(() => vi.fn());
const mockDirectoryUsers = vi.hoisted(() => vi.fn());

// Mock services
vi.mock('@/services/google-workspace', () => ({
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
    currentOrganization: { id: 'current-org-123', name: 'Test Org' },
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

// Mock useSearchParams
const mockSetSearchParams = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useSearchParams: () => [new URLSearchParams(), mockSetSearchParams],
  };
});

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
    mockSyncUsers.mockReset();
    mockSelectMembers.mockReset();
    mockGenerateAuthUrl.mockReset();
    mockToast.mockReset();
    mockRefetch.mockReset();
    mockOnboardingState.mockReset();
    mockConnectionStatus.mockReset();
    mockDirectoryUsers.mockReset();
    mockSetSearchParams.mockReset();
  });

  it('shows connect button for unclaimed domain', () => {
    mockOnboardingState.mockReturnValue({
      email: 'test@example.com',
      domain: 'example.com',
      domain_status: 'unclaimed',
      workspace_org_id: null,
      is_workspace_connected: false,
    });
    mockConnectionStatus.mockReturnValue({
      is_connected: false,
      domain: null,
    });

    customRender(<WorkspaceOnboarding />);

    expect(screen.getByRole('button', { name: /connect google workspace/i })).toBeInTheDocument();
  });

  it('shows connect button for claimed but not connected domain', () => {
    mockOnboardingState.mockReturnValue({
      email: 'test@example.com',
      domain: 'example.com',
      domain_status: 'claimed',
      workspace_org_id: 'org-123',
      is_workspace_connected: false,
    });
    mockConnectionStatus.mockReturnValue({
      is_connected: false,
      domain: null,
    });

    customRender(<WorkspaceOnboarding />);

    expect(screen.getByRole('button', { name: /connect google workspace/i })).toBeInTheDocument();
  });

  it('starts OAuth flow when connect button is clicked', async () => {
    mockOnboardingState.mockReturnValue({
      email: 'test@example.com',
      domain: 'example.com',
      domain_status: 'unclaimed',
      workspace_org_id: null,
      is_workspace_connected: false,
    });
    mockConnectionStatus.mockReturnValue({
      is_connected: false,
      domain: null,
    });
    mockGenerateAuthUrl.mockResolvedValue('https://accounts.google.com/o/oauth2/v2/auth?...');

    // Mock window.location.href setter
    const originalLocation = window.location;
    delete (window as { location?: Location }).location;
    window.location = { ...originalLocation, href: '' } as Location;

    customRender(<WorkspaceOnboarding />);

    const button = screen.getByRole('button', { name: /connect google workspace/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockGenerateAuthUrl).toHaveBeenCalled();
    });

    // Restore
    window.location = originalLocation;
  });

  it('shows sync and member selection for connected workspace', () => {
    mockOnboardingState.mockReturnValue({
      email: 'test@example.com',
      domain: 'example.com',
      domain_status: 'claimed',
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

    expect(screen.getByText(/google workspace connected/i)).toBeInTheDocument();
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

  it('shows message for consumer domains', () => {
    mockOnboardingState.mockReturnValue({
      email: 'test@gmail.com',
      domain: 'gmail.com',
      domain_status: 'unclaimed',
      workspace_org_id: null,
      is_workspace_connected: false,
    });

    customRender(<WorkspaceOnboarding />);

    expect(screen.getByText(/google workspace onboarding is available for business google accounts/i)).toBeInTheDocument();
  });

  it('handles OAuth connection error', async () => {
    mockOnboardingState.mockReturnValue({
      email: 'test@example.com',
      domain: 'example.com',
      domain_status: 'unclaimed',
      workspace_org_id: null,
      is_workspace_connected: false,
    });
    mockConnectionStatus.mockReturnValue({
      is_connected: false,
      domain: null,
    });
    mockGenerateAuthUrl.mockRejectedValue(new Error('OAuth configuration error'));

    customRender(<WorkspaceOnboarding />);

    const button = screen.getByRole('button', { name: /connect google workspace/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Failed to start Google Workspace connection',
        description: 'OAuth configuration error',
        variant: 'error',
      });
    });
  });
});
