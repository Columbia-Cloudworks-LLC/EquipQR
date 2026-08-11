import React from 'react';
import { render, screen, waitFor, fireEvent } from '@vitest-harness/utils/test-utils';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import InventoryItemDetail from './InventoryItemDetail';
import type { InventoryItem, PartCompatibilityRule } from '@/features/inventory/types/inventory';
import * as useInventoryModule from '@/features/inventory/hooks/useInventory';
import * as inventoryEquipmentLinkMutations from '@/features/inventory/hooks/inventoryEquipmentLinkMutations';
import { useIsMobile } from '@/hooks/use-mobile';

const mockNavigate = vi.fn();
let mockSearchParams = new URLSearchParams();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ itemId: 'item-1' }),
    useNavigate: () => mockNavigate,
    useSearchParams: () => [mockSearchParams, vi.fn()],
  };
});

vi.mock('@/contexts/OrganizationContext', () => ({
  useOrganization: vi.fn(() => ({
    currentOrganization: {
      id: 'org-1',
      name: 'Test Org',
      inventoryDefaultLocationName: 'Main Shop',
      inventoryDefaultLocationAddress: '500 Org Default St',
      inventoryDefaultLocationCity: 'Austin',
      inventoryDefaultLocationState: 'TX',
      inventoryDefaultLocationCountry: 'USA',
      inventoryDefaultLocationLat: 30.27,
      inventoryDefaultLocationLng: -97.74,
    },
  })),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'user-1', email: 'test@example.com' },
  })),
}));

vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: vi.fn(() => ({
    canCreateEquipment: () => true,
    canManageInventory: () => true,
  })),
}));

vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: vi.fn(() => false),
}));

vi.mock('@/features/equipment/hooks/useEquipment', () => ({
  useEquipment: vi.fn(() => ({
    data: [{ id: 'eq-1', name: 'Bulldozer 1', manufacturer: 'Caterpillar', model: 'D6T' }],
  })),
  useEquipmentSummaries: vi.fn(() => ({
    data: [{ id: 'eq-1', name: 'Bulldozer 1', manufacturer: 'Caterpillar', model: 'D6T' }],
  })),
  useEquipmentManufacturersAndModels: vi.fn(() => ({
    data: [{ manufacturer: 'Caterpillar', models: ['D6T', 'D8T'] }],
    isLoading: false,
  })),
}));

vi.mock('@/features/organization/hooks/useOrganizationMembers', () => ({
  useOrganizationMembers: vi.fn(() => ({
    data: [],
  })),
}));

vi.mock('@/features/inventory/components/InventoryItemForm', () => ({
  InventoryItemForm: ({ open }: { open: boolean }) =>
    open ? <div data-testid="inventory-item-form">Inventory Form</div> : null,
}));

vi.mock('@/features/inventory/components/InventoryQRCodeDisplay', () => ({
  default: ({ open }: { open: boolean }) =>
    open ? <div data-testid="qr-code-display">QR Code</div> : null,
}));

vi.mock('@/features/equipment/components/InlineEditField', () => ({
  default: ({ value }: { value: string }) => <span>{value || 'N/A'}</span>,
}));

vi.mock('@/hooks/useGoogleMapsLoader', () => ({
  useGoogleMapsLoader: vi.fn(() => ({ isLoaded: true })),
}));

vi.mock('@/hooks/useGoogleMapsKey', () => ({
  useGoogleMapsKey: vi.fn(() => ({
    googleMapsKey: 'test-key',
    mapId: 'test-map-id',
    isLoading: false,
    error: null,
    retry: vi.fn(),
  })),
}));

vi.mock('@/hooks/useThemeVersion', () => ({
  useIsDarkTheme: vi.fn(() => false),
  useThemeVersion: vi.fn(() => 0),
}));

vi.mock('@/components/ui/GooglePlacesAutocomplete', () => ({
  default: () => null,
}));

vi.mock('@/components/location/CenterPinMapPicker', () => ({
  CenterPinMapPicker: () => null,
}));

