import React from 'react';
import { render, screen } from '@/test/utils/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Dashboard from '../Dashboard';
import * as useSimpleOrganizationModule from '@/hooks/useSimpleOrganization';
import * as useTeamBasedDashboardModule from '@/features/teams/hooks/useTeamBasedDashboard';

// Mock query result type for testing
// Note: Using 'any' here is acceptable for test mocks to avoid complex UseQueryResult typing
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MockQueryResult = any;

// Mock all context dependencies first
vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'user-1', email: 'test@test.com' },
    session: { user: { id: 'user-1' } },
    isLoading: false,
    signUp: vi.fn(),
    signIn: vi.fn(),
    signInWithGoogle: vi.fn(),
    signOut: vi.fn()
  }))
}));

vi.mock('@/hooks/useSession', () => ({
  useSession: vi.fn(() => ({
    sessionData: {
      organizations: [],
      currentOrganizationId: 'org-1',
      teamMemberships: []
    },
    isLoading: false,
    error: null,
    refreshSession: vi.fn(),
    clearSession: vi.fn(),
    getCurrentOrganization: vi.fn(() => ({
      id: 'org-1',
      name: 'Test Organization',
      plan: 'free',
      memberCount: 5,
      maxMembers: 10,
      features: [],
      userRole: 'admin',
      userStatus: 'active'
    })),
    switchOrganization: vi.fn(),
    hasTeamRole: vi.fn(() => false),
    hasTeamAccess: vi.fn(() => false),
    canManageTeam: vi.fn(() => false),
    getUserTeamIds: vi.fn(() => [])
  }))
}));

vi.mock('@/features/teams/hooks/useTeamMembership', () => ({
  useTeamMembership: vi.fn(() => ({
    teamMemberships: [],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    hasTeamRole: vi.fn(() => false),
    hasTeamAccess: vi.fn(() => false),
    canManageTeam: vi.fn(() => false),
    getUserTeamIds: vi.fn(() => [])
  }))
}));

// Mock data dependencies
vi.mock('@/hooks/useSupabaseData', () => ({
  useSyncEquipmentByOrganization: vi.fn(() => ({
    data: [],
    isLoading: false,
    error: null
  })),
  useSyncWorkOrdersByOrganization: vi.fn(() => ({
    data: [],
    isLoading: false,
    error: null
  })),
  useEquipmentByOrganization: vi.fn(() => ({
    data: [],
    isLoading: false,
    error: null,
    isError: false,
    isPending: false,
    isSuccess: true,
    refetch: vi.fn(),
    fetchStatus: 'idle'
  })),
  useDashboardStats: vi.fn(() => ({
    data: {
      totalEquipment: 0,
      activeEquipment: 0,
      maintenanceEquipment: 0,
      totalWorkOrders: 0
    },
    isLoading: false,
    error: null
  })),
  useAllWorkOrders: vi.fn(() => ({
    data: [],
    isLoading: false,
    error: null,
    isError: false,
    isPending: false,
    isSuccess: true,
    refetch: vi.fn(),
    fetchStatus: 'idle'
  }))
}));

vi.mock('@/hooks/useSimpleOrganization', () => ({
  useSimpleOrganization: vi.fn()
}));

vi.mock('@/features/teams/hooks/useTeamBasedDashboard', () => ({
  useTeamBasedDashboardStats: vi.fn(),
  useTeamBasedEquipment: vi.fn(),
  useTeamBasedRecentWorkOrders: vi.fn(),
  useTeamBasedDashboardAccess: vi.fn()
}));

vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: vi.fn(() => ({
    canManageEquipment: vi.fn(() => true),
    canManageWorkOrders: vi.fn(() => true),
    hasRole: vi.fn(() => true)
  }))
}));

vi.mock('@/features/teams/hooks/useTeams', () => ({
  useTeams: vi.fn(() => ({
    teams: [],
    isLoading: false,
    error: null
  }))
}));

