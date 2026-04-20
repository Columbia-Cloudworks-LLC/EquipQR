import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { BulkEditableCell } from '../BulkEditableCell';

const baseProps = {
  rowId: 'eq-1',
  field: 'manufacturer',
  type: 'text' as const,
  value: 'Caterpillar',
  initialValue: 'Caterpillar',
  onChange: vi.fn(),
  onSelectRow: vi.fn(),
};

describe('BulkEditableCell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('static state', () => {
    it('renders the value as text', () => {
      render(<BulkEditableCell {...baseProps} />);
      expect(screen.getByText('Caterpillar')).toBeInTheDocument();
    });

    it('renders an em-dash placeholder when value is empty', () => {
      render(<BulkEditableCell {...baseProps} value="" initialValue="" />);
      expect(screen.getByText('—')).toBeInTheDocument();
    });

    it('renders an em-dash placeholder when value is null', () => {
      render(<BulkEditableCell {...baseProps} value={null} initialValue={null} />);
      expect(screen.getByText('—')).toBeInTheDocument();
    });

    it('uses formatDisplay when provided', () => {
      render(
        <BulkEditableCell
          {...baseProps}
          value={1234}
          initialValue={1234}
          type="number"
          formatDisplay={(v) => (typeof v === 'number' ? v.toLocaleString() : '—')}
        />
      );
      expect(screen.getByText('1,234')).toBeInTheDocument();
    });

    it('exposes a hover-revealed edit affordance for keyboard discovery', () => {
      render(<BulkEditableCell {...baseProps} />);
      const trigger = screen.getByRole('button', { name: /manufacturer: Caterpillar/i });
      expect(trigger).toBeInTheDocument();
      expect(trigger).toHaveAttribute('tabIndex', '0');
    });
  });

  describe('dirty state', () => {
    it('shows the dirty left-border accent when value differs from initialValue', () => {
      render(
        <BulkEditableCell
          {...baseProps}
          value="Komatsu"
          initialValue="Caterpillar"
        />
      );
      const trigger = screen.getByRole('button', { name: /manufacturer: Komatsu/i });
      expect(trigger.className).toContain('border-l-2');
      expect(trigger.className).toContain('border-l-primary');
    });

    it('treats empty-string and null as equivalent for dirty checking', () => {
      render(<BulkEditableCell {...baseProps} value="" initialValue={null} />);
      const trigger = screen.getByRole('button', { name: /manufacturer:/i });
      expect(trigger.className).not.toContain('border-l-2');
    });

    it('does not show the dirty accent when value === initialValue', () => {
      render(<BulkEditableCell {...baseProps} value="Caterpillar" initialValue="Caterpillar" />);
      const trigger = screen.getByRole('button', { name: /manufacturer: Caterpillar/i });
      expect(trigger.className).not.toContain('border-l-2');
    });
  });

  describe('selection vs edit interactions', () => {
    it('single-click invokes onSelectRow with the rowId, does NOT enter edit', () => {
      render(<BulkEditableCell {...baseProps} />);
      const trigger = screen.getByRole('button', { name: /manufacturer: Caterpillar/i });
      fireEvent.click(trigger);
      expect(baseProps.onSelectRow).toHaveBeenCalledWith('eq-1');
      // Static cell still rendered; no Input mounted.
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });

    it('double-click mounts the inline Input editor', () => {
      render(<BulkEditableCell {...baseProps} />);
      const trigger = screen.getByRole('button', { name: /manufacturer: Caterpillar/i });
      fireEvent.doubleClick(trigger);
      const input = screen.getByRole('textbox', { name: /edit manufacturer/i });
      expect(input).toBeInTheDocument();
      expect(input).toHaveValue('Caterpillar');
    });

    it('Enter key on the focused static cell mounts the inline Input editor', () => {
      render(<BulkEditableCell {...baseProps} />);
      const trigger = screen.getByRole('button', { name: /manufacturer: Caterpillar/i });
      fireEvent.keyDown(trigger, { key: 'Enter' });
      expect(screen.getByRole('textbox', { name: /edit manufacturer/i })).toBeInTheDocument();
    });
  });

  describe('edit mode', () => {
    it('Enter key on the input commits the new value via onChange', () => {
      render(<BulkEditableCell {...baseProps} />);
      const trigger = screen.getByRole('button', { name: /manufacturer:/i });
      fireEvent.doubleClick(trigger);
      const input = screen.getByRole('textbox', { name: /edit manufacturer/i });
      fireEvent.change(input, { target: { value: 'Komatsu' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(baseProps.onChange).toHaveBeenCalledWith('Komatsu');
    });

    it('Escape key on the input reverts and does NOT call onChange', () => {
      render(<BulkEditableCell {...baseProps} />);
      const trigger = screen.getByRole('button', { name: /manufacturer:/i });
      fireEvent.doubleClick(trigger);
      const input = screen.getByRole('textbox', { name: /edit manufacturer/i });
      fireEvent.change(input, { target: { value: 'Komatsu' } });
      fireEvent.keyDown(input, { key: 'Escape' });
      expect(baseProps.onChange).not.toHaveBeenCalled();
      // Editor is unmounted; static cell shown again.
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });

    it('blur on the input commits the new value', () => {
      render(<BulkEditableCell {...baseProps} />);
      const trigger = screen.getByRole('button', { name: /manufacturer:/i });
      fireEvent.doubleClick(trigger);
      const input = screen.getByRole('textbox', { name: /edit manufacturer/i });
      fireEvent.change(input, { target: { value: 'Komatsu' } });
      fireEvent.blur(input);
      expect(baseProps.onChange).toHaveBeenCalledWith('Komatsu');
    });

    it('parses numeric input as Number for type=number', () => {
      render(
        <BulkEditableCell
          {...baseProps}
          field="working_hours"
          type="number"
          value={100}
          initialValue={100}
        />
      );
      const trigger = screen.getByRole('button', { name: /working_hours: 100/i });
      fireEvent.doubleClick(trigger);
      const input = screen.getByRole('spinbutton', { name: /edit working_hours/i });
      fireEvent.change(input, { target: { value: '250' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(baseProps.onChange).toHaveBeenCalledWith(250);
    });

    it('treats empty string as null for type=number', () => {
      render(
        <BulkEditableCell
          {...baseProps}
          field="working_hours"
          type="number"
          value={100}
          initialValue={100}
        />
      );
      const trigger = screen.getByRole('button', { name: /working_hours: 100/i });
      fireEvent.doubleClick(trigger);
      const input = screen.getByRole('spinbutton', { name: /edit working_hours/i });
      fireEvent.change(input, { target: { value: '' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(baseProps.onChange).toHaveBeenCalledWith(null);
    });
  });
});
