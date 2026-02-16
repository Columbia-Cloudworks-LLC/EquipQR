import React from 'react';
import { render, screen, fireEvent, waitFor } from '@/test/utils/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WorkOrderData } from '@/types/workOrder';
import WorkOrders from '@/features/work-orders/pages/WorkOrders';
import { personas } from '@/test/fixtures/personas';
import { workOrders as woFixtures, organizations } from '@/test/fixtures/entities';
import * as useTeamBasedWorkOrdersModule from '@/features/teams/hooks/useTeamBasedWorkOrders';
import '@/contexts/OrganizationContext';
import * as useWorkOrderFiltersModule from '@/features/work-orders/hooks/useWorkOrderFilters';

// ============================================
// Mocks
// ============================================

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

vi.mock('@/contexts/OrganizationContext', () => ({
  useOrganization: vi.fn(() => ({
    currentOrganization: {
      id: organizations.acme.id,
      name: organizations.acme.name,
      memberCount: organizations.acme.memberCount
    },
    isLoading: false
  }))
}));

vi.mock('@/contexts/useUser', () => ({
  useUser: vi.fn(() => ({
    currentUser: { id: personas.technician.id, email: personas.technician.email, name: personas.technician.name },
    isLoading: false,
    setCurrentUser: vi.fn()
  })),
}));

vi.mock('@/contexts/UserContext', () => ({
  UserProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

vi.mock('@/features/teams/hooks/useTeamBasedWorkOrders', () => ({
  useTeamBasedWorkOrders: vi.fn(() => ({
    data: [],
    isLoading: false,
    error: null
  })),
  useTeamBasedAccess: vi.fn(() => ({
    userTeamIds: ['team-1'],
    hasTeamAccess: true,
    isManager: false,
    isLoading: false
  }))
}));

vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: vi.fn(() => false)
}));

vi.mock('@/features/teams/hooks/useTeamManagement', () => ({
  useTeams: vi.fn(() => ({
    data: [{ id: 'team-1', name: 'Test Team' }],
    isLoading: false,
    error: null
  }))
}));

vi.mock('@/hooks/useWorkOrderData', () => ({
  useUpdateWorkOrderStatus: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false
  }))
}));

vi.mock('@/hooks/useWorkOrderAcceptance', () => ({
  useWorkOrderAcceptance: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false
  }))
}));

vi.mock('@/hooks/useBatchAssignUnassignedWorkOrders', () => ({
  useBatchAssignUnassignedWorkOrders: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false
  }))
}));

vi.mock('@/features/work-orders/hooks/useWorkOrderFilters', () => ({
  useWorkOrderFilters: vi.fn(() => ({
    filters: {
      searchQuery: '',
      statusFilter: 'all',
      assigneeFilter: 'all',
      teamFilter: 'all',
      priorityFilter: 'all',
      dueDateFilter: 'all'
    },
    filteredWorkOrders: [],
    getActiveFilterCount: vi.fn(() => 0),
    clearAllFilters: vi.fn(),
    applyQuickFilter: vi.fn(),
    updateFilter: vi.fn()
  }))
}));

vi.mock('@/hooks/useWorkOrderReopening', () => ({
  useWorkOrderReopening: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false
  }))
}));

// Mock components
vi.mock('@/features/work-orders/components/AutoAssignmentBanner', () => ({
  AutoAssignmentBanner: () => <div data-testid="auto-assignment-banner">Auto Assignment Banner</div>
}));

vi.mock('@/features/work-orders/components/WorkOrderFilters', () => ({
  WorkOrderFilters: ({ filters, onFilterChange }: {
    filters: { searchQuery: string };
    onFilterChange: (key: string, value: string) => void;
  }) => (
    <div data-testid="work-order-filters">
      <input
        placeholder="Search work orders..."
        value={filters.searchQuery}
        onChange={(e) => onFilterChange('searchQuery', e.target.value)}
      />
    </div>
  )
}));

vi.mock('@/features/work-orders/components/WorkOrdersList', () => ({
  WorkOrdersList: ({ workOrders, onCreateClick }: {
    workOrders: WorkOrderData[];
    hasActiveFilters: boolean;
    onCreateClick: () => void;
  }) => (
    <div data-testid="work-orders-list">
      {workOrders.length === 0 ? (
        <div>
          <p>No work orders found</p>
          <p>Get started by creating your first work order</p>
          <button onClick={onCreateClick}>Create Work Order</button>
        </div>
      ) : (
        workOrders.map((wo) => (
          <div key={wo.id}>{wo.title}</div>
        ))
      )}
    </div>
  )
}));

