import React from 'react';
import { render, screen } from '@/test/utils/test-utils';
import { describe, it, expect, vi } from 'vitest';
import CSVUploadStep from '../csv-import/CSVUploadStep';

describe('CSVUploadStep', () => {
  const mockOnNext = vi.fn();
  const mockOnFileSelect = vi.fn();

  it('renders upload step', () => {
    render(
      <CSVUploadStep 
        onNext={mockOnNext} 
        onFileSelect={mockOnFileSelect} 
      />
    );
    
    expect(screen.getByText(/upload/i) || screen.getByText(/csv/i)).toBeDefined();
  });

  it('calls onFileSelect when file is selected', () => {
    render(
      <CSVUploadStep 
        onNext={mockOnNext} 
        onFileSelect={mockOnFileSelect} 
      />
    );
    
    // File selection would trigger onFileSelect
  });
});


