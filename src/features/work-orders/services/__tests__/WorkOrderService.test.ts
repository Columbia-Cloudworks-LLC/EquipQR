import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WorkOrderService } from '../WorkOrderService';

// Mock the supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn()
  }
}));

const { supabase } = await import('@/integrations/supabase/client');

describe('WorkOrderService', () => {
  let service: WorkOrderService;

  beforeEach(() => {
    service = new WorkOrderService('test-org');
    vi.resetAllMocks();
  });

  describe('getAll', () => {
    it('should fetch all work orders successfully', async () => {
      const mockWorkOrders = [
        { 
          id: 'wo-1', 
          title: 'Work Order 1', 
          status: 'submitted', 
          priority: 'medium',
          organization_id: 'test-org',
          equipment: null,
          assignee: null,
          creator: null
        },
        { 
          id: 'wo-2', 
          title: 'Work Order 2', 
          status: 'in_progress', 
          priority: 'high',
          organization_id: 'test-org',
          equipment: null,
          assignee: null,
          creator: null
        }
      ];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockWorkOrders, error: null })
      };

      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await service.getAll({}, {});
      
      expect(result.success).toBe(true);
      expect(result.data).toBeInstanceOf(Array);
      expect(result.data.length).toBeGreaterThan(0);
    });

    it('should filter work orders by status', async () => {
      const mockWorkOrders = [
        { 
          id: 'wo-1', 
          title: 'Work Order 1', 
          status: 'submitted', 
          priority: 'medium',
          organization_id: 'test-org',
          equipment: null,
          assignee: null,
          creator: null
        }
      ];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockWorkOrders, error: null })
      };

      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await service.getAll({ status: 'submitted' }, {});
      
      expect(result.success).toBe(true);
      expect(result.data.every(wo => wo.status === 'submitted')).toBe(true);
    });

    it('should filter work orders by priority', async () => {
      const mockWorkOrders = [
        { 
          id: 'wo-1', 
          title: 'High Priority Order', 
          status: 'submitted', 
          priority: 'high',
          organization_id: 'test-org',
          equipment: null,
          assignee: null,
          creator: null
        }
      ];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockWorkOrders, error: null })
      };

      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await service.getAll({ priority: 'high' }, {});
      
      expect(result.success).toBe(true);
      expect(result.data.every(wo => wo.priority === 'high')).toBe(true);
    });

    it('should filter work orders by assignee', async () => {
      const assigneeId = 'user-1';
      const mockWorkOrders = [
        { 
          id: 'wo-1', 
          title: 'Assigned Order', 
          status: 'assigned', 
          priority: 'medium',
          assignee_id: assigneeId,
          organization_id: 'test-org',
          equipment: null,
          assignee: { id: assigneeId, name: 'User 1' },
          creator: null
        }
      ];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockWorkOrders, error: null })
      };

      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await service.getAll({ assigneeId }, {});
      
      expect(result.success).toBe(true);
      expect(result.data.every(wo => wo.assignee_id === assigneeId)).toBe(true);
    });

    it('should apply pagination correctly', async () => {
      const mockWorkOrders = [
        { 
          id: 'wo-1', 
          title: 'Work Order 1', 
          status: 'submitted', 
          priority: 'medium',
          organization_id: 'test-org',
          equipment: null,
          assignee: null,
          creator: null
        }
      ];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: mockWorkOrders, error: null })
      };

      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await service.getAll({}, { page: 1, limit: 3 });
      
      expect(result.success).toBe(true);
      expect(result.data.length).toBeLessThanOrEqual(3);
    });
  });

  describe('getById', () => {
    it('should fetch work order by id successfully', async () => {
      const mockWorkOrder = { 
        id: 'wo-1', 
        title: 'Work Order 1', 
        status: 'submitted',
        priority: 'medium',
        organization_id: 'test-org',
        equipment: null,
        assignee: null,
        creator: null
      };

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockWorkOrder, error: null })
      };

      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await service.getById('wo-1');
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.id).toBe('wo-1');
    });

    it('should handle non-existent work order', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } })
      };

      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await service.getById('non-existent');
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('create', () => {
    it('should create work order successfully', async () => {
      const workOrderData = {
        title: 'Test Work Order',
        description: 'Test Description',
        equipment_id: 'eq-1',
        priority: 'medium' as const,
        status: 'submitted' as const,
        created_by: 'user-1'
      };

      const mockCreatedWorkOrder = { 
        id: 'wo-new', 
        ...workOrderData, 
        organization_id: 'test-org' 
      };

      const mockInsertQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockCreatedWorkOrder, error: null })
      };

      const mockSelectQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ 
          data: { 
            ...mockCreatedWorkOrder, 
            equipment: null, 
            assignee: null, 
            creator: null 
          }, 
          error: null 
        })
      };

      // First call is for insert, second is for getById
      (supabase.from as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce(mockInsertQuery)
        .mockReturnValueOnce(mockSelectQuery);

      const result = await service.create(workOrderData);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.title).toBe(workOrderData.title);
      expect(result.data.status).toBe('submitted');
    });

    it('should validate required fields', async () => {
      interface IncompleteWorkOrderData {
        title: string;
        status: 'submitted';
        priority: 'medium';
        // Missing required fields like description, equipment_id
      }
      
      const incompleteData: IncompleteWorkOrderData = {
        title: 'Test Work Order',
        status: 'submitted' as const,
        priority: 'medium' as const
      };

      const result = await service.create(incompleteData as Parameters<typeof service.create>[0]);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('update', () => {
    it('should update work order successfully', async () => {
      const updateData = {
        title: 'Updated Work Order',
        priority: 'high' as const
      };

      const mockUpdatedWorkOrder = { 
        id: 'wo-1', 
        title: updateData.title, 
        priority: updateData.priority,
        status: 'submitted',
        organization_id: 'test-org',
        equipment: null,
        assignee: null,
        creator: null
      };

      const mockUpdateQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis()
      };
      // Chain .eq('id', id).eq('organization_id', orgId) - second eq resolves
      mockUpdateQuery.eq.mockReturnValueOnce(mockUpdateQuery);
      mockUpdateQuery.eq.mockResolvedValueOnce({ data: null, error: null });

      const mockSelectQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockUpdatedWorkOrder, error: null })
      };

      // First call is for update, second is for getById
      (supabase.from as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce(mockUpdateQuery)
        .mockReturnValueOnce(mockSelectQuery);

      const result = await service.update('wo-1', updateData);
      
      expect(result.success).toBe(true);
      expect(result.data.title).toBe(updateData.title);
      expect(result.data.priority).toBe(updateData.priority);
    });

    it('should handle non-existent work order update', async () => {
      const mockUpdateQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: null, error: null })
      };

      const mockSelectQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } })
      };

      (supabase.from as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce(mockUpdateQuery)
        .mockReturnValueOnce(mockSelectQuery);

      const result = await service.update('non-existent', { title: 'Updated' });
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('updateStatus', () => {
    it('should update work order status successfully', async () => {
      const newStatus = 'in_progress';
      const mockUpdatedWorkOrder = { 
        id: 'wo-1', 
        title: 'Work Order 1', 
        status: newStatus,
        priority: 'medium',
        organization_id: 'test-org',
        equipment: null,
        assignee: null,
        creator: null
      };

      // Create fresh mock functions for each eq call
      const mockEqForOrg = vi.fn().mockResolvedValue({ data: null, error: null });
      const mockEqForId = vi.fn().mockReturnValue({ eq: mockEqForOrg });
      
      const mockUpdateQuery = {
        update: vi.fn().mockReturnValue({ eq: mockEqForId })
      };

      const mockSelectQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockUpdatedWorkOrder, error: null })
      };

      (supabase.from as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce(mockUpdateQuery)
        .mockReturnValueOnce(mockSelectQuery);

      const result = await service.updateStatus('wo-1', newStatus);
      
      expect(result.success).toBe(true);
      expect(result.data.status).toBe(newStatus);
    });

    it('should handle database error during status update', async () => {
      // Create fresh mock functions for each eq call - second returns error
      const mockEqForOrg = vi.fn().mockResolvedValue({ data: null, error: { message: 'Database error' } });
      const mockEqForId = vi.fn().mockReturnValue({ eq: mockEqForOrg });
      
      const mockUpdateQuery = {
        update: vi.fn().mockReturnValue({ eq: mockEqForId })
      };

      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockUpdateQuery);

      const result = await service.updateStatus('wo-1', 'in_progress');
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('delete', () => {
    it('should delete work order successfully', async () => {
      const mockQuery = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis()
      };
      
      // The second eq() call should resolve with no error
      mockQuery.eq.mockReturnValueOnce(mockQuery);
      mockQuery.eq.mockResolvedValueOnce({ data: null, error: null });

      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await service.delete('wo-1');
      
      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
    });

    it('should handle non-existent work order deletion', async () => {
      const mockQuery = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } })
      };

      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await service.delete('non-existent');
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('getStatusCounts', () => {
    it('should return status counts', async () => {
      const mockWorkOrders = [
        { status: 'submitted' },
        { status: 'submitted' },
        { status: 'in_progress' },
        { status: 'completed' }
      ];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: mockWorkOrders, error: null })
      };

      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await service.getStatusCounts();
      
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('submitted');
      expect(result.data).toHaveProperty('in_progress');
      expect(result.data).toHaveProperty('completed');
      expect(typeof result.data.submitted).toBe('number');
    });
  });

  describe('getPriorityDistribution', () => {
    it('should return priority distribution', async () => {
      const mockWorkOrders = [
        { priority: 'low' },
        { priority: 'medium' },
        { priority: 'medium' },
        { priority: 'high' }
      ];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: mockWorkOrders, error: null })
      };

      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await service.getPriorityDistribution();
      
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('low');
      expect(result.data).toHaveProperty('medium');
      expect(result.data).toHaveProperty('high');
      expect(typeof result.data.low).toBe('number');
    });
  });
});


