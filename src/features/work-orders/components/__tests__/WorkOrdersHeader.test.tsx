import React from 'react';
import { render, screen, fireEvent } from '@/test/utils/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WorkOrdersHeader } from '../WorkOrdersHeader';

describe('WorkOrdersHeader', () => {
  const mockOnCreateClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders work orders title', () => {
      render(
        <WorkOrdersHeader onCreateClick={mockOnCreateClick} />
      );

      expect(screen.getByText(/Work Orders/i)).toBeInTheDocument();
    });

    it('renders create button', () => {
      render(
        <WorkOrdersHeader onCreateClick={mockOnCreateClick} />
      );

      expect(screen.getByRole('button', { name: /Create Work Order/i })).toBeInTheDocument();
    });

    it('renders subtitle when provided', () => {
      render(
        <WorkOrdersHeader
          onCreateClick={mockOnCreateClick}
          subtitle="Test subtitle"
        />
      );

      expect(screen.getByText('Test subtitle')).toBeInTheDocument();
    });

    it('does not render subtitle when not provided', () => {
      render(
        <WorkOrdersHeader onCreateClick={mockOnCreateClick} />
      );

      expect(screen.queryByText(/subtitle/i)).not.toBeInTheDocument();
    });
  });

  describe('Create Button', () => {
    it('calls onCreateClick when create button is clicked', () => {
      render(
        <WorkOrdersHeader onCreateClick={mockOnCreateClick} />
      );

      const createButton = screen.getByRole('button', { name: /Create Work Order/i });
      fireEvent.click(createButton);

      expect(mockOnCreateClick).toHaveBeenCalledTimes(1);
    });
  });
});

