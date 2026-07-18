import React from 'react';
import { render, screen, waitFor, fireEvent } from '@/test/utils/test-utils';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import InventoryList from '../InventoryList';
import type { InventoryItem } from '@/features/inventory/types/inventory';
import * as useInventoryModule from '@/features/inventory/hooks/useInventory';
import * as usePermissionsModule from '@/hooks/usePermissions';
import { useIsMobile } from '@/hooks/use-mobile';

/**
 * Page wiring tests (mobile/desktop shells, permissions, navigation).
 * Sort/quick-filter math lives in inventoryListViewModel + inventoryQuickFilters unit tests.
 */
vi.mock('@/features/inventory/hooks/useInventory', () => ({
  useInventoryItems: vi.fn(),
  useAdjustInventoryQuantity: vi.fn(),
  useInventoryListMetadata: vi.fn(),
  useRecentlyAdjustedInventoryItemIds: vi.fn(() => ({ data: {}, isLoading: false })),
}));

vi.mock('@/features/inventory/hooks/useAlternateGroups', () => ({
  useInventoryGroupMembershipCounts: vi.fn(() => ({ data: {}, isLoading: false })),
}));

const inventoryHookMocks = useInventoryModule as typeof useInventoryModule & {
  useInventoryListMetadata: ReturnType<typeof vi.fn>;
};

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

vi.mock('@/features/inventory/components/PartsAccessSheet', () => ({
  PartsAccessSheet: ({ open }: { open: boolean }) =>
    open ? <div data-testid="parts-access-sheet">Parts Access</div> : null,
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
        (i.external_id ?? '').toLowerCase().includes(q),
    );
  }
  if (f.location) {
    data = data.filter((i) => (i.location ?? '').toLowerCase().includes(f.location!.toLowerCase()));
  }
  return data;
}

function mockMetadata() {
  inventoryHookMocks.useInventoryListMetadata.mockReturnValue({
    data: {
      uniqueLocations: ['Warehouse A', 'Yard'],
      totalCount: 2,
      negativeStockCount: 0,
      outOfStockCount: 0,
      lowStockCount: 1,
      healthyCount: 1,
      missingLocationCount: 0,
      missingUnitCostCount: 0,
      missingSkuCount: 0,
      estimatedInventoryValue: 100,
    },
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  });
}

