import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { getTeamFleetData, getTeamEquipmentWithLocations } from './teamFleetService';
// Mock the supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn()
  }
}));

// Mock parseLatLng utility
vi.mock('@/utils/geoUtils', () => ({
  parseLatLng: vi.fn()
}));

// Mock logger
vi.mock('@/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn()
  }
}));

const { supabase } = await import('@/integrations/supabase/client');
const { parseLatLng: mockParseLatLng } = await import('@/utils/geoUtils');

describe('teamFleetService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getTeamEquipmentWithLocations', () => {
    it('excludes equipment with text addresses (non-parseable locations)', async () => {
      const mockEquipment = [
        {
          id: 'eq-1',
          name: 'Equipment 1',
          manufacturer: 'Test',
          model: 'Model 1',
          serial_number: 'SN001',
          location: '10, 20', // Valid lat/lng
          team_id: 'team-1',
          teams: { id: 'team-1', name: 'Team 1' },
          working_hours: 100,
          last_maintenance: null,
          image_url: null,
          updated_at: '2024-01-01T00:00:00Z'
        },
        {
          id: 'eq-2',
          name: 'Equipment 2',
          manufacturer: 'Test',
          model: 'Model 2',
          serial_number: 'SN002',
          location: '123 Main St', // Invalid - text address
          team_id: 'team-1',
          teams: { id: 'team-1', name: 'Team 1' },
          working_hours: 200,
          last_maintenance: null,
          image_url: null,
          updated_at: '2024-01-01T00:00:00Z'
        },
        {
          id: 'eq-3',
          name: 'Equipment 3',
          manufacturer: 'Test',
          model: 'Model 3',
          serial_number: 'SN003',
          location: null, // Empty location
          team_id: 'team-1',
          teams: { id: 'team-1', name: 'Team 1' },
          working_hours: 300,
          last_maintenance: null,
          image_url: null,
          updated_at: '2024-01-01T00:00:00Z'
        }
      ];

      // Mock parseLatLng to return valid coords for "10, 20" and null for others
      (mockParseLatLng as Mock).mockImplementation((location: string) => {
        if (location === '10, 20') {
          return { lat: 10, lng: 20 };
        }
        return null;
      });

      // Mock equipment query
      const mockEquipmentQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: mockEquipment, error: null })
      };

      // Mock scans query (no scans for any equipment)
      const mockScansQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [], error: null })
      };

      (supabase.from as Mock).mockImplementation((table: string) => {
        if (table === 'equipment') {
          return mockEquipmentQuery;
        }
        if (table === 'scans') {
          return mockScansQuery;
        }
        return mockEquipmentQuery;
      });

      const result = await getTeamEquipmentWithLocations('org-1', ['team-1']);

      // Should only include equipment with valid coordinates
      expect(result).toHaveLength(1);
      expect(result[0].equipment).toHaveLength(1);
      expect(result[0].equipment[0].id).toBe('eq-1');
      expect(result[0].equipment[0].lat).toBe(10);
      expect(result[0].equipment[0].lng).toBe(20);
      
      // Verify no equipment has (0, 0) coordinates
      result.forEach(teamData => {
        teamData.equipment.forEach(eq => {
          expect(eq.lat).not.toBe(0);
          expect(eq.lng).not.toBe(0);
        });
      });

      // Verify equipment with text address is excluded
      const equipmentIds = result[0].equipment.map(eq => eq.id);
      expect(equipmentIds).not.toContain('eq-2');
      expect(equipmentIds).not.toContain('eq-3');
    });

    it('includes equipment with valid coordinates from scans when location is invalid', async () => {
      const mockEquipment = [
        {
          id: 'eq-1',
          name: 'Equipment 1',
          manufacturer: 'Test',
          model: 'Model 1',
          serial_number: 'SN001',
          location: '123 Main St', // Invalid text address
          team_id: 'team-1',
          teams: { id: 'team-1', name: 'Team 1' },
          working_hours: 100,
          last_maintenance: null,
          image_url: null,
          updated_at: '2024-01-01T00:00:00Z'
        }
      ];

      const mockScans = [
        {
          location: '30, 40',
          scanned_at: '2024-01-02T00:00:00Z'
        }
      ];

      // Mock parseLatLng
      (mockParseLatLng as Mock).mockImplementation((location: string) => {
        if (location === '30, 40') {
          return { lat: 30, lng: 40 };
        }
        return null;
      });

      const mockEquipmentQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: mockEquipment, error: null })
      };

      const mockScansQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: mockScans, error: null })
      };

      (supabase.from as Mock).mockImplementation((table: string) => {
        if (table === 'equipment') {
          return mockEquipmentQuery;
        }
        if (table === 'scans') {
          return mockScansQuery;
        }
        return mockEquipmentQuery;
      });

      const result = await getTeamEquipmentWithLocations('org-1', ['team-1']);

      // Should include equipment with coordinates from scan
      expect(result).toHaveLength(1);
      expect(result[0].equipment).toHaveLength(1);
      expect(result[0].equipment[0].source).toBe('scan');
      expect(result[0].equipment[0].lat).toBe(30);
      expect(result[0].equipment[0].lng).toBe(40);
    });
  });

  describe('getTeamFleetData', () => {
    it('sets hasLocationData to true with only 1 item having valid location', async () => {
      const mockTeams = [
        { id: 'team-1', name: 'Team 1', description: null }
      ];

      const mockEquipment = [
        {
          id: 'eq-1',
          name: 'Equipment 1',
          manufacturer: 'Test',
          model: 'Model 1',
          serial_number: 'SN001',
          location: '10, 20', // Valid lat/lng - only this one has location
          team_id: 'team-1',
          teams: { id: 'team-1', name: 'Team 1' },
          working_hours: 100,
          last_maintenance: null,
          image_url: null,
          updated_at: '2024-01-01T00:00:00Z'
        },
        // Add 9 more equipment items without valid locations
        ...Array.from({ length: 9 }, (_, i) => ({
          id: `eq-${i + 2}`,
          name: `Equipment ${i + 2}`,
          manufacturer: 'Test',
          model: `Model ${i + 2}`,
          serial_number: `SN00${i + 2}`,
          location: `Invalid Address ${i + 2}`, // Invalid text addresses
          team_id: 'team-1',
          teams: { id: 'team-1', name: 'Team 1' },
          working_hours: 100,
          last_maintenance: null,
          image_url: null,
          updated_at: '2024-01-01T00:00:00Z'
        }))
      ];

      // Mock parseLatLng to return valid coords only for "10, 20"
      (mockParseLatLng as Mock).mockImplementation((location: string) => {
        if (location === '10, 20') {
          return { lat: 10, lng: 20 };
        }
        return null;
      });

      // Mock teams query
      const mockTeamsQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockTeams, error: null })
      };

      // Mock equipment query
      const mockEquipmentQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: mockEquipment, error: null })
      };

      // Mock scans query (no scans)
      const mockScansQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [], error: null })
      };

      (supabase.from as Mock).mockImplementation((table: string) => {
        if (table === 'teams') {
          return mockTeamsQuery;
        }
        if (table === 'equipment') {
          return mockEquipmentQuery;
        }
        if (table === 'scans') {
          return mockScansQuery;
        }
        return mockTeamsQuery;
      });

      const result = await getTeamFleetData('org-1', [], true);

      // Verify hasLocationData is true even with only 1 out of 10 items
      expect(result.hasLocationData).toBe(true);
      expect(result.totalEquipmentCount).toBe(10);
      expect(result.totalLocatedCount).toBe(1);
      
      // Verify no equipment has (0, 0) coordinates
      result.teamEquipmentData.forEach(teamData => {
        teamData.equipment.forEach(eq => {
          expect(eq.lat).not.toBe(0);
          expect(eq.lng).not.toBe(0);
        });
      });
    });

    it('excludes equipment with text addresses and does not assign (0,0) coordinates', async () => {
      const mockTeams = [
        { id: 'team-1', name: 'Team 1', description: null }
      ];

      const mockEquipment = [
        {
          id: 'eq-1',
          name: 'Equipment 1',
          manufacturer: 'Test',
          model: 'Model 1',
          serial_number: 'SN001',
          location: '10, 20', // Valid
          team_id: 'team-1',
          teams: { id: 'team-1', name: 'Team 1' },
          working_hours: 100,
          last_maintenance: null,
          image_url: null,
          updated_at: '2024-01-01T00:00:00Z'
        },
        {
          id: 'eq-2',
          name: 'Equipment 2',
          manufacturer: 'Test',
          model: 'Model 2',
          serial_number: 'SN002',
          location: '123 Main St', // Invalid text address
          team_id: 'team-1',
          teams: { id: 'team-1', name: 'Team 1' },
          working_hours: 200,
          last_maintenance: null,
          image_url: null,
          updated_at: '2024-01-01T00:00:00Z'
        }
      ];

      // Mock parseLatLng
      (mockParseLatLng as Mock).mockImplementation((location: string) => {
        if (location === '10, 20') {
          return { lat: 10, lng: 20 };
        }
        return null;
      });

      const mockTeamsQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockTeams, error: null })
      };

      const mockEquipmentQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: mockEquipment, error: null })
      };

      const mockScansQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [], error: null })
      };

      (supabase.from as Mock).mockImplementation((table: string) => {
        if (table === 'teams') {
          return mockTeamsQuery;
        }
        if (table === 'equipment') {
          return mockEquipmentQuery;
        }
        if (table === 'scans') {
          return mockScansQuery;
        }
        return mockTeamsQuery;
      });

      const result = await getTeamFleetData('org-1', [], true);

      // Verify equipment with "123 Main St" is excluded
      const allEquipment = result.teamEquipmentData.flatMap(team => team.equipment);
      const equipmentWithTextAddress = allEquipment.find(eq => eq.id === 'eq-2');
      expect(equipmentWithTextAddress).toBeUndefined();

      // Verify no equipment has (0, 0) coordinates
      allEquipment.forEach(eq => {
        expect(eq.lat).not.toBe(0);
        expect(eq.lng).not.toBe(0);
      });

      // Verify only valid equipment is included
      expect(allEquipment).toHaveLength(1);
      expect(allEquipment[0].id).toBe('eq-1');
      expect(allEquipment[0].lat).toBe(10);
      expect(allEquipment[0].lng).toBe(20);
    });

    it('returns hasLocationData false when no equipment has valid locations', async () => {
      const mockTeams = [
        { id: 'team-1', name: 'Team 1', description: null }
      ];

      const mockEquipment = [
        {
          id: 'eq-1',
          name: 'Equipment 1',
          manufacturer: 'Test',
          model: 'Model 1',
          serial_number: 'SN001',
          location: '123 Main St', // Invalid
          team_id: 'team-1',
          teams: { id: 'team-1', name: 'Team 1' },
          working_hours: 100,
          last_maintenance: null,
          image_url: null,
          updated_at: '2024-01-01T00:00:00Z'
        }
      ];

      // Mock parseLatLng to return null for all
      (mockParseLatLng as Mock).mockReturnValue(null);

      const mockTeamsQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockTeams, error: null })
      };

      const mockEquipmentQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: mockEquipment, error: null })
      };

      const mockScansQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [], error: null })
      };

      (supabase.from as Mock).mockImplementation((table: string) => {
        if (table === 'teams') {
          return mockTeamsQuery;
        }
        if (table === 'equipment') {
          return mockEquipmentQuery;
        }
        if (table === 'scans') {
          return mockScansQuery;
        }
        return mockTeamsQuery;
      });

      const result = await getTeamFleetData('org-1', [], true);

      expect(result.hasLocationData).toBe(false);
      expect(result.totalLocatedCount).toBe(0);
    });
  });
});

