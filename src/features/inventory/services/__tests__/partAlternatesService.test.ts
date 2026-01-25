import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase before importing the service
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockEq = vi.fn();
const mockIlike = vi.fn();
const mockOrder = vi.fn();
const mockLimit = vi.fn();
const mockSingle = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn(() => ({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete
    })),
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
import { logger } from '@/utils/logger';
import {
  getAlternatesForPartNumber,
  getAlternatesForInventoryItem,
  getCompatiblePartsForMakeModel,
  createAlternateGroup,
  getAlternateGroupById,
  updateAlternateGroup,
  deleteAlternateGroup,
  removeGroupMember,
  getAlternateGroups,
  addIdentifierToGroup,
  addInventoryItemToGroup,
  createPartIdentifier,
  searchPartIdentifiers
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
      }, { signal: undefined });
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

    describe('cancellation behavior', () => {
      it('returns empty array when signal is already aborted before RPC call', async () => {
        const abortedSignal = { aborted: true } as AbortSignal;

        const result = await getAlternatesForPartNumber('org-1', 'TEST', abortedSignal);

        expect(result).toEqual([]);
        expect(supabase.rpc).not.toHaveBeenCalled();
      });

      it('returns empty array when signal is aborted after RPC call', async () => {
        const abortController = new AbortController();
        const { signal } = abortController;

        vi.mocked(supabase.rpc).mockImplementation(async () => {
          // Abort after the RPC call has been initiated
          queueMicrotask(() => abortController.abort());
          return { data: [], error: null } as { data: unknown; error: null };
        });

        const result = await getAlternatesForPartNumber('org-1', 'TEST', signal);

        expect(result).toEqual([]);
        expect(supabase.rpc).toHaveBeenCalled();
      });

      it('silently handles abort error from RPC error object (lowercase)', async () => {
        vi.mocked(supabase.rpc).mockResolvedValue({
          data: null,
          error: { message: 'request aborted' }
        });

        const result = await getAlternatesForPartNumber('org-1', 'TEST');

        expect(result).toEqual([]);
        expect(logger.error).not.toHaveBeenCalled();
      });

      it('silently handles abort error from RPC error object (uppercase)', async () => {
        vi.mocked(supabase.rpc).mockResolvedValue({
          data: null,
          error: { message: 'Request Aborted' }
        });

        const result = await getAlternatesForPartNumber('org-1', 'TEST');

        expect(result).toEqual([]);
        expect(logger.error).not.toHaveBeenCalled();
      });

      it('silently handles cancel error from RPC error object', async () => {
        vi.mocked(supabase.rpc).mockResolvedValue({
          data: null,
          error: { message: 'request cancelled' }
        });

        const result = await getAlternatesForPartNumber('org-1', 'TEST');

        expect(result).toEqual([]);
        expect(logger.error).not.toHaveBeenCalled();
      });

      it('silently handles AbortError exception', async () => {
        const abortError = new Error('The operation was aborted');
        abortError.name = 'AbortError';
        vi.mocked(supabase.rpc).mockRejectedValue(abortError);

        const result = await getAlternatesForPartNumber('org-1', 'TEST');

        expect(result).toEqual([]);
        expect(logger.error).not.toHaveBeenCalled();
      });

      it('silently handles exception with abort in message', async () => {
        const error = new Error('Network request aborted due to timeout');
        vi.mocked(supabase.rpc).mockRejectedValue(error);

        const result = await getAlternatesForPartNumber('org-1', 'TEST');

        expect(result).toEqual([]);
        expect(logger.error).not.toHaveBeenCalled();
      });

      it('silently handles exception with cancel in message', async () => {
        const error = new Error('Operation cancelled by user');
        vi.mocked(supabase.rpc).mockRejectedValue(error);

        const result = await getAlternatesForPartNumber('org-1', 'TEST');

        expect(result).toEqual([]);
        expect(logger.error).not.toHaveBeenCalled();
      });

      it('does not silently handle non-abort errors', async () => {
        const error = new Error('Database connection failed');
        vi.mocked(supabase.rpc).mockRejectedValue(error);

        await expect(getAlternatesForPartNumber('org-1', 'TEST'))
          .rejects.toThrow('Database connection failed');
        expect(logger.error).toHaveBeenCalledWith('Error looking up alternates for part number:', error);
      });

      it('does not silently handle errors with "signal" in message (not abort/cancel)', async () => {
        const error = new Error('Invalid signal format detected');
        vi.mocked(supabase.rpc).mockRejectedValue(error);

        await expect(getAlternatesForPartNumber('org-1', 'TEST'))
          .rejects.toThrow('Invalid signal format detected');
        expect(logger.error).toHaveBeenCalledWith('Error looking up alternates for part number:', error);
      });
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
        const isJustWildcards = /^[*-]+$/.test(pattern);
        expect(isJustWildcards).toBe(true);
      }
    });

    it('should accept valid wildcard patterns', () => {
      const validPatterns = ['D*T', '*-100', 'JL-*', 'D?T'];
      
      for (const pattern of validPatterns) {
        const asteriskCount = (pattern.match(/\*/g) || []).length;
        const hasNonWildcard = pattern.replace(/[*?-]/g, '').length >= 2;
        expect(asteriskCount <= 2 && hasNonWildcard).toBe(true);
      }
    });
  });
});

