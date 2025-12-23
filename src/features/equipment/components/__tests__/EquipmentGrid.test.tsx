import React from 'react';
import { render, screen, fireEvent } from '@/test/utils/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import EquipmentGrid from '../EquipmentGrid';

// Mock EquipmentCard
vi.mock('../EquipmentCard', () => ({
  default: ({ equipment, onShowQRCode }: { equipment: any; onShowQRCode: (id: string) => void }) => (
    <div data-testid={`equipment-card-${equipment.id}`}>
      <div>{equipment.name}</div>
      <button onClick={() => onShowQRCode(equipment.id)}>Show QR</button>
    </div>
  )
}));

const mockEquipment = [
  {
    id: 'eq-1',
    name: 'Forklift A1',
    manufacturer: 'Toyota',
    model: 'Model X',
    serial_number: 'SN12345',
    status: 'active',
    location: 'Warehouse A'
  },
  {
    id: 'eq-2',
    name: 'Excavator B2',
    manufacturer: 'Caterpillar',
    model: 'Model Y',
    serial_number: 'SN67890',
    status: 'maintenance',
    location: 'Warehouse B'
  }
];

describe('EquipmentGrid', () => {
  const mockOnShowQRCode = vi.fn();
  const mockOnAddEquipment = vi.fn();

  const defaultProps = {
    equipment: mockEquipment,
    searchQuery: '',
    statusFilter: 'all',
    organizationName: 'Test Organization',
    canCreate: true,
    onShowQRCode: mockOnShowQRCode,
    onAddEquipment: mockOnAddEquipment
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Core Rendering', () => {
    it('renders equipment cards in grid', () => {
      render(<EquipmentGrid {...defaultProps} />);
      
      expect(screen.getByTestId('equipment-card-eq-1')).toBeInTheDocument();
      expect(screen.getByTestId('equipment-card-eq-2')).toBeInTheDocument();
    });

    it('renders all equipment items', () => {
      render(<EquipmentGrid {...defaultProps} />);
      
      expect(screen.getByText('Forklift A1')).toBeInTheDocument();
      expect(screen.getByText('Excavator B2')).toBeInTheDocument();
    });

    it('applies responsive grid classes', () => {
      const { container } = render(<EquipmentGrid {...defaultProps} />);
      
      const grid = container.querySelector('[class*="grid"]');
      expect(grid).toHaveClass('grid');
      expect(grid).toHaveClass('gap-4');
      expect(grid).toHaveClass('md:gap-6');
      expect(grid).toHaveClass('md:grid-cols-2');
      expect(grid).toHaveClass('lg:grid-cols-3');
    });
  });

  describe('Empty State', () => {
    it('renders empty state when no equipment', () => {
      render(<EquipmentGrid {...defaultProps} equipment={[]} />);
      
      expect(screen.getByText('No equipment found')).toBeInTheDocument();
      expect(screen.getByText(/Get started by adding your first piece of equipment/)).toBeInTheDocument();
    });

    it('shows "Add Equipment" button in empty state when canCreate is true and no filters', () => {
      render(<EquipmentGrid {...defaultProps} equipment={[]} />);
      
      const addButton = screen.getByText('Add Equipment');
      expect(addButton).toBeInTheDocument();
    });

    it('does not show "Add Equipment" button when canCreate is false', () => {
      render(<EquipmentGrid {...defaultProps} equipment={[]} canCreate={false} />);
      
      expect(screen.queryByText('Add Equipment')).not.toBeInTheDocument();
    });

    it('shows different message when filters are active', () => {
      render(
        <EquipmentGrid 
          {...defaultProps} 
          equipment={[]} 
          searchQuery="test" 
        />
      );
      
      expect(screen.getByText('No equipment matches your current filters.')).toBeInTheDocument();
    });

    it('shows different message when status filter is active', () => {
      render(
        <EquipmentGrid 
          {...defaultProps} 
          equipment={[]} 
          statusFilter="maintenance" 
        />
      );
      
      expect(screen.getByText('No equipment matches your current filters.')).toBeInTheDocument();
    });

    it('does not show "Add Equipment" button when filters are active', () => {
      render(
        <EquipmentGrid 
          {...defaultProps} 
          equipment={[]} 
          searchQuery="test" 
        />
      );
      
      expect(screen.queryByText('Add Equipment')).not.toBeInTheDocument();
    });

    it('calls onAddEquipment when add button is clicked', () => {
      render(<EquipmentGrid {...defaultProps} equipment={[]} />);
      
      const addButton = screen.getByText('Add Equipment');
      fireEvent.click(addButton);
      
      expect(mockOnAddEquipment).toHaveBeenCalledTimes(1);
    });
  });

  describe('Equipment Card Integration', () => {
    it('passes equipment data to EquipmentCard', () => {
      render(<EquipmentGrid {...defaultProps} />);
      
      expect(screen.getByText('Forklift A1')).toBeInTheDocument();
      expect(screen.getByText('Excavator B2')).toBeInTheDocument();
    });

    it('passes onShowQRCode handler to EquipmentCard', () => {
      render(<EquipmentGrid {...defaultProps} />);
      
      const qrButtons = screen.getAllByText('Show QR');
      fireEvent.click(qrButtons[0]);
      
      expect(mockOnShowQRCode).toHaveBeenCalledWith('eq-1');
    });
  });

  describe('Edge Cases', () => {
    it('handles single equipment item', () => {
      render(<EquipmentGrid {...defaultProps} equipment={[mockEquipment[0]]} />);
      
      expect(screen.getByTestId('equipment-card-eq-1')).toBeInTheDocument();
      expect(screen.queryByTestId('equipment-card-eq-2')).not.toBeInTheDocument();
    });

    it('handles large number of equipment items', () => {
      const manyEquipment = Array.from({ length: 20 }, (_, i) => ({
        ...mockEquipment[0],
        id: `eq-${i}`,
        name: `Equipment ${i}`
      }));
      
      render(<EquipmentGrid {...defaultProps} equipment={manyEquipment} />);
      
      expect(screen.getByText('Equipment 0')).toBeInTheDocument();
      expect(screen.getByText('Equipment 19')).toBeInTheDocument();
    });
  });
});