vi.mock('@/components/location/LiveLocationCaptureDialog', () => ({
  LiveLocationCaptureDialog: () => null,
}));

vi.mock('@/components/location/LocationDirectionsMiniMap', () => ({
  LocationDirectionsMiniMap: ({ address }: { address?: string }) => (
    <button type="button" data-testid="inventory-directions-map">
      Tap for directions{address ? `: ${address}` : ''}
    </button>
  ),
}));

vi.mock('@/features/inventory/components/CompatibilityRulesEditor', () => ({
  CompatibilityRulesEditor: ({
    rules,
  }: {
    rules: Array<{ manufacturer: string; model: string | null }>;
  }) => (
    <div data-testid="compatibility-rules-editor">
      <span data-testid="rules-count">Rules: {rules.length}</span>
    </div>
  ),
}));

const mockItem: InventoryItem = {
  id: 'item-1',
  organization_id: 'org-1',
  name: 'Test Part',
  description: 'Test description',
  sku: 'TEST-001',
  external_id: null,
  quantity_on_hand: 100,
  low_stock_threshold: 10,
  location: 'Warehouse A',
  location_address: null,
  location_city: null,
  location_state: null,
  location_country: null,
  location_lat: null,
  location_lng: null,
  default_unit_cost: '25.00',
  image_url: null,
  isLowStock: false,
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
  created_by: 'user-1',
};

const mockRules: PartCompatibilityRule[] = [
  {
    id: 'rule-1',
    inventory_item_id: 'item-1',
    manufacturer: 'Caterpillar',
    model: 'D6T',
    manufacturer_norm: 'caterpillar',
    model_norm: 'd6t',
    created_at: '2024-01-01',
  },
  {
    id: 'rule-2',
    inventory_item_id: 'item-1',
    manufacturer: 'John Deere',
    model: null,
    manufacturer_norm: 'john deere',
    model_norm: null,
    created_at: '2024-01-01',
  },
];

const mockBulkSetRulesMutateAsync = vi.fn();

vi.mock('@/features/inventory/hooks/useInventory', () => ({
  useInventoryItem: vi.fn(),
  useInventoryTransactions: vi.fn(),
  useDeleteInventoryItem: vi.fn(),
  useAdjustInventoryQuantity: vi.fn(),
  useUpdateInventoryItem: vi.fn(),
  useCompatibleEquipmentForItem: vi.fn(),
  useBulkLinkEquipmentToItem: vi.fn(),
  useCompatibilityRulesForItem: vi.fn(),
  useBulkSetCompatibilityRules: vi.fn(),
  useEquipmentMatchingItemRules: vi.fn(),
}));

vi.mock('@/features/inventory/hooks/inventoryEquipmentLinkMutations', () => ({
  useUnlinkItemFromEquipment: vi.fn(),
}));

vi.mock('@/features/inventory/hooks/usePartsManagers', () => ({
  useIsPartsManager: vi.fn(() => ({ data: false, isLoading: false })),
}));

vi.mock('@/features/inventory/hooks/useAlternateGroups', () => ({
  useAlternateGroups: vi.fn(() => ({ data: [], isLoading: false })),
  useCreateAlternateGroup: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useAddInventoryItemToGroup: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
}));

