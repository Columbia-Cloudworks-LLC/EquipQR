import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@/test/utils/test-utils';
import { render as rtlRender } from '@testing-library/react';
import { SessionContext, type SessionData } from '@/contexts/SessionContext';
import { useSession } from '../useSession';

interface SessionDataWithUser extends SessionData {
  user?: { id?: string };
}

const TestComponent = () => {
  const { sessionData, isLoading, error, refreshSession } = useSession();

  return (
    <div>
      <div data-testid="is-loading">{isLoading.toString()}</div>
      <div data-testid="has-error">{(error ? 'true' : 'false')}</div>
        <div data-testid="current-org-id">{sessionData?.currentOrganizationId || 'none'}</div>
        <div data-testid="user-id">{'user' in (sessionData || {}) ? (sessionData as SessionDataWithUser).user?.id : 'none'}</div>
      <button 
        data-testid="refresh-button" 
        onClick={() => refreshSession()}
      >
        Refresh
      </button>
    </div>
  );
};

describe('useSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should provide session data from context successfully', () => {
    // Use the default MockSessionProvider from test utils
    render(<TestComponent />);

    // Verify session data is available
    expect(screen.getByTestId('is-loading')).toHaveTextContent('false');
    expect(screen.getByTestId('has-error')).toHaveTextContent('false');
    expect(screen.getByTestId('current-org-id')).toHaveTextContent('org-1');
    expect(screen.getByTestId('user-id')).toHaveTextContent('user-1');

    // Verify refresh function is available
    const refreshButton = screen.getByTestId('refresh-button');
    expect(refreshButton).toBeInTheDocument();
  });

  it('should show loading state when session is loading', () => {
    const mockLoadingSessionValue = {
      sessionData: null,
      isLoading: true,
      error: null,
      getCurrentOrganization: () => null,
      switchOrganization: () => Promise.resolve(),
      hasTeamRole: () => false,
      hasTeamAccess: () => false,
      canManageTeam: () => false,
      getUserTeamIds: () => [],
      refreshSession: vi.fn(() => Promise.resolve()),
      clearSession: vi.fn()
    };

    render(
      <SessionContext.Provider value={mockLoadingSessionValue}>
        <TestComponent />
      </SessionContext.Provider>
    );

    // Verify loading state
    expect(screen.getByTestId('is-loading')).toHaveTextContent('true');
    expect(screen.getByTestId('current-org-id')).toHaveTextContent('none');
    expect(screen.getByTestId('user-id')).toHaveTextContent('none');
  });

  it('should show error state when session has error', () => {
    const mockErrorSessionValue = {
      sessionData: null,
      isLoading: false,
      error: 'Session failed to load',
      getCurrentOrganization: () => null,
      switchOrganization: () => Promise.resolve(),
      hasTeamRole: () => false,
      hasTeamAccess: () => false,
      canManageTeam: () => false,
      getUserTeamIds: () => [],
      refreshSession: vi.fn(() => Promise.resolve()),
      clearSession: vi.fn()
    };

    render(
      <SessionContext.Provider value={mockErrorSessionValue}>
        <TestComponent />
      </SessionContext.Provider>
    );

    // Verify error state
    expect(screen.getByTestId('is-loading')).toHaveTextContent('false');
    expect(screen.getByTestId('has-error')).toHaveTextContent('true');
    expect(screen.getByTestId('current-org-id')).toHaveTextContent('none');
  });

  it('should throw error when used without SessionProvider', () => {
    // Mock console.error to prevent test output noise
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      rtlRender(
        <div>
          <TestComponent />
        </div>
      );
    }).toThrow('useSession must be used within a SessionProvider');

    consoleSpy.mockRestore();
  });

  it('should call refreshSession when button is clicked', () => {
    const mockRefreshSession = vi.fn(() => Promise.resolve());
    const mockSessionValue = {
      sessionData: {
        organizations: [],
        teamMemberships: [],
        currentOrganization: null,
        currentOrganizationId: null,
        lastUpdated: new Date().toISOString(),
        version: 1
      },
      isLoading: false,
      error: null,
      getCurrentOrganization: () => null,
      switchOrganization: () => Promise.resolve(),
      hasTeamRole: () => false,
      hasTeamAccess: () => false,
      canManageTeam: () => false,
      getUserTeamIds: () => [],
      refreshSession: mockRefreshSession,
      clearSession: vi.fn()
    };

    render(
      <SessionContext.Provider value={mockSessionValue}>
        <TestComponent />
      </SessionContext.Provider>
    );

    // Click refresh button
    const refreshButton = screen.getByTestId('refresh-button');
    refreshButton.click();

    // Verify refreshSession was called
    expect(mockRefreshSession).toHaveBeenCalledTimes(1);
  });

  it('should handle unmount gracefully', () => {
    const { unmount } = render(<TestComponent />);

    // Verify component renders initially
    expect(screen.getByTestId('is-loading')).toHaveTextContent('false');

    // Unmount should not cause errors
    expect(() => unmount()).not.toThrow();
  });

  it('should provide all session context methods', () => {
    const mockSessionValue = {
      sessionData: {
        organizations: [{
          id: 'org-1',
          name: 'Test Org',
          plan: 'free' as const,
          memberCount: 1,
          maxMembers: 10,
          features: [],
          billingEmail: 'test@example.com',
          isOwner: true,
          userRole: 'admin' as const,
          userStatus: 'active' as const
        }],
        teamMemberships: [],
        currentOrganization: {
          id: 'org-1',
          name: 'Test Org',
          plan: 'free' as const,
          memberCount: 1,
          maxMembers: 10,
          features: [],
          billingEmail: 'test@example.com',
          isOwner: true,
          userRole: 'admin' as const,
          userStatus: 'active' as const
        },
        currentOrganizationId: 'org-1',
        lastUpdated: new Date().toISOString(),
        version: 1
      },
      isLoading: false,
      error: null,
      getCurrentOrganization: vi.fn(() => ({ 
        id: 'org-1', 
        name: 'Test Org', 
        plan: 'free' as const,
        memberCount: 1,
        maxMembers: 10,
        features: [],
        billingEmail: 'test@example.com',
        isOwner: true,
        userRole: 'admin' as const,
        userStatus: 'active' as const
      })),
      switchOrganization: vi.fn(() => Promise.resolve()),
      hasTeamRole: vi.fn(() => false),
      hasTeamAccess: vi.fn(() => false),
      canManageTeam: vi.fn(() => false),
      getUserTeamIds: vi.fn(() => []),
      refreshSession: vi.fn(() => Promise.resolve()),
      clearSession: vi.fn()
    };

    const MethodTestComponent = () => {
      const session = useSession();
      
      return (
        <div>
          <div data-testid="has-get-current-org">{typeof session.getCurrentOrganization === 'function' ? 'true' : 'false'}</div>
          <div data-testid="has-switch-org">{typeof session.switchOrganization === 'function' ? 'true' : 'false'}</div>
          <div data-testid="has-team-role">{typeof session.hasTeamRole === 'function' ? 'true' : 'false'}</div>
          <div data-testid="has-team-access">{typeof session.hasTeamAccess === 'function' ? 'true' : 'false'}</div>
          <div data-testid="has-can-manage">{typeof session.canManageTeam === 'function' ? 'true' : 'false'}</div>
          <div data-testid="has-get-team-ids">{typeof session.getUserTeamIds === 'function' ? 'true' : 'false'}</div>
          <div data-testid="has-clear-session">{typeof session.clearSession === 'function' ? 'true' : 'false'}</div>
        </div>
      );
    };

    render(
      <SessionContext.Provider value={mockSessionValue}>
        <MethodTestComponent />
      </SessionContext.Provider>
    );

    // Verify all methods are available
    expect(screen.getByTestId('has-get-current-org')).toHaveTextContent('true');
    expect(screen.getByTestId('has-switch-org')).toHaveTextContent('true');
    expect(screen.getByTestId('has-team-role')).toHaveTextContent('true');
    expect(screen.getByTestId('has-team-access')).toHaveTextContent('true');
    expect(screen.getByTestId('has-can-manage')).toHaveTextContent('true');
    expect(screen.getByTestId('has-get-team-ids')).toHaveTextContent('true');
    expect(screen.getByTestId('has-clear-session')).toHaveTextContent('true');
  });
});