import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import {
  createSupabaseOrderQueryMock,
  createSupabaseQueryMock,
} from '@vitest-harness/utils/supabase-mock-query';
import {
  getEquipmentByOrganization,
  getEquipmentById,
  getTeamsByOrganization,
} from './supabaseDataService';

// Mock the supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn()
  }
}));

const { supabase } = await import('@/integrations/supabase/client');

describe('supabaseDataService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getEquipmentByOrganization', () => {
    it('fetches equipment successfully', async () => {
      const mockEquipment = [
        { id: '1', name: 'Equipment 1', organization_id: 'org-1' },
        { id: '2', name: 'Equipment 2', organization_id: 'org-1' }
      ];

      const mockQuery = createSupabaseQueryMock({
        order: vi.fn().mockResolvedValue({ data: mockEquipment, error: null }),
      });

      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await getEquipmentByOrganization('org-1');

      expect(supabase.from).toHaveBeenCalledWith('equipment');
      expect(mockQuery.select).toHaveBeenCalledWith('*');
      expect(mockQuery.eq).toHaveBeenCalledWith('organization_id', 'org-1');
      expect(mockQuery.order).toHaveBeenCalledWith('name');
      expect(result).toEqual(mockEquipment);
    });

    it('handles database error gracefully', async () => {
      const mockQuery = createSupabaseQueryMock({
        order: vi.fn().mockResolvedValue({ data: null, error: { message: 'Database error' } }),
      });

      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await getEquipmentByOrganization('org-1');

      expect(result).toEqual([]);
    });

    it('handles network error gracefully', async () => {
      const mockQuery = createSupabaseQueryMock({
        order: vi.fn().mockRejectedValue(new Error('Network error')),
      });

      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await getEquipmentByOrganization('org-1');

      expect(result).toEqual([]);
    });

    it('handles null data response', async () => {
      const mockQuery = createSupabaseQueryMock({
        order: vi.fn().mockResolvedValue({ data: null, error: null }),
      });

      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await getEquipmentByOrganization('org-1');

      expect(result).toEqual([]);
    });
  });

  describe('getEquipmentById', () => {
    it('fetches equipment by ID successfully', async () => {
      const mockEquipment = { id: 'eq-1', name: 'Test Equipment', organization_id: 'org-1' };

      const mockQuery = createSupabaseQueryMock({
        single: vi.fn().mockResolvedValue({ data: mockEquipment, error: null }),
      });

      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await getEquipmentById('org-1', 'eq-1');

      expect(supabase.from).toHaveBeenCalledWith('equipment');
      expect(mockQuery.select).toHaveBeenCalledWith('*');
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'eq-1');
      expect(mockQuery.eq).toHaveBeenCalledWith('organization_id', 'org-1');
      expect(mockQuery.single).toHaveBeenCalled();
      expect(result).toEqual(mockEquipment);
    });

    it('returns undefined when equipment not found', async () => {
      const mockQuery = createSupabaseQueryMock({
        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
      });

      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await getEquipmentById('org-1', 'nonexistent');

      expect(result).toBeUndefined();
    });

    it('handles network error gracefully', async () => {
      const mockQuery = createSupabaseQueryMock({
        single: vi.fn().mockRejectedValue(new Error('Network error')),
      });

      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await getEquipmentById('org-1', 'eq-1');

      expect(result).toBeUndefined();
    });
  });

  describe('getTeamsByOrganization', () => {
    beforeEach(() => {
      // Reset the mock before each test in this describe block
      vi.clearAllMocks();
    });

    it('fetches teams successfully', async () => {
      const mockTeams = [
        { id: 'team-1', name: 'Team 1', organization_id: 'org-1' },
        { id: 'team-2', name: 'Team 2', organization_id: 'org-1' }
      ];

      const mockTeamsQuery = createSupabaseOrderQueryMock(mockTeams);
      const mockMembersQuery = createSupabaseOrderQueryMock([]);
      const mockWorkOrdersQuery = createSupabaseOrderQueryMock([]);
      const mockEquipmentQuery = createSupabaseOrderQueryMock([]);

      // Mock supabase.from to return appropriate query builder based on table
      (supabase.from as Mock).mockImplementation((table: string) => {
        switch (table) {
          case 'teams': return mockTeamsQuery;
          case 'team_members': return mockMembersQuery;
          case 'work_orders': return mockWorkOrdersQuery;
          case 'equipment': return mockEquipmentQuery;
          default: return createSupabaseOrderQueryMock([]);
        }
      });

      const result = await getTeamsByOrganization('org-1');

      expect(supabase.from).toHaveBeenCalledWith('teams');
      expect(mockTeamsQuery.select).toHaveBeenCalledWith('*');
      expect(mockTeamsQuery.eq).toHaveBeenCalledWith('organization_id', 'org-1');
      expect(mockTeamsQuery.order).toHaveBeenCalledWith('name');
      expect(result).toHaveLength(2);
    });

    it('returns empty array when no teams found', async () => {
      (supabase.from as Mock).mockImplementation(() => createSupabaseOrderQueryMock([]));

      const result = await getTeamsByOrganization('org-1');

      expect(result).toEqual([]);
    });

    it('handles database error gracefully', async () => {
      (supabase.from as Mock).mockImplementation(() =>
        createSupabaseOrderQueryMock(null, { message: 'Database error' }),
      );

      const result = await getTeamsByOrganization('org-1');

      expect(result).toEqual([]);
    });

    it('handles null teams data', async () => {
      (supabase.from as Mock).mockImplementation(() => createSupabaseOrderQueryMock(null));

      const result = await getTeamsByOrganization('org-1');

      expect(result).toEqual([]);
    });

    it('handles empty teams array', async () => {
      (supabase.from as Mock).mockImplementation(() => createSupabaseOrderQueryMock([]));

      const result = await getTeamsByOrganization('org-1');

      expect(result).toEqual([]);
    });
  });

  describe('Error Handling', () => {
    it('logs errors appropriately', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const mockQuery = createSupabaseQueryMock({
        order: vi.fn().mockRejectedValue(new Error('Test error')),
      });

      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      await getEquipmentByOrganization('org-1');

      expect(consoleSpy).toHaveBeenCalledWith('🚨 Error in getEquipmentByOrganization:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });

  describe('Parameter Validation', () => {
    it('handles empty organization ID', async () => {
      const mockQuery = createSupabaseQueryMock({
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      });

      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await getEquipmentByOrganization('');

      expect(mockQuery.eq).toHaveBeenCalledWith('organization_id', '');
      expect(result).toEqual([]);
    });

    it('handles null organization ID gracefully', async () => {
      const mockQuery = createSupabaseQueryMock({
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      });

      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await getEquipmentByOrganization(null as string);

      expect(result).toEqual([]);
    });
  });
});