import './partAlternatesServiceTestMocks';

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '@/integrations/supabase/client';
import {
  createAlternateGroup,
  getAlternateGroupById,
  updateAlternateGroup,
  deleteAlternateGroup,
  removeGroupMember,
  getAlternateGroups,
  addIdentifierToGroup,
  addInventoryItemToGroup,
  createPartIdentifier,
  searchPartIdentifiers,
} from './partAlternatesService';
import {
  mockSelect,
  mockInsert,
  resetPartAlternatesMockChain,
} from './partAlternatesServiceTestMocks';
import {
  sampleAlternateGroup,
  sampleGroupMember,
  samplePartIdentifier,
} from './partAlternatesServiceFixtures';

describe('Alternate Group Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetPartAlternatesMockChain();
  });

  describe('createAlternateGroup', () => {
    it('creates a group with required fields', async () => {
      mockSelect.mockReturnValueOnce({
        single: vi.fn().mockResolvedValue({ data: sampleAlternateGroup, error: null }),
      });
      mockInsert.mockReturnValueOnce({ select: mockSelect });
      vi.mocked(supabase.from).mockReturnValueOnce({ insert: mockInsert } as never);

      const result = await createAlternateGroup('org-1', { name: 'Test Group' });

      expect(result).toEqual(sampleAlternateGroup);
      expect(supabase.from).toHaveBeenCalledWith('part_alternate_groups');
    });

    it('creates a group with all optional fields', async () => {
      const mockGroup = {
        ...sampleAlternateGroup,
        description: 'A test description',
        status: 'verified',
        notes: 'Some notes',
        evidence_url: 'https://example.com',
      };

      mockSelect.mockReturnValueOnce({
        single: vi.fn().mockResolvedValue({ data: mockGroup, error: null }),
      });
      mockInsert.mockReturnValueOnce({ select: mockSelect });
      vi.mocked(supabase.from).mockReturnValueOnce({ insert: mockInsert } as never);

      const result = await createAlternateGroup('org-1', {
        name: 'Test Group',
        description: 'A test description',
        status: 'verified',
        notes: 'Some notes',
        evidence_url: 'https://example.com',
      });

      expect(result).toEqual(mockGroup);
    });

    it('throws error on database failure', async () => {
      mockSelect.mockReturnValueOnce({
        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB Error' } }),
      });
      mockInsert.mockReturnValueOnce({ select: mockSelect });
      vi.mocked(supabase.from).mockReturnValueOnce({ insert: mockInsert } as never);

      await expect(createAlternateGroup('org-1', { name: 'Test' })).rejects.toEqual({
        message: 'DB Error',
      });
    });
  });

  describe('getAlternateGroupById', () => {
    it('returns group with members', async () => {
      const mockGroup = {
        id: 'group-1',
        name: 'Test Group',
        organization_id: 'org-1',
        status: 'verified',
      };

      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: mockGroup, error: null }),
            }),
          }),
        }),
      } as never);

      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: [sampleGroupMember], error: null }),
            }),
          }),
        }),
      } as never);

      const result = await getAlternateGroupById('org-1', 'group-1');

      expect(result).not.toBeNull();
      expect(result?.name).toBe('Test Group');
      expect(result?.members).toHaveLength(1);
      expect(result?.members[0].identifier_value).toBe('CAT-123');
    });

    it('returns null for non-existent group', async () => {
      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { code: 'PGRST116', message: 'Not found' },
              }),
            }),
          }),
        }),
      } as never);

      const result = await getAlternateGroupById('org-1', 'non-existent');

      expect(result).toBeNull();
    });

    it('throws error on database failure', async () => {
      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { code: '500', message: 'Server error' },
              }),
            }),
          }),
        }),
      } as never);

      await expect(getAlternateGroupById('org-1', 'group-1')).rejects.toEqual({
        code: '500',
        message: 'Server error',
      });
    });
  });

  describe('updateAlternateGroup', () => {
    it('updates group name', async () => {
      const mockUpdatedGroup = {
        id: 'group-1',
        name: 'Updated Name',
        organization_id: 'org-1',
      };

      vi.mocked(supabase.from).mockReturnValueOnce({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockUpdatedGroup, error: null }),
              }),
            }),
          }),
        }),
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
        verified_at: expect.any(String),
      };

      vi.mocked(supabase.from).mockReturnValueOnce({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockUpdatedGroup, error: null }),
              }),
            }),
          }),
        }),
      } as never);

      const result = await updateAlternateGroup('org-1', 'group-1', { status: 'verified' });

      expect(result.status).toBe('verified');
    });

    it('throws error on database failure', async () => {
      vi.mocked(supabase.from).mockReturnValueOnce({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Update failed' } }),
              }),
            }),
          }),
        }),
      } as never);

      await expect(updateAlternateGroup('org-1', 'group-1', { name: 'Test' })).rejects.toEqual({
        message: 'Update failed',
      });
    });
  });

  describe('deleteAlternateGroup', () => {
    it('deletes a group successfully', async () => {
      vi.mocked(supabase.from).mockReturnValueOnce({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        }),
      } as never);

      await expect(deleteAlternateGroup('org-1', 'group-1')).resolves.toBeUndefined();
      expect(supabase.from).toHaveBeenCalledWith('part_alternate_groups');
    });

    it('throws error on database failure', async () => {
      vi.mocked(supabase.from).mockReturnValueOnce({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: { message: 'Delete failed' } }),
          }),
        }),
      } as never);

      await expect(deleteAlternateGroup('org-1', 'group-1')).rejects.toEqual({
        message: 'Delete failed',
      });
    });
  });

  describe('removeGroupMember', () => {
    it('removes a member successfully', async () => {
      vi.mocked(supabase.from).mockReturnValueOnce({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      } as never);

      await expect(removeGroupMember('member-1')).resolves.toBeUndefined();
      expect(supabase.from).toHaveBeenCalledWith('part_alternate_group_members');
    });

    it('throws error on database failure', async () => {
      vi.mocked(supabase.from).mockReturnValueOnce({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: { message: 'Remove failed' } }),
        }),
      } as never);

      await expect(removeGroupMember('member-1')).rejects.toEqual({ message: 'Remove failed' });
    });
  });

  describe('getAlternateGroups', () => {
    it('returns all groups for organization with member summaries', async () => {
      const mockGroups = [
        {
          id: 'group-1',
          name: 'Group A',
          organization_id: 'org-1',
          part_alternate_group_members: [
            {
              id: 'member-1',
              inventory_item_id: 'inv-1',
              part_identifier_id: null,
              is_primary: true,
              created_at: '2024-01-01T00:00:00Z',
              inventory_items: { name: 'Filter A', sku: 'FLT-A' },
              part_identifiers: null,
            },
            {
              id: 'member-2',
              inventory_item_id: null,
              part_identifier_id: 'ident-1',
              is_primary: false,
              created_at: '2024-01-02T00:00:00Z',
              inventory_items: null,
              part_identifiers: { raw_value: 'OEM-123', manufacturer: 'CAT' },
            },
          ],
        },
        {
          id: 'group-2',
          name: 'Group B',
          organization_id: 'org-1',
          part_alternate_group_members: [],
        },
      ];

      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: mockGroups, error: null }),
          }),
        }),
      } as never);

      const result = await getAlternateGroups('org-1');

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Group A');
      expect(result[0].member_count).toBe(2);
      expect(result[0].member_summaries).toEqual([
        { id: 'member-1', name: 'Filter A', sku: 'FLT-A' },
        { id: 'member-2', name: 'OEM-123', sku: null },
      ]);
      expect(result[0].member_details).toEqual([
        expect.objectContaining({
          id: 'member-1',
          member_type: 'inventory',
          item_name: 'Filter A',
          item_sku: 'FLT-A',
          quantity_on_hand: 0,
        }),
        expect.objectContaining({
          id: 'member-2',
          member_type: 'identifier',
          identifier_value: 'OEM-123',
        }),
      ]);
      expect(result[1].member_summaries).toEqual([]);
    });

    it('returns empty array when no groups exist', async () => {
      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      } as never);

      const result = await getAlternateGroups('org-1');

      expect(result).toEqual([]);
    });

    it('throws error on database failure', async () => {
      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: null, error: { message: 'Fetch failed' } }),
          }),
        }),
      } as never);

      await expect(getAlternateGroups('org-1')).rejects.toEqual({ message: 'Fetch failed' });
    });
  });

  describe('addIdentifierToGroup', () => {
    it('adds identifier to group successfully', async () => {
      vi.mocked(supabase.from).mockReturnValueOnce({
        insert: vi.fn().mockResolvedValue({ error: null }),
      } as never);

      await expect(addIdentifierToGroup('group-1', 'ident-1')).resolves.toBeUndefined();
      expect(supabase.from).toHaveBeenCalledWith('part_alternate_group_members');
    });

    it('ignores duplicate insert error', async () => {
      vi.mocked(supabase.from).mockReturnValueOnce({
        insert: vi.fn().mockResolvedValue({ error: { code: '23505', message: 'Duplicate' } }),
      } as never);

      await expect(addIdentifierToGroup('group-1', 'ident-1')).resolves.toBeUndefined();
    });

    it('throws error for other database errors', async () => {
      vi.mocked(supabase.from).mockReturnValueOnce({
        insert: vi.fn().mockResolvedValue({ error: { code: '500', message: 'Server error' } }),
      } as never);

      await expect(addIdentifierToGroup('group-1', 'ident-1')).rejects.toEqual({
        code: '500',
        message: 'Server error',
      });
    });
  });

  describe('addInventoryItemToGroup', () => {
    it('adds inventory item to group successfully', async () => {
      vi.mocked(supabase.from).mockReturnValueOnce({
        insert: vi.fn().mockResolvedValue({ error: null }),
      } as never);

      await expect(addInventoryItemToGroup('group-1', 'item-1')).resolves.toBeUndefined();
      expect(supabase.from).toHaveBeenCalledWith('part_alternate_group_members');
    });

    it('adds inventory item as primary', async () => {
      vi.mocked(supabase.from).mockReturnValueOnce({
        insert: vi.fn().mockResolvedValue({ error: null }),
      } as never);

      await expect(addInventoryItemToGroup('group-1', 'item-1', true)).resolves.toBeUndefined();
    });

    it('ignores duplicate insert error', async () => {
      vi.mocked(supabase.from).mockReturnValueOnce({
        insert: vi.fn().mockResolvedValue({ error: { code: '23505', message: 'Duplicate' } }),
      } as never);

      await expect(addInventoryItemToGroup('group-1', 'item-1')).resolves.toBeUndefined();
    });

    it('throws error for other database errors', async () => {
      vi.mocked(supabase.from).mockReturnValueOnce({
        insert: vi.fn().mockResolvedValue({ error: { code: '500', message: 'Server error' } }),
      } as never);

      await expect(addInventoryItemToGroup('group-1', 'item-1')).rejects.toEqual({
        code: '500',
        message: 'Server error',
      });
    });
  });

  describe('createPartIdentifier', () => {
    it('creates a part identifier successfully', async () => {
      vi.mocked(supabase.from).mockReturnValueOnce({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: samplePartIdentifier, error: null }),
          }),
        }),
      } as never);

      const result = await createPartIdentifier('org-1', {
        identifier_type: 'oem',
        raw_value: 'CAT-123',
      });

      expect(result).toEqual(samplePartIdentifier);
      expect(supabase.from).toHaveBeenCalledWith('part_identifiers');
    });

    it('creates identifier with all optional fields', async () => {
      const mockIdentifier = {
        ...samplePartIdentifier,
        identifier_type: 'aftermarket',
        raw_value: 'WIX-456',
        norm_value: 'wix-456',
        manufacturer: 'WIX',
        inventory_item_id: 'item-1',
        notes: 'Cross reference',
      };

      vi.mocked(supabase.from).mockReturnValueOnce({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockIdentifier, error: null }),
          }),
        }),
      } as never);

      const result = await createPartIdentifier('org-1', {
        identifier_type: 'aftermarket',
        raw_value: 'WIX-456',
        manufacturer: 'WIX',
        inventory_item_id: 'item-1',
        notes: 'Cross reference',
      });

      expect(result.manufacturer).toBe('WIX');
    });

    it('throws error for duplicate part number', async () => {
      vi.mocked(supabase.from).mockReturnValueOnce({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: '23505', message: 'Duplicate' },
            }),
          }),
        }),
      } as never);

      await expect(
        createPartIdentifier('org-1', {
          identifier_type: 'oem',
          raw_value: 'CAT-123',
        }),
      ).rejects.toThrow('This part number already exists');
    });

    it('throws error for other database errors', async () => {
      vi.mocked(supabase.from).mockReturnValueOnce({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Server error' } }),
          }),
        }),
      } as never);

      await expect(
        createPartIdentifier('org-1', {
          identifier_type: 'oem',
          raw_value: 'CAT-123',
        }),
      ).rejects.toEqual({ message: 'Server error' });
    });
  });

  describe('searchPartIdentifiers', () => {
    it('returns matching identifiers', async () => {
      const mockIdentifiers = [
        { id: 'ident-1', raw_value: 'CAT-123', identifier_type: 'oem' },
        { id: 'ident-2', raw_value: 'CAT-456', identifier_type: 'oem' },
      ];

      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            ilike: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({ data: mockIdentifiers, error: null }),
              }),
            }),
          }),
        }),
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
      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            ilike: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({ data: null, error: { message: 'Search failed' } }),
              }),
            }),
          }),
        }),
      } as never);

      await expect(searchPartIdentifiers('org-1', 'CAT')).rejects.toEqual({ message: 'Search failed' });
    });
  });
});
