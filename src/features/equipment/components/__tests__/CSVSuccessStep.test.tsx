import React from 'react';
import { render, screen, fireEvent } from '@/test/utils/test-utils';
import { describe, it, expect, vi } from 'vitest';
import CSVSuccessStep from '../csv-import/CSVSuccessStep';

describe('CSVSuccessStep', () => {
  const mockOnClose = vi.fn();
  const mockOnImportMore = vi.fn();

  it('renders success message', () => {
    render(
      <CSVSuccessStep 
        importedCount={5}
        onClose={mockOnClose}
        onImportMore={mockOnImportMore}
      />
    );
    
    expect(screen.getByText(/success/i) || screen.getByText(/5/)).toBeDefined();
  });

  it('calls onClose when done button is clicked', () => {
    render(
      <CSVSuccessStep 
        importedCount={5}
        onClose={mockOnClose}
        onImportMore={mockOnImportMore}
      />
    );
    
    const doneButton = screen.getByText(/done/i);
    if (doneButton) {
      fireEvent.click(doneButton);
      expect(mockOnClose).toHaveBeenCalled();
    }
  });
});


