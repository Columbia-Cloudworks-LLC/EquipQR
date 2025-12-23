import React from 'react';
import { render, screen, fireEvent, waitFor } from '@/test/utils/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeleteEquipmentDialog } from '../DeleteEquipmentDialog';
import * as deleteEquipmentServiceModule from '@/features/equipment/services/deleteEquipmentService';
import * as useDeleteEquipmentModule from '@/features/equipment/hooks/useDeleteEquipment';

// Mock services and hooks
vi.mock('@/features/equipment/services/deleteEquipmentService', () => ({
  getEquipmentDeletionImpact: vi.fn()
}));

vi.mock('@/features/equipment/hooks/useDeleteEquipment', () => ({
  useDeleteEquipment: vi.fn()
}));

const mockImpact = {
  workOrders: 5,
  pmCount: 3,
  equipmentNoteImages: 2,
  workOrderImages: 4
};

describe('DeleteEquipmentDialog', () => {
  const mockOnOpenChange = vi.fn();
  const mockOnSuccess = vi.fn();

  const defaultProps = {
    open: true,
    onOpenChange: mockOnOpenChange,
    equipmentId: 'eq-1',
    equipmentName: 'Test Equipment',
    orgId: 'org-1',
    onSuccess: mockOnSuccess
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    vi.mocked(deleteEquipmentServiceModule.getEquipmentDeletionImpact).mockResolvedValue(mockImpact);
    
    vi.mocked(useDeleteEquipmentModule.useDeleteEquipment).mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue(undefined),
      isPending: false
    });
  });

  describe('Initial Step - Alert Dialog', () => {
    it('renders alert dialog when open', () => {
      render(<DeleteEquipmentDialog {...defaultProps} />);
      
      expect(screen.getByText('Delete this equipment?')).toBeInTheDocument();
    });

    it('displays equipment name in warning', () => {
      render(<DeleteEquipmentDialog {...defaultProps} />);
      
      expect(screen.getByText(/Test Equipment/)).toBeInTheDocument();
    });

    it('shows loading state while fetching impact', () => {
      vi.mocked(deleteEquipmentServiceModule.getEquipmentDeletionImpact).mockImplementation(() => new Promise(() => {}));
      
      render(<DeleteEquipmentDialog {...defaultProps} />);
      
      expect(screen.getByText('Calculating impact...')).toBeInTheDocument();
    });

    it('displays deletion impact when loaded', async () => {
      render(<DeleteEquipmentDialog {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText(/Work orders:/)).toBeInTheDocument();
        expect(screen.getByText('5')).toBeInTheDocument();
        expect(screen.getByText(/Preventative maintenance records:/)).toBeInTheDocument();
        expect(screen.getByText('3')).toBeInTheDocument();
        expect(screen.getByText(/Images \(notes \+ work orders\):/)).toBeInTheDocument();
        expect(screen.getByText('6')).toBeInTheDocument(); // 2 + 4
      });
    });

    it('renders cancel and continue buttons', () => {
      render(<DeleteEquipmentDialog {...defaultProps} />);
      
      expect(screen.getByText('Cancel')).toBeInTheDocument();
      expect(screen.getByText('Continue')).toBeInTheDocument();
    });

    it('disables continue button while loading impact', () => {
      vi.mocked(deleteEquipmentServiceModule.getEquipmentDeletionImpact).mockImplementation(() => new Promise(() => {}));
      
      render(<DeleteEquipmentDialog {...defaultProps} />);
      
      const continueButton = screen.getByText('Continue');
      expect(continueButton).toBeDisabled();
    });
  });

  describe('Confirmation Step', () => {
    it('moves to confirmation step when continue is clicked', async () => {
      render(<DeleteEquipmentDialog {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Continue')).toBeInTheDocument();
      });
      
      const continueButton = screen.getByText('Continue');
      fireEvent.click(continueButton);
      
      await waitFor(() => {
        expect(screen.getByText('Confirm Equipment Deletion')).toBeInTheDocument();
      });
    });

    it('displays final warning in confirmation step', async () => {
      render(<DeleteEquipmentDialog {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Continue')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByText('Continue'));
      
      await waitFor(() => {
        expect(screen.getByText(/This action cannot be undone/)).toBeInTheDocument();
        expect(screen.getByText(/permanently and irreversibly delete/)).toBeInTheDocument();
      });
    });

    it('shows acknowledgment checkbox', async () => {
      render(<DeleteEquipmentDialog {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Continue')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByText('Continue'));
      
      await waitFor(() => {
        const checkbox = screen.getByRole('checkbox');
        expect(checkbox).toBeInTheDocument();
        expect(checkbox).not.toBeChecked();
      });
    });

    it('enables delete button only when acknowledged', async () => {
      render(<DeleteEquipmentDialog {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Continue')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByText('Continue'));
      
      await waitFor(() => {
        const deleteButton = screen.getByText('Delete Forever');
        expect(deleteButton).toBeDisabled();
        
        const checkbox = screen.getByRole('checkbox');
        fireEvent.click(checkbox);
        
        expect(deleteButton).not.toBeDisabled();
      });
    });
  });

  describe('Deletion Process', () => {
    it('calls delete mutation when delete button is clicked', async () => {
      const mockMutateAsync = vi.fn().mockResolvedValue(undefined);
      vi.mocked(useDeleteEquipmentModule.useDeleteEquipment).mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false
      });
      
      render(<DeleteEquipmentDialog {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Continue')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByText('Continue'));
      
      await waitFor(() => {
        const checkbox = screen.getByRole('checkbox');
        fireEvent.click(checkbox);
      });
      
      const deleteButton = screen.getByText('Delete Forever');
      fireEvent.click(deleteButton);
      
      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith({ equipmentId: 'eq-1', orgId: 'org-1' });
      });
    });

    it('calls onSuccess after successful deletion', async () => {
      const mockMutateAsync = vi.fn().mockResolvedValue(undefined);
      vi.mocked(useDeleteEquipmentModule.useDeleteEquipment).mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false
      });
      
      render(<DeleteEquipmentDialog {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Continue')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByText('Continue'));
      
      await waitFor(() => {
        const checkbox = screen.getByRole('checkbox');
        fireEvent.click(checkbox);
      });
      
      fireEvent.click(screen.getByText('Delete Forever'));
      
      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });

    it('closes dialog after successful deletion', async () => {
      const mockMutateAsync = vi.fn().mockResolvedValue(undefined);
      vi.mocked(useDeleteEquipmentModule.useDeleteEquipment).mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false
      });
      
      render(<DeleteEquipmentDialog {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Continue')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByText('Continue'));
      
      await waitFor(() => {
        const checkbox = screen.getByRole('checkbox');
        fireEvent.click(checkbox);
      });
      
      fireEvent.click(screen.getByText('Delete Forever'));
      
      await waitFor(() => {
        expect(mockOnOpenChange).toHaveBeenCalledWith(false);
      });
    });

    it('shows loading state during deletion', async () => {
      const mockMutateAsync = vi.fn(() => new Promise(() => {}));
      vi.mocked(useDeleteEquipmentModule.useDeleteEquipment).mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: true
      });
      
      render(<DeleteEquipmentDialog {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Continue')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByText('Continue'));
      
      await waitFor(() => {
        const checkbox = screen.getByRole('checkbox');
        fireEvent.click(checkbox);
      });
      
      expect(screen.getByText('Deleting...')).toBeInTheDocument();
    });
  });

  describe('Cancel Functionality', () => {
    it('calls onOpenChange when cancel is clicked in initial step', () => {
      render(<DeleteEquipmentDialog {...defaultProps} />);
      
      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);
      
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });

    it('calls onOpenChange when cancel is clicked in confirmation step', async () => {
      render(<DeleteEquipmentDialog {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Continue')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByText('Continue'));
      
      await waitFor(() => {
        const cancelButton = screen.getByText('Cancel');
        fireEvent.click(cancelButton);
      });
      
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });

    it('resets state when dialog is closed', async () => {
      const { rerender } = render(<DeleteEquipmentDialog {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Continue')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByText('Continue'));
      
      await waitFor(() => {
        expect(screen.getByText('Confirm Equipment Deletion')).toBeInTheDocument();
      });
      
      // Close and reopen
      rerender(<DeleteEquipmentDialog {...defaultProps} open={false} />);
      rerender(<DeleteEquipmentDialog {...defaultProps} open={true} />);
      
      // Should be back to initial step
      await waitFor(() => {
        expect(screen.getByText('Delete this equipment?')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('handles error when fetching impact fails', async () => {
      vi.mocked(deleteEquipmentServiceModule.getEquipmentDeletionImpact).mockRejectedValue(new Error('Failed to fetch'));
      
      render(<DeleteEquipmentDialog {...defaultProps} />);
      
      // Should still render the dialog
      expect(screen.getByText('Delete this equipment?')).toBeInTheDocument();
    });
  });
});