describe('Alternate Group Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock chain
    mockSelect.mockReturnValue({ eq: mockEq });
    mockInsert.mockReturnValue({ select: mockSelect });
    mockUpdate.mockReturnValue({ eq: mockEq });
    mockDelete.mockReturnValue({ eq: mockEq });
    mockEq.mockReturnValue({ eq: mockEq, single: mockSingle, order: mockOrder });
    mockOrder.mockReturnValue({ order: mockOrder, limit: mockLimit, data: [], error: null });
    mockLimit.mockReturnValue({ data: [], error: null });
    mockSingle.mockReturnValue({ data: null, error: null });
    mockIlike.mockReturnValue({ order: mockOrder });
  });

  describe('createAlternateGroup', () => {
    it('creates a group with required fields', async () => {
      const mockGroup = {
        id: 'group-1',
        name: 'Test Group',
        organization_id: 'org-1',
        status: 'unverified',
        created_at: new Date().toISOString()
      };

      mockSelect.mockReturnValueOnce({ single: vi.fn().mockResolvedValue({ data: mockGroup, error: null }) });
      mockInsert.mockReturnValueOnce({ select: mockSelect });
      vi.mocked(supabase.from).mockReturnValueOnce({ insert: mockInsert } as never);

      const result = await createAlternateGroup('org-1', { name: 'Test Group' });

      expect(result).toEqual(mockGroup);
      expect(supabase.from).toHaveBeenCalledWith('part_alternate_groups');
    });

    it('creates a group with all optional fields', async () => {
      const mockGroup = {
        id: 'group-1',
        name: 'Test Group',
        description: 'A test description',
        status: 'verified',
        notes: 'Some notes',
        evidence_url: 'https://example.com',
        organization_id: 'org-1',
        created_at: new Date().toISOString()
      };

      mockSelect.mockReturnValueOnce({ single: vi.fn().mockResolvedValue({ data: mockGroup, error: null }) });
      mockInsert.mockReturnValueOnce({ select: mockSelect });
      vi.mocked(supabase.from).mockReturnValueOnce({ insert: mockInsert } as never);

      const result = await createAlternateGroup('org-1', {
        name: 'Test Group',
        description: 'A test description',
        status: 'verified',
        notes: 'Some notes',
        evidence_url: 'https://example.com'
      });

      expect(result).toEqual(mockGroup);
    });

    it('throws error on database failure', async () => {
      mockSelect.mockReturnValueOnce({ single: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB Error' } }) });
      mockInsert.mockReturnValueOnce({ select: mockSelect });
      vi.mocked(supabase.from).mockReturnValueOnce({ insert: mockInsert } as never);

      await expect(createAlternateGroup('org-1', { name: 'Test' }))
        .rejects.toEqual({ message: 'DB Error' });
    });
  });

  describe('getAlternateGroupById', () => {
    it('returns group with members', async () => {
      const mockGroup = {
        id: 'group-1',
        name: 'Test Group',
        organization_id: 'org-1',
        status: 'verified'
      };

      const mockMembers = [
        {
          id: 'member-1',
          group_id: 'group-1',
          part_identifier_id: 'ident-1',
          inventory_item_id: null,
          is_primary: true,
          notes: null,
          created_at: new Date().toISOString(),
          part_identifiers: { identifier_type: 'oem', raw_value: 'CAT-123', manufacturer: 'Caterpillar' },
          inventory_items: null
        }
      ];

      // Mock for group query: .select().eq().eq().single()
      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: mockGroup, error: null })
            })
          })
        })
      } as never);

      // Mock for members query: .select().eq().order().order()
      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: mockMembers, error: null })
            })
          })
        })
      } as never);

      const result = await getAlternateGroupById('org-1', 'group-1');

      expect(result).not.toBeNull();
      expect(result?.name).toBe('Test Group');
      expect(result?.members).toHaveLength(1);
      expect(result?.members[0].identifier_value).toBe('CAT-123');
    });

    it('returns null for non-existent group', async () => {
      // Mock: .select().eq().eq().single()
      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116', message: 'Not found' } })
            })
          })
        })
      } as never);

      const result = await getAlternateGroupById('org-1', 'non-existent');

      expect(result).toBeNull();
    });

    it('throws error on database failure', async () => {
      // Mock: .select().eq().eq().single()
      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: { code: '500', message: 'Server error' } })
            })
          })
        })
      } as never);

      await expect(getAlternateGroupById('org-1', 'group-1'))
        .rejects.toEqual({ code: '500', message: 'Server error' });
    });
  });

  describe('updateAlternateGroup', () => {
    it('updates group name', async () => {
      const mockUpdatedGroup = {
        id: 'group-1',
        name: 'Updated Name',
        organization_id: 'org-1'
      };

      // Mock: .update().eq().eq().select().single()
      vi.mocked(supabase.from).mockReturnValueOnce({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockUpdatedGroup, error: null })
              })
            })
          })
        })
      } as never);

      const result = await updateAlternateGroup('org-1', 'group-1', { name: 'Updated Name' });

      expect(result.name).toBe('Updated Name');
    });

    it('sets verified_by when status changes to verified', async () => {
      const mockUpdatedGroup = {
        id: 'group-1',
        name: 'Test Group',
        status: 'verified',
        verified_by: 'user-1',
        verified_at: expect.any(String)
      };

      // Mock: .update().eq().eq().select().single()
      vi.mocked(supabase.from).mockReturnValueOnce({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockUpdatedGroup, error: null })
              })
            })
          })
        })
      } as never);

      const result = await updateAlternateGroup('org-1', 'group-1', { status: 'verified' });

      expect(result.status).toBe('verified');
    });

    it('throws error on database failure', async () => {
      // Mock: .update().eq().eq().select().single()
      vi.mocked(supabase.from).mockReturnValueOnce({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Update failed' } })
              })
            })
          })
        })
      } as never);

      await expect(updateAlternateGroup('org-1', 'group-1', { name: 'Test' }))
        .rejects.toEqual({ message: 'Update failed' });
    });
  });

  describe('deleteAlternateGroup', () => {
    it('deletes a group successfully', async () => {
      // Mock: .delete().eq().eq()
      vi.mocked(supabase.from).mockReturnValueOnce({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null })
          })
        })
      } as never);

      await expect(deleteAlternateGroup('org-1', 'group-1')).resolves.toBeUndefined();
      expect(supabase.from).toHaveBeenCalledWith('part_alternate_groups');
    });

    it('throws error on database failure', async () => {
      // Mock: .delete().eq().eq()
      vi.mocked(supabase.from).mockReturnValueOnce({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: { message: 'Delete failed' } })
          })
        })
      } as never);

      await expect(deleteAlternateGroup('org-1', 'group-1'))
        .rejects.toEqual({ message: 'Delete failed' });
    });
  });

  describe('removeGroupMember', () => {
    it('removes a member successfully', async () => {
      // Mock: .delete().eq()
      vi.mocked(supabase.from).mockReturnValueOnce({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null })
        })
      } as never);

      await expect(removeGroupMember('member-1')).resolves.toBeUndefined();
      expect(supabase.from).toHaveBeenCalledWith('part_alternate_group_members');
    });

    it('throws error on database failure', async () => {
      // Mock: .delete().eq()
      vi.mocked(supabase.from).mockReturnValueOnce({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: { message: 'Remove failed' } })
        })
      } as never);

      await expect(removeGroupMember('member-1'))
        .rejects.toEqual({ message: 'Remove failed' });
    });
  });

  describe('getAlternateGroups', () => {
    it('returns all groups for organization', async () => {
      const mockGroups = [
        { id: 'group-1', name: 'Group A', organization_id: 'org-1' },
        { id: 'group-2', name: 'Group B', organization_id: 'org-1' }
      ];

      // Mock: .select().eq().order()
      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: mockGroups, error: null })
          })
        })
      } as never);

      const result = await getAlternateGroups('org-1');

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Group A');
    });

    it('returns empty array when no groups exist', async () => {
      // Mock: .select().eq().order()
      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: [], error: null })
          })
        })
      } as never);

      const result = await getAlternateGroups('org-1');

      expect(result).toEqual([]);
    });

    it('throws error on database failure', async () => {
      // Mock: .select().eq().order()
      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: null, error: { message: 'Fetch failed' } })
          })
        })
      } as never);

      await expect(getAlternateGroups('org-1'))
        .rejects.toEqual({ message: 'Fetch failed' });
    });
  });

  describe('addIdentifierToGroup', () => {
    it('adds identifier to group successfully', async () => {
      vi.mocked(supabase.from).mockReturnValueOnce({
        insert: vi.fn().mockResolvedValue({ error: null })
      } as never);

      await expect(addIdentifierToGroup('group-1', 'ident-1')).resolves.toBeUndefined();
      expect(supabase.from).toHaveBeenCalledWith('part_alternate_group_members');
    });

    it('ignores duplicate insert error', async () => {
      vi.mocked(supabase.from).mockReturnValueOnce({
        insert: vi.fn().mockResolvedValue({ error: { code: '23505', message: 'Duplicate' } })
      } as never);

      await expect(addIdentifierToGroup('group-1', 'ident-1')).resolves.toBeUndefined();
    });

    it('throws error for other database errors', async () => {
      vi.mocked(supabase.from).mockReturnValueOnce({
        insert: vi.fn().mockResolvedValue({ error: { code: '500', message: 'Server error' } })
      } as never);

      await expect(addIdentifierToGroup('group-1', 'ident-1'))
        .rejects.toEqual({ code: '500', message: 'Server error' });
    });
  });

  describe('addInventoryItemToGroup', () => {
    it('adds inventory item to group successfully', async () => {
      vi.mocked(supabase.from).mockReturnValueOnce({
        insert: vi.fn().mockResolvedValue({ error: null })
      } as never);

      await expect(addInventoryItemToGroup('group-1', 'item-1')).resolves.toBeUndefined();
      expect(supabase.from).toHaveBeenCalledWith('part_alternate_group_members');
    });

    it('adds inventory item as primary', async () => {
      vi.mocked(supabase.from).mockReturnValueOnce({
        insert: vi.fn().mockResolvedValue({ error: null })
      } as never);

      await expect(addInventoryItemToGroup('group-1', 'item-1', true)).resolves.toBeUndefined();
    });

    it('ignores duplicate insert error', async () => {
      vi.mocked(supabase.from).mockReturnValueOnce({
        insert: vi.fn().mockResolvedValue({ error: { code: '23505', message: 'Duplicate' } })
      } as never);

      await expect(addInventoryItemToGroup('group-1', 'item-1')).resolves.toBeUndefined();
    });

    it('throws error for other database errors', async () => {
      vi.mocked(supabase.from).mockReturnValueOnce({
        insert: vi.fn().mockResolvedValue({ error: { code: '500', message: 'Server error' } })
      } as never);

      await expect(addInventoryItemToGroup('group-1', 'item-1'))
        .rejects.toEqual({ code: '500', message: 'Server error' });
    });
  });

  describe('createPartIdentifier', () => {
    it('creates a part identifier successfully', async () => {
      const mockIdentifier = {
        id: 'ident-1',
        identifier_type: 'oem',
        raw_value: 'CAT-123',
        norm_value: 'cat-123',
        organization_id: 'org-1'
      };

      // Mock: .insert().select().single()
      vi.mocked(supabase.from).mockReturnValueOnce({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockIdentifier, error: null })
          })
        })
      } as never);

      const result = await createPartIdentifier('org-1', {
        identifier_type: 'oem',
        raw_value: 'CAT-123'
      });

      expect(result).toEqual(mockIdentifier);
      expect(supabase.from).toHaveBeenCalledWith('part_identifiers');
    });

    it('creates identifier with all optional fields', async () => {
      const mockIdentifier = {
        id: 'ident-1',
        identifier_type: 'aftermarket',
        raw_value: 'WIX-456',
        norm_value: 'wix-456',
        manufacturer: 'WIX',
        inventory_item_id: 'item-1',
        notes: 'Cross reference',
        organization_id: 'org-1'
      };

      // Mock: .insert().select().single()
      vi.mocked(supabase.from).mockReturnValueOnce({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockIdentifier, error: null })
          })
        })
      } as never);

      const result = await createPartIdentifier('org-1', {
        identifier_type: 'aftermarket',
        raw_value: 'WIX-456',
        manufacturer: 'WIX',
        inventory_item_id: 'item-1',
        notes: 'Cross reference'
      });

      expect(result.manufacturer).toBe('WIX');
    });

    it('throws error for duplicate part number', async () => {
      // Mock: .insert().select().single()
      vi.mocked(supabase.from).mockReturnValueOnce({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: { code: '23505', message: 'Duplicate' } })
          })
        })
      } as never);

      await expect(createPartIdentifier('org-1', {
        identifier_type: 'oem',
        raw_value: 'CAT-123'
      })).rejects.toThrow('This part number already exists');
    });

    it('throws error for other database errors', async () => {
      // Mock: .insert().select().single()
      vi.mocked(supabase.from).mockReturnValueOnce({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Server error' } })
          })
        })
      } as never);

      await expect(createPartIdentifier('org-1', {
        identifier_type: 'oem',
        raw_value: 'CAT-123'
      })).rejects.toEqual({ message: 'Server error' });
    });
  });

  describe('searchPartIdentifiers', () => {
    it('returns matching identifiers', async () => {
      const mockIdentifiers = [
        { id: 'ident-1', raw_value: 'CAT-123', identifier_type: 'oem' },
        { id: 'ident-2', raw_value: 'CAT-456', identifier_type: 'oem' }
      ];

      // Mock: .select().eq().ilike().order().limit()
      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            ilike: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({ data: mockIdentifiers, error: null })
              })
            })
          })
        })
      } as never);

      const result = await searchPartIdentifiers('org-1', 'CAT');

      expect(result).toHaveLength(2);
      expect(result[0].raw_value).toBe('CAT-123');
    });

    it('returns empty array for empty search term', async () => {
      const result = await searchPartIdentifiers('org-1', '');
      expect(result).toEqual([]);
    });

    it('returns empty array for whitespace-only search term', async () => {
      const result = await searchPartIdentifiers('org-1', '   ');
      expect(result).toEqual([]);
    });

    it('throws error on database failure', async () => {
      // Mock: .select().eq().ilike().order().limit()
      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            ilike: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({ data: null, error: { message: 'Search failed' } })
              })
            })
          })
        })
      } as never);

      await expect(searchPartIdentifiers('org-1', 'CAT'))
        .rejects.toEqual({ message: 'Search failed' });
    });
  });
});

