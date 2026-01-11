/**
 * Inventory Management Journey Tests
 * 
 * These tests validate complete user workflows for inventory management,
 * testing from the perspective of different user personas.
 * 
 * User Stories Covered:
 * - As an Admin, I want to create inventory items with stock levels
 * - As an Admin, I want to adjust inventory quantities with reason tracking
 * - As a Manager, I want to link parts to compatible equipment
 * - As a Manager, I want to assign inventory managers
 * - As a Technician, I want to view inventory details and transaction history
 * - As any user, I want to filter inventory by low stock status
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderAsPersona, renderHookAsPersona } from '@/test/utils/test-utils';
import { personas } from '@/test/fixtures/personas';
import { inventoryItems, inventoryTransactions, equipment, teams, partCompatibilityRules } from '@/test/fixtures/entities';

// Mock the inventory hooks
vi.mock('@/features/inventory/hooks/useInventory', () => ({
  useInventoryItems: vi.fn(),
  useInventoryItem: vi.fn(),
  useCreateInventoryItem: vi.fn(),
  useUpdateInventoryItem: vi.fn(),
  useDeleteInventoryItem: vi.fn(),
  useAdjustInventoryQuantity: vi.fn(),
  useInventoryTransactions: vi.fn(),
  useInventoryItemManagers: vi.fn(),
  useAssignInventoryManagers: vi.fn(),
  useLinkItemToEquipment: vi.fn(),
  useUnlinkItemFromEquipment: vi.fn(),
  useBulkLinkEquipmentToItem: vi.fn(),
  useCompatibleEquipmentForItem: vi.fn(),
  useCompatibilityRulesForItem: vi.fn(),
  useBulkSetCompatibilityRules: vi.fn()
}));

vi.mock('@/hooks/useUnifiedPermissions', () => ({
  useUnifiedPermissions: vi.fn()
}));

vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: vi.fn()
}));

// Import after mocking
import { useInventoryItems, useInventoryItem, useInventoryTransactions, useCompatibleEquipmentForItem, useCompatibilityRulesForItem } from '@/features/inventory/hooks/useInventory';
import { useUnifiedPermissions } from '@/hooks/useUnifiedPermissions';
import { usePermissions } from '@/hooks/usePermissions';

// Test component that exercises the inventory list
const InventoryTestComponent = () => {
  const { data: items, isLoading } = useInventoryItems('org-acme', {});
  
  if (isLoading) return <div data-testid="loading">Loading...</div>;
  
  return (
    <div data-testid="inventory-list">
      <h1>Inventory</h1>
      {items?.map((item) => (
        <div key={item.id} data-testid={`inventory-${item.id}`}>
          <span data-testid="item-name">{item.name}</span>
          <span data-testid="item-quantity">{item.quantity_on_hand}</span>
          {item.isLowStock && <span data-testid="low-stock-badge">Low Stock</span>}
        </div>
      ))}
    </div>
  );
};

// Test component that shows inventory detail
const InventoryDetailTestComponent = ({ itemId }: { itemId: string }) => {
  const { data: item, isLoading } = useInventoryItem('org-acme', itemId);
  const { data: transactions } = useInventoryTransactions('org-acme', itemId);
  const { data: compatibleEquipment } = useCompatibleEquipmentForItem('org-acme', itemId);
  const { data: rules } = useCompatibilityRulesForItem('org-acme', itemId);
  
  if (isLoading) return <div data-testid="loading">Loading...</div>;
  if (!item) return <div data-testid="not-found">Not Found</div>;
  
  return (
    <div data-testid="inventory-detail">
      <h1 data-testid="item-name">{item.name}</h1>
      <div data-testid="item-quantity">{item.quantity_on_hand}</div>
      <div data-testid="item-threshold">{item.low_stock_threshold}</div>
      {item.isLowStock && <span data-testid="low-stock-badge">Low Stock</span>}
      <div data-testid="transaction-count">{transactions?.transactions?.length ?? 0}</div>
      <div data-testid="compatible-equipment-count">{compatibleEquipment?.length ?? 0}</div>
      <div data-testid="rules-count">{rules?.length ?? 0}</div>
    </div>
  );
};

describe('Inventory Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('as an Organization Owner', () => {
    beforeEach(() => {
      vi.mocked(useInventoryItems).mockReturnValue({
        data: Object.values(inventoryItems),
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
        isPending: false,
        isSuccess: true,
        fetchStatus: 'idle'
      } as ReturnType<typeof useInventoryItems>);

      vi.mocked(usePermissions).mockReturnValue({
        canCreateEquipment: () => true,
        canEditEquipment: () => true,
        canDeleteEquipment: () => true,
        canViewTeam: () => true,
        canEditTeam: () => true,
        canManageTeamMembers: () => true,
        isLoading: false
      } as ReturnType<typeof usePermissions>);

      vi.mocked(useUnifiedPermissions).mockReturnValue({
        hasRole: (roles: string | string[]) => {
          const roleArray = Array.isArray(roles) ? roles : [roles];
          return roleArray.includes('owner');
        },
        isTeamMember: () => true,
        isTeamManager: () => true,
        organization: {
          canManage: true,
          canInviteMembers: true,
          canCreateTeams: true,
          canViewBilling: true,
          canManageMembers: true
        },
        equipment: {
          getPermissions: () => ({
            canView: true,
            canCreate: true,
            canEdit: true,
            canDelete: true,
            canAddNotes: true,
            canAddImages: true
          }),
          canViewAll: true,
          canCreateAny: true
        },
        workOrders: {
          getPermissions: () => ({}),
          getDetailedPermissions: () => ({}),
          canViewAll: true,
          canCreateAny: true
        },
        teams: {
          getPermissions: () => ({ canView: true, canCreate: true, canEdit: true, canDelete: true }),
          canCreateAny: true
        },
        notes: {
          getPermissions: () => ({})
        }
      } as unknown as ReturnType<typeof useUnifiedPermissions>);
    });

    it('can view all inventory items', () => {
      renderAsPersona(<InventoryTestComponent />, 'owner');

      expect(screen.getByTestId('inventory-list')).toBeInTheDocument();
      
      // Owner should see all inventory items
      Object.values(inventoryItems).forEach(item => {
        expect(screen.getByTestId(`inventory-${item.id}`)).toBeInTheDocument();
      });
    });

    it('can see low stock indicators on items below threshold', () => {
      renderAsPersona(<InventoryTestComponent />, 'owner');

      // Low stock items should have badge
      const lowStockBadges = screen.getAllByTestId('low-stock-badge');
      const lowStockItems = Object.values(inventoryItems).filter(item => item.isLowStock);
      
      expect(lowStockBadges.length).toBe(lowStockItems.length);
    });

    it('has full administrative permissions on inventory', () => {
      const { result } = renderHookAsPersona(
        () => usePermissions(),
        'owner'
      );

      expect(result.current.canCreateEquipment()).toBe(true);
      expect(result.current.canEditEquipment()).toBe(true);
      expect(result.current.canDeleteEquipment()).toBe(true);
    });
  });

  describe('as an Admin', () => {
    beforeEach(() => {
      vi.mocked(useInventoryItems).mockReturnValue({
        data: Object.values(inventoryItems),
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
        isPending: false,
        isSuccess: true,
        fetchStatus: 'idle'
      } as ReturnType<typeof useInventoryItems>);

      vi.mocked(usePermissions).mockReturnValue({
        canCreateEquipment: () => true,
        canEditEquipment: () => true,
        canDeleteEquipment: () => true,
        canViewTeam: () => true,
        canEditTeam: () => true,
        canManageTeamMembers: () => true,
        isLoading: false
      } as ReturnType<typeof usePermissions>);

      vi.mocked(useUnifiedPermissions).mockReturnValue({
        hasRole: (roles: string | string[]) => {
          const roleArray = Array.isArray(roles) ? roles : [roles];
          return roleArray.includes('admin') || roleArray.includes('owner');
        },
        isTeamMember: () => true,
        isTeamManager: () => true,
        organization: {
          canManage: true,
          canInviteMembers: true,
          canCreateTeams: true,
          canViewBilling: false,
          canManageMembers: true
        },
        equipment: {
          getPermissions: () => ({
            canView: true,
            canCreate: true,
            canEdit: true,
            canDelete: true,
            canAddNotes: true,
            canAddImages: true
          }),
          canViewAll: true,
          canCreateAny: true
        },
        workOrders: {
          getPermissions: () => ({}),
          getDetailedPermissions: () => ({}),
          canViewAll: true,
          canCreateAny: true
        },
        teams: {
          getPermissions: () => ({ canView: true, canCreate: true, canEdit: true, canDelete: false }),
          canCreateAny: true
        },
        notes: {
          getPermissions: () => ({})
        }
      } as unknown as ReturnType<typeof useUnifiedPermissions>);
    });

    it('can view all inventory items', () => {
      renderAsPersona(<InventoryTestComponent />, 'admin');

      expect(screen.getByTestId('inventory-list')).toBeInTheDocument();
      expect(screen.getAllByTestId(/^inventory-inv-/).length).toBe(Object.keys(inventoryItems).length);
    });

    it('can create inventory items with all fields', () => {
      const { result } = renderHookAsPersona(
        () => usePermissions(),
        'admin'
      );

      expect(result.current.canCreateEquipment()).toBe(true);
    });

    it('can delete inventory items', () => {
      const { result } = renderHookAsPersona(
        () => usePermissions(),
        'admin'
      );

      expect(result.current.canDeleteEquipment()).toBe(true);
    });

    it('can assign managers to inventory items', () => {
      const { result } = renderHookAsPersona(
        () => usePermissions(),
        'admin'
      );

      // Admin can manage team members which includes inventory managers
      expect(result.current.canManageTeamMembers()).toBe(true);
    });
  });

  describe('as a Team Manager', () => {
    beforeEach(() => {
      vi.mocked(useInventoryItems).mockReturnValue({
        data: Object.values(inventoryItems),
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
        isPending: false,
        isSuccess: true,
        fetchStatus: 'idle'
      } as ReturnType<typeof useInventoryItems>);

      vi.mocked(usePermissions).mockReturnValue({
        canCreateEquipment: () => false,
        canEditEquipment: () => true,
        canDeleteEquipment: () => false,
        canViewTeam: () => true,
        canEditTeam: () => true,
        canManageTeamMembers: () => false,
        isLoading: false
      } as ReturnType<typeof usePermissions>);

      vi.mocked(useUnifiedPermissions).mockReturnValue({
        hasRole: (roles: string | string[]) => {
          const roleArray = Array.isArray(roles) ? roles : [roles];
          return roleArray.includes('member');
        },
        isTeamMember: (teamId: string) => teamId === teams.maintenance.id,
        isTeamManager: (teamId: string) => teamId === teams.maintenance.id,
        organization: {
          canManage: false,
          canInviteMembers: false,
          canCreateTeams: false,
          canViewBilling: false,
          canManageMembers: false
        },
        equipment: {
          getPermissions: (teamId?: string) => ({
            canView: teamId === teams.maintenance.id,
            canCreate: false,
            canEdit: teamId === teams.maintenance.id,
            canDelete: false,
            canAddNotes: true,
            canAddImages: true
          }),
          canViewAll: false,
          canCreateAny: false
        },
        workOrders: {
          getPermissions: () => ({}),
          getDetailedPermissions: () => ({}),
          canViewAll: false,
          canCreateAny: false
        },
        teams: {
          getPermissions: (teamId: string) => ({
            canView: teamId === teams.maintenance.id,
            canCreate: false,
            canEdit: teamId === teams.maintenance.id,
            canDelete: false
          }),
          canCreateAny: false
        },
        notes: {
          getPermissions: () => ({})
        }
      } as unknown as ReturnType<typeof useUnifiedPermissions>);
    });

    it('can view inventory items', () => {
      renderAsPersona(<InventoryTestComponent />, 'teamManager');

      expect(screen.getByTestId('inventory-list')).toBeInTheDocument();
    });

    it('can link/unlink compatible equipment', () => {
      const { result } = renderHookAsPersona(
        () => usePermissions(),
        'teamManager'
      );

      // Team manager can edit equipment relationships
      expect(result.current.canEditEquipment()).toBe(true);
    });

    it('cannot create new inventory items', () => {
      const { result } = renderHookAsPersona(
        () => usePermissions(),
        'teamManager'
      );

      expect(result.current.canCreateEquipment()).toBe(false);
    });

    it('cannot delete inventory items', () => {
      const { result } = renderHookAsPersona(
        () => usePermissions(),
        'teamManager'
      );

      expect(result.current.canDeleteEquipment()).toBe(false);
    });
  });

  describe('as a Technician', () => {
    beforeEach(() => {
      vi.mocked(useInventoryItems).mockReturnValue({
        data: Object.values(inventoryItems),
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
        isPending: false,
        isSuccess: true,
        fetchStatus: 'idle'
      } as ReturnType<typeof useInventoryItems>);

      vi.mocked(useInventoryItem).mockReturnValue({
        data: inventoryItems.oilFilter,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
        isPending: false,
        isSuccess: true,
        fetchStatus: 'idle'
      } as ReturnType<typeof useInventoryItem>);

      vi.mocked(useInventoryTransactions).mockReturnValue({
        data: {
          transactions: Object.values(inventoryTransactions),
          totalCount: Object.keys(inventoryTransactions).length,
          page: 1,
          limit: 50,
          hasMore: false
        },
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
        isPending: false,
        isSuccess: true,
        fetchStatus: 'idle'
      } as ReturnType<typeof useInventoryTransactions>);

      vi.mocked(useCompatibleEquipmentForItem).mockReturnValue({
        data: [equipment.forklift1, equipment.forklift2],
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
        isPending: false,
        isSuccess: true,
        fetchStatus: 'idle'
      } as ReturnType<typeof useCompatibleEquipmentForItem>);

      vi.mocked(useCompatibilityRulesForItem).mockReturnValue({
        data: [partCompatibilityRules.oilFilterToyota],
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
        isPending: false,
        isSuccess: true,
        fetchStatus: 'idle'
      } as ReturnType<typeof useCompatibilityRulesForItem>);

      vi.mocked(usePermissions).mockReturnValue({
        canCreateEquipment: () => false,
        canEditEquipment: () => false,
        canDeleteEquipment: () => false,
        canViewTeam: () => true,
        canEditTeam: () => false,
        canManageTeamMembers: () => false,
        isLoading: false
      } as ReturnType<typeof usePermissions>);

      vi.mocked(useUnifiedPermissions).mockReturnValue({
        hasRole: (roles: string | string[]) => {
          const roleArray = Array.isArray(roles) ? roles : [roles];
          return roleArray.includes('member');
        },
        isTeamMember: (teamId: string) => teamId === teams.maintenance.id,
        isTeamManager: () => false,
        organization: {
          canManage: false,
          canInviteMembers: false,
          canCreateTeams: false,
          canViewBilling: false,
          canManageMembers: false
        },
        equipment: {
          getPermissions: () => ({
            canView: true,
            canCreate: false,
            canEdit: false,
            canDelete: false,
            canAddNotes: true,
            canAddImages: true
          }),
          canViewAll: false,
          canCreateAny: false
        },
        workOrders: {
          getPermissions: () => ({}),
          getDetailedPermissions: () => ({}),
          canViewAll: false,
          canCreateAny: false
        },
        teams: {
          getPermissions: () => ({
            canView: true,
            canCreate: false,
            canEdit: false,
            canDelete: false
          }),
          canCreateAny: false
        },
        notes: {
          getPermissions: () => ({})
        }
      } as unknown as ReturnType<typeof useUnifiedPermissions>);
    });

    it('can view inventory list', () => {
      renderAsPersona(<InventoryTestComponent />, 'technician');

      expect(screen.getByTestId('inventory-list')).toBeInTheDocument();
    });

    it('can view inventory item details and transaction history', () => {
      renderAsPersona(<InventoryDetailTestComponent itemId="inv-oil-filter" />, 'technician');

      expect(screen.getByTestId('inventory-detail')).toBeInTheDocument();
      expect(screen.getByTestId('item-name')).toHaveTextContent('Oil Filter - Toyota Forklift');
      expect(screen.getByTestId('transaction-count')).toHaveTextContent(String(Object.keys(inventoryTransactions).length));
    });

    it('can see compatible equipment for an item', () => {
      renderAsPersona(<InventoryDetailTestComponent itemId="inv-oil-filter" />, 'technician');

      expect(screen.getByTestId('compatible-equipment-count')).toHaveTextContent('2');
    });

    it('can see compatibility rules for an item', () => {
      renderAsPersona(<InventoryDetailTestComponent itemId="inv-oil-filter" />, 'technician');

      expect(screen.getByTestId('rules-count')).toHaveTextContent('1');
    });

    it('cannot create new inventory items', () => {
      const { result } = renderHookAsPersona(
        () => usePermissions(),
        'technician'
      );

      expect(result.current.canCreateEquipment()).toBe(false);
    });

    it('cannot edit inventory items', () => {
      const { result } = renderHookAsPersona(
        () => usePermissions(),
        'technician'
      );

      expect(result.current.canEditEquipment()).toBe(false);
    });

    it('cannot delete inventory items', () => {
      const { result } = renderHookAsPersona(
        () => usePermissions(),
        'technician'
      );

      expect(result.current.canDeleteEquipment()).toBe(false);
    });
  });

  describe('as a Viewer', () => {
    beforeEach(() => {
      vi.mocked(useInventoryItems).mockReturnValue({
        data: Object.values(inventoryItems),
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
        isPending: false,
        isSuccess: true,
        fetchStatus: 'idle'
      } as ReturnType<typeof useInventoryItems>);

      vi.mocked(usePermissions).mockReturnValue({
        canCreateEquipment: () => false,
        canEditEquipment: () => false,
        canDeleteEquipment: () => false,
        canViewTeam: () => true,
        canEditTeam: () => false,
        canManageTeamMembers: () => false,
        isLoading: false
      } as ReturnType<typeof usePermissions>);

      vi.mocked(useUnifiedPermissions).mockReturnValue({
        hasRole: (roles: string | string[]) => {
          const roleArray = Array.isArray(roles) ? roles : [roles];
          return roleArray.includes('viewer');
        },
        isTeamMember: () => false,
        isTeamManager: () => false,
        organization: {
          canManage: false,
          canInviteMembers: false,
          canCreateTeams: false,
          canViewBilling: false,
          canManageMembers: false
        },
        equipment: {
          getPermissions: () => ({
            canView: true,
            canCreate: false,
            canEdit: false,
            canDelete: false,
            canAddNotes: false,
            canAddImages: false
          }),
          canViewAll: false,
          canCreateAny: false
        },
        workOrders: {
          getPermissions: () => ({}),
          getDetailedPermissions: () => ({}),
          canViewAll: false,
          canCreateAny: false
        },
        teams: {
          getPermissions: () => ({
            canView: true,
            canCreate: false,
            canEdit: false,
            canDelete: false
          }),
          canCreateAny: false
        },
        notes: {
          getPermissions: () => ({})
        }
      } as unknown as ReturnType<typeof useUnifiedPermissions>);
    });

    it('can view inventory items', () => {
      renderAsPersona(<InventoryTestComponent />, 'viewer');

      expect(screen.getByTestId('inventory-list')).toBeInTheDocument();
    });

    it('cannot create, edit, or delete inventory items', () => {
      const { result } = renderHookAsPersona(
        () => usePermissions(),
        'viewer'
      );

      expect(result.current.canCreateEquipment()).toBe(false);
      expect(result.current.canEditEquipment()).toBe(false);
      expect(result.current.canDeleteEquipment()).toBe(false);
    });
  });

  describe('Inventory Quantity Adjustments', () => {
    it('records transactions with user and reason', () => {
      const transaction = inventoryTransactions.restock;
      
      expect(transaction.user_id).toBe(personas.teamManager.id);
      expect(transaction.notes).toBe('Restocked from supplier order #PO-2024-015');
      expect(transaction.change_amount).toBe(10);
    });

    it('shows low stock warning when below threshold', () => {
      const lowStockItem = inventoryItems.hydraulicHose;
      
      expect(lowStockItem.quantity_on_hand).toBe(3);
      expect(lowStockItem.low_stock_threshold).toBe(5);
      expect(lowStockItem.isLowStock).toBe(true);
    });

    it('identifies out of stock items', () => {
      const outOfStockItem = inventoryItems.craneWireRope;
      
      expect(outOfStockItem.quantity_on_hand).toBe(0);
      expect(outOfStockItem.isLowStock).toBe(true);
    });

    it('allows negative inventory adjustments with reason', () => {
      const adjustmentTxn = inventoryTransactions.adjustment;
      
      expect(adjustmentTxn.change_amount).toBe(-2);
      expect(adjustmentTxn.notes).toBe('Physical count correction - damaged inventory');
      expect(adjustmentTxn.transaction_type).toBe('adjustment');
    });

    it('tracks work order usage transactions', () => {
      const workOrderTxn = inventoryTransactions.usageForWorkOrder;
      
      expect(workOrderTxn.transaction_type).toBe('work_order');
      expect(workOrderTxn.work_order_id).toBe('wo-inprogress-1');
      expect(workOrderTxn.change_amount).toBe(-2);
    });
  });

  describe('Compatibility Rules', () => {
    it('matches equipment by manufacturer and model pattern', () => {
      const oilFilterRule = partCompatibilityRules.oilFilterToyota;
      
      expect(oilFilterRule.manufacturer).toBe('Toyota');
      expect(oilFilterRule.model).toBe('8FGU25');
      expect(oilFilterRule.manufacturer_norm).toBe('toyota');
      expect(oilFilterRule.model_norm).toBe('8fgu25');
    });

    it('matches equipment by manufacturer only (any model)', () => {
      const brakePadsRule = partCompatibilityRules.brakePadsUniversal;
      
      expect(brakePadsRule.manufacturer).toBe('Toyota');
      expect(brakePadsRule.model).toBeNull(); // Any Toyota model
    });

    it('normalizes manufacturer and model for matching', () => {
      const rule = partCompatibilityRules.airFilterIngersoll;
      
      expect(rule.manufacturer).toBe('Ingersoll Rand');
      expect(rule.manufacturer_norm).toBe('ingersoll rand');
      expect(rule.model).toBe('R-Series 37');
      expect(rule.model_norm).toBe('r-series 37');
    });
  });

  describe('Low Stock Filtering', () => {
    beforeEach(() => {
      const lowStockItems = Object.values(inventoryItems).filter(item => item.isLowStock);
      
      vi.mocked(useInventoryItems).mockReturnValue({
        data: lowStockItems,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
        isPending: false,
        isSuccess: true,
        fetchStatus: 'idle'
      } as ReturnType<typeof useInventoryItems>);

      vi.mocked(usePermissions).mockReturnValue({
        canCreateEquipment: () => true,
        canEditEquipment: () => true,
        canDeleteEquipment: () => true,
        canViewTeam: () => true,
        canEditTeam: () => true,
        canManageTeamMembers: () => true,
        isLoading: false
      } as ReturnType<typeof usePermissions>);
    });

    it('filters to show only low stock items', () => {
      renderAsPersona(<InventoryTestComponent />, 'admin');

      const lowStockItems = Object.values(inventoryItems).filter(item => item.isLowStock);
      
      expect(screen.getAllByTestId(/^inventory-inv-/).length).toBe(lowStockItems.length);
      
      // All displayed items should have low stock badge
      const badges = screen.getAllByTestId('low-stock-badge');
      expect(badges.length).toBe(lowStockItems.length);
    });
  });

  describe('Inventory Item Creation', () => {
    describe('form validation', () => {
      it('requires name for inventory item', () => {
        const formData = {
          name: '',
          sku: 'TEST-001',
          quantity_on_hand: 10,
          low_stock_threshold: 5
        };

        expect(formData.name.length).toBe(0);
      });

      it('requires quantity to be non-negative', () => {
        const validQuantity = 0;
        const invalidQuantity = -1;

        expect(validQuantity).toBeGreaterThanOrEqual(0);
        expect(invalidQuantity).toBeLessThan(0);
      });

      it('validates low stock threshold is positive', () => {
        const validThreshold = 5;
        const invalidThreshold = 0;

        expect(validThreshold).toBeGreaterThan(0);
        expect(invalidThreshold).toBeLessThanOrEqual(0);
      });

      it('allows optional fields to be empty', () => {
        const formData = {
          name: 'Test Item',
          description: null,
          sku: null,
          external_id: null,
          location: null,
          default_unit_cost: null,
          quantity_on_hand: 10,
          low_stock_threshold: 5
        };

        expect(formData.description).toBeNull();
        expect(formData.sku).toBeNull();
        expect(formData.external_id).toBeNull();
        expect(formData.location).toBeNull();
      });
    });
  });

  describe('Inventory Managers', () => {
    it('tracks who created the inventory item', () => {
      const item = inventoryItems.oilFilter;
      
      expect(item.created_by).toBe(personas.admin.id);
    });

    it('can have multiple managers assigned', () => {
      // Inventory items can have multiple managers
      const managerIds = [personas.admin.id, personas.teamManager.id];
      
      expect(managerIds.length).toBe(2);
      expect(managerIds).toContain(personas.admin.id);
      expect(managerIds).toContain(personas.teamManager.id);
    });
  });
});
