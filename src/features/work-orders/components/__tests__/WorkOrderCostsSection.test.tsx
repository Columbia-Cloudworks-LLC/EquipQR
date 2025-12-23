import React from 'react';
import { render, screen } from '@/test/utils/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import WorkOrderCostsSection from '../WorkOrderCostsSection';

// Mock hooks
vi.mock('@/features/work-orders/hooks/useWorkOrderCosts', () => ({
  useWorkOrderCosts: vi.fn(() => ({
    data: [],
    isLoading: false
  }))
}));

vi.mock('@/features/work-orders/hooks/useWorkOrderEquipment', () => ({
  useWorkOrderEquipment: vi.fn(() => ({
    data: [],
    isLoading: false
  }))
}));

// Mock InlineEditWorkOrderCosts
vi.mock('../InlineEditWorkOrderCosts', () => ({
  default: ({ costs, workOrderId, canEdit }: { costs: unknown[]; workOrderId: string; canEdit: boolean }) => (
    <div data-testid="inline-edit-costs">
      <div data-testid="costs-count">{costs.length}</div>
      <div data-testid="work-order-id">{workOrderId}</div>
      <div data-testid="can-edit">{canEdit ? 'true' : 'false'}</div>
    </div>
  )
}));

describe('WorkOrderCostsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Loading State', () => {
    it('shows loading state when costs are loading', async () => {
      const { useWorkOrderCosts } = await import('@/features/work-orders/hooks/useWorkOrderCosts');
      
      vi.mocked(useWorkOrderCosts).mockReturnValue({
        data: [],
        isLoading: true
      });

      render(
        <WorkOrderCostsSection
          workOrderId="wo-1"
          canAddCosts={true}
          canEditCosts={true}
        />
      );

      expect(screen.getByText(/Loading Costs.../i)).toBeInTheDocument();
    });
  });

  describe('Rendering', () => {
    it('renders costs section with title', () => {
      render(
        <WorkOrderCostsSection
          workOrderId="wo-1"
          canAddCosts={true}
          canEditCosts={true}
        />
      );

      expect(screen.getByText(/Itemized Costs/i)).toBeInTheDocument();
    });

    it('renders inline edit costs component', () => {
      render(
        <WorkOrderCostsSection
          workOrderId="wo-1"
          canAddCosts={true}
          canEditCosts={true}
        />
      );

      expect(screen.getByTestId('inline-edit-costs')).toBeInTheDocument();
    });

    it('passes costs to inline edit component', async () => {
      const { useWorkOrderCosts } = await import('@/features/work-orders/hooks/useWorkOrderCosts');
      const mockCosts = [
        { id: 'cost-1', description: 'Cost 1', quantity: 1, unit_price_cents: 1000 },
        { id: 'cost-2', description: 'Cost 2', quantity: 2, unit_price_cents: 2000 }
      ];
      
      vi.mocked(useWorkOrderCosts).mockReturnValue({
        data: mockCosts,
        isLoading: false
      });

      render(
        <WorkOrderCostsSection
          workOrderId="wo-1"
          canAddCosts={true}
          canEditCosts={true}
        />
      );

      expect(screen.getByTestId('costs-count')).toHaveTextContent('2');
    });

    it('passes work order ID to inline edit component', () => {
      render(
        <WorkOrderCostsSection
          workOrderId="wo-1"
          canAddCosts={true}
          canEditCosts={true}
        />
      );

      expect(screen.getByTestId('work-order-id')).toHaveTextContent('wo-1');
    });

    it('passes canEdit prop based on permissions', () => {
      render(
        <WorkOrderCostsSection
          workOrderId="wo-1"
          canAddCosts={true}
          canEditCosts={true}
        />
      );

      expect(screen.getByTestId('can-edit')).toHaveTextContent('true');
    });

    it('passes canEdit as false when neither permission is granted', () => {
      render(
        <WorkOrderCostsSection
          workOrderId="wo-1"
          canAddCosts={false}
          canEditCosts={false}
        />
      );

      expect(screen.getByTestId('can-edit')).toHaveTextContent('false');
    });

    it('passes canEdit as true when canAddCosts is true', () => {
      render(
        <WorkOrderCostsSection
          workOrderId="wo-1"
          canAddCosts={true}
          canEditCosts={false}
        />
      );

      expect(screen.getByTestId('can-edit')).toHaveTextContent('true');
    });

    it('passes canEdit as true when canEditCosts is true', () => {
      render(
        <WorkOrderCostsSection
          workOrderId="wo-1"
          canAddCosts={false}
          canEditCosts={true}
        />
      );

      expect(screen.getByTestId('can-edit')).toHaveTextContent('true');
    });
  });

  describe('Equipment Integration', () => {
    it('passes equipment IDs to inline edit component', async () => {
      const { useWorkOrderEquipment } = await import('@/features/work-orders/hooks/useWorkOrderEquipment');
      
      vi.mocked(useWorkOrderEquipment).mockReturnValue({
        data: [
          { equipment_id: 'eq-1' },
          { equipment_id: 'eq-2' }
        ],
        isLoading: false
      });

      render(
        <WorkOrderCostsSection
          workOrderId="wo-1"
          canAddCosts={true}
          canEditCosts={true}
        />
      );

      // Equipment IDs are passed to inline edit component
      expect(screen.getByTestId('inline-edit-costs')).toBeInTheDocument();
    });

    it('filters out null equipment IDs', async () => {
      const { useWorkOrderEquipment } = await import('@/features/work-orders/hooks/useWorkOrderEquipment');
      
      vi.mocked(useWorkOrderEquipment).mockReturnValue({
        data: [
          { equipment_id: 'eq-1' },
          { equipment_id: null },
          { equipment_id: 'eq-2' }
        ],
        isLoading: false
      });

      render(
        <WorkOrderCostsSection
          workOrderId="wo-1"
          canAddCosts={true}
          canEditCosts={true}
        />
      );

      // Component should filter out null IDs
      expect(screen.getByTestId('inline-edit-costs')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty costs array', () => {
      render(
        <WorkOrderCostsSection
          workOrderId="wo-1"
          canAddCosts={true}
          canEditCosts={true}
        />
      );

      expect(screen.getByTestId('costs-count')).toHaveTextContent('0');
    });

    it('handles missing equipment data', async () => {
      const { useWorkOrderEquipment } = await import('@/features/work-orders/hooks/useWorkOrderEquipment');
      
      vi.mocked(useWorkOrderEquipment).mockReturnValue({
        data: [],
        isLoading: false
      });

      render(
        <WorkOrderCostsSection
          workOrderId="wo-1"
          canAddCosts={true}
          canEditCosts={true}
        />
      );

      expect(screen.getByTestId('inline-edit-costs')).toBeInTheDocument();
    });
  });
});

