import React from 'react';
import { render, screen, fireEvent } from '@/test/utils/test-utils';
import { describe, it, expect, vi } from 'vitest';
import CSVUploadStep from '../csv-import/CSVUploadStep';

describe('CSVUploadStep', () => {
  const mockOnFileUpload = vi.fn();
  const baseProps = {
    onFileUpload: mockOnFileUpload,
    file: null,
    rowCount: 0,
    delimiter: ','
  };

  it('renders upload step', () => {
    render(
      <CSVUploadStep {...baseProps} />
    );
    
    expect(screen.getByText(/Upload CSV File/i)).toBeInTheDocument();
  });

  it('calls onFileSelect when file is selected', () => {
    const { container } = render(<CSVUploadStep {...baseProps} />);
    const file = new File(['a,b,c'], 'test.csv', { type: 'text/csv' });
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    if (input) {
      fireEvent.change(input, { target: { files: [file] } });
    }

    expect(mockOnFileUpload).toHaveBeenCalledWith(file);
  });
});


