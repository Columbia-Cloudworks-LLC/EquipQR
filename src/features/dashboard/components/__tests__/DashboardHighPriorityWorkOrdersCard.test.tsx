import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DashboardHighPriorityWorkOrdersCard } from '../DashboardHighPriorityWorkOrdersCard';
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
    title: 'Critical engine failure',
    createdDate: '2026-01-08T10:00:00Z',
    dueDate: '2026-01-10T10:00:00Z',
  },
  {
    id: 'wo-2',
    title: 'Safety valve replacement',
    createdDate: '2026-01-07T08:30:00Z',
    dueDate: null,
  },
];

describe('DashboardHighPriorityWorkOrdersCard', () => {
  let mockToLocaleDateString: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Mock toLocaleDateString for consistent test results
    mockToLocaleDateString = vi.spyOn(Date.prototype, 'toLocaleDateString');
    mockToLocaleDateString.mockImplementation(function(this: Date) {
      const month = this.getMonth() + 1;
      const day = this.getDate();
      const year = this.getFullYear();
      return `${month}/${day}/${year}`;
    });
  });

  afterEach(() => {
    mockToLocaleDateString.mockRestore();
  });

  describe('empty state', () => {
    it('returns null when no work orders', () => {
      const { container } = render(
        <MemoryRouter>
          <DashboardHighPriorityWorkOrdersCard workOrders={[]} />
        </MemoryRouter>
      );

      expect(container.firstChild).toBeNull();
    });
  });

  describe('rendering', () => {
    it('renders the card title', () => {
      render(
        <MemoryRouter>
          <DashboardHighPriorityWorkOrdersCard workOrders={mockWorkOrders} />
        </MemoryRouter>
      );

      expect(screen.getByText('High Priority Work Orders')).toBeInTheDocument();
    });

    it('renders count in description', () => {
      render(
        <MemoryRouter>
          <DashboardHighPriorityWorkOrdersCard workOrders={mockWorkOrders} />
        </MemoryRouter>
      );

      expect(screen.getByText('2 work orders require immediate attention')).toBeInTheDocument();
    });

    it('renders singular description for one work order', () => {
      render(
        <MemoryRouter>
          <DashboardHighPriorityWorkOrdersCard workOrders={[mockWorkOrders[0]]} />
        </MemoryRouter>
      );

      expect(screen.getByText('1 work orders require immediate attention')).toBeInTheDocument();
    });

    it('has proper aria-labelledby for accessibility', () => {
      render(
        <MemoryRouter>
          <DashboardHighPriorityWorkOrdersCard workOrders={mockWorkOrders} />
        </MemoryRouter>
      );

      const section = screen.getByRole('region', { name: /high priority/i });
      expect(section).toBeInTheDocument();
    });
  });

  describe('with work order data', () => {
    it('renders work order titles', () => {
      render(
        <MemoryRouter>
          <DashboardHighPriorityWorkOrdersCard workOrders={mockWorkOrders} />
        </MemoryRouter>
      );

      expect(screen.getByText('Critical engine failure')).toBeInTheDocument();
      expect(screen.getByText('Safety valve replacement')).toBeInTheDocument();
    });

    it('renders created dates', () => {
      render(
        <MemoryRouter>
          <DashboardHighPriorityWorkOrdersCard workOrders={mockWorkOrders} />
        </MemoryRouter>
      );

      expect(screen.getByText(/Created: 1\/8\/2026/)).toBeInTheDocument();
      expect(screen.getByText(/Created: 1\/7\/2026/)).toBeInTheDocument();
    });

    it('renders due dates when provided', () => {
      render(
        <MemoryRouter>
          <DashboardHighPriorityWorkOrdersCard workOrders={mockWorkOrders} />
        </MemoryRouter>
      );

      expect(screen.getByText(/Due: 1\/10\/2026/)).toBeInTheDocument();
    });

    it('does not render due date when null', () => {
      render(
        <MemoryRouter>
          <DashboardHighPriorityWorkOrdersCard workOrders={[mockWorkOrders[1]]} />
        </MemoryRouter>
      );

      expect(screen.queryByText(/Due:/)).not.toBeInTheDocument();
    });

    it('renders high priority badges', () => {
      render(
        <MemoryRouter>
          <DashboardHighPriorityWorkOrdersCard workOrders={mockWorkOrders} />
        </MemoryRouter>
      );

      const badges = screen.getAllByText('High Priority');
      expect(badges).toHaveLength(2);
    });

    it('renders links to work order detail pages', () => {
      render(
        <MemoryRouter>
          <DashboardHighPriorityWorkOrdersCard workOrders={mockWorkOrders} />
        </MemoryRouter>
      );

      const links = screen.getAllByRole('link');
      expect(links).toHaveLength(2);
      expect(links[0]).toHaveAttribute('href', '/dashboard/work-orders/wo-1');
      expect(links[1]).toHaveAttribute('href', '/dashboard/work-orders/wo-2');
    });
  });
});
