import './partAlternatesServiceTestMocks';

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '@/integrations/supabase/client';
import {
  getAlternatesForPartNumber,
  getAlternatesForInventoryItem,
  getCompatiblePartsForMakeModel,
} from './partAlternatesService';
import {
  sampleAlternateParts,
  sampleCompatibleParts,
} from './partAlternatesServiceFixtures';

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

      expect(supabase.rpc).toHaveBeenCalledWith(
        'get_alternates_for_part_number',
        {
          p_organization_id: 'org-1',
          p_part_number: 'CAT-1R-0750',
        },
        { signal: undefined },
      );
    });

    it('returns alternate parts from RPC', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({ data: [...sampleAlternateParts], error: null });

      const result = await getAlternatesForPartNumber('org-1', 'CAT-1R-0750');

      expect(result).toEqual(sampleAlternateParts);
      expect(result.length).toBe(2);
      expect(result[1].is_matching_input).toBe(true);
    });

    it('throws error on access denied', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: { code: '42501', message: 'Access denied' },
      });

      await expect(getAlternatesForPartNumber('org-1', 'TEST')).rejects.toThrow('Access denied');
    });
  });

  describe('getAlternatesForInventoryItem', () => {
    it('calls RPC with correct parameters', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({ data: [], error: null });

      await getAlternatesForInventoryItem('org-1', 'inv-123');

      expect(supabase.rpc).toHaveBeenCalledWith('get_alternates_for_inventory_item', {
        p_organization_id: 'org-1',
        p_inventory_item_id: 'inv-123',
      });
    });

    it('returns alternates grouped by group', async () => {
      const mockData = [
        { group_id: 'g1', group_name: 'Group 1', inventory_item_id: 'inv-1' },
        { group_id: 'g1', group_name: 'Group 1', inventory_item_id: 'inv-2' },
      ];

      vi.mocked(supabase.rpc).mockResolvedValue({ data: mockData, error: null });

      const result = await getAlternatesForInventoryItem('org-1', 'inv-123');
      expect(result.length).toBe(2);
      expect(result.every((r) => r.group_id === 'g1')).toBe(true);
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
        p_model: null,
      });
    });

    it('calls RPC with manufacturer and model', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({ data: [], error: null });

      await getCompatiblePartsForMakeModel('org-1', 'Caterpillar', 'D6T');

      expect(supabase.rpc).toHaveBeenCalledWith('get_compatible_parts_for_make_model', {
        p_organization_id: 'org-1',
        p_manufacturer: 'Caterpillar',
        p_model: 'D6T',
      });
    });

    it('returns compatible parts with verification status', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({ data: [...sampleCompatibleParts], error: null });

      const result = await getCompatiblePartsForMakeModel('org-1', 'CAT', 'D6T');

      expect(result.length).toBe(2);
      expect(result[0].is_verified).toBe(true);
      expect(result[1].rule_match_type).toBe('prefix');
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
      error: { code: 'other', message: 'Some error' },
    });

    await expect(getAlternatesForPartNumber('org-1', 'TEST')).rejects.toEqual({
      code: 'other',
      message: 'Some error',
    });
  });

  it('getAlternatesForInventoryItem throws on access denied', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: null,
      error: { code: '42501', message: 'Access denied' },
    });

    await expect(getAlternatesForInventoryItem('org-1', 'item-1')).rejects.toThrow('Access denied');
  });

  it('getAlternatesForInventoryItem throws on other errors', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: null,
      error: { code: 'other', message: 'Some error' },
    });

    await expect(getAlternatesForInventoryItem('org-1', 'item-1')).rejects.toEqual({
      code: 'other',
      message: 'Some error',
    });
  });

  it('getCompatiblePartsForMakeModel throws on access denied', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: null,
      error: { code: '42501', message: 'Access denied' },
    });

    await expect(getCompatiblePartsForMakeModel('org-1', 'CAT')).rejects.toThrow('Access denied');
  });

  it('getCompatiblePartsForMakeModel throws on other errors', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: null,
      error: { code: 'other', message: 'Some error' },
    });

    await expect(getCompatiblePartsForMakeModel('org-1', 'CAT')).rejects.toEqual({
      code: 'other',
      message: 'Some error',
    });
  });

  it('getCompatiblePartsForMakeModel normalizes whitespace in inputs', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: [], error: null });

    await getCompatiblePartsForMakeModel('org-1', '  Caterpillar  ', '  D6T  ');

    expect(supabase.rpc).toHaveBeenCalledWith('get_compatible_parts_for_make_model', {
      p_organization_id: 'org-1',
      p_manufacturer: 'Caterpillar',
      p_model: 'D6T',
    });
  });
});
