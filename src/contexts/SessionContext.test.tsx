import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { SessionProvider, SessionContext } from './SessionContext';
import type { SessionData, SessionOrganization } from './SessionContext';

// Type definitions for mocks
interface MockVisibilityHook {
  mockVisibilityCallback?: (visible: boolean) => void;
}

// Mock dependencies - moved before vi.mock to avoid hoisting issues
vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/hooks/usePageVisibility', () => ({
  usePageVisibility: vi.fn(),
}));

vi.mock('@/hooks/useSessionManager', () => ({
  useSessionManager: vi.fn(),
}));

vi.mock('@/services/sessionStorageService', () => ({
  SessionStorageService: {
    clearSessionStorage: vi.fn(),
    saveSessionToStorage: vi.fn(),
  },
}));

vi.mock('@/services/sessionDataService', () => ({
  SessionDataService: {
    fetchTeamMemberships: vi.fn(),
  },
}));

vi.mock('@/utils/sessionPersistence', () => ({
  getOrganizationPreference: vi.fn(),
}));

vi.mock('@/services/sessionPermissionService', () => ({
  SessionPermissionService: {
    getCurrentOrganization: vi.fn(),
    hasTeamRole: vi.fn(),
    hasTeamAccess: vi.fn(),
    canManageTeam: vi.fn(),
    getUserTeamIds: vi.fn(),
  },
}));

// Mock data
const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
};

const mockOrganization: SessionOrganization = {
  id: 'org-1',
  name: 'Test Organization',
  plan: 'premium' as const,
  memberCount: 5,
  maxMembers: 10,
  features: ['feature1', 'feature2'],
  userRole: 'admin' as const,
  userStatus: 'active' as const,
};

const mockSessionData: SessionData = {
  organizations: [mockOrganization],
  currentOrganizationId: 'org-1',
  teamMemberships: [
    {
      teamId: 'team-1',
      teamName: 'Test Team',
      role: 'manager' as const,
      joinedDate: '2024-01-01',
    },
  ],
  lastUpdated: '2024-01-01T00:00:00Z',
  version: 1,
};

