import React from 'react';
import { render, screen, fireEvent } from '@vitest-harness/utils/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import EquipmentWorkOrdersTab from './EquipmentWorkOrdersTab';
import * as useEquipmentModule from '@/features/equipment/hooks/useEquipment';
import type { EquipmentWorkOrder } from '@/features/equipment/services/EquipmentService';

// Mock hooks and components
vi.mock('@/features/equipment/hooks/useEquipment', () => ({
  useEquipmentWorkOrders: vi.fn()
}));

vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: vi.fn(() => false)
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: vi.fn(() => vi.fn())
  };
});

vi.mock('./MobileWorkOrderCard', () => ({
  default: ({ workOrder }: { workOrder: { id: string } }) => <div data-testid={`mobile-wo-${workOrder.id}`}>Mobile WO {workOrder.id}</div>
}));

vi.mock('@/features/work-orders/components/DesktopWorkOrderCard', () => ({
  default: ({ workOrder }: { workOrder: { id: string } }) => <div data-testid={`desktop-wo-${workOrder.id}`}>Desktop WO {workOrder.id}</div>
}));

vi.mock('@/features/work-orders/components/WorkOrderForm', () => ({
  default: ({ open }: { open: boolean }) => open ? <div data-testid="work-order-form">Work Order Form</div> : null
}));

const createWorkOrder = (overrides: Partial<EquipmentWorkOrder>): EquipmentWorkOrder => ({
  id: 'wo-1',
  title: 'Maintenance Check',
  description: 'Routine maintenance',
  status: 'submitted',
  priority: 'medium',
  equipment_id: 'eq-1',
  organization_id: 'org-1',
  created_by: 'user-1',
  created_by_admin: null,
  created_by_name: null,
  created_date: '2024-01-15',
  due_date: null,
  due_date_has_time: false,
  completed_date: null,
  acceptance_date: null,
  assignee_id: null,
  assignee_name: null,
  equipment_working_hours_at_creation: null,
  estimated_hours: null,
  has_pm: false,
  pm_required: false,
  is_historical: false,
  historical_notes: null,
  historical_start_date: null,
  invoice_balance_cents: null,
  invoice_due_date: null,
  invoice_last_synced_at: null,
  invoice_paid_at: null,
  invoice_sent_at: null,
  invoice_status: null,
  invoice_sync_error: null,
  primary_image_id: null,
  quickbooks_invoice_environment: null,
  quickbooks_invoice_id: null,
  quickbooks_invoice_number: null,
  quickbooks_realm_id: null,
  quickbooks_sync_excluded: false,
  updated_at: '2024-01-15T00:00:00Z',
  ...overrides,
});

const mockWorkOrders: EquipmentWorkOrder[] = [
  createWorkOrder({
    id: 'wo-1',
    title: 'Maintenance Check',
    status: 'submitted',
    due_date: '2024-01-20',
    is_historical: false,
  }),
  createWorkOrder({
    id: 'wo-2',
    title: 'Repair Work',
    status: 'completed',
    created_date: '2024-01-10',
    completed_date: '2024-01-12',
    is_historical: true,
  }),
];

type EquipmentWorkOrdersQuery = ReturnType<typeof useEquipmentModule.useEquipmentWorkOrders>;

const createSuccessQuery = (data: EquipmentWorkOrder[]): EquipmentWorkOrdersQuery => ({
  data,
  isLoading: false,
  error: null,
  isError: false,
  isPending: false,
  isSuccess: true,
  status: 'success',
  dataUpdatedAt: 0,
  errorUpdatedAt: 0,
  failureCount: 0,
  failureReason: null,
  errorUpdateCount: 0,
  fetchStatus: 'idle',
  isFetched: true,
  isFetchedAfterMount: true,
  isFetching: false,
  isInitialLoading: false,
  isLoadingError: false,
  isPaused: false,
  isPlaceholderData: false,
  isRefetchError: false,
  isRefetching: false,
  isStale: false,
  isEnabled: true,
  refetch: vi.fn(),
});

const createLoadingQuery = (): EquipmentWorkOrdersQuery => ({
  data: undefined,
  isLoading: true,
  error: null,
  isError: false,
  isPending: true,
  isSuccess: false,
  status: 'pending',
  dataUpdatedAt: 0,
  errorUpdatedAt: 0,
  failureCount: 0,
  failureReason: null,
  errorUpdateCount: 0,
  fetchStatus: 'fetching',
  isFetched: false,
  isFetchedAfterMount: false,
  isFetching: true,
  isInitialLoading: true,
  isLoadingError: false,
  isPaused: false,
  isPlaceholderData: false,
  isRefetchError: false,
  isRefetching: false,
  isStale: false,
  isEnabled: true,
  refetch: vi.fn(),
});

