import React from 'react';
import { render, screen, fireEvent, waitFor } from '@/test/utils/test-utils';
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
      { id: 'eq-1', name: 'Bulldozer 1', manufacturer: 'Caterpillar', model: 'D6T' },
      { id: 'eq-2', name: 'Excavator 1', manufacturer: 'Komatsu', model: 'PC200' }
    ]
  })),
  useEquipmentManufacturersAndModels: vi.fn(() => ({
    data: [
      { manufacturer: 'Caterpillar', models: ['D6T', 'D8T'] },
      { manufacturer: 'John Deere', models: ['450J', '650K'] },
      { manufacturer: 'Komatsu', models: ['PC200', 'PC300'] }
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

// Mock components that are complex to render
vi.mock('@/features/inventory/components/InventoryItemForm', () => ({
  InventoryItemForm: ({ open }: { open: boolean }) => 
    open ? <div data-testid="inventory-item-form">Inventory Form</div> : null
}));

vi.mock('@/features/inventory/components/InventoryQRCodeDisplay', () => ({
  default: ({ open }: { open: boolean }) => 
    open ? <div data-testid="qr-code-display">QR Code</div> : null
}));

vi.mock('@/features/equipment/components/InlineEditField', () => ({
  default: ({ value }: { value: string }) => <span>{value}</span>
}));

// Mock CompatibilityRulesEditor for dialog testing
vi.mock('@/features/inventory/components/CompatibilityRulesEditor', () => ({
  CompatibilityRulesEditor: ({ rules, onChange, disabled }: { 
    rules: Array<{ manufacturer: string; model: string | null }>;
    onChange: (rules: Array<{ manufacturer: string; model: string | null }>) => void;
    disabled?: boolean;
  }) => (
    <div data-testid="compatibility-rules-editor">
      <span data-testid="rules-count">Rules count: {rules.length}</span>
      <button 
        onClick={() => onChange([...rules, { manufacturer: 'New', model: null }])}
        disabled={disabled}
        data-testid="add-test-rule"
      >
        Add Test Rule
      </button>
    </div>
  )
}));

// Mock inventory hooks
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

// Helper to click the compatibility tab and wait for content
const navigateToCompatibilityTab = async () => {
  await waitFor(() => {
    expect(screen.getByText(/compatibility/i, { selector: '[role="tab"]' })).toBeInTheDocument();
  });
  
  const tab = screen.getByText(/compatibility/i, { selector: '[role="tab"]' });
  fireEvent.click(tab);
  
  // Wait for tab content to switch
  await waitFor(() => {
    expect(screen.getByText('Compatibility Rules')).toBeInTheDocument();
  }, { timeout: 3000 });
};

describe('InventoryItemDetail - Compatibility Rules', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBulkSetRulesMutateAsync.mockResolvedValue({ rulesSet: 2 });
    
    // Setup all the mocked hooks
    vi.mocked(useInventoryModule.useInventoryItem).mockReturnValue({
      data: mockItem,
      isLoading: false,
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
      data: [
        { id: 'eq-1', name: 'Bulldozer 1', manufacturer: 'Caterpillar', model: 'D6T' }
      ],
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
      data: mockRules,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn()
    } as unknown as ReturnType<typeof useInventoryModule.useCompatibilityRulesForItem>);
    
    vi.mocked(useInventoryModule.useBulkSetCompatibilityRules).mockReturnValue({
      mutateAsync: mockBulkSetRulesMutateAsync,
      isPending: false
    } as unknown as ReturnType<typeof useInventoryModule.useBulkSetCompatibilityRules>);
  });

  describe('Page Rendering', () => {
    it('renders the inventory item detail page', async () => {
      render(<InventoryItemDetail />);
      
      await waitFor(() => {
        expect(screen.getByText('Test Part')).toBeInTheDocument();
      });
    });

    it('renders the Compatibility tab', async () => {
      render(<InventoryItemDetail />);
      
      await waitFor(() => {
        expect(screen.getByText(/compatibility/i, { selector: '[role="tab"]' })).toBeInTheDocument();
      });
    });
  });

  describe('Compatibility Tab - Rules Display', () => {
    it('shows Compatibility Rules card when tab is clicked', async () => {
      render(<InventoryItemDetail />);
      await navigateToCompatibilityTab();
      
      expect(screen.getByText('Compatibility Rules')).toBeInTheDocument();
    });

    it('displays existing compatibility rules as badges', async () => {
      render(<InventoryItemDetail />);
      await navigateToCompatibilityTab();

      // Rule with specific model
      expect(screen.getByText('Caterpillar - D6T')).toBeInTheDocument();
      // Rule with any model (null)
      expect(screen.getByText('John Deere - All Models')).toBeInTheDocument();
    });

    it('shows Edit Rules button for users with edit permission', async () => {
      render(<InventoryItemDetail />);
      await navigateToCompatibilityTab();

      expect(screen.getByRole('button', { name: /edit rules/i })).toBeInTheDocument();
    });
  });

  describe('Compatibility Tab - Empty State', () => {
    it('shows empty state when no rules exist', async () => {
      vi.mocked(useInventoryModule.useCompatibilityRulesForItem).mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn()
      } as unknown as ReturnType<typeof useInventoryModule.useCompatibilityRulesForItem>);

      render(<InventoryItemDetail />);
      await navigateToCompatibilityTab();

      expect(screen.getByText(/No compatibility rules defined/)).toBeInTheDocument();
    });

    it('shows Add Rules button in empty state', async () => {
      vi.mocked(useInventoryModule.useCompatibilityRulesForItem).mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn()
      } as unknown as ReturnType<typeof useInventoryModule.useCompatibilityRulesForItem>);

      render(<InventoryItemDetail />);
      await navigateToCompatibilityTab();

      expect(screen.getByRole('button', { name: /add rules/i })).toBeInTheDocument();
    });
  });

  describe('Edit Rules Dialog', () => {
    it('opens edit dialog when Edit Rules button is clicked', async () => {
      render(<InventoryItemDetail />);
      await navigateToCompatibilityTab();

      const editButton = screen.getByRole('button', { name: /edit rules/i });
      fireEvent.click(editButton);

      await waitFor(() => {
        expect(screen.getByText('Edit Compatibility Rules')).toBeInTheDocument();
      });
    });

    it('shows CompatibilityRulesEditor in the dialog', async () => {
      render(<InventoryItemDetail />);
      await navigateToCompatibilityTab();

      const editButton = screen.getByRole('button', { name: /edit rules/i });
      fireEvent.click(editButton);

      await waitFor(() => {
        expect(screen.getByTestId('compatibility-rules-editor')).toBeInTheDocument();
      });
    });

    it('initializes dialog with current rules', async () => {
      render(<InventoryItemDetail />);
      await navigateToCompatibilityTab();

      const editButton = screen.getByRole('button', { name: /edit rules/i });
      fireEvent.click(editButton);

      await waitFor(() => {
        expect(screen.getByTestId('rules-count')).toHaveTextContent('Rules count: 2');
      });
    });

    it('has Cancel and Save buttons in dialog', async () => {
      render(<InventoryItemDetail />);
      await navigateToCompatibilityTab();

      const editButton = screen.getByRole('button', { name: /edit rules/i });
      fireEvent.click(editButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /save rules/i })).toBeInTheDocument();
      });
    });

    it('closes dialog when Cancel is clicked', async () => {
      render(<InventoryItemDetail />);
      await navigateToCompatibilityTab();

      const editButton = screen.getByRole('button', { name: /edit rules/i });
      fireEvent.click(editButton);

      await waitFor(() => {
        expect(screen.getByText('Edit Compatibility Rules')).toBeInTheDocument();
      });

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByText('Edit Compatibility Rules')).not.toBeInTheDocument();
      });
    });

    it('calls mutation when Save is clicked', async () => {
      render(<InventoryItemDetail />);
      await navigateToCompatibilityTab();

      const editButton = screen.getByRole('button', { name: /edit rules/i });
      fireEvent.click(editButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /save rules/i })).toBeInTheDocument();
      });

      const saveButton = screen.getByRole('button', { name: /save rules/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockBulkSetRulesMutateAsync).toHaveBeenCalledWith({
          organizationId: 'org-1',
          itemId: 'item-1',
          rules: expect.any(Array)
        });
      });
    });
  });

  describe('Compatibility Tab - Equipment Section', () => {
    it('shows Compatible Equipment section', async () => {
      render(<InventoryItemDetail />);
      await navigateToCompatibilityTab();

      expect(screen.getByText('Compatible Equipment')).toBeInTheDocument();
    });

    it('displays linked equipment', async () => {
      render(<InventoryItemDetail />);
      await navigateToCompatibilityTab();

      expect(screen.getByText('Bulldozer 1')).toBeInTheDocument();
    });
  });
});