const setupMocks = (options: { rules?: PartCompatibilityRule[]; itemLoading?: boolean } = {}) => {
  const rules = options.rules ?? mockRules;
  const itemLoading = options.itemLoading ?? false;

  vi.mocked(useInventoryModule.useInventoryItem).mockReturnValue({
    data: itemLoading ? null : mockItem,
    isLoading: itemLoading,
    isError: false,
    error: null,
    refetch: vi.fn(),
  } as unknown as ReturnType<typeof useInventoryModule.useInventoryItem>);

  vi.mocked(useInventoryModule.useInventoryTransactions).mockReturnValue({
    data: { transactions: [], totalCount: 0, page: 1, limit: 20, hasMore: false },
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  } as unknown as ReturnType<typeof useInventoryModule.useInventoryTransactions>);

  vi.mocked(useInventoryModule.useDeleteInventoryItem).mockReturnValue({
    mutateAsync: vi.fn(),
    isPending: false,
  } as unknown as ReturnType<typeof useInventoryModule.useDeleteInventoryItem>);

  vi.mocked(useInventoryModule.useAdjustInventoryQuantity).mockReturnValue({
    mutateAsync: vi.fn(),
    isPending: false,
  } as unknown as ReturnType<typeof useInventoryModule.useAdjustInventoryQuantity>);

  vi.mocked(useInventoryModule.useUpdateInventoryItem).mockReturnValue({
    mutateAsync: vi.fn(),
    isPending: false,
  } as unknown as ReturnType<typeof useInventoryModule.useUpdateInventoryItem>);

  vi.mocked(inventoryEquipmentLinkMutations.useUnlinkItemFromEquipment).mockReturnValue({
    mutateAsync: vi.fn(),
    isPending: false,
  } as unknown as ReturnType<typeof inventoryEquipmentLinkMutations.useUnlinkItemFromEquipment>);

  vi.mocked(useInventoryModule.useCompatibleEquipmentForItem).mockReturnValue({
    data: [{ id: 'eq-1', name: 'Bulldozer 1', manufacturer: 'Caterpillar', model: 'D6T' }],
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  } as unknown as ReturnType<typeof useInventoryModule.useCompatibleEquipmentForItem>);

  vi.mocked(useInventoryModule.useBulkLinkEquipmentToItem).mockReturnValue({
    mutateAsync: vi.fn(),
    isPending: false,
  } as unknown as ReturnType<typeof useInventoryModule.useBulkLinkEquipmentToItem>);

  vi.mocked(useInventoryModule.useCompatibilityRulesForItem).mockReturnValue({
    data: rules,
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  } as unknown as ReturnType<typeof useInventoryModule.useCompatibilityRulesForItem>);

  vi.mocked(useInventoryModule.useBulkSetCompatibilityRules).mockReturnValue({
    mutateAsync: mockBulkSetRulesMutateAsync,
    isPending: false,
  } as unknown as ReturnType<typeof useInventoryModule.useBulkSetCompatibilityRules>);

  vi.mocked(useInventoryModule.useEquipmentMatchingItemRules).mockReturnValue({
    data: [],
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  } as unknown as ReturnType<typeof useInventoryModule.useEquipmentMatchingItemRules>);
};

function renderDetail() {
  return render(<InventoryItemDetail />);
}

function expectItemHeading() {
  expect(screen.getByRole('heading', { name: 'Test Part' })).toBeInTheDocument();
}

/** Radix Tabs ignore plain fireEvent.click; userEvent is required for tab activation. */
async function activateTab(name: RegExp) {
  const user = userEvent.setup({ delay: null });
  const tab = screen.getByRole('tab', { name });
  await user.click(tab);
  return tab;
}

describe('InventoryItemDetail - Compatibility Rules', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBulkSetRulesMutateAsync.mockResolvedValue({ rulesSet: 2 });
    setupMocks();
  });

  it('renders heading, tabs, healthy badge, and loads compatibility hooks', () => {
    renderDetail();
    expectItemHeading();
    const tabs = screen.getAllByRole('tab');
    expect(tabs.length).toBeGreaterThanOrEqual(3);
    expect(tabs.some((t) => (t.textContent ?? '').toLowerCase().includes('compatibility'))).toBe(true);
    expect(screen.getAllByText('Healthy').length).toBeGreaterThanOrEqual(1);
    expect(useInventoryModule.useCompatibilityRulesForItem).toHaveBeenCalledWith('org-1', 'item-1');
    expect(useInventoryModule.useBulkSetCompatibilityRules).toHaveBeenCalled();
  });

  it('shows skeleton while loading', () => {
    setupMocks({ itemLoading: true });
    renderDetail();
    const skeletons = document.querySelectorAll('[class*="animate-shimmer"], .bg-muted.rounded-md');
    expect(skeletons.length).toBeGreaterThan(0);
  });
});

