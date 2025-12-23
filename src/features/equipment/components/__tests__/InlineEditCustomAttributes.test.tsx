import React from 'react';
import { render, screen, fireEvent, waitFor } from '@/test/utils/test-utils';
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
      
      // Click the edit button to enter edit mode
      const editButton = screen.getByLabelText('Edit custom attributes');
      fireEvent.click(editButton);
      
      // Wait for edit mode to be active
      await waitFor(() => {
        expect(screen.getByText('Edit Custom Attributes')).toBeInTheDocument();
      });
      
      // Find and update the Color attribute value
      // The inputs are rendered with the current values, so we can find by display value
      const colorValueInput = screen.getByDisplayValue('Red');
      fireEvent.change(colorValueInput, { target: { value: 'Blue' } });
      
      // Wait for the state to update (CustomAttributesSection calls onChange via useEffect)
      await waitFor(() => {
        expect(colorValueInput).toHaveValue('Blue');
      });
      
      // Click the Save button
      const saveButton = screen.getByText('Save');
      fireEvent.click(saveButton);
      
      // Verify onSave was called with updated attributes
      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith({
          Color: 'Blue',
          Size: 'Large'
        });
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
      expect(screen.getByText(/No custom attributes/i)).toBeInTheDocument();
    });
  });
});


