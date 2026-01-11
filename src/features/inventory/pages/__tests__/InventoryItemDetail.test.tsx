import React from 'react';
import { render, screen, waitFor } from '@/test/utils/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import InventoryItemDetail from '../InventoryItemDetail';
import type { InventoryItem, PartCompatibilityRule } from '@/features/inventory/types/inventory';
import * as useInventoryModule from '@/features/inventory/hooks/useInventory';

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ itemId: 'item-1' }),
    useNavigate: () => mockNavigate
  };
});

// Mock contexts
vi.mock('@/contexts/OrganizationContext', () => ({
  useOrganization: vi.fn(() => ({
    currentOrganization: { id: 'org-1', name: 'Test Org' }
  }))
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'user-1', email: 'test@example.com' }
  }))
}));

vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: vi.fn(() => ({
    canCreateEquipment: () => true
  }))
}));

vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: vi.fn(() => false)
}));

// Mock equipment hooks
vi.mock('@/features/equipment/hooks/useEquipment', () => ({
  useEquipment: vi.fn(() => ({
    data: [
      { id: 'eq-1', name: 'Bulldozer 1', manufacturer: 'Caterpillar', model: 'D6T' }
    ]
  })),
  useEquipmentManufacturersAndModels: vi.fn(() => ({
    data: [
      { manufacturer: 'Caterpillar', models: ['D6T', 'D8T'] }
    ],
    isLoading: false
  }))
}));

// Mock organization hooks
vi.mock('@/features/organization/hooks/useOrganizationMembers', () => ({
  useOrganizationMembers: vi.fn(() => ({
    data: []
  }))
}));

// Mock components
vi.mock('@/features/inventory/components/InventoryItemForm', () => ({
  InventoryItemForm: ({ open }: { open: boolean }) => 
    open ? <div data-testid="inventory-item-form">Inventory Form</div> : null
}));

vi.mock('@/features/inventory/components/InventoryQRCodeDisplay', () => ({
  default: ({ open }: { open: boolean }) => 
    open ? <div data-testid="qr-code-display">QR Code</div> : null
}));

vi.mock('@/features/equipment/components/InlineEditField', () => ({
  default: ({ value }: { value: string }) => <span>{value || 'N/A'}</span>
}));

vi.mock('@/features/inventory/components/CompatibilityRulesEditor', () => ({
  CompatibilityRulesEditor: ({ rules }: { rules: Array<{ manufacturer: string; model: string | null }> }) => (
    <div data-testid="compatibility-rules-editor">
      <span data-testid="rules-count">Rules: {rules.length}</span>
    </div>
  )
}));

// Mock data
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
  default_unit_cost: '25.00',
  image_url: null,
  isLowStock: false,
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
  created_by: 'user-1'
};

const mockRules: PartCompatibilityRule[] = [
  { id: 'rule-1', inventory_item_id: 'item-1', manufacturer: 'Caterpillar', model: 'D6T', manufacturer_norm: 'caterpillar', model_norm: 'd6t', created_at: '2024-01-01' },
  { id: 'rule-2', inventory_item_id: 'item-1', manufacturer: 'John Deere', model: null, manufacturer_norm: 'john deere', model_norm: null, created_at: '2024-01-01' }
];

const mockBulkSetRulesMutateAsync = vi.fn();

vi.mock('@/features/inventory/hooks/useInventory', () => ({
  useInventoryItem: vi.fn(),
  useInventoryTransactions: vi.fn(),
  useInventoryItemManagers: vi.fn(),
  useDeleteInventoryItem: vi.fn(),
  useAdjustInventoryQuantity: vi.fn(),
  useUpdateInventoryItem: vi.fn(),
  useUnlinkItemFromEquipment: vi.fn(),
  useCompatibleEquipmentForItem: vi.fn(),
  useAssignInventoryManagers: vi.fn(),
  useBulkLinkEquipmentToItem: vi.fn(),
  useCompatibilityRulesForItem: vi.fn(),
  useBulkSetCompatibilityRules: vi.fn()
}));