describe('InventoryItemDetail - Item Information', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMocks();
  });

  it('displays overview SKU, quantity, location, org-default address, and description', () => {
    renderDetail();
    expect(screen.getByText('TEST-001')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('Location Name')).toBeInTheDocument();
    expect(screen.getByText('Warehouse A')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /use my current location/i })).not.toBeInTheDocument();
    expect(screen.getByText('Organization default')).toBeInTheDocument();
    expect(screen.getByText('Storage address')).toBeInTheDocument();
    expect(screen.getByText('500 Org Default St, Austin, TX, USA')).toBeInTheDocument();
    expect(screen.getByText(/address inherited from organization/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /tap for directions/i })).toBeInTheDocument();
    expect(screen.getByText('Test description')).toBeInTheDocument();
    expect(screen.queryByText('Low stock')).not.toBeInTheDocument();
  });

  it('shows part location source when item has structured storage coordinates', () => {
    vi.mocked(useInventoryModule.useInventoryItem).mockReturnValue({
      data: {
        ...mockItem,
        location_address: '200 Part Bin Ln',
        location_city: 'Dallas',
        location_state: 'TX',
        location_country: 'USA',
        location_lat: 32.77,
        location_lng: -96.79,
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useInventoryModule.useInventoryItem>);

    renderDetail();
    expect(screen.getByText('Part location')).toBeInTheDocument();
    expect(screen.getByText('200 Part Bin Ln, Dallas, TX, USA')).toBeInTheDocument();
  });

  it('shows low stock badge when stock is low', () => {
    vi.mocked(useInventoryModule.useInventoryItem).mockReturnValue({
      data: {
        ...mockItem,
        quantity_on_hand: 5,
        isLowStock: true,
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useInventoryModule.useInventoryItem>);

    renderDetail();
    expect(screen.getAllByText('Low stock').length).toBeGreaterThanOrEqual(1);
  });
});

describe('InventoryItemDetail - Action Buttons', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMocks();
  });

  it('links inventory breadcrumb and opens QR display from the QR button', async () => {
    renderDetail();
    expectItemHeading();
    expect(screen.getByRole('link', { name: /inventory/i })).toHaveAttribute(
      'href',
      '/dashboard/inventory',
    );
    expect(screen.getByText('TEST-001')).toBeInTheDocument();
    expect(screen.getByText('Warehouse A')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /qr/i }));
    expect(await screen.findByTestId('qr-code-display')).toBeInTheDocument();
  });
});

describe('InventoryItemDetail - Quantity Adjustment', () => {
  let mockAdjustMutateAsync: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useIsMobile).mockReturnValue(false);
    mockAdjustMutateAsync = vi.fn().mockResolvedValue({});
    setupMocks();

    vi.mocked(useInventoryModule.useAdjustInventoryQuantity).mockReturnValue({
      mutateAsync: mockAdjustMutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useInventoryModule.useAdjustInventoryQuantity>);
  });

  it('opens adjust dialog when adjust quantity button is clicked', async () => {
    renderDetail();
    expectItemHeading();
    fireEvent.click(screen.getByRole('button', { name: /adjust/i }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('opens adjust bottom sheet on mobile when adjust quantity is clicked', async () => {
    vi.mocked(useIsMobile).mockReturnValue(true);
    renderDetail();
    expectItemHeading();
    fireEvent.click(screen.getByRole('button', { name: /adjust/i }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /adjust quantity/i })).toBeInTheDocument();
  });

  it('resets the adjustment reason when closing with the cancel button', async () => {
    renderDetail();
    expectItemHeading();

    fireEvent.click(screen.getByRole('button', { name: /adjust/i }));
    const reasonInput = await screen.findByRole('textbox', { name: /reason/i });
    fireEvent.change(reasonInput, { target: { value: 'Cycle count follow-up' } });

    fireEvent.click(screen.getByRole('button', { name: /^cancel$/i }));
    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: /adjust quantity/i })).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /adjust/i }));
    expect(await screen.findByRole('textbox', { name: /reason/i })).toHaveValue('');
  });
});

