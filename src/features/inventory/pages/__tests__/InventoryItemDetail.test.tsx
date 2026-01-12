import React from 'react';
import { render, screen, waitFor } from '@/test/utils/test-utils';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import InventoryItemDetail from '../InventoryItemDetail';

// Helper to setup userEvent
const renderWithUser = (ui: React.ReactElement) => {
  return {
    user: userEvent.setup(),
    ...render(ui)
  };
};
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
    canCreateEquipment: () => true,
    canManageInventory: () => true
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
  useDeleteInventoryItem: vi.fn(),
  useAdjustInventoryQuantity: vi.fn(),
  useUpdateInventoryItem: vi.fn(),
  useUnlinkItemFromEquipment: vi.fn(),
  useCompatibleEquipmentForItem: vi.fn(),
  useBulkLinkEquipmentToItem: vi.fn(),
  useCompatibilityRulesForItem: vi.fn(),
  useBulkSetCompatibilityRules: vi.fn(),
  useEquipmentMatchingItemRules: vi.fn()
}));

vi.mock('@/features/inventory/hooks/usePartsManagers', () => ({
  useIsPartsManager: vi.fn(() => ({ data: false, isLoading: false }))
}));

vi.mock('@/features/inventory/hooks/useAlternateGroups', () => ({
  useAlternateGroups: vi.fn(() => ({ data: [], isLoading: false })),
  useCreateAlternateGroup: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useAddInventoryItemToGroup: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false }))
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
  
  vi.mocked(useInventoryModule.useEquipmentMatchingItemRules).mockReturnValue({
    data: [],
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn()
  } as unknown as ReturnType<typeof useInventoryModule.useEquipmentMatchingItemRules>);
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
        expect(tabs.length).toBeGreaterThanOrEqual(3); // Overview, Transactions, Compatibility
        
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

describe('InventoryItemDetail - Item Information', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMocks();
  });

  describe('Overview Tab', () => {
    it('displays item SKU', async () => {
      render(<InventoryItemDetail />);
      
      await waitFor(() => {
        expect(screen.getByText('TEST-001')).toBeInTheDocument();
      });
    });

    it('displays quantity on hand', async () => {
      render(<InventoryItemDetail />);
      
      await waitFor(() => {
        expect(screen.getByText('100')).toBeInTheDocument();
      });
    });

    it('displays location', async () => {
      render(<InventoryItemDetail />);
      
      await waitFor(() => {
        expect(screen.getByText('Warehouse A')).toBeInTheDocument();
      });
    });

    it('displays description', async () => {
      render(<InventoryItemDetail />);
      
      await waitFor(() => {
        expect(screen.getByText('Test description')).toBeInTheDocument();
      });
    });
  });

  describe('Low Stock Indicator', () => {
    it('does not show low stock badge when stock is sufficient', async () => {
      render(<InventoryItemDetail />);
      
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Test Part' })).toBeInTheDocument();
      });
      
      // "Low Stock" badge should not be visible
      expect(screen.queryByText('Low Stock')).not.toBeInTheDocument();
    });

    it('shows low stock badge when stock is low', async () => {
      const lowStockItem = {
        ...mockItem,
        quantity_on_hand: 5,
        isLowStock: true
      };
      
      vi.mocked(useInventoryModule.useInventoryItem).mockReturnValue({
        data: lowStockItem,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn()
      } as unknown as ReturnType<typeof useInventoryModule.useInventoryItem>);
      
      render(<InventoryItemDetail />);
      
      await waitFor(() => {
        expect(screen.getByText('Low Stock')).toBeInTheDocument();
      });
    });
  });
});

describe('InventoryItemDetail - Action Buttons', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMocks();
  });

  describe('Back Button', () => {
    it('navigates back to inventory list when back button is clicked', async () => {
      const { user } = renderWithUser(<InventoryItemDetail />);
      
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Test Part' })).toBeInTheDocument();
      });
      
      // Find back button - it's the button with ArrowLeft icon
      const backButton = screen.getByRole('button', { name: /back/i });
      if (backButton) {
        await user.click(backButton);
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard/inventory');
      }
    });
  });

  describe('QR Code Button', () => {
    it('shows QR code display when QR button is clicked', async () => {
      const { user } = renderWithUser(<InventoryItemDetail />);
      
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Test Part' })).toBeInTheDocument();
      });
      
      const qrButton = screen.getByRole('button', { name: /qr/i });
      if (qrButton) {
        await user.click(qrButton);
        
        await waitFor(() => {
          expect(screen.getByTestId('qr-code-display')).toBeInTheDocument();
        });
      }
    });
  });

  describe('Edit Button', () => {
    it('shows edit form when edit button is clicked', async () => {
      const { user } = renderWithUser(<InventoryItemDetail />);
      
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Test Part' })).toBeInTheDocument();
      });
      
      const editButton = screen.getByRole('button', { name: /edit/i });
      if (editButton) {
        await user.click(editButton);
        
        await waitFor(() => {
          expect(screen.getByTestId('inventory-item-form')).toBeInTheDocument();
        });
      }
    });
  });
});

