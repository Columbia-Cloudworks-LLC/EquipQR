import React from 'react';
import { render, screen } from '@/test/utils/test-utils';
import { describe, it, expect, vi } from 'vitest';
import CSVPreviewStep from '../csv-import/CSVPreviewStep';

describe('CSVPreviewStep', () => {
  const mockOnNext = vi.fn();
  const mockOnBack = vi.fn();

  it('renders preview step', () => {
    render(
      <CSVPreviewStep 
        mappedData={[]}
        onNext={mockOnNext}
        onBack={mockOnBack}
      />
    );
    
    expect(screen.getByText(/preview/i) || screen.queryByText(/review/i)).toBeDefined();
  });
});


