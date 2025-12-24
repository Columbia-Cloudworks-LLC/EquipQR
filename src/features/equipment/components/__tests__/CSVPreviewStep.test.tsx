import React from 'react';
import { render, screen } from '@/test/utils/test-utils';
import { describe, it, expect, vi } from 'vitest';
import { CSVPreviewStep } from '../csv-import/CSVPreviewStep';

describe('CSVPreviewStep', () => {
  const mockOnImport = vi.fn();
  const mockOnBack = vi.fn();
  const mockOnDownloadErrors = vi.fn();

  const mockDryRunResult = {
    willCreate: 5,
    willMerge: 2,
    errorCount: 1,
    validCount: 7,
    warnings: [],
    errors: [],
    sample: []
  };

  const mockImportProgress = {
    processed: 0,
    total: 0,
    isImporting: false,
    completed: false,
    errors: []
  };

  it('renders preview step', () => {
    render(
      <CSVPreviewStep 
        dryRunResult={mockDryRunResult}
        onImport={mockOnImport}
        onBack={mockOnBack}
        importProgress={mockImportProgress}
        parsedData={[]}
        onDownloadErrors={mockOnDownloadErrors}
      />
    );
    
    expect(screen.getByText(/preview/i)).toBeInTheDocument();
  });
});
