import { describe, it, expect } from 'vitest';
import { mapInventoryCompatibilityRules } from '@/features/inventory/utils/inventoryItemEditingLoadHelpers';
import type { PartCompatibilityRuleFormData } from '@/features/inventory/types/inventory';

describe('mapInventoryCompatibilityRules', () => {
  it('returns an empty array for null or empty input', () => {
    expect(mapInventoryCompatibilityRules(null)).toEqual([]);
    expect(mapInventoryCompatibilityRules([])).toEqual([]);
  });

  it('maps union match_type and status without widening to string', () => {
    const rules: PartCompatibilityRuleFormData[] = mapInventoryCompatibilityRules([
      {
        manufacturer: 'Caterpillar',
        model: 'D6T',
        match_type: 'prefix',
        status: 'verified',
        notes: 'fits D6T*',
      },
    ]);

    expect(rules).toEqual([
      {
        manufacturer: 'Caterpillar',
        model: 'D6T',
        match_type: 'prefix',
        status: 'verified',
        notes: 'fits D6T*',
      },
    ]);
  });

  it('defaults null match_type to exact and null status to unverified', () => {
    expect(
      mapInventoryCompatibilityRules([
        {
          manufacturer: 'John Deere',
          model: null,
          match_type: null,
          status: null,
          notes: null,
        },
      ]),
    ).toEqual([
      {
        manufacturer: 'John Deere',
        model: null,
        match_type: 'exact',
        status: 'unverified',
        notes: null,
      },
    ]);
  });
});
