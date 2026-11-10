import React from 'react';
import { render, screen, fireEvent, waitFor } from '@vitest-harness/utils/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import InlineEditField from './InlineEditField';

vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: vi.fn(() => false),
}));

import { useIsMobile } from '@/hooks/use-mobile';

const mockUseIsMobile = vi.mocked(useIsMobile);

describe('InlineEditField', () => {
  const mockOnSave = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnSave.mockResolvedValue(undefined);
    mockUseIsMobile.mockReturnValue(false);
  });

  describe('Display Mode', () => {
    it('renders value in display mode', () => {
      render(<InlineEditField value="Test Value" onSave={mockOnSave} canEdit={true} />);
      
      expect(screen.getByText('Test Value')).toBeInTheDocument();
    });

    it('shows em dash empty placeholder when value is empty', () => {
      render(<InlineEditField value="" onSave={mockOnSave} canEdit={true} />);

      expect(screen.getByLabelText(/no value set/i)).toBeInTheDocument();
      expect(screen.getByText('—')).toBeInTheDocument();
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

    it('enters edit mode on a single click anywhere on the value', () => {
      render(<InlineEditField value="Test Value" onSave={mockOnSave} canEdit={true} />);

      fireEvent.click(screen.getByText('Test Value'));

      expect(screen.getByDisplayValue('Test Value')).toHaveFocus();
    });

    it('highlights the editable row on hover', () => {
      render(<InlineEditField value="Test Value" onSave={mockOnSave} canEdit={true} />);

      const row = screen.getByText('Test Value').closest('[data-inline-edit-row]');
      expect(row).toHaveClass('cursor-pointer', 'hover:bg-muted/60');
    });

    it('leaves links inside the value alone instead of entering edit mode', () => {
      render(
        <InlineEditField
          value="Test Value"
          onSave={mockOnSave}
          canEdit={true}
          displayNode={<a href="/somewhere">Open record</a>}
        />
      );

      fireEvent.click(screen.getByRole('link', { name: 'Open record' }));

      expect(screen.queryByDisplayValue('Test Value')).not.toBeInTheDocument();
    });

    it('has no save or cancel buttons in edit mode', () => {
      render(<InlineEditField value="Test Value" onSave={mockOnSave} canEdit={true} />);

      fireEvent.click(screen.getByRole('button', { name: /edit/i }));

      expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument();
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
    it('saves when the field loses focus', async () => {
      render(<InlineEditField value="Test Value" onSave={mockOnSave} canEdit={true} />);
      
      const editButton = screen.getByRole('button', { name: /edit/i });
      fireEvent.click(editButton);
      
      const input = screen.getByDisplayValue('Test Value');
      fireEvent.change(input, { target: { value: 'New Value' } });
      fireEvent.blur(input);
      
      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith('New Value');
      });
      expect(mockOnSave).toHaveBeenCalledTimes(1);
    });

    it('saves once when Enter is followed by the blur it causes', async () => {
      render(<InlineEditField value="Test Value" onSave={mockOnSave} canEdit={true} />);

      fireEvent.click(screen.getByRole('button', { name: /edit/i }));

      const input = screen.getByDisplayValue('Test Value');
      fireEvent.change(input, { target: { value: 'New Value' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      fireEvent.blur(input);

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith('New Value');
      });
      expect(mockOnSave).toHaveBeenCalledTimes(1);
    });

    it('exits edit mode after successful save', async () => {
      render(<InlineEditField value="Test Value" onSave={mockOnSave} canEdit={true} />);
      
      const editButton = screen.getByRole('button', { name: /edit/i });
      fireEvent.click(editButton);
      
      const input = screen.getByDisplayValue('Test Value');
      fireEvent.change(input, { target: { value: 'New Value' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      
      await waitFor(() => {
        expect(screen.queryByDisplayValue('New Value')).not.toBeInTheDocument();
      });
    });

    it('does not call onSave if value has not changed', async () => {
      render(<InlineEditField value="Test Value" onSave={mockOnSave} canEdit={true} />);
      
      const editButton = screen.getByRole('button', { name: /edit/i });
      fireEvent.click(editButton);
      
      fireEvent.blur(screen.getByDisplayValue('Test Value'));
      
      await waitFor(() => {
        expect(screen.queryByDisplayValue('Test Value')).not.toBeInTheDocument();
      });
      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it('resets value on error', async () => {
      mockOnSave.mockRejectedValue(new Error('Save failed'));
      
      render(<InlineEditField value="Test Value" onSave={mockOnSave} canEdit={true} />);
      
      const editButton = screen.getByRole('button', { name: /edit/i });
      fireEvent.click(editButton);
      
      const input = screen.getByDisplayValue('Test Value') as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'New Value' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      
      // The failed value is dropped and the original is shown again.
      await waitFor(() => {
        expect(screen.getByText('Test Value')).toBeInTheDocument();
      });
      expect(screen.queryByText('New Value')).not.toBeInTheDocument();
    });
  });

  describe('Cancel Functionality', () => {
    it('cancels edit and resets value', () => {
      render(<InlineEditField value="Test Value" onSave={mockOnSave} canEdit={true} />);
      
      const editButton = screen.getByRole('button', { name: /edit/i });
      fireEvent.click(editButton);
      
      const input = screen.getByDisplayValue('Test Value');
      fireEvent.change(input, { target: { value: 'New Value' } });
      fireEvent.keyDown(input, { key: 'Escape' });
      
      expect(screen.queryByDisplayValue('New Value')).not.toBeInTheDocument();
      expect(screen.getByText('Test Value')).toBeInTheDocument();
      expect(mockOnSave).not.toHaveBeenCalled();
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
      
      // Short option lists are edited as one-tap pills that save immediately.
      expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
      expect(screen.getByRole('radio', { name: 'Option 1' })).toBeChecked();

      fireEvent.click(screen.getByRole('radio', { name: 'Option 2' }));

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith('option2');
      });
      expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    });

    it('keeps a dropdown for long option lists, opened straight away', async () => {
      const options = Array.from({ length: 6 }, (_, index) => ({
        value: `option${index + 1}`,
        label: `Option ${index + 1}`,
      }));

      render(
        <InlineEditField
          value="option1"
          onSave={mockOnSave}
          canEdit={true}
          type="select"
          selectOptions={options}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /edit/i }));

      expect(await screen.findByRole('listbox')).toBeInTheDocument();
      expect(screen.getAllByRole('option')).toHaveLength(6);
      expect(screen.queryByRole('radio')).not.toBeInTheDocument();
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

  describe('Optimistic Save', () => {
    it('shows the new value immediately while the save is still in flight', async () => {
      mockOnSave.mockImplementation(() => new Promise(() => {})); // Never resolves
      
      render(<InlineEditField value="Test Value" onSave={mockOnSave} canEdit={true} />);
      
      const editButton = screen.getByRole('button', { name: /edit/i });
      fireEvent.click(editButton);
      
      const input = screen.getByDisplayValue('Test Value');
      fireEvent.change(input, { target: { value: 'New Value' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      
      // Back in display mode with the unsaved value, marked busy until the save settles.
      const optimistic = await screen.findByText('New Value');
      expect(optimistic.closest('[data-inline-edit-row]')).toHaveAttribute('aria-busy', 'true');
      expect(screen.queryByText('Test Value')).not.toBeInTheDocument();
    });
  });

  describe('Edit Aria Label', () => {
    it('defaults the edit trigger aria-label to "Edit"', () => {
      render(<InlineEditField value="Test Value" onSave={mockOnSave} canEdit={true} />);

      const editButton = screen.getByRole('button', { name: 'Edit' });
      expect(editButton).toBeInTheDocument();
      expect(editButton).toHaveAttribute('aria-label', 'Edit');
    });

    it('uses the provided editAriaLabel for the edit trigger', () => {
      render(
        <InlineEditField
          value="Active"
          onSave={mockOnSave}
          canEdit={true}
          editAriaLabel="Edit status"
        />
      );

      const editButton = screen.getByRole('button', { name: 'Edit status' });
      expect(editButton).toBeInTheDocument();
      expect(editButton).toHaveAttribute('aria-label', 'Edit status');
      expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    });

    it('anchors the edit trigger on the right on mobile', () => {
      mockUseIsMobile.mockReturnValue(true);
      render(
        <InlineEditField
          value="Active"
          onSave={mockOnSave}
          canEdit={true}
          editAriaLabel="Edit status"
        />
      );

      const editButton = screen.getByRole('button', { name: 'Edit status' });
      expect(editButton.parentElement?.className).toContain('justify-between');
      expect(editButton.className).toContain('h-11');
    });

    it('keeps desktop hover-reveal on the edit icon', () => {
      mockUseIsMobile.mockReturnValue(false);
      render(
        <InlineEditField
          value="Active"
          onSave={mockOnSave}
          canEdit={true}
          editAriaLabel="Edit status"
        />
      );

      const desktopEditIcon = screen.getByRole('button', { name: 'Edit status' });
      expect(desktopEditIcon.className).toContain('opacity-0');
      expect(desktopEditIcon.className).toContain('group-hover:opacity-100');
    });
  });
});
