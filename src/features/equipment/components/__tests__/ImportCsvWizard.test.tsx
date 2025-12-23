import React from 'react';
import { render, screen } from '@/test/utils/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ImportCsvWizard from '../ImportCsvWizard';

describe('ImportCsvWizard', () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Wizard Rendering', () => {
    it('renders when open is true', () => {
      render(
        <ImportCsvWizard 
          open={true} 
          onClose={mockOnClose} 
          onSuccess={mockOnSuccess} 
        />
      );
      
      expect(screen.getByText(/import csv/i)).toBeInTheDocument();
    });

    it('does not render when open is false', () => {
      render(
        <ImportCsvWizard 
          open={false} 
          onClose={mockOnClose} 
          onSuccess={mockOnSuccess} 
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
          onClose={mockOnClose} 
          onSuccess={mockOnSuccess} 
        />
      );
      
      // Should show upload step
      expect(screen.getByText(/upload/i) || screen.getByText(/csv/i)).toBeDefined();
    });
  });
});


