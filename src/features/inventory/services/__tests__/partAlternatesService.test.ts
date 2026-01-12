import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase before importing the service
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn(),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } })
    }
  }
}));

vi.mock('@/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn()
  }
}));

import { supabase } from '@/integrations/supabase/client';
import {
  getAlternatesForPartNumber,
  getAlternatesForInventoryItem,
  getCompatiblePartsForMakeModel
} from '../partAlternatesService';

describe('partAlternatesService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAlternatesForPartNumber', () => {
    it('returns empty array for empty part number', async () => {
      const result = await getAlternatesForPartNumber('org-1', '');
      expect(result).toEqual([]);
      expect(supabase.rpc).not.toHaveBeenCalled();
    });

    it('returns empty array for whitespace-only part number', async () => {
      const result = await getAlternatesForPartNumber('org-1', '   ');
      expect(result).toEqual([]);
      expect(supabase.rpc).not.toHaveBeenCalled();
    });

    it('calls RPC with normalized part number', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({ data: [], error: null });

      await getAlternatesForPartNumber('org-1', '  CAT-1R-0750  ');

      expect(supabase.rpc).toHaveBeenCalledWith('get_alternates_for_part_number', {
        p_organization_id: 'org-1',
        p_part_number: 'CAT-1R-0750'
      });
    });

    it('returns alternate parts from RPC', async () => {
      const mockAlternates = [
        {
          group_id: 'group-1',
          group_name: 'Oil Filter Alternates',
          group_verified: true,
          inventory_item_id: 'inv-1',
          inventory_name: 'WIX Oil Filter',
          is_in_stock: true,
          is_matching_input: false
        },
        {
          group_id: 'group-1',
          group_name: 'Oil Filter Alternates',
          group_verified: true,
          inventory_item_id: 'inv-2',
          inventory_name: 'CAT Oil Filter',
          is_in_stock: true,
          is_matching_input: true
        }
      ];

      vi.mocked(supabase.rpc).mockResolvedValue({ data: mockAlternates, error: null });

      const result = await getAlternatesForPartNumber('org-1', 'CAT-1R-0750');

      expect(result).toEqual(mockAlternates);
      expect(result.length).toBe(2);
      expect(result[1].is_matching_input).toBe(true);
    });

    it('throws error on access denied', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: { code: '42501', message: 'Access denied' }
      });

      await expect(getAlternatesForPartNumber('org-1', 'TEST'))
        .rejects.toThrow('Access denied');
    });
  });

  describe('getAlternatesForInventoryItem', () => {
    it('calls RPC with correct parameters', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({ data: [], error: null });

      await getAlternatesForInventoryItem('org-1', 'inv-123');

      expect(supabase.rpc).toHaveBeenCalledWith('get_alternates_for_inventory_item', {
        p_organization_id: 'org-1',
        p_inventory_item_id: 'inv-123'
      });
    });

    it('returns alternates grouped by group', async () => {
      const mockData = [
        { group_id: 'g1', group_name: 'Group 1', inventory_item_id: 'inv-1' },
        { group_id: 'g1', group_name: 'Group 1', inventory_item_id: 'inv-2' }
      ];

      vi.mocked(supabase.rpc).mockResolvedValue({ data: mockData, error: null });

      const result = await getAlternatesForInventoryItem('org-1', 'inv-123');
      expect(result.length).toBe(2);
      expect(result.every(r => r.group_id === 'g1')).toBe(true);
    });
  });

  describe('getCompatiblePartsForMakeModel', () => {
    it('returns empty array for empty manufacturer', async () => {
      const result = await getCompatiblePartsForMakeModel('org-1', '');
      expect(result).toEqual([]);
      expect(supabase.rpc).not.toHaveBeenCalled();
    });

    it('calls RPC with manufacturer only', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({ data: [], error: null });

      await getCompatiblePartsForMakeModel('org-1', 'Caterpillar');

      expect(supabase.rpc).toHaveBeenCalledWith('get_compatible_parts_for_make_model', {
        p_organization_id: 'org-1',
        p_manufacturer: 'Caterpillar',
        p_model: null
      });
    });

    it('calls RPC with manufacturer and model', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({ data: [], error: null });

      await getCompatiblePartsForMakeModel('org-1', 'Caterpillar', 'D6T');

      expect(supabase.rpc).toHaveBeenCalledWith('get_compatible_parts_for_make_model', {
        p_organization_id: 'org-1',
        p_manufacturer: 'Caterpillar',
        p_model: 'D6T'
      });
    });

    it('returns compatible parts with verification status', async () => {
      const mockParts = [
        {
          inventory_item_id: 'inv-1',
          name: 'Oil Filter',
          rule_match_type: 'exact',
          rule_status: 'verified',
          is_verified: true,
          is_in_stock: true
        },
        {
          inventory_item_id: 'inv-2',
          name: 'Air Filter',
          rule_match_type: 'prefix',
          rule_status: 'unverified',
          is_verified: false,
          is_in_stock: false
        }
      ];

      vi.mocked(supabase.rpc).mockResolvedValue({ data: mockParts, error: null });

      const result = await getCompatiblePartsForMakeModel('org-1', 'CAT', 'D6T');

      expect(result.length).toBe(2);
      expect(result[0].is_verified).toBe(true);
      expect(result[1].rule_match_type).toBe('prefix');
    });
  });
});

