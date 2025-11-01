import React from 'react';
import { render, screen, fireEvent, waitFor } from '@/test/utils/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WorkOrderData } from '@/types/workOrder';
import WorkOrders from '../WorkOrders';
import * as useTeamBasedWorkOrdersModule from '@/hooks/useTeamBasedWorkOrders';
import '@/contexts/OrganizationContext';
import * as useWorkOrderFiltersModule from '@/hooks/useWorkOrderFilters';

// Mock all required contexts and hooks
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
      id: 'org-1',
      name: 'Test Organization',
      memberCount: 5
    },
    isLoading: false
  }))
}));

vi.mock('@/contexts/useUser', () => ({
  useUser: vi.fn(() => ({
    currentUser: { id: 'test-user', email: 'test@test.com', name: 'Test User' },
    isLoading: false,
    setCurrentUser: vi.fn()
  })),
}));

vi.mock('@/contexts/UserContext', () => ({
  UserProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

vi.mock('@/hooks/useTeamBasedWorkOrders', () => ({
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

vi.mock('@/hooks/useTeamManagement', () => ({
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

vi.mock('@/hooks/useWorkOrderFilters', () => ({
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

vi.mock('@/components/work-orders/WorkOrdersHeader', () => ({
  WorkOrdersHeader: ({ onCreateClick, subtitle }: { onCreateClick: () => void; subtitle: string }) => (
    <div>
      <h1>Work Orders</h1>
      <p>{subtitle}</p>
      <button onClick={onCreateClick}>Create Work Order</button>
    </div>
  )
}));

vi.mock('@/components/work-orders/AutoAssignmentBanner', () => ({
  AutoAssignmentBanner: () => <div data-testid="auto-assignment-banner">Auto Assignment Banner</div>
}));

vi.mock('@/components/work-orders/WorkOrderFilters', () => ({
  WorkOrderFilters: () => (
    <div data-testid="work-order-filters">
      <input placeholder="Search work orders..." />
    </div>
  )
}));

vi.mock('@/components/work-orders/WorkOrdersList', () => ({
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

vi.mock('@/components/work-orders/WorkOrderForm', () => ({
  default: ({ open, onClose }: { open: boolean; onClose: () => void }) => 
    open ? (
      <div data-testid="work-order-form">
        <button onClick={onClose}>Close Form</button>
      </div>
    ) : null
}));

describe('WorkOrders Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset to default team access state
    vi.mocked(useTeamBasedWorkOrdersModule.useTeamBasedAccess).mockReturnValue({
      userTeamIds: ['team-1'],
      hasTeamAccess: true,
      isManager: false,
      isLoading: false
    });
  });

  it('renders work orders page title', () => {
    render(<WorkOrders />);
    
    expect(screen.getByText('Work Orders')).toBeInTheDocument();
  });

  it('shows team access message when user has team access', () => {
    render(<WorkOrders />);
    
    expect(screen.getByText(/showing work orders for your 1 team/i)).toBeInTheDocument();
  });

  it('shows no team access message when user has no teams', () => {
    vi.mocked(useTeamBasedWorkOrdersModule.useTeamBasedAccess).mockReturnValue({
      userTeamIds: [],
      hasTeamAccess: false,
      isManager: false,
      isLoading: false
    });

    render(<WorkOrders />);
    
    expect(screen.getByText(/no team assignments - contact your administrator/i)).toBeInTheDocument();
  });

  it('shows admin access message for managers', () => {
    vi.mocked(useTeamBasedWorkOrdersModule.useTeamBasedAccess).mockReturnValue({
      userTeamIds: [],
      hasTeamAccess: true,
      isManager: true,
      isLoading: false
    });

    render(<WorkOrders />);
    
    expect(screen.getByText(/showing all work orders \(organization admin access\)/i)).toBeInTheDocument();
  });

  it('displays create work order button', () => {
    render(<WorkOrders />);
    
    const createButtons = screen.getAllByText('Create Work Order');
    expect(createButtons.length).toBeGreaterThan(0);
  });

  it('opens work order form when create button is clicked', async () => {
    render(<WorkOrders />);
    
    const createButtons = screen.getAllByText('Create Work Order');
    fireEvent.click(createButtons[0]);
    
    await waitFor(() => {
      expect(screen.getByTestId('work-order-form')).toBeInTheDocument();
    });
  });

  it('closes work order form when close is clicked', async () => {
    render(<WorkOrders />);
    
    // Open form
    const createButtons = screen.getAllByText('Create Work Order');
    fireEvent.click(createButtons[0]);
    
    await waitFor(() => {
      expect(screen.getByTestId('work-order-form')).toBeInTheDocument();
    });
    
    // Close form
    const closeButton = screen.getByText('Close Form');
    fireEvent.click(closeButton);
    
    await waitFor(() => {
      expect(screen.queryByTestId('work-order-form')).not.toBeInTheDocument();
    });
  });

  it('displays loading state correctly', () => {
    vi.mocked(useTeamBasedWorkOrdersModule.useTeamBasedAccess).mockReturnValue({
      userTeamIds: [],
      hasTeamAccess: false,
      isManager: false,
      isLoading: true
    });

    render(<WorkOrders />);
    
    expect(screen.getByText(/loading team-based work orders/i)).toBeInTheDocument();
  });

  it('shows work orders when data is available', () => {
    const mockWorkOrders: WorkOrderData[] = [
      {
        id: 'wo-1',
        title: 'Test Work Order 1',
        description: 'Test description 1',
        equipmentId: 'eq-1',
        organizationId: 'org-1',
        status: 'submitted',
        priority: 'high',
        createdDate: '2024-01-01',
        created_date: '2024-01-01'
      },
      {
        id: 'wo-2',
        title: 'Test Work Order 2',
        description: 'Test description 2',
        equipmentId: 'eq-2',
        organizationId: 'org-1',
        status: 'in_progress',
        priority: 'medium',
        createdDate: '2024-01-02',
        created_date: '2024-01-02'
      }
    ];

    // Mock the useWorkOrderFilters to return the mock data
    vi.mocked(useWorkOrderFiltersModule.useWorkOrderFilters).mockReturnValue({
      filters: { 
        searchQuery: '', 
        statusFilter: 'all', 
        assigneeFilter: 'all', 
        teamFilter: 'all', 
        priorityFilter: 'all', 
        dueDateFilter: 'all' 
      },
      filteredWorkOrders: mockWorkOrders,
      getActiveFilterCount: vi.fn(() => 0),
      clearAllFilters: vi.fn(),
      applyQuickFilter: vi.fn(),
      updateFilter: vi.fn()
    });

    render(<WorkOrders />);
    
    expect(screen.getByText('Test Work Order 1')).toBeInTheDocument();
    expect(screen.getByText('Test Work Order 2')).toBeInTheDocument();
  });

  it('displays empty state when no work orders', () => {
    // Ensure the mock returns empty array for this test
    vi.mocked(useWorkOrderFiltersModule.useWorkOrderFilters).mockReturnValue({
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
    });

    render(<WorkOrders />);
    
    expect(screen.getByText('No work orders found')).toBeInTheDocument();
    expect(screen.getByText(/get started by creating/i)).toBeInTheDocument();
  });

  it('includes search functionality', () => {
    render(<WorkOrders />);
    
    expect(screen.getByPlaceholderText(/search work orders/i)).toBeInTheDocument();
  });

  it('responds to search input', async () => {
    render(<WorkOrders />);
    
    const searchInput = screen.getByPlaceholderText(/search work orders/i);
    fireEvent.change(searchInput, { target: { value: 'maintenance' } });
    
    expect(searchInput).toHaveValue('maintenance');
  });
});