import { describe, expect, it } from 'vitest';
import { compatibilityRuleSchema, inventoryItemFormSchema } from './inventorySchema';

const GROUP_ID = '3f2b8c1e-5d4a-4b7e-9c2d-1a2b3c4d5e6f';
const valid = { name: 'Oil filter', quantity_on_hand: 4 };

function messages(input: Record<string, unknown>): string[] {
  const result = inventoryItemFormSchema.safeParse(input);
  return result.success ? [] : result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
}

describe('compatibilityRuleSchema', () => {
  it('fills exact matching and unverified status by default', () => {
    expect(compatibilityRuleSchema.parse({ manufacturer: 'Cat' })).toEqual({
      manufacturer: 'Cat',
      match_type: 'exact',
      status: 'unverified',
    });
  });

  it('treats an empty model as "any model" and blank notes as no notes', () => {
    expect(compatibilityRuleSchema.parse({ manufacturer: 'Cat', model: '', notes: '   ' })).toMatchObject({
      model: null,
      notes: null,
    });
  });

  it('keeps real models and notes, and passes null through', () => {
    expect(compatibilityRuleSchema.parse({ manufacturer: 'Cat', model: '950M', notes: 'per dealer' })).toMatchObject({
      model: '950M',
      notes: 'per dealer',
    });
    expect(compatibilityRuleSchema.parse({ manufacturer: 'Cat', model: null, notes: null })).toMatchObject({
      model: null,
      notes: null,
    });
  });

  it('enforces manufacturer, model and notes lengths and known enums', () => {
    const issues = (input: Record<string, unknown>) => {
      const r = compatibilityRuleSchema.safeParse({ manufacturer: 'Cat', ...input });
      return r.success ? [] : r.error.issues.map((i) => i.message);
    };
    expect(issues({ manufacturer: '' })).toEqual(['Manufacturer is required']);
    expect(issues({ manufacturer: 'x'.repeat(256) })).toEqual(['Manufacturer must be less than 255 characters']);
    expect(issues({ model: 'x'.repeat(256) })).toEqual(['Model must be less than 255 characters']);
    expect(issues({ notes: 'x'.repeat(501) })).toEqual(['Notes must be less than 500 characters']);
    expect(issues({ match_type: 'regex' })).toHaveLength(1);
    expect(issues({ status: 'maybe' })).toHaveLength(1);
  });

  it('keeps the editor fields instead of stripping them (parity with the rules editor)', () => {
    expect(
      compatibilityRuleSchema.parse({ manufacturer: 'Cat', model: '9*', match_type: 'wildcard', status: 'verified' }),
    ).toMatchObject({ match_type: 'wildcard', status: 'verified' });
  });
});

describe('inventoryItemFormSchema', () => {
  it('applies defaults for threshold, compatibility, and group mode', () => {
    expect(inventoryItemFormSchema.parse(valid)).toEqual({
      ...valid,
      low_stock_threshold: 5,
      compatibleEquipmentIds: [],
      compatibilityRules: [],
      alternateGroupMode: 'none',
    });
  });

  it('requires a name of at most 255 characters', () => {
    expect(messages({ ...valid, name: '' })).toEqual(['name: Name is required']);
    expect(messages({ ...valid, name: 'x'.repeat(256) })).toEqual(['name: Name must be less than 255 characters']);
  });

  it.each([
    ['description', 1001, 'Description must be less than 1000 characters'],
    ['sku', 101, 'SKU must be less than 100 characters'],
    ['external_id', 101, 'External ID must be less than 100 characters'],
    ['location', 256, 'Location name must be less than 255 characters'],
    ['location_address', 501, 'Storage address must be less than 500 characters'],
    ['location_city', 256, 'City must be less than 255 characters'],
    ['location_state', 256, 'State must be less than 255 characters'],
    ['location_country', 256, 'Country must be less than 255 characters'],
    ['newAlternateGroupName', 201, 'Group name must be less than 200 characters'],
  ])('limits %s length', (field, length, message) => {
    expect(messages({ ...valid, [field]: 'x'.repeat(length) })).toEqual([`${field}: ${message}`]);
    expect(messages({ ...valid, [field]: null })).toEqual([]);
  });

  it('allows backorders down to -10,000 whole units', () => {
    expect(messages({ ...valid, quantity_on_hand: -10000 })).toEqual([]);
    expect(messages({ ...valid, quantity_on_hand: -10001 })).toEqual([
      'quantity_on_hand: Quantity cannot be less than -10,000 (prevents data entry errors while allowing reasonable backorders)',
    ]);
    expect(messages({ ...valid, quantity_on_hand: 1.5 })).toEqual(['quantity_on_hand: Quantity must be an integer']);
  });

  it('requires a whole low-stock threshold of at least 1', () => {
    expect(messages({ ...valid, low_stock_threshold: 0 })).toEqual([
      'low_stock_threshold: Low stock threshold must be at least 1',
    ]);
    expect(messages({ ...valid, low_stock_threshold: 2.5 })).toEqual([
      'low_stock_threshold: Low stock threshold must be an integer',
    ]);
  });

  it('keeps unit cost between 0 and 999,999.99', () => {
    expect(messages({ ...valid, default_unit_cost: -0.01 })).toEqual(['default_unit_cost: Unit cost cannot be negative']);
    expect(messages({ ...valid, default_unit_cost: 1000000 })).toEqual(['default_unit_cost: Unit cost seems too high']);
    expect(messages({ ...valid, default_unit_cost: 999999.99 })).toEqual([]);
  });

  it('accepts coordinates and requires UUIDs for compatible equipment', () => {
    expect(messages({ ...valid, location_lat: 41.9, location_lng: -87.6, compatibleEquipmentIds: [GROUP_ID] })).toEqual([]);
    expect(messages({ ...valid, compatibleEquipmentIds: ['not-a-uuid'] })).toHaveLength(1);
  });

  describe('alternate group assignment', () => {
    const groupError = ['alternateGroupId: Please select an existing group or provide a name for the new group'];

    it('needs a group id when joining an existing group', () => {
      expect(messages({ ...valid, alternateGroupMode: 'existing' })).toEqual(groupError);
      expect(messages({ ...valid, alternateGroupMode: 'existing', alternateGroupId: GROUP_ID })).toEqual([]);
      expect(messages({ ...valid, alternateGroupMode: 'existing', alternateGroupId: 'nope' })).toHaveLength(1);
    });

    it('needs a non-blank name when creating a new group', () => {
      expect(messages({ ...valid, alternateGroupMode: 'new' })).toEqual(groupError);
      expect(messages({ ...valid, alternateGroupMode: 'new', newAlternateGroupName: '   ' })).toEqual(groupError);
      expect(messages({ ...valid, alternateGroupMode: 'new', newAlternateGroupName: 'Filters' })).toEqual([]);
    });

    it('rejects unknown modes', () => {
      expect(messages({ ...valid, alternateGroupMode: 'merge' })).toHaveLength(1);
    });
  });
});
