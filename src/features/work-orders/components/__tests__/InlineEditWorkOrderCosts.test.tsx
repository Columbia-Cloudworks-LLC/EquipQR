import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '@/test/utils/test-utils';
import InlineEditWorkOrderCosts from '../InlineEditWorkOrderCosts';
import { isLaborCostRow } from '@/features/work-orders/utils/isLaborCostRow';
import type { WorkOrderCost } from '@/features/work-orders/services/workOrderCostsService';

const mutateAsyncCreate = vi.fn();
const adjustInventoryMutateAsync = vi.fn();

vi.mock('@/features/work-orders/hooks/useWorkOrderCosts', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@/features/work-orders/hooks/useWorkOrderCosts')>();
  return {
    ...mod,
    useCreateWorkOrderCost: () => ({
      mutateAsync: mutateAsyncCreate,
      isPending: false,
    }),
    useUpdateWorkOrderCostWithInventory: () => ({
      mutateAsync: vi.fn(),
      isPending: false,
    }),
    useDeleteWorkOrderCostWithInventoryRestore: () => ({
      mutateAsync: vi.fn(),
      isPending: false,
    }),
  };
});

vi.mock('@/features/inventory/hooks/useInventory', () => ({
  useAdjustInventoryQuantity: () => ({
    mutateAsync: adjustInventoryMutateAsync,
    isPending: false,
  }),
}));

vi.mock('@/hooks/useAppToast', () => ({
  useAppToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/hooks/useFormatTimestamp', () => ({
  useFormatTimestamp: () => ({ formatDate: () => 'Jan 1, 2024' }),
}));

vi.mock('@/contexts/OrganizationContext', () => ({
  useOrganization: () => ({
    currentOrganization: { id: 'org-1', name: 'Org' },
  }),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1', email: 'u@example.com' } }),
}));

vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => false,
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}));

describe('isLaborCostRow', () => {
  it('detects labor descriptions without inventory', () => {
    expect(isLaborCostRow({ description: 'Labor', inventory_item_id: null })).toBe(true);
    expect(isLaborCostRow({ description: 'Labor - travel', inventory_item_id: null })).toBe(true);
    expect(isLaborCostRow({ description: 'Laboratory supplies', inventory_item_id: null })).toBe(false);
    expect(isLaborCostRow({ description: 'Labor', inventory_item_id: 'inv-1' })).toBe(false);
  });
});

describe('InlineEditWorkOrderCosts labor preset', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mutateAsyncCreate.mockResolvedValue({
      id: 'cost-new',
      work_order_id: 'wo-1',
      description: 'Labor',
      quantity: 2,
      unit_price_cents: 7500,
      total_price_cents: 15000,
      created_by: 'user-1',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      inventory_item_id: null,
      original_quantity: null,
    } satisfies WorkOrderCost);
  });

  it('creates labor via dialog without calling inventory adjustment', async () => {
    const user = userEvent.setup();
    render(
      <InlineEditWorkOrderCosts
        costs={[]}
        workOrderId="wo-1"
        equipmentIds={['eq-1']}
        canEdit={true}
        compactMobile={true}
      />,
    );

    await user.click(screen.getByRole('button', { name: /add labor/i }));

    await user.type(screen.getByLabelText(/^hours$/i), '2');
    await user.type(screen.getByLabelText(/hourly rate/i), '75');
    await user.click(screen.getByRole('button', { name: /save labor/i }));

    await waitFor(() => {
      expect(mutateAsyncCreate).toHaveBeenCalledWith({
        work_order_id: 'wo-1',
        description: 'Labor',
        quantity: 2,
        unit_price_cents: 7500,
      });
    });
    expect(adjustInventoryMutateAsync).not.toHaveBeenCalled();
  });

  it('includes optional note in labor description', async () => {
    const user = userEvent.setup();
    render(
      <InlineEditWorkOrderCosts
        costs={[]}
        workOrderId="wo-1"
        equipmentIds={[]}
        canEdit={true}
        compactMobile={true}
      />,
    );

    await user.click(screen.getByRole('button', { name: /add labor/i }));
    await user.type(screen.getByLabelText(/^hours$/i), '1.5');
    await user.type(screen.getByLabelText(/hourly rate/i), '80');
    await user.type(screen.getByLabelText(/note/i), 'OT');
    await user.click(screen.getByRole('button', { name: /save labor/i }));

    await waitFor(() => {
      expect(mutateAsyncCreate).toHaveBeenCalledWith({
        work_order_id: 'wo-1',
        description: 'Labor - OT',
        quantity: 1.5,
        unit_price_cents: 8000,
      });
    });
    expect(adjustInventoryMutateAsync).not.toHaveBeenCalled();
  });
});
