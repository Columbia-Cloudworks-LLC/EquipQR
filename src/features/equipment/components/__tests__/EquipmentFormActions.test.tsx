import React from 'react';
import { render, screen, fireEvent } from '@/test/utils/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import EquipmentFormActions from '../form/EquipmentFormActions';

describe('EquipmentFormActions', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Core Rendering', () => {
    it('renders cancel button', () => {
      render(<EquipmentFormActions isEdit={false} isPending={false} onClose={mockOnClose} />);
      
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('renders create button when not in edit mode', () => {
      render(<EquipmentFormActions isEdit={false} isPending={false} onClose={mockOnClose} />);
      
      expect(screen.getByText('Create Equipment')).toBeInTheDocument();
    });

    it('renders update button when in edit mode', () => {
      render(<EquipmentFormActions isEdit={true} isPending={false} onClose={mockOnClose} />);
      
      expect(screen.getByText('Update Equipment')).toBeInTheDocument();
    });
  });

  describe('Button Interactions', () => {
    it('calls onClose when cancel button is clicked', () => {
      render(<EquipmentFormActions isEdit={false} isPending={false} onClose={mockOnClose} />);
      
      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);
      
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('cancel button has type="button" to prevent form submission', () => {
      render(<EquipmentFormActions isEdit={false} isPending={false} onClose={mockOnClose} />);
      
      const cancelButton = screen.getByText('Cancel');
      expect(cancelButton).toHaveAttribute('type', 'button');
    });

    it('submit button has type="submit"', () => {
      render(<EquipmentFormActions isEdit={false} isPending={false} onClose={mockOnClose} />);
      
      const submitButton = screen.getByText('Create Equipment');
      expect(submitButton).toHaveAttribute('type', 'submit');
    });
  });

  describe('Pending State', () => {
    it('shows "Creating..." when isPending is true in create mode', () => {
      render(<EquipmentFormActions isEdit={false} isPending={true} onClose={mockOnClose} />);
      
      expect(screen.getByText('Creating...')).toBeInTheDocument();
      expect(screen.queryByText('Create Equipment')).not.toBeInTheDocument();
    });

    it('disables submit button when isPending is true', () => {
      render(<EquipmentFormActions isEdit={false} isPending={true} onClose={mockOnClose} />);
      
      const submitButton = screen.getByText('Creating...');
      expect(submitButton).toBeDisabled();
    });

    it('enables submit button when isPending is false', () => {
      render(<EquipmentFormActions isEdit={false} isPending={false} onClose={mockOnClose} />);
      
      const submitButton = screen.getByText('Create Equipment');
      expect(submitButton).not.toBeDisabled();
    });
  });

  describe('Layout', () => {
    it('applies flex layout classes', () => {
      render(
        <EquipmentFormActions isEdit={false} isPending={false} onClose={mockOnClose} />
      );
      
      const actionsContainer = screen.getByTestId('equipment-form-actions');
      expect(actionsContainer).toHaveClass('flex');
      expect(actionsContainer).toHaveClass('gap-2');
      expect(actionsContainer).toHaveClass('justify-end');
    });
  });
});
