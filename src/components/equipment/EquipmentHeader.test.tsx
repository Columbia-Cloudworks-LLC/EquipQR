import { vi, beforeEach, describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import EquipmentHeader from './EquipmentHeader';

const defaultProps = {
  organizationName: 'Test Organization',
  canCreate: true,
  canImport: false,
  onAddEquipment: vi.fn(),
  onImportCsv: vi.fn(),
};

describe('EquipmentHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders the equipment title', () => {
      render(<EquipmentHeader {...defaultProps} />);
      
      expect(screen.getByText('Equipment')).toBeInTheDocument();
    });

    it('renders the organization name in description', () => {
      render(<EquipmentHeader {...defaultProps} />);
      
      expect(screen.getByText('Manage equipment for Test Organization')).toBeInTheDocument();
    });

    it('renders the add equipment button when canCreate is true', () => {
      render(<EquipmentHeader {...defaultProps} />);
      
      expect(screen.getByText('Add Equipment')).toBeInTheDocument();
    });

    it('shows import button when canImport is true', () => {
      render(<EquipmentHeader {...defaultProps} canImport={true} />);
      
      expect(screen.getByText('Import CSV')).toBeInTheDocument();
    });

    it('does not render the add equipment button when canCreate is false', () => {
      render(<EquipmentHeader canCreate={false} organizationName="Test Org" canImport={false} onAddEquipment={vi.fn()} onImportCsv={vi.fn()} />);
      
      expect(screen.queryByText('Add Equipment')).not.toBeInTheDocument();
    });

    it('calls onAddEquipment when add button is clicked', () => {
      const onAddEquipment = vi.fn();
      render(<EquipmentHeader onAddEquipment={onAddEquipment} organizationName="Test Org" canCreate={true} canImport={false} onImportCsv={vi.fn()} />);
      
      screen.getByText('Add Equipment').click();
      expect(onAddEquipment).toHaveBeenCalledTimes(1);
    });
  });

  describe('Responsive Layout', () => {
    it('applies responsive layout classes', () => {
      render(<EquipmentHeader {...defaultProps} />);
      
      const container = screen.getByTestId('equipment-header');
      expect(container).toHaveClass('flex');
      expect(container).toHaveClass('flex-col');
      expect(container).toHaveClass('gap-4');
      expect(container).toHaveClass('sm:flex-row');
      expect(container).toHaveClass('sm:items-center');
      expect(container).toHaveClass('sm:justify-between');
    });
  });

  describe('Conditional Button Rendering', () => {
    it('shows both buttons when user has both permissions', () => {
      render(<EquipmentHeader {...defaultProps} canImport={true} />);
      
      expect(screen.getByText('Add Equipment')).toBeInTheDocument();
      expect(screen.getByText('Import CSV')).toBeInTheDocument();
    });

    it('shows only add button when user can only create', () => {
      render(<EquipmentHeader {...defaultProps} canImport={false} />);
      
      expect(screen.getByText('Add Equipment')).toBeInTheDocument();
      expect(screen.queryByText('Import CSV')).not.toBeInTheDocument();
    });

    it('shows only import button when user can only import', () => {
      render(<EquipmentHeader {...defaultProps} canCreate={false} canImport={true} />);
      
      expect(screen.queryByText('Add Equipment')).not.toBeInTheDocument();
      expect(screen.getByText('Import CSV')).toBeInTheDocument();
    });

    it('shows no buttons when user has no permissions', () => {
      render(<EquipmentHeader {...defaultProps} canCreate={false} canImport={false} />);
      
      expect(screen.queryByText('Add Equipment')).not.toBeInTheDocument();
      expect(screen.queryByText('Import CSV')).not.toBeInTheDocument();
    });
  });

  describe('Button Click Handlers', () => {
    it('calls onAddEquipment when add button is clicked', () => {
      const onAddEquipment = vi.fn();
      render(<EquipmentHeader {...defaultProps} onAddEquipment={onAddEquipment} />);
      
      screen.getByText('Add Equipment').click();
      expect(onAddEquipment).toHaveBeenCalledTimes(1);
    });

    it('calls onImportCsv when import button is clicked', () => {
      const onImportCsv = vi.fn();
      render(<EquipmentHeader {...defaultProps} canImport={true} onImportCsv={onImportCsv} />);
      
      screen.getByText('Import CSV').click();
      expect(onImportCsv).toHaveBeenCalledTimes(1);
    });
  });

  describe('Mobile Layout Adjustments', () => {
    it('applies full width to buttons on mobile', () => {
      render(<EquipmentHeader {...defaultProps} canImport={true} />);
      
      const addButton = screen.getByText('Add Equipment');
      const importButton = screen.getByText('Import CSV');
      
      expect(addButton).toHaveClass('w-full');
      expect(importButton).toHaveClass('w-full');
    });

    it('stacks buttons vertically on mobile', () => {
      render(<EquipmentHeader {...defaultProps} canImport={true} />);
      
      const buttonContainer = screen.getByTestId('button-container');
      expect(buttonContainer).toHaveClass('flex-col');
    });
  });
});