describe('SessionContext', () => {
  let mockSessionManager: {
    switchOrganization: ReturnType<typeof vi.fn>;
    refreshSession: ReturnType<typeof vi.fn>;
    initializeSession: ReturnType<typeof vi.fn>;
    shouldRefreshOnVisibility: ReturnType<typeof vi.fn>;
  };
  let mockUseAuth: ReturnType<typeof vi.fn>;
  let mockUsePageVisibility: ReturnType<typeof vi.fn> & MockVisibilityHook;
  let mockUseSessionManager: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    const { useAuth } = await import('@/hooks/useAuth');
    const { usePageVisibility } = await import('@/hooks/usePageVisibility');
    const { useSessionManager } = await import('@/hooks/useSessionManager');
    const { SessionDataService } = await import('@/services/sessionDataService');
    const { getOrganizationPreference } = await import('@/utils/sessionPersistence');
    
    mockUseAuth = vi.mocked(useAuth);
    mockUsePageVisibility = vi.mocked(usePageVisibility) as typeof mockUsePageVisibility;
    mockUseSessionManager = vi.mocked(useSessionManager);
    
    mockSessionManager = {
      switchOrganization: vi.fn(),
      refreshSession: vi.fn(),
      initializeSession: vi.fn().mockReturnValue({
        shouldLoadFromCache: false,
        cachedData: null,
        needsRefresh: false,
      }),
      shouldRefreshOnVisibility: vi.fn().mockReturnValue(false),
    };

    mockUseAuth.mockReturnValue({ user: mockUser, isLoading: false });
    mockUsePageVisibility.mockImplementation(({ onVisibilityChange }) => {
      // Store the callback for testing
      mockUsePageVisibility.mockVisibilityCallback = onVisibilityChange;
    });
    mockUseSessionManager.mockReturnValue(mockSessionManager);
    vi.mocked(getOrganizationPreference).mockReturnValue(null);
    vi.mocked(SessionDataService.fetchTeamMemberships).mockResolvedValue(
      mockSessionData.teamMemberships,
    );
  });

  const createWrapper = () => ({ children }: { children: React.ReactNode }) => (
    <SessionProvider>{children}</SessionProvider>
  );

  const renderSessionHook = () =>
    renderHook(() => React.useContext(SessionContext), { wrapper: createWrapper() });

  const mockCachedSession = (overrides: {
    needsRefresh?: boolean;
    cachedData?: SessionData | null;
  } = {}) => {
    mockSessionManager.initializeSession.mockReturnValue({
      shouldLoadFromCache: true,
      cachedData: mockSessionData,
      needsRefresh: false,
      ...overrides,
    });
  };

  const renderLoadedSessionHook = async () => {
    const hook = renderSessionHook();
    await waitFor(() => {
      expect(hook.result.current?.isLoading).toBe(false);
    });
    return hook;
  };

  it('should initialize with loading state', () => {
    const { result } = renderSessionHook();

    expect(result.current?.isLoading).toBe(true);
    expect(result.current?.sessionData).toBe(null);
    expect(result.current?.error).toBe(null);
  });

  it('should load from cache when available', async () => {
    mockCachedSession();

    const { result } = await renderLoadedSessionHook();

    expect(result.current?.sessionData).toMatchObject({
      organizations: mockSessionData.organizations,
      currentOrganizationId: mockSessionData.currentOrganizationId,
      teamMemberships: mockSessionData.teamMemberships,
      version: mockSessionData.version,
    });
    expect(mockSessionManager.refreshSession).not.toHaveBeenCalled();
  });

  it('should re-sync team memberships for preferred org on cache hydrate', async () => {
    const { SessionDataService } = await import('@/services/sessionDataService');
    const { SessionStorageService } = await import('@/services/sessionStorageService');
    const { getOrganizationPreference } = await import('@/utils/sessionPersistence');

    const org2: SessionOrganization = {
      ...mockOrganization,
      id: 'org-2',
      name: 'Other Organization',
      userRole: 'member',
    };
    const cachedForWrongOrg: SessionData = {
      ...mockSessionData,
      organizations: [mockOrganization, org2],
      currentOrganizationId: 'org-1',
      teamMemberships: [],
    };
    const preferredTeams = [
      {
        teamId: 'team-2',
        teamName: 'Preferred Team',
        role: 'technician' as const,
        joinedDate: '2024-02-01',
      },
    ];

    vi.mocked(getOrganizationPreference).mockReturnValue({
      selectedOrgId: 'org-2',
      selectionTimestamp: '2024-02-01T00:00:00Z',
    });
    vi.mocked(SessionDataService.fetchTeamMemberships).mockResolvedValue(preferredTeams);
    mockCachedSession({ cachedData: cachedForWrongOrg });

    const { result } = await renderLoadedSessionHook();

    await waitFor(() => {
      expect(SessionDataService.fetchTeamMemberships).toHaveBeenCalledWith('user-1', 'org-2');
    });
    expect(result.current?.sessionData?.currentOrganizationId).toBe('org-2');
    expect(result.current?.sessionData?.teamMemberships).toEqual(preferredTeams);
    expect(SessionStorageService.saveSessionToStorage).toHaveBeenCalled();
  });

  it('should refresh in background when cache needs update', async () => {
    mockCachedSession({ needsRefresh: true });

    const { result } = await renderLoadedSessionHook();

    expect(result.current?.sessionData?.currentOrganizationId).toBe('org-1');
    expect(result.current?.sessionData?.teamMemberships).toEqual(mockSessionData.teamMemberships);
    expect(mockSessionManager.refreshSession).toHaveBeenCalledWith(false);
  });

  it('should fetch fresh data when no cache available', async () => {
    mockSessionManager.initializeSession.mockReturnValue({
      shouldLoadFromCache: false,
      cachedData: null,
      needsRefresh: false,
    });

    renderSessionHook();

    expect(mockSessionManager.refreshSession).toHaveBeenCalledWith(true);
  });

  it('should not fetch or clear when waitForAuth (auth still loading)', async () => {
    mockUseAuth.mockReturnValue({ user: null, isLoading: true });
    mockSessionManager.initializeSession.mockReturnValue({ waitForAuth: true });

    const { result } = renderSessionHook();

    await waitFor(() => {
      expect(mockSessionManager.initializeSession).toHaveBeenCalled();
    });

    expect(mockSessionManager.refreshSession).not.toHaveBeenCalled();
    expect(result.current?.sessionData).toBe(null);
    expect(result.current?.isLoading).toBe(true);
  });

  it('should provide session management functions', async () => {
    mockCachedSession();

    const { result } = await renderLoadedSessionHook();

    expect(typeof result.current?.getCurrentOrganization).toBe('function');
    expect(typeof result.current?.switchOrganization).toBe('function');
    expect(typeof result.current?.hasTeamRole).toBe('function');
    expect(typeof result.current?.hasTeamAccess).toBe('function');
    expect(typeof result.current?.canManageTeam).toBe('function');
    expect(typeof result.current?.getUserTeamIds).toBe('function');
    expect(typeof result.current?.refreshSession).toBe('function');
    expect(typeof result.current?.clearSession).toBe('function');
  });

  it('should handle page visibility changes', async () => {
    mockSessionManager.shouldRefreshOnVisibility.mockReturnValue(true);

    renderSessionHook();

    // Simulate visibility change
    if ((mockUsePageVisibility as MockVisibilityHook).mockVisibilityCallback) {
      (mockUsePageVisibility as MockVisibilityHook).mockVisibilityCallback(true);
    }

    expect(mockSessionManager.shouldRefreshOnVisibility).toHaveBeenCalledWith(true);
    expect(mockSessionManager.refreshSession).toHaveBeenCalledWith(false);
  });

  it('should not refresh on visibility change when not needed', async () => {
    mockSessionManager.shouldRefreshOnVisibility.mockReturnValue(false);

    renderSessionHook();

    // Clear previous calls
    mockSessionManager.refreshSession.mockClear();

    // Simulate visibility change
    if ((mockUsePageVisibility as MockVisibilityHook).mockVisibilityCallback) {
      (mockUsePageVisibility as MockVisibilityHook).mockVisibilityCallback(true);
    }

    expect(mockSessionManager.shouldRefreshOnVisibility).toHaveBeenCalledWith(true);
    expect(mockSessionManager.refreshSession).not.toHaveBeenCalled();
  });

  it('should switch organization', async () => {
    mockCachedSession();

    const { result } = await renderLoadedSessionHook();

    await result.current!.switchOrganization('org-2');

    expect(mockSessionManager.switchOrganization).toHaveBeenCalledWith(
      'org-2',
      expect.objectContaining({
        currentOrganizationId: 'org-1',
        teamMemberships: mockSessionData.teamMemberships,
      }),
    );
  });

  it('should clear session', async () => {
    const { SessionStorageService } = await import('@/services/sessionStorageService');

    mockCachedSession();

    const { result } = await renderLoadedSessionHook();

    act(() => {
      result.current!.clearSession();
    });

    await waitFor(() => {
      expect(result.current?.sessionData).toBe(null);
    });
    
    expect(SessionStorageService.clearSessionStorage).toHaveBeenCalled();
  });

  it('should handle user changes', async () => {
    const { rerender } = renderSessionHook();

    // Clear previous calls
    mockSessionManager.refreshSession.mockClear();

    // Change user
    mockUseAuth.mockReturnValue({ user: { id: 'user-2', email: 'user2@example.com' }, isLoading: false });

    rerender();

    expect(mockSessionManager.initializeSession).toHaveBeenCalledTimes(2);
  });
});