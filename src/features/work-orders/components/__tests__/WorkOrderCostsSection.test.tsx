import React from 'react';
import { render, screen } from '@/test/utils/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import WorkOrderCostsSection from '../WorkOrderCostsSection';
import { personas } from '@/test/fixtures/personas';
import { workOrders as woFixtures } from '@/test/fixtures/entities';

// ============================================
// Mocks
// ============================================

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

// ============================================
// Persona-Driven Tests
// ============================================

describe('WorkOrderCostsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --------------------------------------------------------
  // Bob Admin — full cost management
  // --------------------------------------------------------
  describe(`as ${personas.admin.name} (admin with full cost access)`, () => {
    it('shows the costs section title', async () => {
      const { useWorkOrderCosts } = await import('@/features/work-orders/hooks/useWorkOrderCosts');
      vi.mocked(useWorkOrderCosts).mockReturnValue({ data: [], isLoading: false });

      render(
        <WorkOrderCostsSection workOrderId={woFixtures.assigned.id} canAddCosts={true} canEditCosts={true} />
      );

      expect(screen.getByText(/Itemized Costs/i)).toBeInTheDocument();
    });

    it('can both add and edit costs', async () => {
      const { useWorkOrderCosts } = await import('@/features/work-orders/hooks/useWorkOrderCosts');
      vi.mocked(useWorkOrderCosts).mockReturnValue({ data: [], isLoading: false });

      render(
        <WorkOrderCostsSection workOrderId={woFixtures.assigned.id} canAddCosts={true} canEditCosts={true} />
      );

      expect(screen.getByTestId('can-edit')).toHaveTextContent('true');
    });

    it('displays cost items with correct count', async () => {
      const { useWorkOrderCosts } = await import('@/features/work-orders/hooks/useWorkOrderCosts');
      const mockCosts = [
        { id: 'cost-1', description: 'Hydraulic hose replacement', quantity: 1, unit_price_cents: 8950 },
        { id: 'cost-2', description: 'Labor - 2 hours', quantity: 2, unit_price_cents: 7500 }
      ];
      vi.mocked(useWorkOrderCosts).mockReturnValue({ data: mockCosts, isLoading: false });

      render(
        <WorkOrderCostsSection workOrderId={woFixtures.inProgress.id} canAddCosts={true} canEditCosts={true} />
      );

      expect(screen.getByTestId('costs-count')).toHaveTextContent('2');
      expect(screen.getByTestId('work-order-id')).toHaveTextContent(woFixtures.inProgress.id);
    });
  });

  // --------------------------------------------------------
  // Carol Manager — can add costs but not edit existing ones
  // --------------------------------------------------------
  describe(`as ${personas.teamManager.name} (manager with add-only access)`, () => {
    it('can add new costs (canAddCosts=true makes canEdit true)', () => {
      render(
        <WorkOrderCostsSection workOrderId={woFixtures.submitted.id} canAddCosts={true} canEditCosts={false} />
      );

      expect(screen.getByTestId('can-edit')).toHaveTextContent('true');
    });
  });

  // --------------------------------------------------------
  // Grace Viewer — read-only, cannot add or edit costs
  // --------------------------------------------------------
  describe(`as ${personas.viewer.name} (viewer with no cost access)`, () => {
    it('renders in read-only mode', () => {
      render(
        <WorkOrderCostsSection workOrderId={woFixtures.completed.id} canAddCosts={false} canEditCosts={false} />
      );

      expect(screen.getByTestId('can-edit')).toHaveTextContent('false');
    });
  });

  // --------------------------------------------------------
  // Permission matrix — comprehensive canEdit derivation
  // --------------------------------------------------------
  describe('permission combinations (canEdit = canAddCosts OR canEditCosts)', () => {
    const cases = [
      { canAddCosts: true,  canEditCosts: true,  expected: 'true',  label: 'both add+edit -> editable' },
      { canAddCosts: true,  canEditCosts: false, expected: 'true',  label: 'add only -> editable' },
      { canAddCosts: false, canEditCosts: true,  expected: 'true',  label: 'edit only -> editable' },
      { canAddCosts: false, canEditCosts: false, expected: 'false', label: 'neither -> read-only' },
    ];

    it.each(cases)('$label', async ({ canAddCosts, canEditCosts, expected }) => {
      const { useWorkOrderCosts } = await import('@/features/work-orders/hooks/useWorkOrderCosts');
      vi.mocked(useWorkOrderCosts).mockReturnValue({ data: [], isLoading: false });

      render(
        <WorkOrderCostsSection workOrderId="wo-test" canAddCosts={canAddCosts} canEditCosts={canEditCosts} />
      );

      expect(screen.getByTestId('can-edit')).toHaveTextContent(expected);
    });
  });

  // --------------------------------------------------------
  // Loading state
  // --------------------------------------------------------
  describe('while costs are loading', () => {
    it('shows a loading indicator', async () => {
      const { useWorkOrderCosts } = await import('@/features/work-orders/hooks/useWorkOrderCosts');
      vi.mocked(useWorkOrderCosts).mockReturnValue({ data: [], isLoading: true });

      render(
        <WorkOrderCostsSection workOrderId={woFixtures.assigned.id} canAddCosts={true} canEditCosts={true} />
      );

      expect(screen.getByText(/Loading Costs.../i)).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------
  // Equipment integration edge case
  // --------------------------------------------------------
  describe('equipment data handling', () => {
    it('handles equipment data including filtering null IDs', async () => {
      const { useWorkOrderCosts } = await import('@/features/work-orders/hooks/useWorkOrderCosts');
      const { useWorkOrderEquipment } = await import('@/features/work-orders/hooks/useWorkOrderEquipment');

      vi.mocked(useWorkOrderCosts).mockReturnValue({ data: [], isLoading: false });
      vi.mocked(useWorkOrderEquipment).mockReturnValue({
        data: [
          { equipment_id: 'eq-forklift-1' },
          { equipment_id: null },
          { equipment_id: 'eq-crane-1' }
        ],
        isLoading: false
      });

      render(
        <WorkOrderCostsSection workOrderId={woFixtures.inProgress.id} canAddCosts={true} canEditCosts={true} />
      );

      expect(screen.getByTestId('inline-edit-costs')).toBeInTheDocument();
    });
  });
});