vi.mock('@/components/notifications/NotificationCenter', () => ({
  __esModule: true,
  default: () => <div data-testid="notification-center">Notifications</div>
}));

vi.mock('@/features/work-orders/components/WorkOrderForm', () => ({
  default: ({ open, onClose }: { open: boolean; onClose: () => void }) =>
    open ? (
      <div data-testid="work-order-form">
        <button onClick={onClose}>Close Form</button>
      </div>
    ) : null
}));

// ============================================
// Helpers
// ============================================

function configureAccess(options: {
  hasTeamAccess: boolean;
  isManager: boolean;
  userTeamIds?: string[];
  isLoading?: boolean;
}) {
  vi.mocked(useTeamBasedWorkOrdersModule.useTeamBasedAccess).mockReturnValue({
    userTeamIds: options.userTeamIds ?? (options.hasTeamAccess ? ['team-maintenance'] : []),
    hasTeamAccess: options.hasTeamAccess,
    isManager: options.isManager,
    isLoading: options.isLoading ?? false
  });
}

function setWorkOrders(workOrders: WorkOrderData[]) {
  vi.mocked(useWorkOrderFiltersModule.useWorkOrderFilters).mockReturnValue({
    filters: {
      searchQuery: '',
      statusFilter: 'all',
      assigneeFilter: 'all',
      teamFilter: 'all',
      priorityFilter: 'all',
      dueDateFilter: 'all'
    },
    filteredWorkOrders: workOrders,
    getActiveFilterCount: vi.fn(() => 0),
    clearAllFilters: vi.fn(),
    applyQuickFilter: vi.fn(),
    updateFilter: vi.fn()
  });
}

// ============================================
// Persona-Driven Tests
// ============================================

