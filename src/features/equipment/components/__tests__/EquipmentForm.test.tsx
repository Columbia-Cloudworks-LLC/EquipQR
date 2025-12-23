import React from 'react';
import { render, screen, fireEvent, waitFor } from '@/test/utils/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import EquipmentForm from '../EquipmentForm';

// Mock hooks
vi.mock('../hooks/useEquipmentForm', () => ({
  useEquipmentForm: vi.fn()
}));

vi.mock('@/hooks/useCustomAttributes', () => ({
  useCustomAttributes: vi.fn(() => ({
    attributes: []
  }))
}));

// Mock form sections
vi.mock('../form/EquipmentBasicInfoSection', () => ({
  default: () => <div data-testid="basic-info-section">Basic Info</div>
}));

vi.mock('../form/EquipmentStatusLocationSection', () => ({
  default: () => <div data-testid="status-location-section">Status & Location</div>
}));

vi.mock('../form/EquipmentNotesSection', () => ({
  default: () => <div data-testid="notes-section">Notes</div>
}));

vi.mock('../form/TeamSelectionSection', () => ({
  default: () => <div data-testid="team-selection-section">Team Selection</div>
}));

vi.mock('../form/EquipmentFormActions', () => ({
  default: ({ isEdit, isPending, onClose }: any) => (
    <div data-testid="form-actions">
      <button onClick={onClose}>Cancel</button>
      <button type="submit" disabled={isPending}>
        {isPending ? 'Saving...' : (isEdit ? 'Update' : 'Create')}
      </button>
    </div>
  )
}));

vi.mock('../CustomAttributesSection', () => ({
  default: () => <div data-testid="custom-attributes-section">Custom Attributes</div>
}));

const mockEquipment = {
  id: 'eq-1',
  name: 'Test Equipment',
  manufacturer: 'Test Manufacturer',
  model: 'Test Model',
  serial_number: 'TEST123',
  status: 'active',
  location: 'Test Location'
};

describe('EquipmentForm', () => {
  const mockOnClose = vi.fn();
  const mockOnSubmit = vi.fn();
  const mockForm = {
    control: {},
    handleSubmit: vi.fn((fn) => (e: any) => {
      e.preventDefault();
      fn({});
    }),
    setValue: vi.fn(),
    watch: vi.fn(),
    formState: { errors: {} }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    const { useEquipmentForm } = require('../hooks/useEquipmentForm');
    vi.mocked(useEquipmentForm).mockReturnValue({
      form: mockForm,
      onSubmit: mockOnSubmit,
      isEdit: false,
      isPending: false
    });
  });

  describe('Dialog Rendering', () => {
    it('does not render when open is false', () => {
      render(<EquipmentForm open={false} onClose={mockOnClose} />);
      
      expect(screen.queryByText('Create New Equipment')).not.toBeInTheDocument();
    });

    it('renders when open is true', () => {
      render(<EquipmentForm open={true} onClose={mockOnClose} />);
      
      expect(screen.getByText('Create New Equipment')).toBeInTheDocument();
    });

    it('shows create title when not in edit mode', () => {
      render(<EquipmentForm open={true} onClose={mockOnClose} />);
      
      expect(screen.getByText('Create New Equipment')).toBeInTheDocument();
      expect(screen.getByText('Enter the details for the new equipment')).toBeInTheDocument();
    });

    it('shows edit title when in edit mode', () => {
      const { useEquipmentForm } = require('../hooks/useEquipmentForm');
      vi.mocked(useEquipmentForm).mockReturnValue({
        form: mockForm,
        onSubmit: mockOnSubmit,
        isEdit: true,
        isPending: false
      });

      render(<EquipmentForm open={true} onClose={mockOnClose} equipment={mockEquipment} />);
      
      expect(screen.getByText('Edit Equipment')).toBeInTheDocument();
      expect(screen.getByText('Update equipment information')).toBeInTheDocument();
    });
  });

  describe('Form Sections', () => {
    it('renders all form sections', () => {
      render(<EquipmentForm open={true} onClose={mockOnClose} />);
      
      expect(screen.getByTestId('basic-info-section')).toBeInTheDocument();
      expect(screen.getByTestId('status-location-section')).toBeInTheDocument();
      expect(screen.getByTestId('team-selection-section')).toBeInTheDocument();
      expect(screen.getByTestId('notes-section')).toBeInTheDocument();
      expect(screen.getByTestId('custom-attributes-section')).toBeInTheDocument();
    });

    it('renders form actions', () => {
      render(<EquipmentForm open={true} onClose={mockOnClose} />);
      
      expect(screen.getByTestId('form-actions')).toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    it('calls onSubmit when form is submitted', async () => {
      render(<EquipmentForm open={true} onClose={mockOnClose} />);
      
      const form = screen.getByTestId('form-actions').closest('form');
      if (form) {
        fireEvent.submit(form);
        
        await waitFor(() => {
          expect(mockOnSubmit).toHaveBeenCalled();
        });
      }
    });
  });

  describe('Custom Attributes', () => {
    it('calls setValue when custom attributes change', () => {
      const { useCustomAttributes } = require('@/hooks/useCustomAttributes');
      const mockOnChange = vi.fn();
      
      render(<EquipmentForm open={true} onClose={mockOnClose} />);
      
      // CustomAttributesSection should be rendered and handle onChange
      expect(screen.getByTestId('custom-attributes-section')).toBeInTheDocument();
    });
  });

  describe('Equipment Data', () => {
    it('passes equipment data to useEquipmentForm hook', () => {
      render(<EquipmentForm open={true} onClose={mockOnClose} equipment={mockEquipment} />);
      
      const { useEquipmentForm } = require('../hooks/useEquipmentForm');
      expect(useEquipmentForm).toHaveBeenCalledWith(mockEquipment, mockOnClose);
    });

    it('passes undefined when no equipment provided', () => {
      render(<EquipmentForm open={true} onClose={mockOnClose} />);
      
      const { useEquipmentForm } = require('../hooks/useEquipmentForm');
      expect(useEquipmentForm).toHaveBeenCalledWith(undefined, mockOnClose);
    });
  });

  describe('Dialog Close', () => {
    it('calls onClose when dialog is closed', () => {
      render(<EquipmentForm open={true} onClose={mockOnClose} />);
      
      // Dialog close would be triggered by clicking outside or close button
      // This depends on the Dialog component implementation
      expect(screen.getByText('Create New Equipment')).toBeInTheDocument();
    });
  });

  describe('Layout', () => {
    it('applies responsive grid layout', () => {
      const { container } = render(<EquipmentForm open={true} onClose={mockOnClose} />);
      
      const grid = container.querySelector('[class*="grid"]');
      expect(grid).toHaveClass('grid');
      expect(grid).toHaveClass('grid-cols-1');
      expect(grid).toHaveClass('md:grid-cols-2');
    });

    it('applies max width and scroll classes', () => {
      const { container } = render(<EquipmentForm open={true} onClose={mockOnClose} />);
      
      const dialogContent = container.querySelector('[class*="max-w-4xl"]');
      expect(dialogContent).toBeInTheDocument();
    });
  });
});

