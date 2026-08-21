import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import {
  createSupabaseOrderQueryMock,
} from '@vitest-harness/utils/supabase-mock-query';
import { getTeamsByOrganization } from './supabaseDataService';

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

    it('handles empty organization ID', async () => {
      (supabase.from as Mock).mockImplementation(() => createSupabaseOrderQueryMock([]));

      const result = await getTeamsByOrganization('');

      expect(supabase.from).toHaveBeenCalledWith('teams');
      expect(result).toEqual([]);
    });
  });
});
