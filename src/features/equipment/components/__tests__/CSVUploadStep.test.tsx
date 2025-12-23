import React from 'react';
import { render, screen, fireEvent } from '@/test/utils/test-utils';
import { describe, it, expect, vi } from 'vitest';
import { CSVUploadStep } from '../csv-import/CSVUploadStep';

describe('CSVUploadStep', () => {
  const mockOnFileUpload = vi.fn();
  const baseProps = {
    onFileUpload: mockOnFileUpload,
    file: null,
    rowCount: 0,
    delimiter: ','
  };

  it('renders upload step', () => {
    const { container } = render(
      <CSVUploadStep {...baseProps} />
    );
    
    // Verify main heading
    expect(screen.getByRole('heading', { name: /Upload CSV File/i })).toBeInTheDocument();
    
    // Verify upload instructions
    expect(screen.getByText(/Drag and drop your CSV file here, or click to browse/i)).toBeInTheDocument();
    
    // Verify choose file button
    expect(screen.getByRole('button', { name: /Choose File/i })).toBeInTheDocument();
    
    // Verify info alert with description
    expect(screen.getByText(/Upload a CSV file with equipment data/i)).toBeInTheDocument();
    expect(screen.getByText(/Maximum 10,000 rows and 5MB file size/i)).toBeInTheDocument();
    
    // Verify requirements section
    expect(screen.getByText(/Requirements:/i)).toBeInTheDocument();
    expect(screen.getByText(/CSV format with header row/i)).toBeInTheDocument();
    
    // Verify file input is present (hidden)
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeInTheDocument();
    expect(fileInput).toHaveAttribute('type', 'file');
    expect(fileInput).toHaveAttribute('accept', '.csv');
    expect(fileInput).toHaveAttribute('id', 'csv-upload');
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