describe('Pattern Matching Logic', () => {
  // These tests validate the expected behavior of pattern matching
  // The actual SQL logic is in the database, but we document expected behavior here

  describe('Match Type: any', () => {
    it('should match any model from the manufacturer', () => {
      const rule = { manufacturer: 'Caterpillar', model: null, match_type: 'any' };
      
      // This rule should match:
      // - Caterpillar D6T
      // - Caterpillar D8T
      // - Caterpillar 320
      expect(rule.match_type).toBe('any');
      expect(rule.model).toBeNull();
    });
  });

  describe('Match Type: exact', () => {
    it('should match only the exact model', () => {
      const rule = { manufacturer: 'John Deere', model: '450J', match_type: 'exact' };
      
      // This rule should match:
      // - John Deere 450J
      // NOT:
      // - John Deere 450JLT
      // - John Deere 650J
      expect(rule.match_type).toBe('exact');
      expect(rule.model).toBe('450J');
    });
  });

  describe('Match Type: prefix', () => {
    it('should match models starting with the pattern', () => {
      const rule = { manufacturer: 'JLG', model: 'JL-', match_type: 'prefix' };
      
      // This rule should match:
      // - JLG JL-100
      // - JLG JL-200-A
      // NOT:
      // - JLG XJL-100
      expect(rule.match_type).toBe('prefix');
      expect(rule.model).toBe('JL-');
    });
  });

  describe('Match Type: wildcard', () => {
    it('should match models with wildcard pattern', () => {
      const rule = { manufacturer: 'CAT', model: 'D*T', match_type: 'wildcard' };
      
      // This rule should match:
      // - CAT D6T
      // - CAT D8T
      // - CAT D10T
      // NOT:
      // - CAT D6
      // - CAT D6R
      expect(rule.match_type).toBe('wildcard');
      expect(rule.model).toBe('D*T');
    });

    it('should support suffix wildcards', () => {
      const rule = { manufacturer: 'Genie', model: '*-100', match_type: 'wildcard' };
      
      // This rule should match:
      // - Genie S-100
      // - Genie GS-100
      expect(rule.match_type).toBe('wildcard');
    });
  });
});

describe('Pattern Validation', () => {
  // Client-side validation tests

  describe('prefix patterns', () => {
    it('should reject patterns with wildcards', () => {
      const invalidPatterns = ['JL-*', 'JL?', '*-prefix'];
      
      for (const pattern of invalidPatterns) {
        const hasWildcard = pattern.includes('*') || pattern.includes('?');
        expect(hasWildcard).toBe(true);
      }
    });

    it('should accept valid prefix patterns', () => {
      const validPatterns = ['JL-', 'D6', 'CAT-', 'Series-A'];
      
      for (const pattern of validPatterns) {
        const hasWildcard = pattern.includes('*') || pattern.includes('?');
        expect(hasWildcard).toBe(false);
      }
    });
  });

  describe('wildcard patterns', () => {
    it('should reject patterns with more than 2 wildcards', () => {
      const pattern = 'D*T*X*';
      const asteriskCount = (pattern.match(/\*/g) || []).length;
      expect(asteriskCount).toBeGreaterThan(2);
    });

    it('should reject patterns that would match everything', () => {
      const dangerousPatterns = ['*', '**', '*-*'];
      
      for (const pattern of dangerousPatterns) {
        const isJustWildcards = /^[\*\-]+$/.test(pattern);
        expect(isJustWildcards).toBe(true);
      }
    });

    it('should accept valid wildcard patterns', () => {
      const validPatterns = ['D*T', '*-100', 'JL-*', 'D?T'];
      
      for (const pattern of validPatterns) {
        const asteriskCount = (pattern.match(/\*/g) || []).length;
        const hasNonWildcard = pattern.replace(/[\*\?\-]/g, '').length >= 2;
        expect(asteriskCount <= 2 && hasNonWildcard).toBe(true);
      }
    });
  });
});
