import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '@vitest-harness/utils/test-utils';
import InlineEditWorkOrderCosts from './InlineEditWorkOrderCosts';
import { isLaborCostRow } from '@/features/work-orders/utils/isLaborCostRow';
import type { WorkOrderCost } from '@/features/work-orders/services/workOrderCostsService';

const mutateAsyncCreate = vi.fn();
const adjustInventoryMutateAsync = vi.fn();

const { mockUseIsMobile } = vi.hoisted(() => ({
  mockUseIsMobile: vi.fn(() => false),
}));

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

const { mockUseInventoryAccess } = vi.hoisted(() => ({
  mockUseInventoryAccess: vi.fn(() => ({
    canView: true,
    canEdit: false,
    isPartsManager: false,
    isPartsConsumer: true,
    isLoading: false,
  })),
}));

vi.mock('@/features/inventory/hooks/useInventoryAccess', () => ({
  useInventoryAccess: () => mockUseInventoryAccess(),
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
  useIsMobile: () => mockUseIsMobile(),
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

describe('InlineEditWorkOrderCosts inventory RBAC gating', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseIsMobile.mockReturnValue(false);
  });

  it('shows Add from Inventory when the user has inventory view access', async () => {
    mockUseInventoryAccess.mockReturnValue({
      canView: true,
      canEdit: false,
      isPartsManager: false,
      isPartsConsumer: true,
      isLoading: false,
    });
    const user = userEvent.setup();
    render(
      <InlineEditWorkOrderCosts
        costs={[]}
        workOrderId="wo-1"
        equipmentIds={['eq-1']}
        canEdit
      />,
    );

    await user.click(screen.getByRole('button', { name: /add cost item/i }));
    expect(screen.getByRole('button', { name: /add from inventory/i })).toBeInTheDocument();
  });

  it('hides Add from Inventory when the user lacks inventory access', async () => {
    mockUseInventoryAccess.mockReturnValue({
      canView: false,
      canEdit: false,
      isPartsManager: false,
      isPartsConsumer: false,
      isLoading: false,
    });
    const user = userEvent.setup();
    render(
      <InlineEditWorkOrderCosts
        costs={[]}
        workOrderId="wo-1"
        equipmentIds={['eq-1']}
        canEdit
      />,
    );

    await user.click(screen.getByRole('button', { name: /add cost item/i }));
    expect(screen.queryByRole('button', { name: /add from inventory/i })).not.toBeInTheDocument();
  });
});

describe('InlineEditWorkOrderCosts labor preset', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseIsMobile.mockReturnValue(false);
    mockUseInventoryAccess.mockReturnValue({
      canView: true,
      canEdit: false,
      isPartsManager: false,
      isPartsConsumer: true,
      isLoading: false,
    });
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

const mobileInlineEditDefaults = {
  costs: [] as WorkOrderCost[],
  workOrderId: 'wo-1',
  equipmentIds: ['eq-1'],
  canEdit: true,
  compactMobile: true,
};

function renderMobileInlineEditCosts(overrides?: Partial<typeof mobileInlineEditDefaults>) {
  return render(
    <InlineEditWorkOrderCosts {...mobileInlineEditDefaults} {...overrides} />,
  );
}

async function enterMobileCostEditMode(user: ReturnType<typeof userEvent.setup>) {
  renderMobileInlineEditCosts();
  await user.click(screen.getByRole('button', { name: /add cost/i }));
}

describe('InlineEditWorkOrderCosts mobile edit UX', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseIsMobile.mockReturnValue(true);
    mockUseInventoryAccess.mockReturnValue({
      canView: true,
      canEdit: false,
      isPartsManager: false,
      isPartsConsumer: true,
      isLoading: false,
    });
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

  it('does not show inline validation on entering mobile edit mode', async () => {
    const user = userEvent.setup();
    await enterMobileCostEditMode(user);

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByText('Cost Items')).not.toBeInTheDocument();
    expect(screen.getByText('Edit cost lines')).toBeInTheDocument();
  });

  it('does not show validation alert immediately after Add cost line', async () => {
    const user = userEvent.setup();
    await enterMobileCostEditMode(user);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /add cost line/i }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows validation after Save with invalid rows', async () => {
    const user = userEvent.setup();
    await enterMobileCostEditMode(user);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^save$/i }));

    expect(screen.getByRole('alert')).toHaveTextContent(/valid quantities/i);
  });

  it('shows validation after first field interaction while still invalid', async () => {
    const user = userEvent.setup();
    await enterMobileCostEditMode(user);
    await user.type(screen.getByPlaceholderText('Qty'), '2');

    expect(screen.getByRole('alert')).toHaveTextContent(/valid quantities/i);
  });

  it('adds a placeholder row when entering edit with empty props after prior non-empty hook state', async () => {
    const user = userEvent.setup();
    const existingCost = {
      id: 'cost-1',
      work_order_id: 'wo-1',
      description: 'Part',
      quantity: 1,
      unit_price_cents: 100,
      total_price_cents: 100,
      created_by: 'user-1',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      inventory_item_id: null,
      original_quantity: null,
    } satisfies WorkOrderCost;

    const { rerender } = render(
      <InlineEditWorkOrderCosts
        costs={[existingCost]}
        workOrderId="wo-1"
        equipmentIds={['eq-1']}
        canEdit
        compactMobile
      />,
    );

    await user.click(screen.getByRole('button', { name: /edit costs/i }));
    await user.click(screen.getByRole('button', { name: /cancel/i }));

    rerender(
      <InlineEditWorkOrderCosts
        costs={[]}
        workOrderId="wo-1"
        equipmentIds={['eq-1']}
        canEdit
        compactMobile
      />,
    );

    await user.click(screen.getByRole('button', { name: /add cost/i }));

    expect(screen.getAllByPlaceholderText('Qty')).toHaveLength(1);
  });
});
