import React from 'react';
import { render, screen, fireEvent, waitFor } from '@/test/utils/test-utils';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import WorkOrderCostForm from '../WorkOrderCostForm';

// Helper to create a complete mock mutation result with proper typing
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createMockMutationResult = (overrides: Record<string, any> = {}): any => ({
  mutate: vi.fn(),
  mutateAsync: vi.fn().mockResolvedValue({}),
  isPending: false,
  isIdle: true,
  isSuccess: false,
  isError: false,
  data: undefined,
  error: null,
  variables: undefined,
  context: undefined,
  status: 'idle',
  reset: vi.fn(),
  failureCount: 0,
  failureReason: null,
  submittedAt: 0,
  isPaused: false,
  ...overrides
});

// Mock hooks
vi.mock('@/features/work-orders/hooks/useWorkOrderCosts', () => ({
  useCreateWorkOrderCost: vi.fn(() => createMockMutationResult()),
  useUpdateWorkOrderCost: vi.fn(() => createMockMutationResult())
}));

const mockCost = {
  id: 'cost-1',
  work_order_id: 'wo-1',
  description: 'Test Cost',
  quantity: 2,
  unit_price_cents: 1000, // $10.00
  total_price_cents: 2000, // quantity * unit_price
  created_by: 'user-1',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z'
};