describe('WorkOrders Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    configureAccess({ hasTeamAccess: true, isManager: false, userTeamIds: ['team-maintenance'] });
  });

  // --------------------------------------------------------
  // Bob Admin — sees all work orders org-wide
  // --------------------------------------------------------
  describe('as Bob Admin viewing all work orders', () => {
    beforeEach(() => {
      configureAccess({ hasTeamAccess: true, isManager: true, userTeamIds: [] });
    });

    it('shows the "Admin" badge indicating org-wide access', () => {
      render(<WorkOrders />);
      const adminBadges = screen.getAllByText('Admin');
      expect(adminBadges.length).toBeGreaterThan(0);
    });

    it('shows "Showing all work orders" subtitle', () => {
      render(<WorkOrders />);
      expect(screen.getByText(/showing all work orders/i)).toBeInTheDocument();
    });

    it('displays the create work order button', () => {
      render(<WorkOrders />);
      const createButtons = screen.getAllByText(/create/i);
      expect(createButtons.length).toBeGreaterThan(0);
    });

    it('shows work orders when data is loaded', () => {
      const mockWOs: WorkOrderData[] = [
        {
          id: woFixtures.assigned.id,
          title: woFixtures.assigned.title,
          description: woFixtures.assigned.description,
          equipmentId: woFixtures.assigned.equipment_id,
          organizationId: woFixtures.assigned.organization_id,
          status: woFixtures.assigned.status,
          priority: woFixtures.assigned.priority,
          createdDate: woFixtures.assigned.created_date,
          created_date: woFixtures.assigned.created_date
        },
        {
          id: woFixtures.inProgress.id,
          title: woFixtures.inProgress.title,
          description: woFixtures.inProgress.description,
          equipmentId: woFixtures.inProgress.equipment_id,
          organizationId: woFixtures.inProgress.organization_id,
          status: woFixtures.inProgress.status,
          priority: woFixtures.inProgress.priority,
          createdDate: woFixtures.inProgress.created_date,
          created_date: woFixtures.inProgress.created_date
        }
      ];

      setWorkOrders(mockWOs);
      render(<WorkOrders />);
      expect(screen.getByText(woFixtures.assigned.title)).toBeInTheDocument();
      expect(screen.getByText(woFixtures.inProgress.title)).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------
  // Dave Technician — sees team-scoped work orders
  // --------------------------------------------------------
  describe('as Dave Technician viewing team work orders', () => {
    beforeEach(() => {
      configureAccess({
        hasTeamAccess: true,
        isManager: false,
        userTeamIds: [personas.technician.teamMemberships[0].teamId]
      });
    });

    it('shows team-scoped subtitle', () => {
      render(<WorkOrders />);
      expect(screen.getByText(/showing work orders for your 1 team/i)).toBeInTheDocument();
    });

    it('does NOT show the Admin badge', () => {
      render(<WorkOrders />);
      expect(screen.queryByText('Admin')).not.toBeInTheDocument();
    });

    it('can create a new work order', async () => {
      render(<WorkOrders />);
      const createButtons = screen.getAllByText(/create/i);
      fireEvent.click(createButtons[0]);
      await waitFor(() => {
        expect(screen.getByTestId('work-order-form')).toBeInTheDocument();
      });
    });

    it('can close the work order form', async () => {
      render(<WorkOrders />);
      const createButtons = screen.getAllByText(/create/i);
      fireEvent.click(createButtons[0]);
      await waitFor(() => {
        expect(screen.getByTestId('work-order-form')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText('Close Form'));
      await waitFor(() => {
        expect(screen.queryByTestId('work-order-form')).not.toBeInTheDocument();
      });
    });

    it('shows search functionality', () => {
      render(<WorkOrders />);
      expect(screen.getByPlaceholderText(/search work orders/i)).toBeInTheDocument();
    });

    it('responds to search input', () => {
      const mockUpdateFilter = vi.fn();
      vi.mocked(useWorkOrderFiltersModule.useWorkOrderFilters).mockReturnValue({
        filters: { searchQuery: '', statusFilter: 'all', assigneeFilter: 'all', teamFilter: 'all', priorityFilter: 'all', dueDateFilter: 'all' },
        filteredWorkOrders: [],
        getActiveFilterCount: vi.fn(() => 0),
        clearAllFilters: vi.fn(),
        applyQuickFilter: vi.fn(),
        updateFilter: mockUpdateFilter
      });

      render(<WorkOrders />);
      fireEvent.change(screen.getByPlaceholderText(/search work orders/i), { target: { value: 'hydraulic' } });
      expect(mockUpdateFilter).toHaveBeenCalledWith('searchQuery', 'hydraulic');
    });
  });

  // --------------------------------------------------------
  // Eve MultiTeamTechnician — sees work orders from 2 teams
  // --------------------------------------------------------
  describe('as Eve (multi-team technician) viewing cross-team work orders', () => {
    beforeEach(() => {
      configureAccess({
        hasTeamAccess: true,
        isManager: false,
        userTeamIds: personas.multiTeamTechnician.teamMemberships.map(tm => tm.teamId)
      });
    });

    it('shows team count for 2 teams', () => {
      render(<WorkOrders />);
      expect(screen.getByText(/showing work orders for your 2 teams/i)).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------
  // Frank (read-only member) — no team assignments
  // --------------------------------------------------------
  describe('as Frank (read-only member with no teams)', () => {
    beforeEach(() => {
      configureAccess({ hasTeamAccess: false, isManager: false, userTeamIds: [] });
    });

    it('shows "no team assignments" message', () => {
      render(<WorkOrders />);
      expect(screen.getByText(/no team assignments - contact your administrator/i)).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------
  // Loading state
  // --------------------------------------------------------
  describe('while team access is loading', () => {
    beforeEach(() => {
      configureAccess({ hasTeamAccess: false, isManager: false, isLoading: true });
    });

    it('shows loading state with description', () => {
      render(<WorkOrders />);
      expect(screen.getByText(/loading team-based work orders/i)).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------
  // Empty state — team member with zero work orders
  // --------------------------------------------------------
  describe('when there are no work orders', () => {
    beforeEach(() => {
      configureAccess({ hasTeamAccess: true, isManager: false });
      setWorkOrders([]);
    });

    it('shows the empty state message', () => {
      render(<WorkOrders />);
      expect(screen.getByText('No work orders found')).toBeInTheDocument();
      expect(screen.getByText(/get started by creating/i)).toBeInTheDocument();
    });
  });
});
