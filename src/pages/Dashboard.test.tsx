import React from 'react';
import { render, screen, waitFor } from '@vitest-harness/utils/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Dashboard from '@/features/dashboard/pages/Dashboard';
import * as useSimpleOrganizationModule from '@/hooks/useSimpleOrganization';
import * as useTeamBasedDashboardModule from '@/features/teams/hooks/useTeamBasedDashboard';
import * as useDashboardLayoutModule from '@/features/dashboard/hooks/useDashboardLayout';
import * as useMobileModule from '@/hooks/use-mobile';
import { personas } from '@vitest-harness/fixtures/personas';
import { organizations, equipment as eqFixtures, workOrders as woFixtures } from '@vitest-harness/fixtures/entities';

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

vi.mock('@/features/equipment/hooks/useEquipmentPMStatus', () => ({
  useOrgEquipmentPMStatuses: vi.fn(() => ({ data: [] })),
  useEquipmentPMStatus: vi.fn(() => ({ data: null, isLoading: false })),
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

vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: vi.fn(() => false),
}));

vi.mock('@/hooks/useSelectedTeam', () => ({
  useSelectedTeam: vi.fn(() => ({
    selectedTeamId: null,
    selectedTeam: null,
    setSelectedTeamId: vi.fn(),
  })),
}));

vi.mock('@/features/work-orders/hooks/useWorkOrderPermissionLevels', () => ({
  useWorkOrderPermissionLevels: vi.fn(() => ({
    isManager: false,
    isRequestor: true,
    isTechnician: true,
    canEdit: true,
    canDelete: false,
    canAssign: false,
    canChangeStatus: true,
    canAddNotes: true,
    canAddImages: true,
    getFormMode: vi.fn(() => 'manager' as const),
  })),
}));

vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: vi.fn(() => ({
    canManageEquipment: vi.fn(() => true),
    canManageWorkOrders: vi.fn(() => true),
    hasRole: vi.fn(() => true)
  }))
}));

vi.mock('@/features/inventory/hooks/useInventoryAccess', () => ({
  useInventoryAccess: vi.fn(() => ({
    currentOrganization: { id: 'org-acme' },
    canView: true,
    canEdit: true,
    isPartsManager: false,
    isPartsConsumer: false,
    isLoading: false,
  })),
}));

vi.mock('@/features/teams/hooks/useTeams', () => ({
  useTeams: vi.fn(() => ({
    teams: [],
    isLoading: false,
    error: null
  }))
}));

// Mock Recharts: chart shells render as <svg> and forward children so StatsCard sparkline
// composition (defs / linearGradient / stop) stays valid in jsdom while preserving fidelity.
vi.mock('recharts', () => ({
  PieChart: ({ children }: { children?: React.ReactNode }) => (
    <svg data-testid="pie-chart">{children}</svg>
  ),
  Pie: ({ children }: { children?: React.ReactNode }) => <g data-testid="pie">{children}</g>,
  Cell: () => <g data-testid="cell" />,
  AreaChart: ({ children }: { children?: React.ReactNode }) => (
    <svg data-testid="area-chart">{children}</svg>
  ),
  Area: () => <path data-testid="area" />,
  BarChart: ({ children }: { children?: React.ReactNode }) => (
    <svg data-testid="bar-chart">{children}</svg>
  ),
  Bar: () => <rect data-testid="bar" />,
  XAxis: () => <g data-testid="x-axis" />,
  YAxis: () => <g data-testid="y-axis" />,
  ZAxis: () => <g data-testid="z-axis" />,
  CartesianGrid: () => <g data-testid="cartesian-grid" />,
  Tooltip: () => <g data-testid="tooltip" />,
  Legend: () => <g data-testid="legend" />,
  ResponsiveContainer: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  ScatterChart: ({ children }: { children?: React.ReactNode }) => (
    <svg data-testid="scatter-chart">{children}</svg>
  ),
  Scatter: () => <g data-testid="scatter" />,
}));

// ============================================
// Helpers
// ============================================

