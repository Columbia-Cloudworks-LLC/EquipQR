import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getWorkOrderCosts,
  createWorkOrderCost,
  updateWorkOrderCost,
  deleteWorkOrderCost,
  getWorkOrderCostById,
  deleteWorkOrderCostWithInventoryInfo,
  updateWorkOrderCostWithQuantityTracking,
  getMyCosts,
  getAllCostsWithCreators,
  getCostSummaryByUser
} from '../workOrderCostsService';

// Mock the supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn()
    }
  }
}));

// Mock the logger
vi.mock('@/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn()
  }
}));

const { supabase } = await import('@/integrations/supabase/client');

describe('workOrderCostsService', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('getWorkOrderCosts', () => {
    it('should fetch costs for a work order successfully', async () => {
      const mockCosts = [
        { id: 'cost-1', work_order_id: 'wo-1', description: 'Parts', quantity: 2, unit_price_cents: 1000, total_price_cents: 2000, created_by: 'user-1', created_at: '2024-01-01' },
        { id: 'cost-2', work_order_id: 'wo-1', description: 'Labor', quantity: 1, unit_price_cents: 5000, total_price_cents: 5000, created_by: 'user-2', created_at: '2024-01-02' }
      ];

      const mockProfiles = [
        { id: 'user-1', name: 'John Doe' },
        { id: 'user-2', name: 'Jane Smith' }
      ];

      const mockCostsQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockCosts, error: null })
      };

      const mockProfilesQuery = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: mockProfiles, error: null })
      };

      (supabase.from as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce(mockCostsQuery)
        .mockReturnValueOnce(mockProfilesQuery);

      const result = await getWorkOrderCosts('wo-1');

      expect(result).toHaveLength(2);
      expect(result[0].created_by_name).toBe('John Doe');
      expect(result[1].created_by_name).toBe('Jane Smith');
    });

    it('should return empty array when work order has no costs', async () => {
      const mockCostsQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null })
      };

      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockCostsQuery);

      const result = await getWorkOrderCosts('wo-1');

      expect(result).toHaveLength(0);
    });

    it('should validate organization_id when provided (multi-tenancy)', async () => {
      const mockWorkOrderQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: 'wo-1', organization_id: 'org-1' }, error: null })
      };

      const mockCostsQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null })
      };

      (supabase.from as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce(mockWorkOrderQuery)
        .mockReturnValueOnce(mockCostsQuery);

      const result = await getWorkOrderCosts('wo-1', 'org-1');

      expect(result).toBeDefined();
      expect(supabase.from).toHaveBeenCalledWith('work_orders');
    });

    it('should return empty array when work order not found for organization', async () => {
      const mockWorkOrderQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116', message: 'Not found' } })
      };

      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockWorkOrderQuery);

      const result = await getWorkOrderCosts('wo-1', 'wrong-org');

      expect(result).toHaveLength(0);
    });

    it('should handle "Unknown" for profiles that cannot be resolved', async () => {
      const mockCosts = [
        { id: 'cost-1', work_order_id: 'wo-1', description: 'Parts', quantity: 1, unit_price_cents: 1000, total_price_cents: 1000, created_by: 'unknown-user', created_at: '2024-01-01' }
      ];

      const mockCostsQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockCosts, error: null })
      };

      const mockProfilesQuery = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: [], error: null })
      };

      (supabase.from as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce(mockCostsQuery)
        .mockReturnValueOnce(mockProfilesQuery);

      const result = await getWorkOrderCosts('wo-1');

      expect(result[0].created_by_name).toBe('Unknown');
    });

    it('should throw error on database failure', async () => {
      const mockCostsQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: { message: 'Database error' } })
      };

      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockCostsQuery);

      await expect(getWorkOrderCosts('wo-1')).rejects.toThrow();
    });
  });

  describe('createWorkOrderCost', () => {
    it('should create a cost item successfully', async () => {
      const costData = {
        work_order_id: 'wo-1',
        description: 'New parts',
        quantity: 3,
        unit_price_cents: 1500
      };

      const mockCreatedCost = {
        id: 'cost-new',
        ...costData,
        total_price_cents: 4500,
        created_by: 'user-1',
        created_at: '2024-01-10',
        updated_at: '2024-01-10'
      };

      (supabase.auth.getUser as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { user: { id: 'user-1' } }
      });

      const mockInsertQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockCreatedCost, error: null })
      };

      const mockProfileQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { name: 'John Doe' }, error: null })
      };

      (supabase.from as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce(mockInsertQuery)
        .mockReturnValueOnce(mockProfileQuery);

      const result = await createWorkOrderCost(costData);

      expect(result.id).toBe('cost-new');
      expect(result.created_by_name).toBe('John Doe');
    });

    it('should throw error when user is not authenticated', async () => {
      (supabase.auth.getUser as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { user: null }
      });

      const costData = {
        work_order_id: 'wo-1',
        description: 'Parts',
        quantity: 1,
        unit_price_cents: 1000
      };

      await expect(createWorkOrderCost(costData)).rejects.toThrow('User not authenticated');
    });

    it('should throw error on database failure', async () => {
      (supabase.auth.getUser as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { user: { id: 'user-1' } }
      });

      const mockInsertQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Insert failed' } })
      };

      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockInsertQuery);

      await expect(createWorkOrderCost({
        work_order_id: 'wo-1',
        description: 'Parts',
        quantity: 1,
        unit_price_cents: 1000
      })).rejects.toThrow();
    });
  });

  describe('updateWorkOrderCost', () => {
    it('should update a cost item successfully', async () => {
      const updateData = { description: 'Updated parts', quantity: 5 };

      const mockUpdatedCost = {
        id: 'cost-1',
        work_order_id: 'wo-1',
        description: 'Updated parts',
        quantity: 5,
        unit_price_cents: 1000,
        total_price_cents: 5000,
        created_by: 'user-1',
        created_at: '2024-01-01',
        updated_at: '2024-01-10'
      };

      const mockUpdateQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockUpdatedCost, error: null })
      };

      const mockProfileQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { name: 'John Doe' }, error: null })
      };

      (supabase.from as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce(mockUpdateQuery)
        .mockReturnValueOnce(mockProfileQuery);

      const result = await updateWorkOrderCost('cost-1', updateData);

      expect(result.description).toBe('Updated parts');
      expect(result.quantity).toBe(5);
      expect(result.created_by_name).toBe('John Doe');
    });

    it('should throw error on update failure', async () => {
      const mockUpdateQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Update failed' } })
      };

      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockUpdateQuery);

      await expect(updateWorkOrderCost('cost-1', { quantity: 5 })).rejects.toThrow();
    });
  });

  describe('deleteWorkOrderCost', () => {
    it('should delete a cost item successfully', async () => {
      const mockDeleteQuery = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: null, error: null })
      };

      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockDeleteQuery);

      await expect(deleteWorkOrderCost('cost-1')).resolves.not.toThrow();
    });

    it('should throw error on delete failure', async () => {
      const mockDeleteQuery = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: null, error: { message: 'Delete failed' } })
      };

      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockDeleteQuery);

      await expect(deleteWorkOrderCost('cost-1')).rejects.toThrow();
    });
  });

  describe('getWorkOrderCostById', () => {
    it('should fetch a cost by ID successfully', async () => {
      const mockCost = {
        id: 'cost-1',
        work_order_id: 'wo-1',
        description: 'Parts',
        quantity: 2,
        unit_price_cents: 1000,
        total_price_cents: 2000,
        created_by: 'user-1'
      };

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockCost, error: null })
      };

      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await getWorkOrderCostById('cost-1');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('cost-1');
    });

    it('should return null when cost not found (PGRST116)', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116', message: 'No rows' } })
      };

      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await getWorkOrderCostById('non-existent');

      expect(result).toBeNull();
    });

    it('should throw error for other database errors', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { code: 'OTHER', message: 'Database error' } })
      };

      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      await expect(getWorkOrderCostById('cost-1')).rejects.toThrow();
    });
  });

  describe('deleteWorkOrderCostWithInventoryInfo', () => {
    it('should delete cost and return inventory info when linked', async () => {
      const mockCost = {
        id: 'cost-1',
        work_order_id: 'wo-1',
        description: 'Inventory part',
        quantity: 3,
        inventory_item_id: 'inv-1'
      };

      // Mock getWorkOrderCostById
      const mockSelectQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockCost, error: null })
      };

      const mockDeleteQuery = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: null, error: null })
      };

      (supabase.from as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce(mockSelectQuery)
        .mockReturnValueOnce(mockDeleteQuery);

      const result = await deleteWorkOrderCostWithInventoryInfo('cost-1');

      expect(result).not.toBeNull();
      expect(result?.inventory_item_id).toBe('inv-1');
      expect(result?.quantity).toBe(3);
    });

    it('should delete cost and return null when not linked to inventory', async () => {
      const mockCost = {
        id: 'cost-1',
        work_order_id: 'wo-1',
        description: 'Manual entry',
        quantity: 1,
        inventory_item_id: null
      };

      const mockSelectQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockCost, error: null })
      };

      const mockDeleteQuery = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: null, error: null })
      };

      (supabase.from as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce(mockSelectQuery)
        .mockReturnValueOnce(mockDeleteQuery);

      const result = await deleteWorkOrderCostWithInventoryInfo('cost-1');

      expect(result).toBeNull();
    });

    it('should throw error when cost not found', async () => {
      const mockSelectQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } })
      };

      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockSelectQuery);

      await expect(deleteWorkOrderCostWithInventoryInfo('non-existent')).rejects.toThrow('Cost item not found');
    });
  });

  describe('updateWorkOrderCostWithQuantityTracking', () => {
    it('should calculate positive delta when reducing quantity (return to inventory)', async () => {
      const mockCurrentCost = {
        id: 'cost-1',
        work_order_id: 'wo-1',
        description: 'Parts',
        quantity: 5,
        unit_price_cents: 1000,
        inventory_item_id: 'inv-1',
        created_by: 'user-1'
      };

      const mockUpdatedCost = {
        ...mockCurrentCost,
        quantity: 3,
        total_price_cents: 3000,
        updated_at: '2024-01-10'
      };

      const mockSelectQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockCurrentCost, error: null })
      };

      const mockUpdateQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockUpdatedCost, error: null })
      };

      const mockProfileQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { name: 'John' }, error: null })
      };

      (supabase.from as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce(mockSelectQuery)
        .mockReturnValueOnce(mockUpdateQuery)
        .mockReturnValueOnce(mockProfileQuery);

      const result = await updateWorkOrderCostWithQuantityTracking('cost-1', { quantity: 3 });

      expect(result.inventoryAdjustment).not.toBeNull();
      expect(result.inventoryAdjustment?.delta).toBe(2); // 5 - 3 = 2 (returning 2 to inventory)
      expect(result.inventoryAdjustment?.inventory_item_id).toBe('inv-1');
    });

    it('should calculate negative delta when increasing quantity (taking from inventory)', async () => {
      const mockCurrentCost = {
        id: 'cost-1',
        work_order_id: 'wo-1',
        quantity: 2,
        inventory_item_id: 'inv-1',
        created_by: 'user-1'
      };

      const mockUpdatedCost = {
        ...mockCurrentCost,
        quantity: 5,
        updated_at: '2024-01-10'
      };

      const mockSelectQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockCurrentCost, error: null })
      };

      const mockUpdateQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockUpdatedCost, error: null })
      };

      const mockProfileQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { name: 'John' }, error: null })
      };

      (supabase.from as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce(mockSelectQuery)
        .mockReturnValueOnce(mockUpdateQuery)
        .mockReturnValueOnce(mockProfileQuery);

      const result = await updateWorkOrderCostWithQuantityTracking('cost-1', { quantity: 5 });

      expect(result.inventoryAdjustment?.delta).toBe(-3); // 2 - 5 = -3 (taking 3 more)
    });

    it('should return null inventoryAdjustment when cost is not linked to inventory', async () => {
      const mockCurrentCost = {
        id: 'cost-1',
        quantity: 2,
        inventory_item_id: null,
        created_by: 'user-1'
      };

      const mockUpdatedCost = {
        ...mockCurrentCost,
        quantity: 5,
        updated_at: '2024-01-10'
      };

      const mockSelectQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockCurrentCost, error: null })
      };

      const mockUpdateQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockUpdatedCost, error: null })
      };

      const mockProfileQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { name: 'John' }, error: null })
      };

      (supabase.from as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce(mockSelectQuery)
        .mockReturnValueOnce(mockUpdateQuery)
        .mockReturnValueOnce(mockProfileQuery);

      const result = await updateWorkOrderCostWithQuantityTracking('cost-1', { quantity: 5 });

      expect(result.inventoryAdjustment).toBeNull();
    });

    it('should return null inventoryAdjustment when quantity unchanged', async () => {
      const mockCurrentCost = {
        id: 'cost-1',
        quantity: 3,
        inventory_item_id: 'inv-1',
        created_by: 'user-1'
      };

      const mockUpdatedCost = {
        ...mockCurrentCost,
        description: 'Updated description',
        updated_at: '2024-01-10'
      };

      const mockSelectQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockCurrentCost, error: null })
      };

      const mockUpdateQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockUpdatedCost, error: null })
      };

      const mockProfileQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { name: 'John' }, error: null })
      };

      (supabase.from as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce(mockSelectQuery)
        .mockReturnValueOnce(mockUpdateQuery)
        .mockReturnValueOnce(mockProfileQuery);

      const result = await updateWorkOrderCostWithQuantityTracking('cost-1', { description: 'Updated description' });

      expect(result.inventoryAdjustment).toBeNull();
    });

    it('should throw error when cost not found', async () => {
      const mockSelectQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } })
      };

      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockSelectQuery);

      await expect(updateWorkOrderCostWithQuantityTracking('non-existent', { quantity: 5 }))
        .rejects.toThrow('Cost item not found');
    });
  });

  describe('getMyCosts', () => {
    it('should fetch costs created by the current user', async () => {
      const mockCosts = [
        { id: 'cost-1', work_order_id: 'wo-1', description: 'Parts', quantity: 1, unit_price_cents: 1000, total_price_cents: 1000, created_by: 'user-1', work_orders: { id: 'wo-1', title: 'Work Order 1', organization_id: 'org-1' } }
      ];

      const mockProfiles = [{ id: 'user-1', name: 'John Doe' }];

      const mockCostsQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockCosts, error: null })
      };

      const mockProfilesQuery = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: mockProfiles, error: null })
      };

      (supabase.from as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce(mockCostsQuery)
        .mockReturnValueOnce(mockProfilesQuery);

      const result = await getMyCosts('org-1', 'user-1');

      expect(result).toHaveLength(1);
      expect(result[0].createdByName).toBe('John Doe');
      expect(result[0].workOrderTitle).toBe('Work Order 1');
    });

    it('should return empty array on error', async () => {
      const mockCostsQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: { message: 'Error' } })
      };

      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockCostsQuery);

      const result = await getMyCosts('org-1', 'user-1');

      expect(result).toHaveLength(0);
    });
  });

  describe('getAllCostsWithCreators', () => {
    it('should fetch all costs for an organization', async () => {
      const mockCosts = [
        { id: 'cost-1', work_order_id: 'wo-1', description: 'Parts', quantity: 1, unit_price_cents: 1000, total_price_cents: 1000, created_by: 'user-1', work_orders: { id: 'wo-1', title: 'WO 1', organization_id: 'org-1' } },
        { id: 'cost-2', work_order_id: 'wo-2', description: 'Labor', quantity: 2, unit_price_cents: 2000, total_price_cents: 4000, created_by: 'user-2', work_orders: { id: 'wo-2', title: 'WO 2', organization_id: 'org-1' } }
      ];

      const mockProfiles = [
        { id: 'user-1', name: 'John' },
        { id: 'user-2', name: 'Jane' }
      ];

      const mockCostsQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockCosts, error: null })
      };

      const mockProfilesQuery = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: mockProfiles, error: null })
      };

      (supabase.from as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce(mockCostsQuery)
        .mockReturnValueOnce(mockProfilesQuery);

      const result = await getAllCostsWithCreators('org-1');

      expect(result).toHaveLength(2);
      expect(result[0].createdByName).toBe('John');
      expect(result[1].createdByName).toBe('Jane');
    });

    it('should return empty array on error', async () => {
      const mockCostsQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: { message: 'Error' } })
      };

      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockCostsQuery);

      const result = await getAllCostsWithCreators('org-1');

      expect(result).toHaveLength(0);
    });
  });

  describe('getCostSummaryByUser', () => {
    it('should aggregate costs by user', async () => {
      const mockCosts = [
        { created_by: 'user-1', quantity: 2, unit_price_cents: 1000, total_price_cents: 2000, work_orders: { organization_id: 'org-1' } },
        { created_by: 'user-1', quantity: 1, unit_price_cents: 3000, total_price_cents: 3000, work_orders: { organization_id: 'org-1' } },
        { created_by: 'user-2', quantity: 5, unit_price_cents: 500, total_price_cents: 2500, work_orders: { organization_id: 'org-1' } }
      ];

      const mockProfiles = [
        { id: 'user-1', name: 'John' },
        { id: 'user-2', name: 'Jane' }
      ];

      const mockCostsQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: mockCosts, error: null })
      };

      const mockProfilesQuery = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: mockProfiles, error: null })
      };

      (supabase.from as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce(mockCostsQuery)
        .mockReturnValueOnce(mockProfilesQuery);

      const result = await getCostSummaryByUser('org-1');

      expect(result).toHaveLength(2);
      
      const johnSummary = result.find(s => s.userId === 'user-1');
      expect(johnSummary?.userName).toBe('John');
      expect(johnSummary?.totalCosts).toBe(5000); // 2000 + 3000
      expect(johnSummary?.itemCount).toBe(2);

      const janeSummary = result.find(s => s.userId === 'user-2');
      expect(janeSummary?.userName).toBe('Jane');
      expect(janeSummary?.totalCosts).toBe(2500);
      expect(janeSummary?.itemCount).toBe(1);
    });

    it('should return empty array on error', async () => {
      const mockCostsQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: null, error: { message: 'Error' } })
      };

      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockCostsQuery);

      const result = await getCostSummaryByUser('org-1');

      expect(result).toHaveLength(0);
    });

    it('should handle unknown user profiles', async () => {
      const mockCosts = [
        { created_by: 'unknown-user', quantity: 1, unit_price_cents: 1000, total_price_cents: 1000, work_orders: { organization_id: 'org-1' } }
      ];

      const mockCostsQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: mockCosts, error: null })
      };

      const mockProfilesQuery = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: [], error: null })
      };

      (supabase.from as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce(mockCostsQuery)
        .mockReturnValueOnce(mockProfilesQuery);

      const result = await getCostSummaryByUser('org-1');

      expect(result[0].userName).toBe('Unknown');
    });
  });
});
