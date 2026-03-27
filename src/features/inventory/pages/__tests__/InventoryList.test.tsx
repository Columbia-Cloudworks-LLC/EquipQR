import React from 'react';
import { render, screen, waitFor } from '@/test/utils/test-utils';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import InventoryList from '../InventoryList';
import type { InventoryItem } from '@/features/inventory/types/inventory';
import * as useInventoryModule from '@/features/inventory/hooks/useInventory';
import * as usePermissionsModule from '@/hooks/usePermissions';
import { useIsMobile } from '@/hooks/use-mobile';

vi.mock('@/features/inventory/hooks/useInventory', () => ({
  useInventoryItems: vi.fn(),
  useAdjustInventoryQuantity: vi.fn(),
}));

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/contexts/OrganizationContext', () => ({
  useOrganization: vi.fn(() => ({
    currentOrganization: { id: 'org-1', name: 'Test Org' },
  })),
}));

vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: vi.fn(),
}));

vi.mock('@/features/inventory/hooks/usePartsManagers', () => ({
  useIsPartsManager: vi.fn(() => ({ data: false, isLoading: false })),
}));

vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: vi.fn(() => true),
}));

vi.mock('@/features/inventory/components/InventoryItemForm', () => ({
  InventoryItemForm: ({ open }: { open: boolean }) =>
    open ? <div data-testid="inventory-item-form">Inventory Form</div> : null,
}));

vi.mock('@/features/inventory/components/InventoryQRCodeDisplay', () => ({
  default: ({ open }: { open: boolean }) =>
    open ? <div data-testid="qr-code-display">QR Code</div> : null,
}));

vi.mock('@/features/inventory/components/PartsManagersSheet', () => ({
  PartsManagersSheet: () => null,
}));

const baseItem = (overrides: Partial<InventoryItem>): InventoryItem => ({
  id: 'item-1',
  organization_id: 'org-1',
  name: 'Healthy Part',
  description: null,
  sku: 'SKU-1',
  external_id: null,
  quantity_on_hand: 100,
  low_stock_threshold: 10,
  location: 'Warehouse A',
  default_unit_cost: '1.00',
  image_url: null,
  isLowStock: false,
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
  created_by: 'user-1',
  ...overrides,
});

const mockCatalog: InventoryItem[] = [
  baseItem({ id: 'item-1', name: 'Healthy Part', quantity_on_hand: 100, isLowStock: false }),
  baseItem({
    id: 'item-2',
    name: 'Low Stock Part',
    sku: 'SKU-LOW',
    quantity_on_hand: 5,
    isLowStock: true,
  }),
];

function filterItems(filters: import('@/features/inventory/types/inventory').InventoryFilters | undefined) {
  let data = [...mockCatalog];
  const f = filters ?? {};
  if (f.lowStockOnly) {
    data = data.filter((i) => i.isLowStock);
  }
  if (f.search?.trim()) {
    const q = f.search.trim().toLowerCase();
    data = data.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        (i.sku ?? '').toLowerCase().includes(q) ||
        (i.external_id ?? '').toLowerCase().includes(q)
    );
  }
  if (f.location) {
    data = data.filter((i) => (i.location ?? '').toLowerCase().includes(f.location!.toLowerCase()));
  }
  return data;
}

