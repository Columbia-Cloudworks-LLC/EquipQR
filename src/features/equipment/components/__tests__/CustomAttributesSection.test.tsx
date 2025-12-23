import React from 'react';
import { render, screen, fireEvent, waitFor } from '@/test/utils/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CustomAttributesSection from '../CustomAttributesSection';

// Mock hook
vi.mock('@/hooks/useCustomAttributes', () => ({
  useCustomAttributes: vi.fn()
}));

describe('CustomAttributesSection', () => {
  const mockOnChange = vi.fn();
  const mockAddAttribute = vi.fn();
  const mockRemoveAttribute = vi.fn();
  const mockUpdateAttribute = vi.fn();
  const mockGetCleanAttributes = vi.fn(() => []);

  beforeEach(() => {
    vi.clearAllMocks();
    
    const { useCustomAttributes } = require('@/hooks/useCustomAttributes');
    vi.mocked(useCustomAttributes).mockReturnValue({
      attributes: [],
      addAttribute: mockAddAttribute,
      removeAttribute: mockRemoveAttribute,
      updateAttribute: mockUpdateAttribute,
      getCleanAttributes: mockGetCleanAttributes
    });
  });

  describe('Core Rendering', () => {
    it('renders section title', () => {
      render(<CustomAttributesSection onChange={mockOnChange} />);
      
      expect(screen.getByText('Custom Attributes')).toBeInTheDocument();
    });

    it('renders add attribute button', () => {
      render(<CustomAttributesSection onChange={mockOnChange} />);
      
      expect(screen.getByText('Add Attribute')).toBeInTheDocument();
    });

    it('renders in a Card component', () => {
      const { container } = render(<CustomAttributesSection onChange={mockOnChange} />);
      
      const card = container.querySelector('[class*="card"]');
      expect(card).toBeInTheDocument();
    });
  });

  describe('Attribute Management', () => {
    it('calls addAttribute when add button is clicked', () => {
      render(<CustomAttributesSection onChange={mockOnChange} />);
      
      const addButton = screen.getByText('Add Attribute');
      fireEvent.click(addButton);
      
      expect(mockAddAttribute).toHaveBeenCalledTimes(1);
    });

    it('displays attributes from hook', () => {
      const { useCustomAttributes } = require('@/hooks/useCustomAttributes');
      vi.mocked(useCustomAttributes).mockReturnValue({
        attributes: [
          { id: 'attr-1', key: 'Color', value: 'Red' },
          { id: 'attr-2', key: 'Size', value: 'Large' }
        ],
        addAttribute: mockAddAttribute,
        removeAttribute: mockRemoveAttribute,
        updateAttribute: mockUpdateAttribute,
        getCleanAttributes: mockGetCleanAttributes
      });

      render(<CustomAttributesSection onChange={mockOnChange} />);
      
      expect(screen.getByDisplayValue('Color')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Red')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Size')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Large')).toBeInTheDocument();
    });

    it('calls updateAttribute when attribute key changes', () => {
      const { useCustomAttributes } = require('@/hooks/useCustomAttributes');
      vi.mocked(useCustomAttributes).mockReturnValue({
        attributes: [
          { id: 'attr-1', key: 'Color', value: 'Red' }
        ],
        addAttribute: mockAddAttribute,
        removeAttribute: mockRemoveAttribute,
        updateAttribute: mockUpdateAttribute,
        getCleanAttributes: mockGetCleanAttributes
      });

      render(<CustomAttributesSection onChange={mockOnChange} />);
      
      const keyInput = screen.getByDisplayValue('Color');
      fireEvent.change(keyInput, { target: { value: 'New Key' } });
      
      expect(mockUpdateAttribute).toHaveBeenCalledWith('attr-1', 'key', 'New Key');
    });

    it('calls updateAttribute when attribute value changes', () => {
      const { useCustomAttributes } = require('@/hooks/useCustomAttributes');
      vi.mocked(useCustomAttributes).mockReturnValue({
        attributes: [
          { id: 'attr-1', key: 'Color', value: 'Red' }
        ],
        addAttribute: mockAddAttribute,
        removeAttribute: mockRemoveAttribute,
        updateAttribute: mockUpdateAttribute,
        getCleanAttributes: mockGetCleanAttributes
      });

      render(<CustomAttributesSection onChange={mockOnChange} />);
      
      const valueInput = screen.getByDisplayValue('Red');
      fireEvent.change(valueInput, { target: { value: 'Blue' } });
      
      expect(mockUpdateAttribute).toHaveBeenCalledWith('attr-1', 'value', 'Blue');
    });

    it('calls removeAttribute when delete button is clicked', () => {
      const { useCustomAttributes } = require('@/hooks/useCustomAttributes');
      vi.mocked(useCustomAttributes).mockReturnValue({
        attributes: [
          { id: 'attr-1', key: 'Color', value: 'Red' }
        ],
        addAttribute: mockAddAttribute,
        removeAttribute: mockRemoveAttribute,
        updateAttribute: mockUpdateAttribute,
        getCleanAttributes: mockGetCleanAttributes
      });

      render(<CustomAttributesSection onChange={mockOnChange} />);
      
      const deleteButton = screen.getByRole('button', { name: /delete/i });
      fireEvent.click(deleteButton);
      
      expect(mockRemoveAttribute).toHaveBeenCalledWith('attr-1');
    });
  });

  describe('Initial Attributes', () => {
    it('handles array format initial attributes', () => {
      const initialAttributes = [
        { id: 'attr-1', key: 'Key1', value: 'Value1' }
      ];

      render(<CustomAttributesSection initialAttributes={initialAttributes} onChange={mockOnChange} />);
      
      expect(screen.getByDisplayValue('Key1')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Value1')).toBeInTheDocument();
    });

    it('handles object format initial attributes', () => {
      const initialAttributes = {
        Key1: 'Value1',
        Key2: 'Value2'
      };

      render(<CustomAttributesSection initialAttributes={initialAttributes} onChange={mockOnChange} />);
      
      // Object should be converted to array format
      expect(screen.getByDisplayValue('Key1')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Value1')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('displays error message when hasError is true', () => {
      render(<CustomAttributesSection onChange={mockOnChange} hasError={true} />);
      
      expect(screen.getByText(/Attribute names must be unique and not empty/)).toBeInTheDocument();
    });

    it('does not display error message when hasError is false', () => {
      render(<CustomAttributesSection onChange={mockOnChange} hasError={false} />);
      
      expect(screen.queryByText(/Attribute names must be unique/)).not.toBeInTheDocument();
    });
  });

  describe('OnChange Callback', () => {
    it('calls onChange when attributes change', async () => {
      const { useCustomAttributes } = require('@/hooks/useCustomAttributes');
      vi.mocked(useCustomAttributes).mockReturnValue({
        attributes: [
          { id: 'attr-1', key: 'Color', value: 'Red' }
        ],
        addAttribute: mockAddAttribute,
        removeAttribute: mockRemoveAttribute,
        updateAttribute: mockUpdateAttribute,
        getCleanAttributes: () => [{ key: 'Color', value: 'Red' }]
      });

      render(<CustomAttributesSection onChange={mockOnChange} />);
      
      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled();
      });
    });
  });
});