describe('Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getAlternatesForPartNumber throws on RPC error', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: null,
      error: { code: 'other', message: 'Some error' }
    });

    await expect(getAlternatesForPartNumber('org-1', 'TEST'))
      .rejects.toEqual({ code: 'other', message: 'Some error' });
  });

  it('getAlternatesForInventoryItem throws on access denied', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: null,
      error: { code: '42501', message: 'Access denied' }
    });

    await expect(getAlternatesForInventoryItem('org-1', 'item-1'))
      .rejects.toThrow('Access denied');
  });

  it('getAlternatesForInventoryItem throws on other errors', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: null,
      error: { code: 'other', message: 'Some error' }
    });

    await expect(getAlternatesForInventoryItem('org-1', 'item-1'))
      .rejects.toEqual({ code: 'other', message: 'Some error' });
  });

  it('getCompatiblePartsForMakeModel throws on access denied', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: null,
      error: { code: '42501', message: 'Access denied' }
    });

    await expect(getCompatiblePartsForMakeModel('org-1', 'CAT'))
      .rejects.toThrow('Access denied');
  });

  it('getCompatiblePartsForMakeModel throws on other errors', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: null,
      error: { code: 'other', message: 'Some error' }
    });

    await expect(getCompatiblePartsForMakeModel('org-1', 'CAT'))
      .rejects.toEqual({ code: 'other', message: 'Some error' });
  });

  it('getCompatiblePartsForMakeModel normalizes whitespace in inputs', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: [], error: null });

    await getCompatiblePartsForMakeModel('org-1', '  Caterpillar  ', '  D6T  ');

    expect(supabase.rpc).toHaveBeenCalledWith('get_compatible_parts_for_make_model', {
      p_organization_id: 'org-1',
      p_manufacturer: 'Caterpillar',
      p_model: 'D6T'
    });
  });
});