describe('WorkOrderCostForm', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Create Mode', () => {
    it('renders form in create mode when editingCost is not provided', () => {
      render(
        <WorkOrderCostForm
          open={true}
          onClose={mockOnClose}
          workOrderId="wo-1"
        />
      );

      expect(screen.getByText(/Add Cost/i)).toBeInTheDocument();
    });

    it('renders all form fields', () => {
      render(
        <WorkOrderCostForm
          open={true}
          onClose={mockOnClose}
          workOrderId="wo-1"
        />
      );

      expect(screen.getByLabelText(/Description/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Quantity/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Unit Price/i)).toBeInTheDocument();
    });

    it('has default values for quantity and unit price', () => {
      render(
        <WorkOrderCostForm
          open={true}
          onClose={mockOnClose}
          workOrderId="wo-1"
        />
      );

      const quantityInput = screen.getByLabelText(/Quantity/i) as HTMLInputElement;
      expect(quantityInput.value).toBe('1');

      const priceInput = screen.getByLabelText(/Unit Price/i) as HTMLInputElement;
      expect(priceInput.value).toBe('0');
    });

    it('calls create mutation when form is submitted', async () => {
      const { useCreateWorkOrderCost } = await import('@/features/work-orders/hooks/useWorkOrderCosts');
      const mockMutateAsync = vi.fn().mockResolvedValue({});
      
      vi.mocked(useCreateWorkOrderCost).mockReturnValue(
        createMockMutationResult({ mutateAsync: mockMutateAsync })
      );

      render(
        <WorkOrderCostForm
          open={true}
          onClose={mockOnClose}
          workOrderId="wo-1"
        />
      );

      const descriptionInput = screen.getByLabelText(/Description/i);
      const quantityInput = screen.getByLabelText(/Quantity/i);
      const priceInput = screen.getByLabelText(/Unit Price/i);

      fireEvent.change(descriptionInput, { target: { value: 'Test Cost' } });
      fireEvent.change(quantityInput, { target: { value: '2' } });
      fireEvent.change(priceInput, { target: { value: '10.50' } });

      const submitButton = screen.getByRole('button', { name: /^add$/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith({
          work_order_id: 'wo-1',
          description: 'Test Cost',
          quantity: 2,
          unit_price_cents: 1050 // $10.50 * 100
        });
      });
    });

    it('calls onClose after successful creation', async () => {
      const { useCreateWorkOrderCost } = await import('@/features/work-orders/hooks/useWorkOrderCosts');
      const mockMutateAsync = vi.fn().mockResolvedValue({});
      
      vi.mocked(useCreateWorkOrderCost).mockReturnValue(
        createMockMutationResult({ mutateAsync: mockMutateAsync })
      );

      render(
        <WorkOrderCostForm
          open={true}
          onClose={mockOnClose}
          workOrderId="wo-1"
        />
      );

      const descriptionInput = screen.getByLabelText(/Description/i);
      fireEvent.change(descriptionInput, { target: { value: 'Test Cost' } });

      const submitButton = screen.getByRole('button', { name: /^add$/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });
  });

  describe('Edit Mode', () => {
    it('renders form in edit mode when editingCost is provided', () => {
      render(
        <WorkOrderCostForm
          open={true}
          onClose={mockOnClose}
          workOrderId="wo-1"
          editingCost={mockCost}
        />
      );

      expect(screen.getByText(/Edit Cost/i)).toBeInTheDocument();
    });

    it('pre-fills form fields with existing cost data', () => {
      render(
        <WorkOrderCostForm
          open={true}
          onClose={mockOnClose}
          workOrderId="wo-1"
          editingCost={mockCost}
        />
      );

      const descriptionInput = screen.getByLabelText(/Description/i) as HTMLInputElement;
      expect(descriptionInput.value).toBe('Test Cost');

      const quantityInput = screen.getByLabelText(/Quantity/i) as HTMLInputElement;
      expect(quantityInput.value).toBe('2');

      const priceInput = screen.getByLabelText(/Unit Price/i) as HTMLInputElement;
      expect(priceInput.value).toBe('10'); // $10.00
    });

    it('calls update mutation when form is submitted', async () => {
      const { useUpdateWorkOrderCost } = await import('@/features/work-orders/hooks/useWorkOrderCosts');
      const mockMutateAsync = vi.fn().mockResolvedValue({});
      
      vi.mocked(useUpdateWorkOrderCost).mockReturnValue(
        createMockMutationResult({ mutateAsync: mockMutateAsync })
      );

      render(
        <WorkOrderCostForm
          open={true}
          onClose={mockOnClose}
          workOrderId="wo-1"
          editingCost={mockCost}
        />
      );

      const descriptionInput = screen.getByLabelText(/Description/i);
      fireEvent.change(descriptionInput, { target: { value: 'Updated Cost' } });

      const submitButton = screen.getByRole('button', { name: /^update$/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith({
          costId: 'cost-1',
          updateData: {
            description: 'Updated Cost',
            quantity: 2,
            unit_price_cents: 1000
          }
        });
      });
    });
  });

  describe('Form Validation', () => {
    it('shows error when description is empty', async () => {
      const user = userEvent.setup();
      render(
        <WorkOrderCostForm
          open={true}
          onClose={mockOnClose}
          workOrderId="wo-1"
        />
      );

      const submitButton = screen.getByRole('button', { name: /^add$/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Description is required/i)).toBeInTheDocument();
      });
    });

    it('shows error when quantity is invalid', async () => {
      const user = userEvent.setup();
      render(
        <WorkOrderCostForm
          open={true}
          onClose={mockOnClose}
          workOrderId="wo-1"
        />
      );

      const quantityInput = screen.getByLabelText(/Quantity/i);
      // Clear the default value and enter 0
      await user.clear(quantityInput);
      await user.type(quantityInput, '0');

      const submitButton = screen.getByRole('button', { name: /^add$/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Quantity must be greater than 0/i)).toBeInTheDocument();
      });
    });

    it('shows error when unit price is negative', async () => {
      const user = userEvent.setup();
      render(
        <WorkOrderCostForm
          open={true}
          onClose={mockOnClose}
          workOrderId="wo-1"
        />
      );

      const priceInput = screen.getByLabelText(/Unit Price/i);
      // Clear and enter a negative value
      await user.clear(priceInput);
      await user.type(priceInput, '-10');

      const submitButton = screen.getByRole('button', { name: /^add$/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Unit price cannot be negative/i)).toBeInTheDocument();
      });
    });
  });

  describe('Dialog Behavior', () => {
    it('does not render when open is false', () => {
      render(
        <WorkOrderCostForm
          open={false}
          onClose={mockOnClose}
          workOrderId="wo-1"
        />
      );

      expect(screen.queryByText(/Add Cost/i)).not.toBeInTheDocument();
    });

    it('calls onClose when cancel button is clicked', () => {
      render(
        <WorkOrderCostForm
          open={true}
          onClose={mockOnClose}
          workOrderId="wo-1"
        />
      );

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Loading States', () => {
    it('disables submit button when mutation is pending', async () => {
      const { useCreateWorkOrderCost } = await import('@/features/work-orders/hooks/useWorkOrderCosts');
      
      vi.mocked(useCreateWorkOrderCost).mockReturnValue(
        createMockMutationResult({ isPending: true, isIdle: false, status: 'pending' as const })
      );

      render(
        <WorkOrderCostForm
          open={true}
          onClose={mockOnClose}
          workOrderId="wo-1"
        />
      );

      const submitButton = screen.getByRole('button', { name: /saving.../i });
      expect(submitButton).toBeDisabled();
    });
  });
});