const setupMocks = (options: { rules?: PartCompatibilityRule[]; itemLoading?: boolean } = {}) => {
  const rules = options.rules ?? mockRules;
  const itemLoading = options.itemLoading ?? false;
  
  vi.mocked(useInventoryModule.useInventoryItem).mockReturnValue({
    data: itemLoading ? null : mockItem,
    isLoading: itemLoading,
    isError: false,
    error: null,
    refetch: vi.fn()
  } as unknown as ReturnType<typeof useInventoryModule.useInventoryItem>);
  
  vi.mocked(useInventoryModule.useInventoryTransactions).mockReturnValue({
    data: { transactions: [], totalCount: 0, page: 1, limit: 20, hasMore: false },
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn()
  } as unknown as ReturnType<typeof useInventoryModule.useInventoryTransactions>);
  
  vi.mocked(useInventoryModule.useInventoryItemManagers).mockReturnValue({
    data: [],
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn()
  } as unknown as ReturnType<typeof useInventoryModule.useInventoryItemManagers>);
  
  vi.mocked(useInventoryModule.useDeleteInventoryItem).mockReturnValue({
    mutateAsync: vi.fn(),
    isPending: false
  } as unknown as ReturnType<typeof useInventoryModule.useDeleteInventoryItem>);
  
  vi.mocked(useInventoryModule.useAdjustInventoryQuantity).mockReturnValue({
    mutateAsync: vi.fn(),
    isPending: false
  } as unknown as ReturnType<typeof useInventoryModule.useAdjustInventoryQuantity>);
  
  vi.mocked(useInventoryModule.useUpdateInventoryItem).mockReturnValue({
    mutateAsync: vi.fn(),
    isPending: false
  } as unknown as ReturnType<typeof useInventoryModule.useUpdateInventoryItem>);
  
  vi.mocked(useInventoryModule.useUnlinkItemFromEquipment).mockReturnValue({
    mutateAsync: vi.fn(),
    isPending: false
  } as unknown as ReturnType<typeof useInventoryModule.useUnlinkItemFromEquipment>);
  
  vi.mocked(useInventoryModule.useCompatibleEquipmentForItem).mockReturnValue({
    data: [{ id: 'eq-1', name: 'Bulldozer 1', manufacturer: 'Caterpillar', model: 'D6T' }],
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn()
  } as unknown as ReturnType<typeof useInventoryModule.useCompatibleEquipmentForItem>);
  
  vi.mocked(useInventoryModule.useAssignInventoryManagers).mockReturnValue({
    mutateAsync: vi.fn(),
    isPending: false
  } as unknown as ReturnType<typeof useInventoryModule.useAssignInventoryManagers>);
  
  vi.mocked(useInventoryModule.useBulkLinkEquipmentToItem).mockReturnValue({
    mutateAsync: vi.fn(),
    isPending: false
  } as unknown as ReturnType<typeof useInventoryModule.useBulkLinkEquipmentToItem>);
  
  vi.mocked(useInventoryModule.useCompatibilityRulesForItem).mockReturnValue({
    data: rules,
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn()
  } as unknown as ReturnType<typeof useInventoryModule.useCompatibilityRulesForItem>);
  
  vi.mocked(useInventoryModule.useBulkSetCompatibilityRules).mockReturnValue({
    mutateAsync: mockBulkSetRulesMutateAsync,
    isPending: false
  } as unknown as ReturnType<typeof useInventoryModule.useBulkSetCompatibilityRules>);
};

describe('InventoryItemDetail - Compatibility Rules', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBulkSetRulesMutateAsync.mockResolvedValue({ rulesSet: 2 });
    setupMocks();
  });

  describe('Page Rendering', () => {
    it('renders the inventory item with item name in heading', async () => {
      render(<InventoryItemDetail />);
      
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Test Part' })).toBeInTheDocument();
      });
    });

    it('renders all tab triggers including Compatibility', async () => {
      render(<InventoryItemDetail />);
      
      await waitFor(() => {
        const tabs = screen.getAllByRole('tab');
        expect(tabs.length).toBeGreaterThanOrEqual(4); // Overview, Transactions, Compatibility, Managers
        
        const tabTexts = tabs.map(t => t.textContent?.toLowerCase() || '');
        expect(tabTexts.some(t => t.includes('compatibility'))).toBe(true);
      });
    });
  });

  describe('Hooks Usage', () => {
    it('calls useCompatibilityRulesForItem hook with correct params', async () => {
      render(<InventoryItemDetail />);
      
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Test Part' })).toBeInTheDocument();
      });
      
      expect(useInventoryModule.useCompatibilityRulesForItem).toHaveBeenCalledWith(
        'org-1',
        'item-1'
      );
    });

    it('calls useBulkSetCompatibilityRules hook', async () => {
      render(<InventoryItemDetail />);
      
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Test Part' })).toBeInTheDocument();
      });
      
      expect(useInventoryModule.useBulkSetCompatibilityRules).toHaveBeenCalled();
    });
  });

  describe('Loading State', () => {
    it('shows skeleton while loading', async () => {
      setupMocks({ itemLoading: true });
      
      render(<InventoryItemDetail />);
      
      await waitFor(() => {
        const skeletons = document.querySelectorAll('.animate-pulse');
        expect(skeletons.length).toBeGreaterThan(0);
      });
    });
  });
});
