import React from 'react';
import { render, screen } from '@/test/utils/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import WorkOrderCostSubtotal from '../WorkOrderCostSubtotal';

// Mock hooks
vi.mock('@/features/work-orders/hooks/useWorkOrderCostsSubtotal', () => ({
  useWorkOrderCostsSubtotal: vi.fn(() => ({
    data: 0,
    isLoading: false
  }))
}));

vi.mock('@/utils/currencyUtils', () => ({
  formatCurrency: vi.fn((cents: number) => `$${(cents / 100).toFixed(2)}`)
}));

describe('WorkOrderCostSubtotal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Loading State', () => {
    it('shows loading message when data is loading', async () => {
      const { useWorkOrderCostsSubtotal } = await import('@/features/work-orders/hooks/useWorkOrderCostsSubtotal');
      
      vi.mocked(useWorkOrderCostsSubtotal).mockReturnValue({
        data: 0,
        isLoading: true
      });

      render(<WorkOrderCostSubtotal workOrderId="wo-1" />);

      expect(screen.getByText(/Loading.../i)).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('shows no costs message when subtotal is zero', async () => {
      const { useWorkOrderCostsSubtotal } = await import('@/features/work-orders/hooks/useWorkOrderCostsSubtotal');
      
      vi.mocked(useWorkOrderCostsSubtotal).mockReturnValue({
        data: 0,
        isLoading: false
      });

      render(<WorkOrderCostSubtotal workOrderId="wo-1" />);

      expect(screen.getByText(/No costs/i)).toBeInTheDocument();
    });
  });

  describe('Cost Display', () => {
    it('displays formatted currency when costs exist', async () => {
      const { useWorkOrderCostsSubtotal } = await import('@/features/work-orders/hooks/useWorkOrderCostsSubtotal');
      
      vi.mocked(useWorkOrderCostsSubtotal).mockReturnValue({
        data: 5000, // $50.00 in cents
        isLoading: false
      });

      render(<WorkOrderCostSubtotal workOrderId="wo-1" />);

      expect(screen.getByText(/\$50\.00/i)).toBeInTheDocument();
    });

    it('displays large amounts correctly', async () => {
      const { useWorkOrderCostsSubtotal } = await import('@/features/work-orders/hooks/useWorkOrderCostsSubtotal');
      
      vi.mocked(useWorkOrderCostsSubtotal).mockReturnValue({
        data: 123456, // $1234.56 in cents
        isLoading: false
      });

      render(<WorkOrderCostSubtotal workOrderId="wo-1" />);

      expect(screen.getByText(/\$1234\.56/i)).toBeInTheDocument();
    });
  });

  describe('Custom ClassName', () => {
    it('applies custom className prop', () => {
      const { container } = render(
        <WorkOrderCostSubtotal workOrderId="wo-1" className="custom-class" />
      );

      const element = container.querySelector('.custom-class');
      expect(element).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles zero cents correctly', async () => {
      const { useWorkOrderCostsSubtotal } = await import('@/features/work-orders/hooks/useWorkOrderCostsSubtotal');
      
      vi.mocked(useWorkOrderCostsSubtotal).mockReturnValue({
        data: 0,
        isLoading: false
      });

      render(<WorkOrderCostSubtotal workOrderId="wo-1" />);

      expect(screen.getByText(/No costs/i)).toBeInTheDocument();
    });

    it('handles negative values gracefully', async () => {
      const { useWorkOrderCostsSubtotal } = await import('@/features/work-orders/hooks/useWorkOrderCostsSubtotal');
      
      vi.mocked(useWorkOrderCostsSubtotal).mockReturnValue({
        data: -100, // Should not happen but handle gracefully
        isLoading: false
      });

      render(<WorkOrderCostSubtotal workOrderId="wo-1" />);

      // Should display formatted value (even if negative)
      expect(screen.queryByText(/No costs/i)).not.toBeInTheDocument();
    });
  });
});