describe('InventoryItemDetail - Quantity Adjustment', () => {
  let mockAdjustMutateAsync: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAdjustMutateAsync = vi.fn().mockResolvedValue({});
    setupMocks();
    
    vi.mocked(useInventoryModule.useAdjustInventoryQuantity).mockReturnValue({
      mutateAsync: mockAdjustMutateAsync,
      isPending: false
    } as unknown as ReturnType<typeof useInventoryModule.useAdjustInventoryQuantity>);
  });

  it('opens adjust dialog when adjust quantity button is clicked', async () => {
    const { user } = renderWithUser(<InventoryItemDetail />);
    
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Test Part' })).toBeInTheDocument();
    });
    
    const adjustButton = screen.getByRole('button', { name: /adjust/i });
    if (adjustButton) {
      await user.click(adjustButton);
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    }
  });
});

describe('InventoryItemDetail - Tab Navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMocks();
  });

  it('switches to Transactions tab when clicked', async () => {
    const { user } = renderWithUser(<InventoryItemDetail />);
    
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Test Part' })).toBeInTheDocument();
    });
    
    const transactionsTab = screen.getByRole('tab', { name: /transaction/i });
    await user.click(transactionsTab);
    
    expect(transactionsTab).toHaveAttribute('aria-selected', 'true');
  });

  it('switches to Compatibility tab when clicked', async () => {
    const { user } = renderWithUser(<InventoryItemDetail />);
    
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Test Part' })).toBeInTheDocument();
    });
    
    const compatibilityTab = screen.getByRole('tab', { name: /compatibility/i });
    await user.click(compatibilityTab);
    
    expect(compatibilityTab).toHaveAttribute('aria-selected', 'true');
  });

  it('shows compatibility rules editor in Compatibility tab', async () => {
    const { user } = renderWithUser(<InventoryItemDetail />);
    
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Test Part' })).toBeInTheDocument();
    });
    
    const compatibilityTab = screen.getByRole('tab', { name: /compatibility/i });
    await user.click(compatibilityTab);
    
    await waitFor(() => {
      expect(screen.getByTestId('compatibility-rules-editor')).toBeInTheDocument();
      expect(screen.getByTestId('rules-count')).toHaveTextContent('Rules: 2');
    });
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
      isPending: false
    } as unknown as ReturnType<typeof useInventoryModule.useDeleteInventoryItem>);
  });

  it('shows delete confirmation dialog when delete button is clicked', async () => {
    const { user } = renderWithUser(<InventoryItemDetail />);
    
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Test Part' })).toBeInTheDocument();
    });
    
    const deleteButton = screen.getByRole('button', { name: /delete/i });
    if (deleteButton) {
      await user.click(deleteButton);
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
      });
    }
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
            user_email: 'test@example.com'
          }
        ],
        totalCount: 1,
        page: 1,
        limit: 20,
        hasMore: false
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn()
    } as unknown as ReturnType<typeof useInventoryModule.useInventoryTransactions>);
  });

  it('displays transactions when navigating to Transactions tab', async () => {
    const { user } = renderWithUser(<InventoryItemDetail />);
    
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Test Part' })).toBeInTheDocument();
    });
    
    const transactionsTab = screen.getByRole('tab', { name: /transaction/i });
    await user.click(transactionsTab);
    
    await waitFor(() => {
      expect(screen.getByText('Received shipment')).toBeInTheDocument();
    });
  });
});

describe('InventoryItemDetail - Equipment Links', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMocks();
    
    vi.mocked(useInventoryModule.useEquipmentMatchingItemRules).mockReturnValue({
      data: [
        { id: 'eq-1', name: 'Bulldozer 1', manufacturer: 'Caterpillar', model: 'D6T' },
        { id: 'eq-2', name: 'Excavator 1', manufacturer: 'John Deere', model: '350G' }
      ],
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn()
    } as unknown as ReturnType<typeof useInventoryModule.useEquipmentMatchingItemRules>);
  });

  it('displays compatible equipment in Compatibility tab', async () => {
    const { user } = renderWithUser(<InventoryItemDetail />);
    
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Test Part' })).toBeInTheDocument();
    });
    
    const compatibilityTab = screen.getByRole('tab', { name: /compatibility/i });
    await user.click(compatibilityTab);
    
    await waitFor(() => {
      expect(screen.getByText('Bulldozer 1')).toBeInTheDocument();
    });
  });
});

describe('InventoryItemDetail - No Item Found', () => {
  it('shows error state when item is not found', async () => {
    vi.mocked(useInventoryModule.useInventoryItem).mockReturnValue({
      data: null,
      isLoading: false,
      isError: true,
      error: new Error('Item not found'),
      refetch: vi.fn()
    } as unknown as ReturnType<typeof useInventoryModule.useInventoryItem>);
    
    render(<InventoryItemDetail />);
    
    await waitFor(() => {
      // Should not show the item heading since item is null
      expect(screen.queryByRole('heading', { name: 'Test Part' })).not.toBeInTheDocument();
    });
  });
});
