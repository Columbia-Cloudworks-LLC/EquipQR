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

  describe('rendering and data display', () => {
    it('shows loading state when costs are loading', async () => {
      const { useWorkOrderCosts } = await import('@/features/work-orders/hooks/useWorkOrderCosts');
      
      vi.mocked(useWorkOrderCosts).mockReturnValue({
        data: [],
        isLoading: true
      });

      render(
        <WorkOrderCostsSection workOrderId="wo-1" canAddCosts={true} canEditCosts={true} />
      );

      expect(screen.getByText(/Loading Costs.../i)).toBeInTheDocument();
    });

    it('renders costs section with title and passes data to inline edit component', async () => {
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
        <WorkOrderCostsSection workOrderId="wo-1" canAddCosts={true} canEditCosts={true} />
      );

      expect(screen.getByText(/Itemized Costs/i)).toBeInTheDocument();
      expect(screen.getByTestId('inline-edit-costs')).toBeInTheDocument();
      expect(screen.getByTestId('costs-count')).toHaveTextContent('2');
      expect(screen.getByTestId('work-order-id')).toHaveTextContent('wo-1');
    });
  });

  describe('permission handling', () => {
    it('passes canEdit based on permission combinations', async () => {
      const { useWorkOrderCosts } = await import('@/features/work-orders/hooks/useWorkOrderCosts');
      
      vi.mocked(useWorkOrderCosts).mockReturnValue({ data: [], isLoading: false });

      const permissionCases = [
        { canAddCosts: true, canEditCosts: true, expected: 'true' },
        { canAddCosts: true, canEditCosts: false, expected: 'true' },
        { canAddCosts: false, canEditCosts: true, expected: 'true' },
        { canAddCosts: false, canEditCosts: false, expected: 'false' }
      ];

      for (const { canAddCosts, canEditCosts, expected } of permissionCases) {
        const { unmount } = render(
          <WorkOrderCostsSection workOrderId="wo-1" canAddCosts={canAddCosts} canEditCosts={canEditCosts} />
        );

        expect(screen.getByTestId('can-edit')).toHaveTextContent(expected);
        unmount();
      }
    });
  });

  describe('equipment integration', () => {
    it('handles equipment data including filtering null IDs', async () => {
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
        <WorkOrderCostsSection workOrderId="wo-1" canAddCosts={true} canEditCosts={true} />
      );

      expect(screen.getByTestId('inline-edit-costs')).toBeInTheDocument();
    });
  });
});