describe('InventoryItemDetail - Tab Navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMocks();
  });

  it('switches tabs and opens the compatibility rules editor', async () => {
    renderDetail();
    expectItemHeading();

    const transactionsTab = await activateTab(/transaction/i);
    expect(transactionsTab).toHaveAttribute('aria-selected', 'true');

    const compatibilityTab = await activateTab(/compatibility/i);
    expect(compatibilityTab).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Compatibility Rules')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /edit rules/i }));
    expect(await screen.findByText('Rules: 2')).toBeInTheDocument();
  });
});

describe('InventoryItemDetail - Delete Functionality', () => {
  let mockDeleteMutateAsync: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDeleteMutateAsync = vi.fn().mockResolvedValue({});
    setupMocks();

    vi.mocked(useInventoryModule.useDeleteInventoryItem).mockReturnValue({
      mutateAsync: mockDeleteMutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useInventoryModule.useDeleteInventoryItem>);
  });

  it('shows delete confirmation dialog when delete button is clicked', async () => {
    renderDetail();
    expectItemHeading();
    fireEvent.click(screen.getByRole('button', { name: /delete/i }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
  });
});

describe('InventoryItemDetail - Transactions Tab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMocks();

    vi.mocked(useInventoryModule.useInventoryTransactions).mockReturnValue({
      data: {
        transactions: [
          {
            id: 'trans-1',
            inventory_item_id: 'item-1',
            transaction_type: 'adjustment',
            quantity_change: 10,
            quantity_after: 110,
            notes: 'Received shipment',
            created_at: '2024-01-15T10:00:00Z',
            created_by: 'user-1',
            user_email: 'test@example.com',
          },
        ],
        totalCount: 1,
        page: 1,
        limit: 20,
        hasMore: false,
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useInventoryModule.useInventoryTransactions>);
  });

  it('displays transactions when navigating to Transactions tab', async () => {
    renderDetail();
    expectItemHeading();
    await activateTab(/transaction/i);
    expect(screen.getByText('Received shipment')).toBeInTheDocument();
  });
});

describe('InventoryItemDetail - Equipment Links', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMocks();

    vi.mocked(useInventoryModule.useEquipmentMatchingItemRules).mockReturnValue({
      data: [
        {
          equipment_id: 'eq-1',
          name: 'Bulldozer 1',
          manufacturer: 'Caterpillar',
          model: 'D6T',
          serial_number: null,
          matched_rule_match_type: 'exact',
          matched_rule_status: 'verified',
        },
        {
          equipment_id: 'eq-2',
          name: 'Excavator 1',
          manufacturer: 'John Deere',
          model: '350G',
          serial_number: null,
          matched_rule_match_type: 'any',
          matched_rule_status: 'unverified',
        },
      ],
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useInventoryModule.useEquipmentMatchingItemRules>);
  });

  it('displays compatible equipment in Compatibility tab', async () => {
    renderDetail();
    expectItemHeading();
    await activateTab(/compatibility/i);
    expect(screen.getByText('Equipment Matched by Rules')).toBeInTheDocument();
    expect(screen.getAllByText('Bulldozer 1').length).toBeGreaterThan(0);
  });
});

describe('InventoryItemDetail - alternateAction query param', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams('alternateAction=add');
    setupMocks();
  });

  afterEach(() => {
    mockSearchParams = new URLSearchParams();
  });

  it('opens Add to Alternate Group dialog when ?alternateAction=add is present', async () => {
    renderDetail();
    expect(screen.getAllByText('Test Part').length).toBeGreaterThan(0);
    await waitFor(() => {
      expect(screen.getAllByText('Add to Alternate Group').length).toBeGreaterThan(0);
    });
  });
});

describe('InventoryItemDetail - No Item Found', () => {
  it('shows error state when item is not found', () => {
    vi.mocked(useInventoryModule.useInventoryItem).mockReturnValue({
      data: null,
      isLoading: false,
      isError: true,
      error: new Error('Item not found'),
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useInventoryModule.useInventoryItem>);

    renderDetail();
    expect(screen.queryByRole('heading', { name: 'Test Part' })).not.toBeInTheDocument();
  });
});
