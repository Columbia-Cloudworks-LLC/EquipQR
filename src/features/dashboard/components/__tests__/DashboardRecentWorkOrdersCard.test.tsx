import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DashboardRecentWorkOrdersCard } from '../DashboardRecentWorkOrdersCard';
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

const mockWorkOrders = [
  {
    id: 'wo-1',
    title: 'Replace hydraulic pump',
    priority: 'high',
    assigneeName: 'John Doe',
    status: 'in_progress',
  },
  {
    id: 'wo-2',
    title: 'Annual inspection',
    priority: 'medium',
    assigneeName: null,
    status: 'pending',
  },
  {
    id: 'wo-3',
    title: 'Oil change',
    priority: 'low',
    assigneeName: 'Jane Smith',
    status: 'completed',
  },
];

describe('DashboardRecentWorkOrdersCard', () => {
  describe('rendering', () => {
    it('renders the card title', () => {
      render(
        <MemoryRouter>
          <DashboardRecentWorkOrdersCard workOrders={[]} isLoading={false} hasMore={false} />
        </MemoryRouter>
      );

      expect(screen.getByText('Recent Work Orders')).toBeInTheDocument();
    });

    it('renders the card description', () => {
      render(
        <MemoryRouter>
          <DashboardRecentWorkOrdersCard workOrders={[]} isLoading={false} hasMore={false} />
        </MemoryRouter>
      );

      expect(screen.getByText('Latest work order activity')).toBeInTheDocument();
    });

    it('renders view all link when more items exist', () => {
      render(
        <MemoryRouter>
          <DashboardRecentWorkOrdersCard workOrders={[]} isLoading={false} hasMore={true} />
        </MemoryRouter>
      );

      const viewAllLink = screen.getByRole('link', { name: /view all/i });
      expect(viewAllLink).toBeInTheDocument();
      expect(viewAllLink).toHaveAttribute('href', '/dashboard/work-orders');
    });

    it('does not render view all link when there are not more items', () => {
      render(
        <MemoryRouter>
          <DashboardRecentWorkOrdersCard workOrders={[]} isLoading={false} hasMore={false} />
        </MemoryRouter>
      );

      expect(screen.queryByText('View all')).not.toBeInTheDocument();
    });

    it('has proper aria-labelledby for accessibility', () => {
      render(
        <MemoryRouter>
          <DashboardRecentWorkOrdersCard workOrders={[]} isLoading={false} hasMore={false} />
        </MemoryRouter>
      );

      const section = screen.getByRole('region', { name: /recent work orders/i });
      expect(section).toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    it('renders loading skeletons when loading', () => {
      const { container } = render(
        <MemoryRouter>
          <DashboardRecentWorkOrdersCard workOrders={[]} isLoading={true} hasMore={false} />
        </MemoryRouter>
      );

      const skeletons = container.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('does not render work orders when loading', () => {
      render(
        <MemoryRouter>
          <DashboardRecentWorkOrdersCard workOrders={mockWorkOrders} isLoading={true} hasMore={false} />
        </MemoryRouter>
      );

      expect(screen.queryByText('Replace hydraulic pump')).not.toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('renders empty message when no work orders', () => {
      render(
        <MemoryRouter>
          <DashboardRecentWorkOrdersCard workOrders={[]} isLoading={false} hasMore={false} />
        </MemoryRouter>
      );

      expect(screen.getByText('No work orders found')).toBeInTheDocument();
    });
  });

  describe('with work order data', () => {
    it('renders work order titles', () => {
      render(
        <MemoryRouter>
          <DashboardRecentWorkOrdersCard workOrders={mockWorkOrders} isLoading={false} hasMore={false} />
        </MemoryRouter>
      );

      expect(screen.getByText('Replace hydraulic pump')).toBeInTheDocument();
      expect(screen.getByText('Annual inspection')).toBeInTheDocument();
      expect(screen.getByText('Oil change')).toBeInTheDocument();
    });

    it('renders priority and assignee info', () => {
      render(
        <MemoryRouter>
          <DashboardRecentWorkOrdersCard workOrders={mockWorkOrders} isLoading={false} hasMore={false} />
        </MemoryRouter>
      );

      expect(screen.getByText(/high priority.*John Doe/i)).toBeInTheDocument();
      expect(screen.getByText(/medium priority.*Unassigned/i)).toBeInTheDocument();
      expect(screen.getByText(/low priority.*Jane Smith/i)).toBeInTheDocument();
    });

    it('shows "Unassigned" when assigneeName is null', () => {
      render(
        <MemoryRouter>
          <DashboardRecentWorkOrdersCard workOrders={mockWorkOrders} isLoading={false} hasMore={false} />
        </MemoryRouter>
      );

      expect(screen.getByText(/Unassigned/i)).toBeInTheDocument();
    });

    it('renders status badges with formatted status', () => {
      render(
        <MemoryRouter>
          <DashboardRecentWorkOrdersCard workOrders={mockWorkOrders} isLoading={false} hasMore={false} />
        </MemoryRouter>
      );

      // "in_progress" should be formatted as "in progress"
      expect(screen.getByText('in progress')).toBeInTheDocument();
      expect(screen.getByText('pending')).toBeInTheDocument();
      expect(screen.getByText('completed')).toBeInTheDocument();
    });

    it('renders links to work order detail pages', () => {
      render(
        <MemoryRouter>
          <DashboardRecentWorkOrdersCard workOrders={mockWorkOrders} isLoading={false} hasMore={false} />
        </MemoryRouter>
      );

      const links = screen.getAllByRole('link');
      const workOrderLinks = links.filter(link => 
        link.getAttribute('href')?.includes('/dashboard/work-orders/')
      );

      expect(workOrderLinks).toHaveLength(3);
      expect(workOrderLinks[0]).toHaveAttribute('href', '/dashboard/work-orders/wo-1');
      expect(workOrderLinks[1]).toHaveAttribute('href', '/dashboard/work-orders/wo-2');
      expect(workOrderLinks[2]).toHaveAttribute('href', '/dashboard/work-orders/wo-3');
    });
  });
});
