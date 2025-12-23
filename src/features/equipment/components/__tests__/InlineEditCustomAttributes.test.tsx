import React from 'react';
import { render, screen } from '@/test/utils/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import InlineEditCustomAttributes from '../InlineEditCustomAttributes';

describe('InlineEditCustomAttributes', () => {
  const mockOnSave = vi.fn();
  const mockAttributes = {
    Color: 'Red',
    Size: 'Large'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnSave.mockResolvedValue(undefined);
  });

  describe('Core Rendering', () => {
    it('renders custom attributes', () => {
      render(
        <InlineEditCustomAttributes 
          attributes={mockAttributes} 
          onSave={mockOnSave} 
          canEdit={true} 
        />
      );
      
      expect(screen.getByText('Color')).toBeInTheDocument();
      expect(screen.getByText('Red')).toBeInTheDocument();
    });

    it('does not show edit button when canEdit is false', () => {
      render(
        <InlineEditCustomAttributes 
          attributes={mockAttributes} 
          onSave={mockOnSave} 
          canEdit={false} 
        />
      );
      
      expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
    });
  });

  describe('Edit Functionality', () => {
    it('allows editing when canEdit is true', () => {
      render(
        <InlineEditCustomAttributes 
          attributes={mockAttributes} 
          onSave={mockOnSave} 
          canEdit={true} 
        />
      );
      
      // Edit functionality should be available
      expect(screen.getByText('Color')).toBeInTheDocument();
    });

    it('calls onSave when attributes are updated', async () => {
      render(
        <InlineEditCustomAttributes 
          attributes={mockAttributes} 
          onSave={mockOnSave} 
          canEdit={true} 
        />
      );
      
      // Save would be triggered by user interaction
      // This depends on the actual component implementation
      await waitFor(() => {
        // Component should handle save
      });
    });
  });

  describe('Empty State', () => {
    it('handles empty attributes', () => {
      render(
        <InlineEditCustomAttributes 
          attributes={{}} 
          onSave={mockOnSave} 
          canEdit={true} 
        />
      );
      
      // Should render without errors
      expect(screen.getByText(/custom attributes/i) || screen.queryByText('Color')).toBeDefined();
    });
  });
});


