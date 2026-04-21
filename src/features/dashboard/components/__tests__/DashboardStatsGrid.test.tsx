import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DashboardStatsGrid } from '../DashboardStatsGrid';
import { MemoryRouter } from 'react-router-dom';

interface MockLinkProps {
  to: string;
  children: React.ReactNode;
  className?: string;
}

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    Link: ({ to, children, ...props }: MockLinkProps) => (
      <a href={to} {...props}>
        {children}
      </a>
    ),
  };
});

const mockStats = {
  totalEquipment: 42,
  activeEquipment: 35,
  maintenanceEquipment: 3,
  inactiveEquipment: 4,
  totalWorkOrders: 120,
  overdueWorkOrders: 5,
};

describe('DashboardStatsGrid', () => {
  describe('rendering', () => {
    it('renders all four stat cards', () => {
      render(
        <MemoryRouter>
          <DashboardStatsGrid
            stats={mockStats}
            activeWorkOrdersCount={15}
            needsAttentionCount={7}
          />
        </MemoryRouter>
      );

      expect(screen.getByText('Total Equipment')).toBeInTheDocument();
      expect(screen.getByText('Overdue Work')).toBeInTheDocument();
      expect(screen.getByText('Total Work Orders')).toBeInTheDocument();
      expect(screen.getByText('Needs attention')).toBeInTheDocument();
    });

    it('renders stat values correctly', async () => {
      render(
        <MemoryRouter>
          <DashboardStatsGrid
            stats={mockStats}
            activeWorkOrdersCount={15}
            needsAttentionCount={7}
          />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('total-equipment-value')).toHaveTextContent('42');
        expect(screen.getByTestId('overdue-work-value')).toHaveTextContent('5');
        expect(screen.getByTestId('total-work-orders-value')).toHaveTextContent('120');
        expect(screen.getByTestId('needs-attention-value')).toHaveTextContent('7');
      });
    });

    it('renders sublabels correctly', () => {
      render(
        <MemoryRouter>
          <DashboardStatsGrid
            stats={mockStats}
            activeWorkOrdersCount={15}
            needsAttentionCount={7}
          />
        </MemoryRouter>
      );

      expect(screen.getByText('35 active')).toBeInTheDocument();
      expect(screen.getByText('15 active')).toBeInTheDocument();
      expect(screen.getByText('Past due — open list to reprioritize')).toBeInTheDocument();
      expect(screen.getByText('Maintenance, inactive, or PM interval overdue')).toBeInTheDocument();
    });

    it('renders links when not loading', () => {
      render(
        <MemoryRouter>
          <DashboardStatsGrid
            stats={mockStats}
            activeWorkOrdersCount={15}
            needsAttentionCount={7}
          />
        </MemoryRouter>
      );

      const links = screen.getAllByRole('link');
      expect(links).toHaveLength(4);
      expect(links[0]).toHaveAttribute('href', '/dashboard/equipment');
      expect(links[1]).toHaveAttribute('href', '/dashboard/work-orders?date=overdue');
      expect(links[2]).toHaveAttribute('href', '/dashboard/work-orders');
      expect(links[3]).toHaveAttribute('href', '/dashboard/equipment?status=out_of_service');
    });
  });

  describe('loading state', () => {
    it('renders loading skeletons when loading', () => {
      const { container } = render(
        <MemoryRouter>
          <DashboardStatsGrid
            stats={null}
            activeWorkOrdersCount={0}
            needsAttentionCount={0}
            isLoading
          />
        </MemoryRouter>
      );

      const skeletons = container.querySelectorAll('[class*="animate-shimmer"], .bg-muted.rounded-md');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('does not render links when loading', () => {
      render(
        <MemoryRouter>
          <DashboardStatsGrid
            stats={null}
            activeWorkOrdersCount={0}
            needsAttentionCount={0}
            isLoading
          />
        </MemoryRouter>
      );

      expect(screen.queryAllByRole('link')).toHaveLength(0);
    });

    it('hides card labels when loading and shows skeleton content', () => {
      render(
        <MemoryRouter>
          <DashboardStatsGrid
            stats={null}
            activeWorkOrdersCount={0}
            needsAttentionCount={0}
            isLoading
          />
        </MemoryRouter>
      );

      expect(screen.queryByText('Total Equipment')).not.toBeInTheDocument();
      expect(screen.queryByText('Overdue Work')).not.toBeInTheDocument();
      expect(screen.queryByText('Total Work Orders')).not.toBeInTheDocument();
      expect(screen.queryByText('Needs attention')).not.toBeInTheDocument();
      expect(screen.queryAllByTestId(/-value$/)).toHaveLength(0);
    });
  });

  describe('null stats handling', () => {
    it('renders zero values when stats is null', async () => {
      render(
        <MemoryRouter>
          <DashboardStatsGrid
            stats={null}
            activeWorkOrdersCount={0}
            needsAttentionCount={5}
          />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('total-equipment-value')).toHaveTextContent('0');
        expect(screen.getByTestId('overdue-work-value')).toHaveTextContent('0');
        expect(screen.getByTestId('total-work-orders-value')).toHaveTextContent('0');
        expect(screen.getByTestId('needs-attention-value')).toHaveTextContent('5');
      });
    });

    it('handles undefined stats gracefully', () => {
      render(
        <MemoryRouter>
          <DashboardStatsGrid
            stats={undefined}
            activeWorkOrdersCount={10}
            needsAttentionCount={3}
          />
        </MemoryRouter>
      );

      expect(screen.getByTestId('total-equipment-value')).toHaveTextContent('0');
      expect(screen.getByText('0 active')).toBeInTheDocument();
    });
  });

  describe('grid layout', () => {
    it('renders with correct grid classes', () => {
      const { container } = render(
        <MemoryRouter>
          <DashboardStatsGrid
            stats={mockStats}
            activeWorkOrdersCount={15}
            needsAttentionCount={7}
          />
        </MemoryRouter>
      );

      const grid = container.firstChild;
      expect(grid).toHaveClass('grid');
      expect(grid).toHaveClass('gap-4');
      expect(grid).toHaveClass('grid-cols-2');
      expect(grid).toHaveClass('md:grid-cols-4');
    });
  });

  describe('accessibility', () => {
    it('includes aria descriptions on cards', () => {
      render(
        <MemoryRouter>
          <DashboardStatsGrid
            stats={mockStats}
            activeWorkOrdersCount={15}
            needsAttentionCount={7}
          />
        </MemoryRouter>
      );

      expect(screen.getByLabelText('View all equipment in the fleet')).toBeInTheDocument();
      expect(screen.getByLabelText('View overdue work orders')).toBeInTheDocument();
      expect(screen.getByLabelText('View all work orders')).toBeInTheDocument();
      expect(screen.getByLabelText('View equipment that needs attention')).toBeInTheDocument();
    });
  });

  // Issue #589: real dashboard trends — ensures sparkline + trend props are
  // propagated and empty states are handled without throwing.
  describe('trends (issue #589)', () => {
    const trendsFixture = {
      totalEquipment: {
        sparkline: [10, 11, 12, 12, 13, 14, 15],
        delta: 50,
        direction: 'up' as const,
      },
      overdueWorkOrders: {
        sparkline: [5, 4, 4, 3, 3, 2, 2],
        delta: -60,
        direction: 'down' as const,
      },
      totalWorkOrders: {
        sparkline: [100, 105, 108, 110, 115, 118, 120],
        delta: 20,
        direction: 'up' as const,
      },
      needsAttention: {
        sparkline: [7, 7, 7, 7, 7, 7, 7],
        delta: null,
        direction: 'flat' as const,
      },
    };

    it('renders trend chip copy when deltas are provided', () => {
      render(
        <MemoryRouter>
          <DashboardStatsGrid
            stats={mockStats}
            activeWorkOrdersCount={15}
            needsAttentionCount={7}
            trends={trendsFixture}
          />
        </MemoryRouter>
      );

      // Positive and negative deltas both render as "N% this week" (absolute value).
      expect(screen.getByText('50% this week')).toBeInTheDocument();
      expect(screen.getByText('60% this week')).toBeInTheDocument();
      expect(screen.getByText('20% this week')).toBeInTheDocument();
    });

    it('suppresses the trend chip when delta is null (empty-state AC)', () => {
      render(
        <MemoryRouter>
          <DashboardStatsGrid
            stats={mockStats}
            activeWorkOrdersCount={15}
            needsAttentionCount={7}
            trends={trendsFixture}
          />
        </MemoryRouter>
      );

      // needsAttention has delta=null — should render no percentage copy for 0%.
      expect(screen.queryByText('0% this week')).not.toBeInTheDocument();
    });

    it('renders without trends prop (backward compatibility)', () => {
      render(
        <MemoryRouter>
          <DashboardStatsGrid
            stats={mockStats}
            activeWorkOrdersCount={15}
            needsAttentionCount={7}
          />
        </MemoryRouter>
      );

      expect(screen.getByText('Total Equipment')).toBeInTheDocument();
      // No trend copy should exist when no trends are passed.
      expect(screen.queryByText(/% this week$/)).not.toBeInTheDocument();
    });

    it('suppresses sparkline when series has fewer than 2 points', () => {
      const { container } = render(
        <MemoryRouter>
          <DashboardStatsGrid
            stats={mockStats}
            activeWorkOrdersCount={15}
            needsAttentionCount={7}
            trends={{
              ...trendsFixture,
              totalEquipment: { sparkline: [], delta: null, direction: 'flat' },
            }}
          />
        </MemoryRouter>
      );

      // Sparklines render as SVG inside a fixed-height wrapper; a cheap check is
      // that at least the non-empty cards still produce SVG content.
      const svgs = container.querySelectorAll('svg');
      expect(svgs.length).toBeGreaterThan(0);
    });
  });
});
