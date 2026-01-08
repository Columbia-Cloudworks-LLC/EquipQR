import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DashboardRecentEquipmentCard } from '../DashboardRecentEquipmentCard';
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

const mockEquipment = [
  {
    id: 'eq-1',
    name: 'Forklift XL',
    manufacturer: 'Toyota',
    model: 'FXL-500',
    status: 'active',
  },
  {
    id: 'eq-2',
    name: 'Excavator Pro',
    manufacturer: 'Caterpillar',
    model: 'EX-300',
    status: 'maintenance',
  },
];

describe('DashboardRecentEquipmentCard', () => {
  describe('rendering', () => {
    it('renders the card title', () => {
      render(
        <MemoryRouter>
          <DashboardRecentEquipmentCard equipment={[]} isLoading={false} />
        </MemoryRouter>
      );

      expect(screen.getByText('Recent Equipment')).toBeInTheDocument();
    });

    it('renders the card description', () => {
      render(
        <MemoryRouter>
          <DashboardRecentEquipmentCard equipment={[]} isLoading={false} />
        </MemoryRouter>
      );

      expect(screen.getByText('Latest equipment in your fleet')).toBeInTheDocument();
    });

    it('renders view all link', () => {
      render(
        <MemoryRouter>
          <DashboardRecentEquipmentCard equipment={[]} isLoading={false} />
        </MemoryRouter>
      );

      const viewAllLink = screen.getByText('View all');
      expect(viewAllLink).toBeInTheDocument();
      expect(viewAllLink.closest('a')).toHaveAttribute('href', '/dashboard/equipment');
    });

    it('has proper aria-labelledby for accessibility', () => {
      render(
        <MemoryRouter>
          <DashboardRecentEquipmentCard equipment={[]} isLoading={false} />
        </MemoryRouter>
      );

      const section = screen.getByRole('region', { name: /recent equipment/i });
      expect(section).toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    it('renders loading skeletons when loading', () => {
      const { container } = render(
        <MemoryRouter>
          <DashboardRecentEquipmentCard equipment={[]} isLoading={true} />
        </MemoryRouter>
      );

      const skeletons = container.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('does not render equipment when loading', () => {
      render(
        <MemoryRouter>
          <DashboardRecentEquipmentCard equipment={mockEquipment} isLoading={true} />
        </MemoryRouter>
      );

      expect(screen.queryByText('Forklift XL')).not.toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('renders empty message when no equipment', () => {
      render(
        <MemoryRouter>
          <DashboardRecentEquipmentCard equipment={[]} isLoading={false} />
        </MemoryRouter>
      );

      expect(screen.getByText('No equipment found')).toBeInTheDocument();
    });
  });

  describe('with equipment data', () => {
    it('renders equipment names', () => {
      render(
        <MemoryRouter>
          <DashboardRecentEquipmentCard equipment={mockEquipment} isLoading={false} />
        </MemoryRouter>
      );

      expect(screen.getByText('Forklift XL')).toBeInTheDocument();
      expect(screen.getByText('Excavator Pro')).toBeInTheDocument();
    });

    it('renders manufacturer and model', () => {
      render(
        <MemoryRouter>
          <DashboardRecentEquipmentCard equipment={mockEquipment} isLoading={false} />
        </MemoryRouter>
      );

      expect(screen.getByText('Toyota FXL-500')).toBeInTheDocument();
      expect(screen.getByText('Caterpillar EX-300')).toBeInTheDocument();
    });

    it('renders status badges', () => {
      render(
        <MemoryRouter>
          <DashboardRecentEquipmentCard equipment={mockEquipment} isLoading={false} />
        </MemoryRouter>
      );

      expect(screen.getByText('active')).toBeInTheDocument();
      expect(screen.getByText('maintenance')).toBeInTheDocument();
    });

    it('renders links to equipment detail pages', () => {
      render(
        <MemoryRouter>
          <DashboardRecentEquipmentCard equipment={mockEquipment} isLoading={false} />
        </MemoryRouter>
      );

      const links = screen.getAllByRole('link');
      const equipmentLinks = links.filter(link => 
        link.getAttribute('href')?.includes('/dashboard/equipment/')
      );

      expect(equipmentLinks).toHaveLength(2);
      expect(equipmentLinks[0]).toHaveAttribute('href', '/dashboard/equipment/eq-1');
      expect(equipmentLinks[1]).toHaveAttribute('href', '/dashboard/equipment/eq-2');
    });
  });
});
