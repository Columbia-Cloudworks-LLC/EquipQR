import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WorkOrderPDFExportDialog } from '../WorkOrderPDFExportDialog';

describe('WorkOrderPDFExportDialog', () => {
  const mockOnOpenChange = vi.fn();
  const mockOnExport = vi.fn();

  const defaultProps = {
    open: true,
    onOpenChange: mockOnOpenChange,
    onExport: mockOnExport,
    isExporting: false,
    showCostsOption: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnExport.mockResolvedValue(undefined);
  });

  describe('Dialog opening and closing', () => {
    it('renders dialog when open is true', () => {
      render(<WorkOrderPDFExportDialog {...defaultProps} />);
      
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Export Work Order PDF')).toBeInTheDocument();
    });

    it('does not render dialog when open is false', () => {
      render(<WorkOrderPDFExportDialog {...defaultProps} open={false} />);
      
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('closes dialog when Cancel button is clicked', async () => {
      const user = userEvent.setup();
      render(<WorkOrderPDFExportDialog {...defaultProps} />);
      
      await user.click(screen.getByRole('button', { name: /cancel/i }));
      
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe('Checkbox state', () => {
    it('renders cost checkbox unchecked by default', () => {
      render(<WorkOrderPDFExportDialog {...defaultProps} />);
      
      const checkbox = screen.getByRole('checkbox', { name: /include cost items/i });
      expect(checkbox).not.toBeChecked();
    });

    it('toggles checkbox state when clicked', async () => {
      const user = userEvent.setup();
      render(<WorkOrderPDFExportDialog {...defaultProps} />);
      
      const checkbox = screen.getByRole('checkbox', { name: /include cost items/i });
      
      await user.click(checkbox);
      expect(checkbox).toBeChecked();
      
      await user.click(checkbox);
      expect(checkbox).not.toBeChecked();
    });

    it('resets checkbox state when dialog closes', async () => {
      const user = userEvent.setup();
      const { rerender } = render(<WorkOrderPDFExportDialog {...defaultProps} />);
      
      // Check the checkbox
      const checkbox = screen.getByRole('checkbox', { name: /include cost items/i });
      await user.click(checkbox);
      expect(checkbox).toBeChecked();
      
      // Close and reopen dialog
      rerender(<WorkOrderPDFExportDialog {...defaultProps} open={false} />);
      rerender(<WorkOrderPDFExportDialog {...defaultProps} open={true} />);
      
      // Checkbox should be reset to unchecked
      const resetCheckbox = screen.getByRole('checkbox', { name: /include cost items/i });
      expect(resetCheckbox).not.toBeChecked();
    });
  });

  describe('showCostsOption prop', () => {
    it('hides checkbox when showCostsOption is false', () => {
      render(<WorkOrderPDFExportDialog {...defaultProps} showCostsOption={false} />);
      
      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
      expect(screen.queryByText(/include cost items/i)).not.toBeInTheDocument();
    });

    it('shows checkbox when showCostsOption is true', () => {
      render(<WorkOrderPDFExportDialog {...defaultProps} showCostsOption={true} />);
      
      expect(screen.getByRole('checkbox', { name: /include cost items/i })).toBeInTheDocument();
    });
  });

  describe('Export button behavior', () => {
    it('shows Download PDF text when not exporting', () => {
      render(<WorkOrderPDFExportDialog {...defaultProps} />);
      
      expect(screen.getByRole('button', { name: /download pdf/i })).toBeInTheDocument();
    });

    it('shows Generating text and spinner when exporting', () => {
      render(<WorkOrderPDFExportDialog {...defaultProps} isExporting={true} />);
      
      expect(screen.getByRole('button', { name: /generating/i })).toBeInTheDocument();
    });

    it('disables buttons when exporting', () => {
      render(<WorkOrderPDFExportDialog {...defaultProps} isExporting={true} />);
      
      expect(screen.getByRole('button', { name: /generating/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
    });

    it('enables buttons when not exporting', () => {
      render(<WorkOrderPDFExportDialog {...defaultProps} isExporting={false} />);
      
      expect(screen.getByRole('button', { name: /download pdf/i })).not.toBeDisabled();
      expect(screen.getByRole('button', { name: /cancel/i })).not.toBeDisabled();
    });
  });

  describe('Export functionality', () => {
    it('calls onExport with includeCosts: false by default', async () => {
      const user = userEvent.setup();
      render(<WorkOrderPDFExportDialog {...defaultProps} />);
      
      await user.click(screen.getByRole('button', { name: /download pdf/i }));
      
      expect(mockOnExport).toHaveBeenCalledWith({ includeCosts: false });
    });

    it('calls onExport with includeCosts: true when checkbox is checked', async () => {
      const user = userEvent.setup();
      render(<WorkOrderPDFExportDialog {...defaultProps} />);
      
      await user.click(screen.getByRole('checkbox', { name: /include cost items/i }));
      await user.click(screen.getByRole('button', { name: /download pdf/i }));
      
      expect(mockOnExport).toHaveBeenCalledWith({ includeCosts: true });
    });

    it('closes dialog on successful export', async () => {
      const user = userEvent.setup();
      mockOnExport.mockResolvedValue(undefined);
      render(<WorkOrderPDFExportDialog {...defaultProps} />);
      
      await user.click(screen.getByRole('button', { name: /download pdf/i }));
      
      await waitFor(() => {
        expect(mockOnOpenChange).toHaveBeenCalledWith(false);
      });
    });

    it('keeps dialog open on export error for retry', async () => {
      const user = userEvent.setup();
      mockOnExport.mockRejectedValue(new Error('Export failed'));
      render(<WorkOrderPDFExportDialog {...defaultProps} />);
      
      await user.click(screen.getByRole('button', { name: /download pdf/i }));
      
      // Dialog should not close on error
      await waitFor(() => {
        expect(mockOnExport).toHaveBeenCalled();
      });
      
      // onOpenChange should not be called with false
      expect(mockOnOpenChange).not.toHaveBeenCalledWith(false);
    });
  });

  describe('Dialog content', () => {
    it('displays dialog title and description', () => {
      render(<WorkOrderPDFExportDialog {...defaultProps} />);
      
      expect(screen.getByText('Export Work Order PDF')).toBeInTheDocument();
      expect(screen.getByText(/generate a customer-facing pdf document/i)).toBeInTheDocument();
    });

    it('displays information about PDF contents', () => {
      render(<WorkOrderPDFExportDialog {...defaultProps} />);
      
      expect(screen.getByText(/work order details/i)).toBeInTheDocument();
      expect(screen.getByText(/equipment information/i)).toBeInTheDocument();
      expect(screen.getByText(/public notes with photos/i)).toBeInTheDocument();
    });
  });
});
