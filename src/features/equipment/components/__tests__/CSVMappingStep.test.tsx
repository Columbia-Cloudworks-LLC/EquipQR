import React from 'react';
import { render, screen } from '@/test/utils/test-utils';
import { describe, it, expect, vi } from 'vitest';
import CSVMappingStep from '../csv-import/CSVMappingStep';

describe('CSVMappingStep', () => {
  const mockOnNext = vi.fn();
  const mockOnMappingChange = vi.fn();

  it('renders mapping step', () => {
    render(
      <CSVMappingStep 
        csvData={[]}
        onNext={mockOnNext}
        onMappingChange={mockOnMappingChange}
      />
    );
    
    expect(screen.getByText(/mapping/i) || screen.queryByText(/column/i)).toBeDefined();
  });
});


