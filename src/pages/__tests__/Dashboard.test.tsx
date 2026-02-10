import React from 'react';
import { render, screen, waitFor } from '@/test/utils/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Dashboard from '@/features/dashboard/pages/Dashboard';
import * as useSimpleOrganizationModule from '@/hooks/useSimpleOrganization';
import * as useTeamBasedDashboardModule from '@/features/teams/hooks/useTeamBasedDashboard';
import * as useDashboardLayoutModule from '@/features/dashboard/hooks/useDashboardLayout';
import { personas } from '@/test/fixtures/personas';
import { organizations, equipment as eqFixtures, workOrders as woFixtures } from '@/test/fixtures/entities';

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
      currentOrganizationId: 'org-acme',
      teamMemberships: []
    },
    isLoading: false,
    error: null,
    refreshSession: vi.fn(),
    clearSession: vi.fn(),
    getCurrentOrganization: vi.fn(() => ({
      id: organizations.acme.id,
      name: organizations.acme.name,
      plan: organizations.acme.plan,
      memberCount: organizations.acme.memberCount,
      maxMembers: organizations.acme.maxMembers,
      features: organizations.acme.features,
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
  useTeamFleetEfficiency: vi.fn(),
  useTeamBasedDashboardAccess: vi.fn()
}));

vi.mock('@/features/dashboard/hooks/useDashboardLayout', () => ({
  useDashboardLayout: vi.fn()
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

// Mock react-grid-layout for jsdom environment
vi.mock('react-grid-layout', () => ({
  Responsive: ({ children }: { children?: React.ReactNode }) => <div data-testid="responsive-grid">{children}</div>,
  useContainerWidth: () => ({ width: 1200, containerRef: { current: null }, mounted: true }),
}));

vi.mock('react-grid-layout/css/styles.css', () => ({}));
vi.mock('react-resizable/css/styles.css', () => ({}));

// Mock Recharts components
vi.mock('recharts', () => ({
  PieChart: ({ children }: { children?: React.ReactNode }) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => <div data-testid="pie" />,
  Cell: () => <div data-testid="cell" />,
  BarChart: ({ children }: { children?: React.ReactNode }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  ZAxis: () => <div data-testid="z-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  ResponsiveContainer: ({ children }: { children?: React.ReactNode }) => <div data-testid="responsive-container">{children}</div>,
  ScatterChart: ({ children }: { children?: React.ReactNode }) => <div data-testid="scatter-chart">{children}</div>,
  Scatter: () => <div data-testid="scatter" />,
}));

// ============================================
// Helpers
// ============================================

const defaultLayoutMock = {
  layouts: {
    lg: [
      { i: 'stats-grid', x: 0, y: 0, w: 12, h: 2 },
      { i: 'fleet-efficiency', x: 0, y: 2, w: 12, h: 7 },
      { i: 'recent-equipment', x: 0, y: 9, w: 6, h: 6 },
      { i: 'recent-work-orders', x: 6, y: 9, w: 6, h: 6 },
      { i: 'high-priority-wo', x: 0, y: 15, w: 12, h: 4 },
    ],
    md: [], sm: [], xs: [], xxs: [],
  },
  activeWidgets: ['stats-grid', 'fleet-efficiency', 'recent-equipment', 'recent-work-orders', 'high-priority-wo'],
  isLoading: false,
  updateLayout: vi.fn(),
  addWidget: vi.fn(),
  removeWidget: vi.fn(),
  resetToDefault: vi.fn(),
};

/** Configure mocks to simulate a persona's organization + team access */
function setupPersonaMocks(options: {
  orgName?: string;
  hasTeamAccess: boolean;
  isManager?: boolean;
  userTeamIds?: string[];
  stats?: Record<string, number> | null;
  equipment?: Array<{ id: string; name: string; status: string; manufacturer: string; model: string }>;
  workOrders?: Array<{ id: string; title: string; priority: string; assigneeName: string | null; status: string }>;
  isLoading?: boolean;
}) {
  const {
    orgName = organizations.acme.name,
    hasTeamAccess,
    isManager = false,
    userTeamIds = hasTeamAccess ? ['team-maintenance'] : [],
    stats = { totalEquipment: 10, activeEquipment: 8, maintenanceEquipment: 2, inactiveEquipment: 0, totalWorkOrders: 15, openWorkOrders: 5, overdueWorkOrders: 1, completedWorkOrders: 10, totalTeams: 2 },
    equipment = [],
    workOrders = [],
    isLoading = false
  } = options;

  vi.mocked(useSimpleOrganizationModule.useSimpleOrganization).mockReturnValue({
    currentOrganization: {
      id: organizations.acme.id,
      name: orgName,
      memberCount: organizations.acme.memberCount,
      plan: organizations.acme.plan,
      maxMembers: organizations.acme.maxMembers,
      features: organizations.acme.features,
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
    userTeamIds,
    hasTeamAccess,
    isManager,
    isLoading: false
  });

  vi.mocked(useTeamBasedDashboardModule.useTeamBasedDashboardStats).mockReturnValue({
    data: stats,
    isLoading,
    error: null,
    isError: false,
    isPending: isLoading,
    isSuccess: !isLoading,
    refetch: vi.fn(),
    fetchStatus: isLoading ? 'fetching' : 'idle'
  } as MockQueryResult);

  vi.mocked(useTeamBasedDashboardModule.useTeamBasedEquipment).mockReturnValue({
    data: equipment,
    isLoading: false,
    error: null,
    isError: false,
    isPending: false,
    isSuccess: true,
    refetch: vi.fn(),
    fetchStatus: 'idle'
  } as MockQueryResult);

  vi.mocked(useTeamBasedDashboardModule.useTeamBasedRecentWorkOrders).mockReturnValue({
    data: workOrders,
    isLoading: false,
    error: null,
    isError: false,
    isPending: false,
    isSuccess: true,
    refetch: vi.fn(),
    fetchStatus: 'idle'
  } as MockQueryResult);

  vi.mocked(useTeamBasedDashboardModule.useTeamFleetEfficiency).mockReturnValue({
    data: [],
    isLoading: false,
    error: null,
    isError: false,
    isPending: false,
    isSuccess: true,
    refetch: vi.fn(),
    fetchStatus: 'idle'
  } as MockQueryResult);

  vi.mocked(useDashboardLayoutModule.useDashboardLayout).mockReturnValue(defaultLayoutMock);
}

// ============================================
// Persona-Driven Tests
// ============================================

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --------------------------------------------------------
  // Alice Owner — opens the dashboard for a daily overview
  // --------------------------------------------------------
  describe('as Alice Owner reviewing the daily fleet overview', () => {
    beforeEach(() => {
      setupPersonaMocks({
        hasTeamAccess: true,
        isManager: true,
        userTeamIds: [personas.owner.teamMemberships[0].teamId],
        equipment: [
          { id: eqFixtures.forklift1.id, name: eqFixtures.forklift1.name, status: 'active', manufacturer: 'Toyota', model: '8FGU25' },
          { id: eqFixtures.crane.id, name: eqFixtures.crane.name, status: 'active', manufacturer: 'Konecranes', model: 'CXT-10' },
          { id: eqFixtures.forklift2.id, name: eqFixtures.forklift2.name, status: 'maintenance', manufacturer: 'Toyota', model: '8FGU25' },
        ],
        workOrders: [
          { id: woFixtures.assigned.id, title: woFixtures.assigned.title, priority: 'high', assigneeName: personas.technician.name, status: 'assigned' },
          { id: woFixtures.inProgress.id, title: woFixtures.inProgress.title, priority: 'high', assigneeName: personas.multiTeamTechnician.name, status: 'in_progress' },
        ]
      });
    });

    it('shows the welcome message with organization name', () => {
      render(<Dashboard />);
      expect(screen.getByText(`Welcome back to ${organizations.acme.name}`)).toBeInTheDocument();
    });

    it('renders the dashboard grid with widgets', async () => {
      render(<Dashboard />);
      // The grid should render with lazy-loaded widgets
      await waitFor(() => {
        expect(screen.getByTestId('responsive-grid')).toBeInTheDocument();
      });
    });

    it('displays the Customize button', () => {
      render(<Dashboard />);
      expect(screen.getByText('Customize')).toBeInTheDocument();
    });

    it('displays widget content after lazy loading', async () => {
      render(<Dashboard />);
      // Wait for lazy-loaded widgets to resolve
      await waitFor(() => {
        expect(screen.getByText('Total Equipment')).toBeInTheDocument();
      });
    });

    it('shows recent equipment for fleet monitoring', async () => {
      render(<Dashboard />);
      await waitFor(() => {
        expect(screen.getByText('Recent Equipment')).toBeInTheDocument();
        expect(screen.getByText(eqFixtures.forklift1.name)).toBeInTheDocument();
      });
    });

    it('shows recent work orders for workload tracking', async () => {
      render(<Dashboard />);
      await waitFor(() => {
        expect(screen.getByText('Recent Work Orders')).toBeInTheDocument();
      });
    });

    it('shows high-priority work orders widget', async () => {
      render(<Dashboard />);
      await waitFor(() => {
        expect(screen.getByText('High Priority Work Orders')).toBeInTheDocument();
      });
    });
  });

  // --------------------------------------------------------
  // Carol Manager — checks team performance metrics
  // --------------------------------------------------------
  describe('as Carol Manager checking team performance', () => {
    beforeEach(() => {
      setupPersonaMocks({
        hasTeamAccess: true,
        isManager: false,
        userTeamIds: [personas.teamManager.teamMemberships[0].teamId],
        equipment: [
          { id: eqFixtures.forklift1.id, name: eqFixtures.forklift1.name, status: 'active', manufacturer: 'Toyota', model: '8FGU25' },
        ],
        workOrders: [
          { id: woFixtures.submitted.id, title: woFixtures.submitted.title, priority: 'medium', assigneeName: null, status: 'submitted' },
        ]
      });
    });

    it('displays equipment statistics scoped to team', async () => {
      render(<Dashboard />);
      await waitFor(() => {
        expect(screen.getByText('Total Equipment')).toBeInTheDocument();
      });
    });

    it('shows recent equipment in the team fleet', async () => {
      render(<Dashboard />);
      await waitFor(() => {
        expect(screen.getByText(eqFixtures.forklift1.name)).toBeInTheDocument();
      });
    });

    it('shows work orders the team is responsible for', async () => {
      render(<Dashboard />);
      await waitFor(() => {
        expect(screen.getByText(woFixtures.submitted.title)).toBeInTheDocument();
      });
    });
  });

  // --------------------------------------------------------
  // Frank (readOnlyMember) — no teams, sees guidance card
  // --------------------------------------------------------
  describe('as Frank (read-only member with no teams)', () => {
    beforeEach(() => {
      setupPersonaMocks({
        hasTeamAccess: false,
        isManager: false,
        userTeamIds: [],
        stats: null,
        equipment: [],
        workOrders: []
      });
    });

    it('shows the "no teams" guidance card', () => {
      render(<Dashboard />);
      expect(screen.getAllByText(`Welcome to ${organizations.acme.name}`).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/not yet a member of any teams/i)).toBeInTheDocument();
    });

    it('tells the user to contact an administrator', () => {
      render(<Dashboard />);
      expect(screen.getByText(/contact an organization administrator/i)).toBeInTheDocument();
    });

    it('does NOT show the dashboard grid', () => {
      render(<Dashboard />);
      expect(screen.queryByTestId('responsive-grid')).not.toBeInTheDocument();
    });
  });

  // --------------------------------------------------------
  // Edge case: no organization selected (first-time user)
  // --------------------------------------------------------
  describe('when no organization is selected (new user)', () => {
    beforeEach(() => {
      vi.mocked(useSimpleOrganizationModule.useSimpleOrganization).mockReturnValue({
        organizations: [],
        userOrganizations: [],
        currentOrganization: null,
        setCurrentOrganization: vi.fn(),
        switchOrganization: vi.fn(),
        isLoading: false,
        error: null,
        refetch: vi.fn()
      });
      vi.mocked(useTeamBasedDashboardModule.useTeamBasedDashboardAccess).mockReturnValue({
        userTeamIds: [],
        hasTeamAccess: false,
        isManager: false,
        isLoading: false
      });
      vi.mocked(useTeamBasedDashboardModule.useTeamBasedDashboardStats).mockReturnValue({
        data: null, isLoading: false, error: null, isError: false, isPending: false, isSuccess: true, refetch: vi.fn(), fetchStatus: 'idle'
      } as MockQueryResult);
      vi.mocked(useTeamBasedDashboardModule.useTeamBasedEquipment).mockReturnValue({
        data: [], isLoading: false, error: null, isError: false, isPending: false, isSuccess: true, refetch: vi.fn(), fetchStatus: 'idle'
      } as MockQueryResult);
      vi.mocked(useTeamBasedDashboardModule.useTeamBasedRecentWorkOrders).mockReturnValue({
        data: [], isLoading: false, error: null, isError: false, isPending: false, isSuccess: true, refetch: vi.fn(), fetchStatus: 'idle'
      } as MockQueryResult);
      vi.mocked(useTeamBasedDashboardModule.useTeamFleetEfficiency).mockReturnValue({
        data: [], isLoading: false, error: null, isError: false, isPending: false, isSuccess: true, refetch: vi.fn(), fetchStatus: 'idle'
      } as MockQueryResult);
      vi.mocked(useDashboardLayoutModule.useDashboardLayout).mockReturnValue(defaultLayoutMock);
    });

    it('prompts user to select an organization', () => {
      render(<Dashboard />);
      expect(screen.getByText(/please select an organization/i)).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------
  // Loading state — skeleton UX while data loads
  // --------------------------------------------------------
  describe('while data is loading', () => {
    beforeEach(() => {
      setupPersonaMocks({
        hasTeamAccess: true,
        isManager: true,
        stats: null,
        isLoading: true
      });
    });

    it('still displays the welcome header during load', () => {
      render(<Dashboard />);
      expect(screen.getByText(`Welcome back to ${organizations.acme.name}`)).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------
  // Dashboard grid system
  // --------------------------------------------------------
  describe('dashboard grid system', () => {
    beforeEach(() => {
      setupPersonaMocks({
        hasTeamAccess: true,
        isManager: true,
      });
    });

    it('renders the responsive grid layout', async () => {
      render(<Dashboard />);
      await waitFor(() => {
        expect(screen.getByTestId('responsive-grid')).toBeInTheDocument();
      });
    });

    it('renders widgets based on activeWidgets from layout hook', async () => {
      render(<Dashboard />);
      // Grid should contain widget cards
      await waitFor(() => {
        const grid = screen.getByTestId('responsive-grid');
        expect(grid.children.length).toBe(5); // 5 default widgets
      });
    });

    it('shows empty state when no widgets are active', () => {
      vi.mocked(useDashboardLayoutModule.useDashboardLayout).mockReturnValue({
        ...defaultLayoutMock,
        activeWidgets: [],
        layouts: { lg: [], md: [], sm: [], xs: [], xxs: [] },
      });
      render(<Dashboard />);
      expect(screen.getByText(/no widgets on your dashboard/i)).toBeInTheDocument();
    });
  });
});
