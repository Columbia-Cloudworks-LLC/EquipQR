import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EquipmentService } from '../EquipmentService';

// Mock the supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn()
  }
}));

const { supabase } = await import('@/integrations/supabase/client');

describe('EquipmentService', () => {
  const organizationId = 'test-org';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAll', () => {
    it('should fetch all equipment successfully', async () => {
      const mockEquipment = [
        { id: 'eq-1', name: 'Equipment 1', organization_id: 'test-org', status: 'active' },
        { id: 'eq-2', name: 'Equipment 2', organization_id: 'test-org', status: 'maintenance' }
      ];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockEquipment, error: null })
      };

      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await EquipmentService.getAll(organizationId);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeInstanceOf(Array);
      expect(result.data.length).toBeGreaterThan(0);
    });

    it('should filter equipment by status', async () => {
      const mockEquipment = [
        { id: 'eq-1', name: 'Equipment 1', organization_id: 'test-org', status: 'active' }
      ];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockEquipment, error: null })
      };

      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await EquipmentService.getAll(organizationId, { status: 'active' });
      
      expect(result.success).toBe(true);
      expect(result.data.every(eq => eq.status === 'active')).toBe(true);
    });

    it('should filter equipment by location', async () => {
      const location = 'Warehouse A';
      const mockEquipment = [
        { id: 'eq-1', name: 'Equipment 1', organization_id: 'test-org', location }
      ];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockEquipment, error: null })
      };

      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await EquipmentService.getAll(organizationId, { location });
      
      expect(result.success).toBe(true);
      expect(result.data.every(eq => eq.location === location)).toBe(true);
    });

    it('should apply pagination correctly', async () => {
      const mockEquipment = [
        { id: 'eq-1', name: 'Equipment 1', organization_id: 'test-org' }
      ];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: mockEquipment, error: null })
      };

      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await EquipmentService.getAll(organizationId, {}, { page: 1, limit: 2 });
      
      expect(result.success).toBe(true);
      expect(result.data.length).toBeLessThanOrEqual(2);
    });
  });

  describe('getById', () => {
    it('should fetch equipment by id successfully', async () => {
      const mockEquipment = { id: 'eq-1', name: 'Equipment 1', organization_id: 'test-org' };

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockEquipment, error: null })
      };

      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await EquipmentService.getById(organizationId, 'eq-1');
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.id).toBe('eq-1');
    });

    it('should handle non-existent equipment', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } })
      };

      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await EquipmentService.getById(organizationId, 'non-existent');
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('create', () => {
    it('should create equipment successfully', async () => {
      const equipmentData = {
        name: 'Test Equipment',
        manufacturer: 'Test Manufacturer',
        model: 'Test Model',
        serial_number: '12345',
        status: 'active' as const,
        location: 'Test Location',
        installation_date: '2024-01-01',
        warranty_expiration: '2025-01-01',
        last_maintenance: '2024-01-01'
      };

      const mockEquipment = { id: 'eq-new', ...equipmentData, organization_id: 'test-org' };

      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockEquipment, error: null })
      };

      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await EquipmentService.create(organizationId, equipmentData);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.name).toBe(equipmentData.name);
    });

    it('should validate required fields', async () => {
      interface IncompleteEquipmentData {
        name: string;
        status: 'active';
        location: string;
        installation_date: string;
        warranty_expiration: string;
        last_maintenance: string;
        // Missing required fields like manufacturer, model, serial_number
      }
      
      const incompleteData: IncompleteEquipmentData = {
        name: 'Test Equipment',
        status: 'active' as const,
        location: 'Test Location',
        installation_date: '2024-01-01',
        warranty_expiration: '2025-01-01',
        last_maintenance: '2024-01-01'
      };

      const result = await EquipmentService.create(organizationId, incompleteData as any);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('update', () => {
    it('should update equipment successfully', async () => {
      const updateData = {
        name: 'Updated Equipment',
        status: 'maintenance' as const
      };

      const mockEquipment = { id: 'eq-1', ...updateData, organization_id: 'test-org' };

      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockEquipment, error: null })
      };

      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await EquipmentService.update(organizationId, 'eq-1', updateData);
      
      expect(result.success).toBe(true);
      expect(result.data.name).toBe(updateData.name);
      expect(result.data.status).toBe(updateData.status);
    });

    it('should handle non-existent equipment update', async () => {
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } })
      };

      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await EquipmentService.update(organizationId, 'non-existent', { name: 'Updated' });
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('delete', () => {
    it('should delete equipment successfully', async () => {
      const mockQuery = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis()
      };
      
      // The second eq() call should resolve with no error
      mockQuery.eq.mockReturnValueOnce(mockQuery);
      mockQuery.eq.mockResolvedValueOnce({ data: null, error: null });

      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await EquipmentService.delete(organizationId, 'eq-1');
      
      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
    });

    it('should handle non-existent equipment deletion', async () => {
      const mockQuery = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } })
      };

      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await EquipmentService.delete(organizationId, 'non-existent');
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('getStatusCounts', () => {
    it('should return status counts', async () => {
      const mockEquipment = [
        { status: 'active' },
        { status: 'active' },
        { status: 'maintenance' },
        { status: 'inactive' }
      ];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: mockEquipment, error: null })
      };

      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await EquipmentService.getStatusCounts(organizationId);
      
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('active');
      expect(result.data).toHaveProperty('maintenance');
      expect(result.data).toHaveProperty('inactive');
      expect(typeof result.data.active).toBe('number');
    });
  });
});