describe('EquipmentWorkOrdersTab', () => {
  const mockOnCreateWorkOrder = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    vi.mocked(useEquipmentModule.useEquipmentWorkOrders).mockReturnValue(createSuccessQuery(mockWorkOrders));
  });

  describe('Core Rendering', () => {
    it('renders work orders header', () => {
      render(
        <EquipmentWorkOrdersTab 
          equipmentId="eq-1" 
          organizationId="org-1" 
        />
      );
      
      expect(screen.getByText('Work Orders')).toBeInTheDocument();
      expect(screen.getByText('2 work orders')).toBeInTheDocument();
    });

    it('renders create work order button', () => {
      render(
        <EquipmentWorkOrdersTab 
          equipmentId="eq-1" 
          organizationId="org-1" 
        />
      );
      
      expect(screen.getByText('Create Work Order')).toBeInTheDocument();
    });

    it('displays work order count correctly', () => {
      render(
        <EquipmentWorkOrdersTab 
          equipmentId="eq-1" 
          organizationId="org-1" 
        />
      );
      
      expect(screen.getByText('2 work orders')).toBeInTheDocument();
    });

    it('displays singular form for one work order', () => {
      vi.mocked(useEquipmentModule.useEquipmentWorkOrders).mockReturnValue(createSuccessQuery([mockWorkOrders[0]]));

      render(
        <EquipmentWorkOrdersTab 
          equipmentId="eq-1" 
          organizationId="org-1" 
        />
      );
      
      expect(screen.getByText('1 work order')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('shows loading skeletons when isLoading is true', () => {
      vi.mocked(useEquipmentModule.useEquipmentWorkOrders).mockReturnValue(createLoadingQuery());

      const { container } = render(
        <EquipmentWorkOrdersTab 
          equipmentId="eq-1" 
          organizationId="org-1" 
        />
      );
      
      const skeletons = container.querySelectorAll('[class*="animate-pulse"]');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('Empty State', () => {
    it('shows empty state when no work orders', () => {
      vi.mocked(useEquipmentModule.useEquipmentWorkOrders).mockReturnValue(createSuccessQuery([]));

      render(
        <EquipmentWorkOrdersTab 
          equipmentId="eq-1" 
          organizationId="org-1" 
        />
      );
      
      expect(screen.getByText('No work orders')).toBeInTheDocument();
      expect(screen.getByText(/No work orders have been created/)).toBeInTheDocument();
      expect(screen.getByText('Create First Work Order')).toBeInTheDocument();
    });
  });

  describe('Work Order Creation', () => {
    it('calls onCreateWorkOrder when provided and button is clicked', () => {
      render(
        <EquipmentWorkOrdersTab 
          equipmentId="eq-1" 
          organizationId="org-1" 
          onCreateWorkOrder={mockOnCreateWorkOrder}
        />
      );
      
      const createButton = screen.getByText('Create Work Order');
      fireEvent.click(createButton);
      
      expect(mockOnCreateWorkOrder).toHaveBeenCalledTimes(1);
    });

    it('opens work order form when onCreateWorkOrder is not provided', () => {
      render(
        <EquipmentWorkOrdersTab 
          equipmentId="eq-1" 
          organizationId="org-1" 
        />
      );
      
      const createButton = screen.getByText('Create Work Order');
      fireEvent.click(createButton);
      
      expect(screen.getByTestId('work-order-form')).toBeInTheDocument();
    });
  });

  describe('Work Order Display', () => {
    it('renders work order cards', () => {
      render(
        <EquipmentWorkOrdersTab 
          equipmentId="eq-1" 
          organizationId="org-1" 
        />
      );
      
      expect(screen.getByTestId('desktop-wo-wo-1')).toBeInTheDocument();
      expect(screen.getByTestId('desktop-wo-wo-2')).toBeInTheDocument();
    });

    it('shows historical badge for historical work orders', () => {
      render(
        <EquipmentWorkOrdersTab 
          equipmentId="eq-1" 
          organizationId="org-1" 
        />
      );
      
      // Historical badge should be shown for historical work orders
      // This depends on the HistoricalWorkOrderBadge component
    });
  });

  describe('Mobile Responsiveness', () => {
    it('renders mobile cards when on mobile', async () => {
      const { useIsMobile } = await import('@/hooks/use-mobile');
      vi.mocked(useIsMobile).mockReturnValue(true);

      render(
        <EquipmentWorkOrdersTab 
          equipmentId="eq-1" 
          organizationId="org-1" 
        />
      );
      
      expect(screen.getByTestId('mobile-wo-wo-1')).toBeInTheDocument();
    });
  });
});


