import React from 'react';
import { render, screen, fireEvent, waitFor } from '@/test/utils/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import InlineEditField from '../InlineEditField';

describe('InlineEditField', () => {
  const mockOnSave = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnSave.mockResolvedValue(undefined);
  });

  describe('Display Mode', () => {
    it('renders value in display mode', () => {
      render(<InlineEditField value="Test Value" onSave={mockOnSave} canEdit={true} />);
      
      expect(screen.getByText('Test Value')).toBeInTheDocument();
    });

    it('shows "Not set" when value is empty', () => {
      render(<InlineEditField value="" onSave={mockOnSave} canEdit={true} />);
      
      expect(screen.getByText('Not set')).toBeInTheDocument();
    });

    it('does not show edit button when canEdit is false', () => {
      render(<InlineEditField value="Test Value" onSave={mockOnSave} canEdit={false} />);
      
      expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
    });

    it('renders as span when canEdit is false', () => {
      const { container } = render(<InlineEditField value="Test Value" onSave={mockOnSave} canEdit={false} />);
      
      const span = container.querySelector('span');
      expect(span).toBeInTheDocument();
      expect(span).toHaveTextContent('Test Value');
    });
  });

  describe('Edit Mode', () => {
    it('enters edit mode when edit button is clicked', () => {
      render(<InlineEditField value="Test Value" onSave={mockOnSave} canEdit={true} />);
      
      const editButton = screen.getByRole('button', { name: /edit/i });
      fireEvent.click(editButton);
      
      const input = screen.getByDisplayValue('Test Value');
      expect(input).toBeInTheDocument();
    });

    it('shows save and cancel buttons in edit mode', () => {
      render(<InlineEditField value="Test Value" onSave={mockOnSave} canEdit={true} />);
      
      const editButton = screen.getByRole('button', { name: /edit/i });
      fireEvent.click(editButton);
      
      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('updates value when input changes', () => {
      render(<InlineEditField value="Test Value" onSave={mockOnSave} canEdit={true} />);
      
      const editButton = screen.getByRole('button', { name: /edit/i });
      fireEvent.click(editButton);
      
      const input = screen.getByDisplayValue('Test Value') as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'New Value' } });
      
      expect(input.value).toBe('New Value');
    });
  });

  describe('Save Functionality', () => {
    it('calls onSave when save button is clicked', async () => {
      render(<InlineEditField value="Test Value" onSave={mockOnSave} canEdit={true} />);
      
      const editButton = screen.getByRole('button', { name: /edit/i });
      fireEvent.click(editButton);
      
      const input = screen.getByDisplayValue('Test Value');
      fireEvent.change(input, { target: { value: 'New Value' } });
      
      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith('New Value');
      });
    });

    it('exits edit mode after successful save', async () => {
      render(<InlineEditField value="Test Value" onSave={mockOnSave} canEdit={true} />);
      
      const editButton = screen.getByRole('button', { name: /edit/i });
      fireEvent.click(editButton);
      
      const input = screen.getByDisplayValue('Test Value');
      fireEvent.change(input, { target: { value: 'New Value' } });
      
      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(screen.queryByDisplayValue('New Value')).not.toBeInTheDocument();
      });
    });

    it('does not call onSave if value has not changed', async () => {
      render(<InlineEditField value="Test Value" onSave={mockOnSave} canEdit={true} />);
      
      const editButton = screen.getByRole('button', { name: /edit/i });
      fireEvent.click(editButton);
      
      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(mockOnSave).not.toHaveBeenCalled();
      });
    });

    it('resets value on error', async () => {
      mockOnSave.mockRejectedValue(new Error('Save failed'));
      
      render(<InlineEditField value="Test Value" onSave={mockOnSave} canEdit={true} />);
      
      const editButton = screen.getByRole('button', { name: /edit/i });
      fireEvent.click(editButton);
      
      const input = screen.getByDisplayValue('Test Value') as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'New Value' } });
      
      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(input.value).toBe('Test Value');
      });
    });
  });

  describe('Cancel Functionality', () => {
    it('cancels edit and resets value', () => {
      render(<InlineEditField value="Test Value" onSave={mockOnSave} canEdit={true} />);
      
      const editButton = screen.getByRole('button', { name: /edit/i });
      fireEvent.click(editButton);
      
      const input = screen.getByDisplayValue('Test Value');
      fireEvent.change(input, { target: { value: 'New Value' } });
      
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);
      
      expect(screen.queryByDisplayValue('New Value')).not.toBeInTheDocument();
      expect(screen.getByText('Test Value')).toBeInTheDocument();
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('saves on Enter key for text input', async () => {
      render(<InlineEditField value="Test Value" onSave={mockOnSave} canEdit={true} />);
      
      const editButton = screen.getByRole('button', { name: /edit/i });
      fireEvent.click(editButton);
      
      const input = screen.getByDisplayValue('Test Value');
      fireEvent.change(input, { target: { value: 'New Value' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      
      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith('New Value');
      });
    });

    it('cancels on Escape key', () => {
      render(<InlineEditField value="Test Value" onSave={mockOnSave} canEdit={true} />);
      
      const editButton = screen.getByRole('button', { name: /edit/i });
      fireEvent.click(editButton);
      
      const input = screen.getByDisplayValue('Test Value');
      fireEvent.change(input, { target: { value: 'New Value' } });
      fireEvent.keyDown(input, { key: 'Escape' });
      
      expect(screen.queryByDisplayValue('New Value')).not.toBeInTheDocument();
    });
  });

  describe('Field Types', () => {
    it('renders textarea for textarea type', () => {
      render(<InlineEditField value="Test Value" onSave={mockOnSave} canEdit={true} type="textarea" />);
      
      const editButton = screen.getByRole('button', { name: /edit/i });
      fireEvent.click(editButton);
      
      const textarea = screen.getByDisplayValue('Test Value');
      expect(textarea.tagName).toBe('TEXTAREA');
    });

    it('renders date input for date type', () => {
      render(<InlineEditField value="2024-01-15" onSave={mockOnSave} canEdit={true} type="date" />);
      
      const editButton = screen.getByRole('button', { name: /edit/i });
      fireEvent.click(editButton);
      
      const dateInput = screen.getByDisplayValue('2024-01-15') as HTMLInputElement;
      expect(dateInput.type).toBe('date');
    });

    it('renders select for select type', async () => {
      const options = [
        { value: 'option1', label: 'Option 1' },
        { value: 'option2', label: 'Option 2' }
      ];
      
      render(
        <InlineEditField 
          value="option1" 
          onSave={mockOnSave} 
          canEdit={true} 
          type="select"
          selectOptions={options}
        />
      );
      
      const editButton = screen.getByRole('button', { name: /edit/i });
      fireEvent.click(editButton);
      
      const select = screen.getByRole('combobox');
      expect(select).toBeInTheDocument();
    });

    it('displays select option label', () => {
      const options = [
        { value: 'option1', label: 'Option 1' },
        { value: 'option2', label: 'Option 2' }
      ];
      
      render(
        <InlineEditField 
          value="option1" 
          onSave={mockOnSave} 
          canEdit={false} 
          type="select"
          selectOptions={options}
        />
      );
      
      expect(screen.getByText('Option 1')).toBeInTheDocument();
    });

    it('formats date for display', () => {
      render(<InlineEditField value="2024-01-15" onSave={mockOnSave} canEdit={false} type="date" />);
      
      // Date should be formatted for display
      const displayValue = screen.getByText(/2024/);
      expect(displayValue).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('shows loading state while saving', async () => {
      mockOnSave.mockImplementation(() => new Promise(() => {})); // Never resolves
      
      render(<InlineEditField value="Test Value" onSave={mockOnSave} canEdit={true} />);
      
      const editButton = screen.getByRole('button', { name: /edit/i });
      fireEvent.click(editButton);
      
      const input = screen.getByDisplayValue('Test Value');
      fireEvent.change(input, { target: { value: 'New Value' } });
      
      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);
      
      // Save button should be disabled during save
      expect(saveButton).toBeDisabled();
    });
  });
});