// Mock Recharts components
vi.mock('recharts', () => ({
  PieChart: ({ children }: { children?: React.ReactNode }) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => <div data-testid="pie" />,
  Cell: () => <div data-testid="cell" />,
  BarChart: ({ children }: { children?: React.ReactNode }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  ResponsiveContainer: ({ children }: { children?: React.ReactNode }) => <div data-testid="responsive-container">{children}</div>
}));

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mocks
    vi.mocked(useSimpleOrganizationModule.useSimpleOrganization).mockReturnValue({
      currentOrganization: {
        id: 'org-1',
        name: 'Test Organization',
        memberCount: 5,
        plan: 'free',
        maxMembers: 10,
        features: [],
        userRole: 'admin',
        userStatus: 'active'
      },
      organizations: [],
      userOrganizations: [],
      setCurrentOrganization: vi.fn(),
      switchOrganization: vi.fn(),
      isLoading: false,
      error: null,
      refetch: vi.fn()
    });

    vi.mocked(useTeamBasedDashboardModule.useTeamBasedDashboardAccess).mockReturnValue({
      userTeamIds: ['team-1'],
      hasTeamAccess: true,
      isManager: false,
      isLoading: false
    });

    vi.mocked(useTeamBasedDashboardModule.useTeamBasedDashboardStats).mockReturnValue({
      data: {
        totalEquipment: 10,
        activeEquipment: 8,
        maintenanceEquipment: 2,
        inactiveEquipment: 0,
        totalWorkOrders: 15,
        openWorkOrders: 5,
        overdueWorkOrders: 1,
        completedWorkOrders: 10,
        totalTeams: 2
      },
      isLoading: false,
      error: null,
      isError: false,
      isPending: false,
      isSuccess: true,
      refetch: vi.fn(),
      fetchStatus: 'idle'
    } as MockQueryResult);

    vi.mocked(useTeamBasedDashboardModule.useTeamBasedEquipment).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      isError: false,
      isPending: false,
      isSuccess: true,
      refetch: vi.fn(),
      fetchStatus: 'idle'
    } as MockQueryResult);

    vi.mocked(useTeamBasedDashboardModule.useTeamBasedRecentWorkOrders).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      isError: false,
      isPending: false,
      isSuccess: true,
      refetch: vi.fn(),
      fetchStatus: 'idle'
    } as MockQueryResult);
  });

  it('renders dashboard title', () => {
    render(<Dashboard />);
    
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('renders organization selection prompt when no organization', () => {
    const mockHook = vi.mocked(useSimpleOrganizationModule.useSimpleOrganization);
    mockHook.mockReturnValue({
      organizations: [],
      userOrganizations: [],
      currentOrganization: null,
      setCurrentOrganization: vi.fn(),
      switchOrganization: vi.fn(),
      isLoading: false,
      error: null,
      refetch: vi.fn()
    });

    render(<Dashboard />);
    
    expect(screen.getByText(/please select an organization/i)).toBeInTheDocument();
  });

  it('renders dashboard content when organization is selected', () => {
    render(<Dashboard />);
    
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Welcome back to Test Organization')).toBeInTheDocument();
    expect(screen.getByText('Total Equipment')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('displays loading state correctly', () => {
    vi.mocked(useTeamBasedDashboardModule.useTeamBasedDashboardStats).mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
      isError: false,
      isPending: true,
      isSuccess: false,
      refetch: vi.fn(),
      fetchStatus: 'fetching'
    } as MockQueryResult);

    render(<Dashboard />);
    
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Welcome back to Test Organization')).toBeInTheDocument();
    
    // Should show loading cards
    const cards = screen.getAllByRole('generic');
    const loadingCards = cards.filter(card => 
      card.className?.includes('animate-pulse')
    );
    expect(loadingCards.length).toBeGreaterThan(0);
  });

  it('shows equipment statistics when data is available', () => {
    vi.mocked(useTeamBasedDashboardModule.useTeamBasedDashboardStats).mockReturnValue({
      data: {
        totalEquipment: 3,
        activeEquipment: 2,
        maintenanceEquipment: 1,
        inactiveEquipment: 0,
        totalWorkOrders: 5,
        openWorkOrders: 2,
        overdueWorkOrders: 0,
        completedWorkOrders: 3,
        totalTeams: 1
      },
      isLoading: false,
      error: null,
      isError: false,
      isPending: false,
      isSuccess: true,
      refetch: vi.fn(),
      fetchStatus: 'idle'
    } as MockQueryResult);

    vi.mocked(useTeamBasedDashboardModule.useTeamBasedEquipment).mockReturnValue({
      data: [
        { id: '1', name: 'Equipment 1', status: 'active', manufacturer: 'Test Mfg', model: 'Model 1' },
        { id: '2', name: 'Equipment 2', status: 'maintenance', manufacturer: 'Test Mfg', model: 'Model 2' },
        { id: '3', name: 'Equipment 3', status: 'active', manufacturer: 'Test Mfg', model: 'Model 3' }
      ],
      isLoading: false,
      error: null,
      isError: false,
      isPending: false,
      isSuccess: true,
      refetch: vi.fn(),
      fetchStatus: 'idle'
    } as MockQueryResult);

    render(<Dashboard />);
    
    expect(screen.getByTestId('total-equipment-value')).toHaveTextContent('3');
    expect(screen.getByText('Recent Equipment')).toBeInTheDocument();
    expect(screen.getByText('Equipment 1')).toBeInTheDocument();
  });

  it('handles empty data states gracefully', () => {
    vi.mocked(useTeamBasedDashboardModule.useTeamBasedDashboardStats).mockReturnValue({
      data: {
        totalEquipment: 0,
        activeEquipment: 0,
        maintenanceEquipment: 0,
        inactiveEquipment: 0,
        totalWorkOrders: 0,
        openWorkOrders: 0,
        overdueWorkOrders: 0,
        completedWorkOrders: 0,
        totalTeams: 0
      },
      isLoading: false,
      error: null,
      isError: false,
      isPending: false,
      isSuccess: true,
      refetch: vi.fn(),
      fetchStatus: 'idle'
    } as MockQueryResult);

    vi.mocked(useTeamBasedDashboardModule.useTeamBasedEquipment).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      isError: false,
      isPending: false,
      isSuccess: true,
      refetch: vi.fn(),
      fetchStatus: 'idle'
    } as MockQueryResult);

    render(<Dashboard />);
    
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Welcome back to Test Organization')).toBeInTheDocument();
    expect(screen.getByTestId('total-equipment-value')).toHaveTextContent('0');
  });
});