import React from 'react';
import { render, screen, fireEvent, waitFor } from '@/test/utils/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import BulkTemplateManagementDialog from '../BulkTemplateManagementDialog';

describe('BulkTemplateManagementDialog', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Dialog Rendering', () => {
    it('renders when open is true', () => {
      render(
        <BulkTemplateManagementDialog 
          open={true} 
          onClose={mockOnClose} 
          equipmentIds={['eq-1', 'eq-2']} 
        />
      );
      
      expect(screen.getByText(/bulk template/i)).toBeInTheDocument();
    });

    it('does not render when open is false', () => {
      render(
        <BulkTemplateManagementDialog 
          open={false} 
          onClose={mockOnClose} 
          equipmentIds={['eq-1']} 
        />
      );
      
      expect(screen.queryByText(/bulk template/i)).not.toBeInTheDocument();
    });
  });
});

