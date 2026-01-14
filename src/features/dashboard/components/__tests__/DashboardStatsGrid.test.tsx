import React from 'react';
import { render, screen } from '@testing-library/react';
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
            memberCount={8}
          />
        </MemoryRouter>
      );

      expect(screen.getByText('Total Equipment')).toBeInTheDocument();
      expect(screen.getByText('Overdue Work')).toBeInTheDocument();
      expect(screen.getByText('Total Work Orders')).toBeInTheDocument();
      expect(screen.getByText('Org Members')).toBeInTheDocument();
    });

    it('renders stat values correctly', () => {
      render(
        <MemoryRouter>
          <DashboardStatsGrid
            stats={mockStats}
            activeWorkOrdersCount={15}
            memberCount={8}
          />
        </MemoryRouter>
      );

      expect(screen.getByTestId('total-equipment-value')).toHaveTextContent('42');
      expect(screen.getByTestId('overdue-work-value')).toHaveTextContent('5');
      expect(screen.getByTestId('total-work-orders-value')).toHaveTextContent('120');
      expect(screen.getByTestId('org-members-value')).toHaveTextContent('8');
    });

    it('renders sublabels correctly', () => {
      render(
        <MemoryRouter>
          <DashboardStatsGrid
            stats={mockStats}
            activeWorkOrdersCount={15}
            memberCount={8}
          />
        </MemoryRouter>
      );

      expect(screen.getByText('35 active')).toBeInTheDocument();
      expect(screen.getByText('15 active')).toBeInTheDocument();
      expect(screen.getByText('Past due work orders')).toBeInTheDocument();
      expect(screen.getByText('Active organization members')).toBeInTheDocument();
    });

    it('renders links when not loading', () => {
      render(
        <MemoryRouter>
          <DashboardStatsGrid
            stats={mockStats}
            activeWorkOrdersCount={15}
            memberCount={8}
          />
        </MemoryRouter>
      );

      const links = screen.getAllByRole('link');
      expect(links).toHaveLength(4);
      expect(links[0]).toHaveAttribute('href', '/dashboard/equipment');
      expect(links[1]).toHaveAttribute('href', '/dashboard/work-orders?date=overdue');
      expect(links[2]).toHaveAttribute('href', '/dashboard/work-orders');
      expect(links[3]).toHaveAttribute('href', '/dashboard/organization');
    });
  });

  describe('loading state', () => {
    it('renders loading skeletons when loading', () => {
      const { container } = render(
        <MemoryRouter>
          <DashboardStatsGrid
            stats={null}
            activeWorkOrdersCount={0}
            memberCount={0}
            isLoading
          />
        </MemoryRouter>
      );

      const skeletons = container.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('does not render links when loading', () => {
      render(
        <MemoryRouter>
          <DashboardStatsGrid
            stats={null}
            activeWorkOrdersCount={0}
            memberCount={0}
            isLoading
          />
        </MemoryRouter>
      );

      expect(screen.queryAllByRole('link')).toHaveLength(0);
    });

    it('renders card labels even when loading', () => {
      render(
        <MemoryRouter>
          <DashboardStatsGrid
            stats={null}
            activeWorkOrdersCount={0}
            memberCount={0}
            isLoading
          />
        </MemoryRouter>
      );

      expect(screen.getByText('Total Equipment')).toBeInTheDocument();
      expect(screen.getByText('Overdue Work')).toBeInTheDocument();
      expect(screen.getByText('Total Work Orders')).toBeInTheDocument();
      expect(screen.getByText('Org Members')).toBeInTheDocument();
    });
  });

  describe('null stats handling', () => {
    it('renders zero values when stats is null', () => {
      render(
        <MemoryRouter>
          <DashboardStatsGrid
            stats={null}
            activeWorkOrdersCount={0}
            memberCount={5}
          />
        </MemoryRouter>
      );

      expect(screen.getByTestId('total-equipment-value')).toHaveTextContent('0');
      expect(screen.getByTestId('overdue-work-value')).toHaveTextContent('0');
      expect(screen.getByTestId('total-work-orders-value')).toHaveTextContent('0');
      expect(screen.getByTestId('org-members-value')).toHaveTextContent('5');
    });

    it('handles undefined stats gracefully', () => {
      render(
        <MemoryRouter>
          <DashboardStatsGrid
            stats={undefined}
            activeWorkOrdersCount={10}
            memberCount={3}
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
            memberCount={8}
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
            memberCount={8}
          />
        </MemoryRouter>
      );

      expect(screen.getByLabelText('View all equipment in the fleet')).toBeInTheDocument();
      expect(screen.getByLabelText('View overdue work orders')).toBeInTheDocument();
      expect(screen.getByLabelText('View all work orders')).toBeInTheDocument();
      expect(screen.getByLabelText('View organization members')).toBeInTheDocument();
    });
  });
});
