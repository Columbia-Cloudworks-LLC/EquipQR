import { render, renderHook, waitFor, act, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { SessionProvider, SessionContext } from './SessionContext';
import type { SessionData, SessionOrganization } from './SessionContext';
import { createTestQueryClient } from '@vitest-harness/utils/query-client-wrapper';
import { useUnifiedPermissions } from '@/hooks/useUnifiedPermissions';
import { WorkOrderPMManagementActions } from '@/features/work-orders/components/WorkOrderPMManagementActions';
import type { WorkOrderData } from '@/features/work-orders/types/workOrder';

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

vi.mock('@/services/permissions/PermissionEngine', () => ({
  permissionEngine: {
    hasPermission: vi.fn(),
    clearCache: vi.fn(),
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
  scanLocationCollectionEnabled: true,
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

const pmManagementWorkOrder = {
  id: 'wo-1',
  title: 'Hydraulic repair',
  description: 'Repair a leaking hydraulic line',
  equipmentId: 'eq-1',
  organizationId: 'org-1',
  priority: 'high',
  status: 'in_progress',
  assigneeId: 'user-1',
  teamId: 'team-1',
  createdDate: '2026-01-01T00:00:00Z',
  created_date: '2026-01-01T00:00:00Z',
  createdBy: 'requestor-1',
  hasPM: true,
} satisfies WorkOrderData;

const SessionChromeProbe = () => {
  const session = React.useContext(SessionContext);
  const currentOrganization = session?.sessionData?.organizations.find(
    (organization) => organization.id === session.sessionData?.currentOrganizationId,
  );
  const hasOperationalRole =
    session?.sessionData?.teamMemberships.some(
      (membership) => membership.role === 'manager' || membership.role === 'technician',
    ) ?? false;

  if (session?.isLoading || !currentOrganization) {
    return <div>Resolving session</div>;
  }

  if (currentOrganization.userRole === 'member' && !hasOperationalRole) {
    return <div>Limited View</div>;
  }

  return (
    <div>
      <span>Itemized Costs</span>
      <span>Add labor</span>
      <span>Inventory / Part Lookup</span>
      <span>Create Work Order</span>
    </div>
  );
};

const PMManagementChromeProbe = () => {
  const session = React.useContext(SessionContext);
  const permissions = useUnifiedPermissions();
  const currentOrganization = session?.sessionData?.organizations.find(
    (organization) => organization.id === session.sessionData?.currentOrganizationId,
  );

  if (session?.isLoading || !currentOrganization) {
    return <div>Resolving session</div>;
  }

  const canManagePM = permissions.workOrders.getDetailedPermissions(pmManagementWorkOrder).canEditPM;

  return (
    <div>
      <WorkOrderPMManagementActions
        canManage={canManagePM}
        hasPm={true}
        onManage={() => undefined}
      />
    </div>
  );
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
    vi.clearAllMocks();

    const { useAuth } = await import('@/hooks/useAuth');
    const { usePageVisibility } = await import('@/hooks/usePageVisibility');
    const { useSessionManager } = await import('@/hooks/useSessionManager');
    const { getOrganizationPreference } = await import('@/utils/sessionPersistence');
    const { permissionEngine } = await import('@/services/permissions/PermissionEngine');
    const { SessionPermissionService } = await import('@/services/sessionPermissionService');
    
    mockUseAuth = vi.mocked(useAuth);
    mockUsePageVisibility = vi.mocked(usePageVisibility) as typeof mockUsePageVisibility;
    mockUseSessionManager = vi.mocked(useSessionManager);
    
    mockSessionManager = {
      switchOrganization: vi.fn(),
      refreshSession: vi.fn().mockResolvedValue(undefined),
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
    vi.mocked(SessionPermissionService.getCurrentOrganization).mockImplementation((sessionData) => {
      if (!sessionData?.currentOrganizationId) {
        return null;
      }

      return (
        sessionData.organizations.find(
          (organization) => organization.id === sessionData.currentOrganizationId,
        ) ?? null
      );
    });
    vi.mocked(SessionPermissionService.hasTeamRole).mockImplementation((sessionData, teamId, role) => {
      return sessionData?.teamMemberships.some(
        (membership) => membership.teamId === teamId && membership.role === role,
      ) ?? false;
    });
    vi.mocked(SessionPermissionService.hasTeamAccess).mockImplementation((sessionData, teamId) => {
      return sessionData?.teamMemberships.some((membership) => membership.teamId === teamId) ?? false;
    });
    vi.mocked(SessionPermissionService.canManageTeam).mockImplementation(
      (sessionData, currentOrganization, teamId) => {
        if (!currentOrganization) {
          return false;
        }

        return (
          currentOrganization.userRole === 'owner' ||
          currentOrganization.userRole === 'admin' ||
          sessionData?.teamMemberships.some(
            (membership) => membership.teamId === teamId && membership.role === 'manager',
          ) === true
        );
      },
    );
    vi.mocked(SessionPermissionService.getUserTeamIds).mockImplementation((sessionData) => {
      return sessionData?.teamMemberships.map((membership) => membership.teamId) ?? [];
    });
    vi.mocked(permissionEngine.hasPermission).mockImplementation((permission, context, entityContext) => {
      const teamId = entityContext?.teamId;
      const teamMembership = context.teamMemberships.find((membership) => membership.teamId === teamId);
      const isOperationalTeamMember =
        teamMembership?.role === 'owner' ||
        teamMembership?.role === 'manager' ||
        teamMembership?.role === 'technician';

      switch (permission) {
        case 'workorder.view':
          return ['owner', 'admin'].includes(context.userRole) || Boolean(teamMembership);
        case 'workorder.edit':
        case 'workorder.assign':
          return ['owner', 'admin'].includes(context.userRole) || teamMembership?.role === 'manager';
        case 'workorder.changestatus':
          return (
            ['owner', 'admin'].includes(context.userRole) ||
            Boolean(isOperationalTeamMember) ||
            entityContext?.assigneeId === context.userId
          );
        default:
          return false;
      }
    });
  });

  const createWrapper = () => {
    const queryClient = createTestQueryClient();
    return {
      queryClient,
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>
          <SessionProvider>{children}</SessionProvider>
        </QueryClientProvider>
      ),
    };
  };

  const renderSessionHook = () => {
    const testWrapper = createWrapper();
    return {
      ...renderHook(() => React.useContext(SessionContext), { wrapper: testWrapper.wrapper }),
      queryClient: testWrapper.queryClient,
    };
  };

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

  const simulateVisibilityChange = (visible: boolean) => {
    const onVisibilityChange = (mockUsePageVisibility as MockVisibilityHook).mockVisibilityCallback;
    onVisibilityChange?.(visible);
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

  it('should force server refresh when preferred org differs from cache', async () => {
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
      teamMemberships: mockSessionData.teamMemberships,
    };

    vi.mocked(getOrganizationPreference).mockReturnValue({
      selectedOrgId: 'org-2',
      selectionTimestamp: '2024-02-01T00:00:00Z',
    });
    mockCachedSession({ cachedData: cachedForWrongOrg });

    const { result } = await renderLoadedSessionHook();

    expect(result.current?.sessionData?.currentOrganizationId).toBe('org-2');
    expect(result.current?.sessionData?.teamMemberships).toEqual([]);
    expect(mockSessionManager.refreshSession).toHaveBeenCalledTimes(1);
    expect(mockSessionManager.refreshSession).toHaveBeenCalledWith(true);
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

    simulateVisibilityChange(true);

    expect(mockSessionManager.shouldRefreshOnVisibility).toHaveBeenCalledWith(true);
    expect(mockSessionManager.refreshSession).toHaveBeenCalledWith(false);
  });

  it('should not refresh on visibility change when not needed', async () => {
    mockSessionManager.shouldRefreshOnVisibility.mockReturnValue(false);

    renderSessionHook();

    // Clear previous calls
    mockSessionManager.refreshSession.mockClear();

    simulateVisibilityChange(true);

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

  it('clears cached session, permission, and query state before paint when auth user changes', async () => {
    const { SessionStorageService } = await import('@/services/sessionStorageService');
    const { permissionEngine } = await import('@/services/permissions/PermissionEngine');

    mockCachedSession();
    mockSessionManager.refreshSession.mockImplementation(() => new Promise(() => {}));

    const hook = renderSessionHook();
    const clearSpy = vi.spyOn(hook.queryClient, 'clear');

    await waitFor(() => {
      expect(hook.result.current?.isLoading).toBe(false);
    });

    mockSessionManager.initializeSession.mockReturnValue({
      shouldLoadFromCache: false,
      cachedData: null,
      needsRefresh: false,
    });
    mockUseAuth.mockReturnValue({
      user: { id: 'user-2', email: 'user2@example.com' },
      isLoading: false,
    });

    act(() => {
      hook.rerender();
    });

    expect(clearSpy).toHaveBeenCalledTimes(1);
    expect(permissionEngine.clearCache).toHaveBeenCalledTimes(1);
    expect(SessionStorageService.clearSessionStorage).toHaveBeenCalledTimes(1);
    expect(hook.result.current?.sessionData).toBe(null);
    expect(hook.result.current?.isLoading).toBe(true);
  });

  it('drops privileged chrome immediately on a technician to viewer switch', async () => {
    mockCachedSession({ cachedData: mockSessionData });
    mockSessionManager.refreshSession.mockImplementation(() => new Promise(() => {}));

    const testWrapper = createWrapper();
    const rendered = render(<SessionChromeProbe />, { wrapper: testWrapper.wrapper });

    await waitFor(() => {
      expect(screen.getByText('Itemized Costs')).toBeInTheDocument();
      expect(screen.getByText('Add labor')).toBeInTheDocument();
      expect(screen.getByText('Inventory / Part Lookup')).toBeInTheDocument();
      expect(screen.getByText('Create Work Order')).toBeInTheDocument();
    });

    mockSessionManager.initializeSession.mockReturnValue({
      shouldLoadFromCache: false,
      cachedData: null,
      needsRefresh: false,
    });
    mockUseAuth.mockReturnValue({
      user: { id: 'user-2', email: 'viewer@example.com' },
      isLoading: false,
    });

    act(() => {
      rendered.rerender(<SessionChromeProbe />);
    });

    expect(screen.queryByText('Itemized Costs')).not.toBeInTheDocument();
    expect(screen.queryByText('Add labor')).not.toBeInTheDocument();
    expect(screen.queryByText('Inventory / Part Lookup')).not.toBeInTheDocument();
    expect(screen.queryByText('Create Work Order')).not.toBeInTheDocument();
    expect(screen.getByText('Resolving session')).toBeInTheDocument();
  });

  it('drops PM management chrome immediately on a technician to viewer switch', async () => {
    const technicianSessionData: SessionData = {
      ...mockSessionData,
      organizations: [
        {
          ...mockOrganization,
          userRole: 'member',
        },
      ],
      teamMemberships: [
        {
          teamId: 'team-1',
          teamName: 'Test Team',
          role: 'technician',
          joinedDate: '2024-01-01',
        },
      ],
    };

    mockCachedSession({ cachedData: technicianSessionData });
    mockSessionManager.refreshSession.mockImplementation(() => new Promise(() => {}));

    const testWrapper = createWrapper();
    const rendered = render(<PMManagementChromeProbe />, { wrapper: testWrapper.wrapper });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /manage pm template/i })).toBeInTheDocument();
    });

    mockSessionManager.initializeSession.mockReturnValue({
      shouldLoadFromCache: false,
      cachedData: null,
      needsRefresh: false,
    });
    mockUseAuth.mockReturnValue({
      user: { id: 'user-2', email: 'viewer@example.com' },
      isLoading: false,
    });

    act(() => {
      rendered.rerender(<PMManagementChromeProbe />);
    });

    expect(screen.queryByRole('button', { name: /manage pm template/i })).not.toBeInTheDocument();
    expect(screen.getByText('Resolving session')).toBeInTheDocument();
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