const defaultLayoutMock = {
  activeWidgets: [
    'stats-grid',
    'equipment-by-status',
    'pm-compliance',
    'recent-equipment',
    'recent-work-orders',
    'high-priority-wo',
  ],
  isLoading: false,
  updateWidgetOrder: vi.fn(),
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

    it('shows the dashboard heading', () => {
      setupPersonaMocks({
        hasTeamAccess: true,
        isManager: true,
        userTeamIds: [personas.owner.teamMemberships[0].teamId],
        stats: {
          totalEquipment: 10,
          activeEquipment: 10,
          maintenanceEquipment: 0,
          inactiveEquipment: 0,
          totalWorkOrders: 15,
          openWorkOrders: 5,
          overdueWorkOrders: 0,
          completedWorkOrders: 10,
          totalTeams: 2,
        },
        equipment: [
          { id: eqFixtures.forklift1.id, name: eqFixtures.forklift1.name, status: 'active', manufacturer: 'Toyota', model: '8FGU25' },
          { id: eqFixtures.crane.id, name: eqFixtures.crane.name, status: 'active', manufacturer: 'Konecranes', model: 'CXT-10' },
        ],
        workOrders: [
          { id: woFixtures.assigned.id, title: woFixtures.assigned.title, priority: 'high', assigneeName: personas.technician.name, status: 'assigned' },
        ],
      });
      render(<Dashboard />);
      expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument();
    });

    it('renders the static dashboard grid', async () => {
      render(<Dashboard />);
      await waitFor(() => {
        expect(screen.getByTestId('dashboard-grid')).toBeInTheDocument();
      });
    });

    it('displays the dashboard options button', () => {
      render(<Dashboard />);
      expect(screen.getByTitle('Dashboard settings')).toBeInTheDocument();
    });

    it(
      'displays widget content after lazy loading',
      async () => {
        render(<Dashboard />);
        await waitFor(
          () => {
            expect(screen.getByText('Total Equipment')).toBeInTheDocument();
          },
          { timeout: 15_000 }
        );
      },
      20_000
    );

    it('shows recent equipment for fleet monitoring', async () => {
      render(<Dashboard />);
      await waitFor(
        () => {
          expect(screen.getByText('Recent Equipment')).toBeInTheDocument();
          expect(screen.getByText(eqFixtures.forklift1.name)).toBeInTheDocument();
        },
        { timeout: 5000 }
      );
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
      expect(screen.queryByTestId('dashboard-grid')).not.toBeInTheDocument();
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
      expect(screen.getByText(/select an organization/i)).toBeInTheDocument();
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

    it('still displays the dashboard heading during load', () => {
      render(<Dashboard />);
      expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument();
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

    it('renders the static dashboard grid', async () => {
      render(<Dashboard />);
      await waitFor(() => {
        expect(screen.getByTestId('dashboard-grid')).toBeInTheDocument();
      });
    });

    it('renders widgets based on activeWidgets from layout hook', async () => {
      render(<Dashboard />);
      await waitFor(() => {
        const grid = screen.getByTestId('dashboard-grid');
        // 6 default widget slots rendered (stats-grid, equipment-by-status, pm-compliance, recent-equipment, recent-work-orders, high-priority-wo)
        expect(grid.children.length).toBe(6);
      });
    });

    it('shows empty state when no widgets are active', () => {
      vi.mocked(useDashboardLayoutModule.useDashboardLayout).mockReturnValue({
        ...defaultLayoutMock,
        activeWidgets: [],
      });
      render(<Dashboard />);
      expect(screen.getByText(/no widgets on your dashboard/i)).toBeInTheDocument();
    });

    it('shows the dashboard options button that opens the widget manager', () => {
      render(<Dashboard />);
      expect(screen.getByTitle('Dashboard settings')).toBeInTheDocument();
    });
  });

  describe('mobile dashboard layout (#836)', () => {
    beforeEach(() => {
      vi.mocked(useMobileModule.useIsMobile).mockReturnValue(true);
      setupPersonaMocks({
        hasTeamAccess: true,
        isManager: true,
        userTeamIds: [personas.owner.teamMemberships[0].teamId],
        stats: {
          totalEquipment: 10,
          activeEquipment: 8,
          maintenanceEquipment: 1,
          inactiveEquipment: 1,
          totalWorkOrders: 15,
          openWorkOrders: 5,
          overdueWorkOrders: 2,
          completedWorkOrders: 10,
          totalTeams: 2,
        },
        equipment: [
          { id: eqFixtures.forklift1.id, name: eqFixtures.forklift1.name, status: 'active', manufacturer: 'Toyota', model: '8FGU25' },
        ],
        workOrders: [
          { id: woFixtures.assigned.id, title: woFixtures.assigned.title, priority: 'high', assigneeName: personas.technician.name, status: 'assigned' },
        ],
      });
    });

    afterEach(() => {
      vi.mocked(useMobileModule.useIsMobile).mockReturnValue(false);
    });

    it('renders Scan QR hero linking to in-app dashboard scanner', () => {
      render(<Dashboard />);
      const hero = screen.getByTestId('mobile-dashboard-scan-hero');
      expect(hero).toHaveAttribute('href', '/dashboard/scan');
    });

    it('shows full-width alert card when urgent counts exist', () => {
      render(<Dashboard />);
      expect(screen.getByTestId('dashboard-mobile-alert-card')).toBeInTheDocument();
    });

    it('still exposes dashboard heading for assistive tech', () => {
      render(<Dashboard />);
      expect(screen.getByRole('heading', { name: /^dashboard$/i })).toBeInTheDocument();
    });
  });
});
