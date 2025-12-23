import React from 'react';
import { render, screen, fireEvent } from '@/test/utils/test-utils';
import { describe, it, expect, vi } from 'vitest';
import { CSVSuccessStep } from '../csv-import/CSVSuccessStep';

describe('CSVSuccessStep', () => {
  const mockOnClose = vi.fn();
  const mockOnDownloadErrors = vi.fn();

  const mockImportProgress = {
    processed: 5,
    total: 5,
    isImporting: false,
    completed: true,
    errors: []
  };

  it('renders success message', () => {
    render(
      <CSVSuccessStep 
        importProgress={mockImportProgress}
        organizationName="Test Org"
        importId="test-import-123"
        selectedTeamId={null}
        onClose={mockOnClose}
        onDownloadErrors={mockOnDownloadErrors}
      />
    );
    
    expect(screen.getByText(/success/i) || screen.getByText(/5/)).toBeDefined();
  });

  it('calls onClose when close button is clicked', () => {
    render(
      <CSVSuccessStep 
        importProgress={mockImportProgress}
        organizationName="Test Org"
        importId="test-import-123"
        selectedTeamId={null}
        onClose={mockOnClose}
        onDownloadErrors={mockOnDownloadErrors}
      />
    );
    
    const closeButton = screen.getByText(/close/i);
    if (closeButton) {
      fireEvent.click(closeButton);
      expect(mockOnClose).toHaveBeenCalled();
    }
  });
});
