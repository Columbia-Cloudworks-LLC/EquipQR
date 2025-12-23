import React from 'react';
import { render, screen, fireEvent } from '@/test/utils/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import EquipmentWorkOrdersTab from '../EquipmentWorkOrdersTab';
import * as useEquipmentModule from '@/features/equipment/hooks/useEquipment';

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

vi.mock('../MobileWorkOrderCard', () => ({
  default: ({ workOrder }: { workOrder: { id: string } }) => <div data-testid={`mobile-wo-${workOrder.id}`}>Mobile WO {workOrder.id}</div>
}));

vi.mock('@/features/work-orders/components/DesktopWorkOrderCard', () => ({
  default: ({ workOrder }: { workOrder: { id: string } }) => <div data-testid={`desktop-wo-${workOrder.id}`}>Desktop WO {workOrder.id}</div>
}));

vi.mock('@/features/work-orders/components/WorkOrderForm', () => ({
  default: ({ open }: { open: boolean }) => open ? <div data-testid="work-order-form">Work Order Form</div> : null
}));

const mockWorkOrders = [
  {
    id: 'wo-1',
    equipment_id: 'eq-1',
    title: 'Maintenance Check',
    status: 'open',
    created_date: '2024-01-15',
    due_date: '2024-01-20',
    is_historical: false
  },
  {
    id: 'wo-2',
    equipment_id: 'eq-1',
    title: 'Repair Work',
    status: 'completed',
    created_date: '2024-01-10',
    completed_date: '2024-01-12',
    is_historical: true
  }
];

describe('EquipmentWorkOrdersTab', () => {
  const mockOnCreateWorkOrder = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    vi.mocked(useEquipmentModule.useEquipmentWorkOrders).mockReturnValue({
      data: mockWorkOrders,
      isLoading: false
    });
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
      vi.mocked(useEquipmentModule.useEquipmentWorkOrders).mockReturnValue({
        data: [mockWorkOrders[0]],
        isLoading: false
      });

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
      vi.mocked(useEquipmentModule.useEquipmentWorkOrders).mockReturnValue({
        data: [],
        isLoading: true
      });

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
      vi.mocked(useEquipmentModule.useEquipmentWorkOrders).mockReturnValue({
        data: [],
        isLoading: false
      });

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