describe('InventoryList — mobile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(usePermissionsModule.usePermissions).mockImplementation(() => ({
      canManageInventory: () => true,
      canManagePartsManagers: () => false,
    } as unknown as ReturnType<typeof usePermissionsModule.usePermissions>));
    vi.mocked(useIsMobile).mockReturnValue(true);
    vi.mocked(useInventoryModule.useAdjustInventoryQuantity).mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue(0),
      isPending: false,
    } as unknown as ReturnType<typeof useInventoryModule.useAdjustInventoryQuantity>);

    vi.mocked(useInventoryModule.useInventoryItems).mockImplementation((_orgId, filters) => ({
      data: filterItems(filters),
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useInventoryModule.useInventoryItems>));
  });

  it('renders mobile stats, search, and Sort & Filter', async () => {
    render(<InventoryList />);

    await waitFor(() => {
      expect(screen.getByText('Healthy Part')).toBeInTheDocument();
    });
    const statBlock = screen.getByText(/^items$/).closest('div');
    expect(statBlock).toHaveTextContent('2');
    expect(statBlock).toHaveTextContent('items');
    expect(
      screen.getByRole('button', { name: /show 1 low stock items only/i })
    ).toBeInTheDocument();
    const search = screen.getByRole('textbox', { name: /search inventory by name, sku, or id/i });
    expect(search).toBeInTheDocument();
    expect(search).toHaveAttribute('placeholder', 'Search by name, SKU, or ID…');
    expect(screen.getByRole('button', { name: /sort and filter/i })).toBeInTheDocument();
  });

  it('toggles low stock filter when the low stock chip is pressed', async () => {
    const user = userEvent.setup();
    render(<InventoryList />);

    await waitFor(() => {
      expect(screen.getByText('Healthy Part')).toBeInTheDocument();
    });
    expect(screen.getByText('Low Stock Part')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /show 1 low stock items only/i }));

    await waitFor(() => {
      expect(screen.queryByText('Healthy Part')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Low Stock Part')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /low stock filter on/i }));

    await waitFor(() => {
      expect(screen.getByText('Healthy Part')).toBeInTheDocument();
    });
  });

  it('opens sort & filter sheet with sort controls', async () => {
    const user = userEvent.setup();
    render(<InventoryList />);

    await waitFor(() => {
      expect(screen.getByText('Healthy Part')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /^sort and filter$/i }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /sort & filter/i })).toBeInTheDocument();
    });
    expect(screen.getByText(/sort by/i)).toBeInTheDocument();
  });

  it('navigates to item detail when a card is activated', async () => {
    const user = userEvent.setup();
    render(<InventoryList />);

    await waitFor(() => {
      expect(screen.getByText('Healthy Part')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /open inventory item healthy part/i }));

    expect(mockNavigate).toHaveBeenCalledWith('/dashboard/inventory/item-1');
  });

  it('opens row menu without navigating; View Details navigates', async () => {
    const user = userEvent.setup();
    render(<InventoryList />);

    await waitFor(() => {
      expect(screen.getByText('Healthy Part')).toBeInTheDocument();
    });

    await user.click(
      screen.getByRole('button', { name: /more actions for healthy part/i })
    );

    await waitFor(() => {
      expect(screen.getByRole('menuitem', { name: /view details/i })).toBeInTheDocument();
    });

    expect(mockNavigate).not.toHaveBeenCalled();

    await user.click(screen.getByRole('menuitem', { name: /view details/i }));

    expect(mockNavigate).toHaveBeenCalledWith('/dashboard/inventory/item-1');
  });

  it('shows mobile FAB when user can create inventory', async () => {
    render(<InventoryList />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add inventory item/i })).toBeInTheDocument();
    });
  });

  it('shows labeled Parts Managers on mobile when user can manage parts managers', async () => {
    vi.mocked(usePermissionsModule.usePermissions).mockImplementation(() => ({
      canManageInventory: () => true,
      canManagePartsManagers: () => true,
    } as unknown as ReturnType<typeof usePermissionsModule.usePermissions>));

    render(<InventoryList />);

    await waitFor(() => {
      expect(screen.getByText('Healthy Part')).toBeInTheDocument();
    });

    expect(screen.getByTestId('inventory-mobile-parts-managers')).toBeInTheDocument();
    expect(screen.getByTestId('inventory-mobile-parts-managers')).toHaveTextContent(
      'Parts Managers'
    );
  });

  it('shows Low stock badge on low-stock mobile cards', async () => {
    render(<InventoryList />);

    await waitFor(() => {
      expect(screen.getByText('Low Stock Part')).toBeInTheDocument();
    });

    expect(screen.getByText('Low stock')).toBeInTheDocument();
  });
});

describe('InventoryList — desktop table', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(usePermissionsModule.usePermissions).mockImplementation(() => ({
      canManageInventory: () => true,
      canManagePartsManagers: () => false,
    } as unknown as ReturnType<typeof usePermissionsModule.usePermissions>));
    vi.mocked(useIsMobile).mockReturnValue(false);
    vi.mocked(useInventoryModule.useAdjustInventoryQuantity).mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue(0),
      isPending: false,
    } as unknown as ReturnType<typeof useInventoryModule.useAdjustInventoryQuantity>);

    vi.mocked(useInventoryModule.useInventoryItems).mockImplementation((_orgId, filters) => ({
      data: filterItems(filters),
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useInventoryModule.useInventoryItems>));
  });

  it('renders table rows instead of mobile cards', async () => {
    render(<InventoryList />);

    await waitFor(() => {
      expect(screen.getByRole('columnheader', { name: /name/i })).toBeInTheDocument();
    });
    expect(screen.queryByRole('button', { name: /sort and filter/i })).not.toBeInTheDocument();
    expect(screen.getByText('Healthy Part')).toBeInTheDocument();
  });

  it('shows a negative stock label for negative quantities', async () => {
    const negativeItem = baseItem({
      id: 'item-negative',
      name: 'Backordered Part',
      quantity_on_hand: -2,
      low_stock_threshold: 10,
      isLowStock: true,
    });

    vi.mocked(useInventoryModule.useInventoryItems).mockImplementation(() => ({
      data: [negativeItem],
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useInventoryModule.useInventoryItems>));

    render(<InventoryList />);

    await waitFor(() => {
      expect(screen.getByText('Backordered Part')).toBeInTheDocument();
    });

    expect(screen.getAllByText('Negative stock')).toHaveLength(2);
  });
});
