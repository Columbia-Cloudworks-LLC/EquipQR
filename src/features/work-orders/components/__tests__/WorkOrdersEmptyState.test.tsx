import React from 'react';
import { render, screen, fireEvent } from '@/test/utils/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WorkOrdersEmptyState } from '../WorkOrdersEmptyState';

describe('WorkOrdersEmptyState', () => {
  const mockOnCreateClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders empty state message', () => {
      render(
        <WorkOrdersEmptyState
          hasActiveFilters={false}
          onCreateClick={mockOnCreateClick}
        />
      );

      expect(screen.getByText(/No work orders found/i)).toBeInTheDocument();
    });

    it('shows create message when no filters are active', () => {
      render(
        <WorkOrdersEmptyState
          hasActiveFilters={false}
          onCreateClick={mockOnCreateClick}
        />
      );

      expect(screen.getByText(/Get started by creating your first work order/i)).toBeInTheDocument();
    });

    it('shows filter message when filters are active', () => {
      render(
        <WorkOrdersEmptyState
          hasActiveFilters={true}
          onCreateClick={mockOnCreateClick}
        />
      );

      expect(screen.getByText(/No work orders match your current filters/i)).toBeInTheDocument();
    });
  });

  describe('Create Button', () => {
    it('shows create button when no filters are active', () => {
      render(
        <WorkOrdersEmptyState
          hasActiveFilters={false}
          onCreateClick={mockOnCreateClick}
        />
      );

      expect(screen.getByRole('button', { name: /Create Work Order/i })).toBeInTheDocument();
    });

    it('hides create button when filters are active', () => {
      render(
        <WorkOrdersEmptyState
          hasActiveFilters={true}
          onCreateClick={mockOnCreateClick}
        />
      );

      expect(screen.queryByRole('button', { name: /Create Work Order/i })).not.toBeInTheDocument();
    });

    it('calls onCreateClick when create button is clicked', () => {
      render(
        <WorkOrdersEmptyState
          hasActiveFilters={false}
          onCreateClick={mockOnCreateClick}
        />
      );

      const createButton = screen.getByRole('button', { name: /Create Work Order/i });
      fireEvent.click(createButton);

      expect(mockOnCreateClick).toHaveBeenCalledTimes(1);
    });
  });
});

