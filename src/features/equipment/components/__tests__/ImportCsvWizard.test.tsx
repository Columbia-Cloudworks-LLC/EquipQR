import React from 'react';
import { render, screen } from '@/test/utils/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ImportCsvWizard from '../ImportCsvWizard';

describe('ImportCsvWizard', () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();
  const baseProps = {
    onClose: mockOnClose,
    onSuccess: mockOnSuccess,
    organizationId: 'org-1',
    organizationName: 'Test Org',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Wizard Rendering', () => {
    it('renders when open is true', () => {
      render(
        <ImportCsvWizard 
          open={true} 
          {...baseProps} 
        />
      );
      
      expect(screen.getByText(/import csv/i)).toBeInTheDocument();
    });

    it('does not render when open is false', () => {
      render(
        <ImportCsvWizard 
          open={false} 
          {...baseProps} 
        />
      );
      
      expect(screen.queryByText(/import csv/i)).not.toBeInTheDocument();
    });
  });

  describe('Wizard Steps', () => {
    it('starts at upload step', () => {
      render(
        <ImportCsvWizard 
          open={true} 
          {...baseProps} 
        />
      );
      
      // Should show upload step
      expect(screen.getAllByText(/upload/i).length).toBeGreaterThan(0);
    });
  });
});