async function renderUntilCatalogVisible() {
  render(<InventoryList />);
  expect(await screen.findByText('Healthy Part')).toBeInTheDocument();
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
    mockMetadata();

    vi.mocked(useInventoryModule.useInventoryItems).mockImplementation((_orgId, filters) => ({
      data: filterItems(filters),
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useInventoryModule.useInventoryItems>));
  });

  it('renders mobile search, personalization, and filter controls', async () => {
    await renderUntilCatalogVisible();

    const search = screen.getByRole('textbox', { name: /search inventory by name, sku, or id/i });
    expect(search).toHaveAttribute('placeholder', 'Search by name, SKU, or ID…');
    expect(screen.getByRole('button', { name: /open personalization/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /open filters/i })).toBeInTheDocument();
  });

  it('toggles low stock filter from the filter sheet', async () => {
    await renderUntilCatalogVisible();

    fireEvent.click(screen.getByRole('button', { name: /open filters/i }));
    fireEvent.click(screen.getByRole('switch', { name: /low stock only/i }));

    await waitFor(() => {
      expect(screen.queryByText('Healthy Part')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Low Stock Part')).toBeInTheDocument();
  });

  it('navigates to item detail when a card is activated', async () => {
    await renderUntilCatalogVisible();

    fireEvent.click(screen.getByRole('button', { name: /open inventory item healthy part/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard/inventory/item-1');
  });

  it('opens parts access sheet from mobile footer when permitted', async () => {
    vi.mocked(usePermissionsModule.usePermissions).mockImplementation(() => ({
      canManageInventory: () => true,
      canManagePartsManagers: () => true,
    } as unknown as ReturnType<typeof usePermissionsModule.usePermissions>));

    await renderUntilCatalogVisible();

    fireEvent.click(screen.getByRole('button', { name: 'Update parts access' }));
    expect(screen.getByTestId('parts-access-sheet')).toBeInTheDocument();
  });

  it('uses lightweight inventory metadata instead of a second full inventory query', async () => {
    vi.mocked(useInventoryModule.useInventoryItems).mockImplementation((_orgId, filters) => {
      if (
        filters?.search === '' &&
        filters?.lowStockOnly === false &&
        filters?.sortBy === undefined &&
        filters?.sortOrder === undefined
      ) {
        throw new Error('InventoryList should not issue a second full inventory query for metadata');
      }

      return {
        data: filterItems(filters),
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      } as unknown as ReturnType<typeof useInventoryModule.useInventoryItems>;
    });

    await renderUntilCatalogVisible();

    expect(inventoryHookMocks.useInventoryListMetadata).toHaveBeenCalledWith('org-1');
  });

  it('does not show the desktop Add Item dropdown on mobile', async () => {
    await renderUntilCatalogVisible();

    expect(screen.queryByRole('menuitem', { name: /bulk add \/ edit/i })).not.toBeInTheDocument();
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
    mockMetadata();

    vi.mocked(useInventoryModule.useInventoryItems).mockImplementation((_orgId, filters) => ({
      data: filterItems(filters),
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useInventoryModule.useInventoryItems>));
  });

  it('renders table chrome and health summary (not mobile filter icons)', async () => {
    await renderUntilCatalogVisible();

    expect(screen.getByRole('button', { name: /manage table columns/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /saved views/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /open personalization/i })).not.toBeInTheDocument();

    const summary = screen.getByLabelText(/inventory health summary/i);
    expect(summary).toHaveTextContent('Total');
    expect(summary).toHaveTextContent('Low stock');
  });

  it('does not expose row selection or list-level bulk actions', async () => {
    await renderUntilCatalogVisible();

    expect(
      screen.queryByRole('checkbox', { name: /select all inventory items/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /open bulk edit/i })).not.toBeInTheDocument();
  });

  it('Add Item dropdown opens single-item form and bulk navigate', async () => {
    const user = userEvent.setup();
    await renderUntilCatalogVisible();

    const addButton = screen.getByRole('button', { name: /add item/i });
    await user.click(addButton);
    await user.click(await screen.findByRole('menuitem', { name: /add single item/i }));
    expect(screen.getByTestId('inventory-item-form')).toBeInTheDocument();

    await user.click(addButton);
    await user.click(await screen.findByRole('menuitem', { name: /bulk add \/ edit/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard/inventory/bulk');
  });

  it('navigates to alternate groups via row actions', async () => {
    const user = userEvent.setup();
    await renderUntilCatalogVisible();

    const [actionsTrigger] = screen.getAllByRole('button', { name: /actions for healthy part/i });
    if (!actionsTrigger) {
      throw new Error('Expected at least one row actions trigger for Healthy Part');
    }
    await user.click(actionsTrigger);
    await user.click(await screen.findByRole('menuitem', { name: /manage alternate groups/i }));

    expect(mockNavigate).toHaveBeenCalledWith('/dashboard/inventory/item-1?alternateAction=add');
  });

  it('paginates desktop table results instead of rendering every item at once', async () => {
    const manyItems = Array.from({ length: 30 }, (_, index) =>
      baseItem({
        id: `item-${index + 1}`,
        name: `Inventory Item ${String(index + 1).padStart(2, '0')}`,
        sku: `SKU-${index + 1}`,
      }),
    );

    vi.mocked(useInventoryModule.useInventoryItems).mockImplementation(() => ({
      data: manyItems,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useInventoryModule.useInventoryItems>));

    render(<InventoryList />);

    expect(await screen.findByText('Inventory Item 01')).toBeInTheDocument();
    expect(screen.getByText('Inventory Item 25')).toBeInTheDocument();
    expect(screen.queryByText('Inventory Item 26')).not.toBeInTheDocument();
    expect(screen.getByTestId('inventory-list-pagination-footer')).toBeInTheDocument();
    expect(screen.getByText(/Showing 1 to 25 of 30 items/)).toBeInTheDocument();
  });
});
