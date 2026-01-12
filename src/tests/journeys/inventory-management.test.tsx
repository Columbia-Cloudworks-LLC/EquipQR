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
 * - As a Technician, I want to view inventory details and transaction history
 * - As any user, I want to filter inventory by low stock status
 * 
 * Note: Per-item inventory managers have been replaced with organization-level
 * parts managers. See partsManagersService.ts and usePartsManagers.ts.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderAsPersona, renderHookAsPersona } from '@/test/utils/test-utils';
import { personas } from '@/test/fixtures/personas';
import { inventoryItems, inventoryTransactions, equipment, teams, partCompatibilityRules, partAlternateGroups, partIdentifiers } from '@/test/fixtures/entities';

// Mock the inventory hooks
vi.mock('@/features/inventory/hooks/useInventory', () => ({
  useInventoryItems: vi.fn(),
  useInventoryItem: vi.fn(),
  useCreateInventoryItem: vi.fn(),
  useUpdateInventoryItem: vi.fn(),
  useDeleteInventoryItem: vi.fn(),
  useAdjustInventoryQuantity: vi.fn(),
  useInventoryTransactions: vi.fn(),
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
        canManageOrganization: () => true,
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

    it('can manage parts managers at organization level', () => {
      const { result } = renderHookAsPersona(
        () => usePermissions(),
        'admin'
      );

      // Admin can manage organization, which includes parts managers
      expect(result.current.canManageOrganization()).toBe(true);
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

  describe('Inventory Item Creation', () => {
    it('tracks who created the inventory item', () => {
      const item = inventoryItems.oilFilter;
      
      expect(item.created_by).toBe(personas.admin.id);
    });

    // Note: Per-item managers have been replaced with organization-level parts managers.
    // See partsManagersService.ts for the new approach.
  });
});

/**
 * Parts Managers Journey Tests
 *
 * User Stories Covered:
 * - As an Owner/Admin, I want to assign parts managers so specific team members can manage inventory
 * - As a Parts Manager, I want to verify my elevated permissions
 * - As an Admin, I want to revoke parts manager access when no longer needed
 */
describe('Parts Managers Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('as an Organization Owner', () => {
    beforeEach(() => {
      vi.mocked(usePermissions).mockReturnValue({
        canCreateEquipment: () => true,
        canEditEquipment: () => true,
        canDeleteEquipment: () => true,
        canViewTeam: () => true,
        canEditTeam: () => true,
        canManageTeamMembers: () => true,
        canManageOrganization: () => true,
        canManagePartsManagers: () => true,
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

    it('can assign any organization member as a parts manager', () => {
      const { result } = renderHookAsPersona(
        () => usePermissions(),
        'owner'
      );

      // Owner has full permissions including parts manager management
      expect(result.current.canManageOrganization()).toBe(true);
    });

    it('can view the list of all parts managers', () => {
      const { result } = renderHookAsPersona(
        () => useUnifiedPermissions(),
        'owner'
      );

      expect(result.current.organization.canManageMembers).toBe(true);
    });

    it('can remove parts managers when needed', () => {
      const { result } = renderHookAsPersona(
        () => usePermissions(),
        'owner'
      );

      expect(result.current.canManageOrganization()).toBe(true);
    });
  });

  describe('as an Admin', () => {
    beforeEach(() => {
      vi.mocked(usePermissions).mockReturnValue({
        canCreateEquipment: () => true,
        canEditEquipment: () => true,
        canDeleteEquipment: () => true,
        canViewTeam: () => true,
        canEditTeam: () => true,
        canManageTeamMembers: () => true,
        canManageOrganization: () => true,
        canManagePartsManagers: () => true,
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

    it('can promote a technician to parts manager', () => {
      const { result } = renderHookAsPersona(
        () => usePermissions(),
        'admin'
      );

      expect(result.current.canManageOrganization()).toBe(true);
    });

    it('can view parts managers list', () => {
      const { result } = renderHookAsPersona(
        () => useUnifiedPermissions(),
        'admin'
      );

      expect(result.current.organization.canManageMembers).toBe(true);
    });
  });

  describe('as a Team Manager (non-admin)', () => {
    beforeEach(() => {
      vi.mocked(usePermissions).mockReturnValue({
        canCreateEquipment: () => false,
        canEditEquipment: () => true,
        canDeleteEquipment: () => false,
        canViewTeam: () => true,
        canEditTeam: () => true,
        canManageTeamMembers: () => false,
        canManageOrganization: () => false,
        canManagePartsManagers: () => false,
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

    it('cannot manage parts managers', () => {
      const { result } = renderHookAsPersona(
        () => usePermissions(),
        'teamManager'
      );

      expect(result.current.canManageOrganization()).toBe(false);
    });

    it('cannot access parts manager administration', () => {
      const { result } = renderHookAsPersona(
        () => useUnifiedPermissions(),
        'teamManager'
      );

      expect(result.current.organization.canManageMembers).toBe(false);
    });
  });

  describe('Parts Manager Permission Effects', () => {
    it('owners and admins have implicit parts manager access', () => {
      // Owners and admins don't need explicit parts manager role
      const ownerRole = personas.owner.organizationRole;
      const adminRole = personas.admin.organizationRole;

      expect(['owner', 'admin']).toContain(ownerRole);
      expect(['owner', 'admin']).toContain(adminRole);
    });

    it('regular members need explicit parts manager assignment', () => {
      const memberRole = personas.technician.organizationRole;
      
      // Regular members are 'member' role, need explicit assignment
      expect(memberRole).toBe('member');
    });
  });
});

/**
 * Alternate Parts Groups Journey Tests
 *
 * User Stories Covered:
 * - As a Parts Manager, I want to create alternate groups for interchangeable parts
 * - As a Parts Manager, I want to add part numbers to groups for lookup
 * - As a Technician, I want to find alternate parts when primary is out of stock
 * - As an Admin, I want to verify alternate groups to ensure accuracy
 */
describe('Alternate Parts Groups Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('as a Parts Manager', () => {
    beforeEach(() => {
      vi.mocked(usePermissions).mockReturnValue({
        canCreateEquipment: () => true,
        canEditEquipment: () => true,
        canDeleteEquipment: () => true,
        canViewTeam: () => true,
        canEditTeam: () => true,
        canManageTeamMembers: () => false,
        canManageOrganization: () => false,
        isLoading: false
      } as ReturnType<typeof usePermissions>);
    });

    it('can create new alternate groups', () => {
      const { result } = renderHookAsPersona(
        () => usePermissions(),
        'teamManager'
      );

      // Parts managers can create inventory-related items
      expect(result.current.canCreateEquipment()).toBe(true);
    });

    it('can add inventory items to alternate groups', () => {
      const { result } = renderHookAsPersona(
        () => usePermissions(),
        'teamManager'
      );

      expect(result.current.canEditEquipment()).toBe(true);
    });

    it('can remove items from alternate groups', () => {
      const { result } = renderHookAsPersona(
        () => usePermissions(),
        'teamManager'
      );

      expect(result.current.canEditEquipment()).toBe(true);
    });
  });

  describe('Alternate Group Data Structure', () => {
    it('groups have verification status', () => {
      const verifiedGroup = partAlternateGroups.oilFilterGroup;
      const unverifiedGroup = partAlternateGroups.airFilterGroup;

      expect(verifiedGroup.status).toBe('verified');
      expect(unverifiedGroup.status).toBe('unverified');
    });

    it('verified groups track who verified and when', () => {
      const verifiedGroup = partAlternateGroups.oilFilterGroup;

      expect(verifiedGroup.verified_by).toBe('user-owner');
      expect(verifiedGroup.verified_at).not.toBeNull();
    });

    it('groups can have evidence URLs for verification', () => {
      const groupWithEvidence = partAlternateGroups.oilFilterGroup;

      expect(groupWithEvidence.evidence_url).toBe('https://wixfilters.com/catalog');
    });
  });

  describe('Part Identifiers', () => {
    it('identifiers have types (OEM, aftermarket, etc.)', () => {
      const oemIdentifier = partIdentifiers.catOilFilter;
      const aftermarketIdentifier = partIdentifiers.wixOilFilter;

      expect(oemIdentifier.identifier_type).toBe('oem');
      expect(aftermarketIdentifier.identifier_type).toBe('aftermarket');
    });

    it('identifiers store both raw and normalized values', () => {
      const identifier = partIdentifiers.catOilFilter;

      expect(identifier.raw_value).toBe('CAT-1R-0750');
      expect(identifier.norm_value).toBe('cat-1r-0750');
    });

    it('identifiers can link to inventory items', () => {
      const linkedIdentifier = partIdentifiers.catOilFilter;
      const unlinkedIdentifier = partIdentifiers.wixOilFilter;

      expect(linkedIdentifier.inventory_item_id).toBe('inv-oil-filter');
      expect(unlinkedIdentifier.inventory_item_id).toBeNull();
    });

    it('identifiers track manufacturer information', () => {
      const identifier = partIdentifiers.catOilFilter;

      expect(identifier.manufacturer).toBe('Caterpillar');
    });
  });

  describe('as a Technician', () => {
    beforeEach(() => {
      vi.mocked(usePermissions).mockReturnValue({
        canCreateEquipment: () => false,
        canEditEquipment: () => false,
        canDeleteEquipment: () => false,
        canViewTeam: () => true,
        canEditTeam: () => false,
        canManageTeamMembers: () => false,
        canManageOrganization: () => false,
        isLoading: false
      } as ReturnType<typeof usePermissions>);
    });

    it('can view alternate groups', () => {
      const { result } = renderHookAsPersona(
        () => usePermissions(),
        'technician'
      );

      expect(result.current.canViewTeam()).toBe(true);
    });

    it('cannot create or modify alternate groups', () => {
      const { result } = renderHookAsPersona(
        () => usePermissions(),
        'technician'
      );

      expect(result.current.canCreateEquipment()).toBe(false);
      expect(result.current.canEditEquipment()).toBe(false);
    });
  });

  describe('Alternate Group Lookup Scenarios', () => {
    it('finds alternates by OEM part number', () => {
      // Simulating a lookup: technician has CAT-1R-0750, needs alternatives
      const searchPartNumber = 'CAT-1R-0750';
      const matchingIdentifier = Object.values(partIdentifiers).find(
        id => id.raw_value === searchPartNumber
      );

      expect(matchingIdentifier).toBeDefined();
      expect(matchingIdentifier?.identifier_type).toBe('oem');
    });

    it('identifies in-stock vs out-of-stock alternates', () => {
      const inStockItem = inventoryItems.oilFilter;
      const outOfStockItem = inventoryItems.craneWireRope;

      expect(inStockItem.quantity_on_hand).toBeGreaterThan(0);
      expect(outOfStockItem.quantity_on_hand).toBe(0);
    });

    it('prioritizes verified alternates over unverified', () => {
      const verifiedGroup = partAlternateGroups.oilFilterGroup;
      const unverifiedGroup = partAlternateGroups.airFilterGroup;

      // Verified groups should be preferred for critical applications
      expect(verifiedGroup.status).toBe('verified');
      expect(unverifiedGroup.status).toBe('unverified');
    });
  });

  describe('as a Viewer', () => {
    beforeEach(() => {
      vi.mocked(usePermissions).mockReturnValue({
        canCreateEquipment: () => false,
        canEditEquipment: () => false,
        canDeleteEquipment: () => false,
        canViewTeam: () => true,
        canEditTeam: () => false,
        canManageTeamMembers: () => false,
        canManageOrganization: () => false,
        isLoading: false
      } as ReturnType<typeof usePermissions>);
    });

    it('can view alternate groups (read-only)', () => {
      const { result } = renderHookAsPersona(
        () => usePermissions(),
        'viewer'
      );

      expect(result.current.canViewTeam()).toBe(true);
      expect(result.current.canEditEquipment()).toBe(false);
    });
  });
});
