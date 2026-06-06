import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { __testables } from '../../../scripts/generate-large-inventory-seed';

const {
  resetSeed,
  selectAlternateGroupStatus,
  buildAlternateGroupRecord,
  buildPartIdentifierRecord,
  buildGroupMemberRecord,
  generatePartIdentifiersAndGroups,
  generateSQL,
} = __testables;

const ORG = {
  id: '660e8400-e29b-41d4-a716-446655440000',
  name: 'Apex Construction',
  users: [
    'bb0e8400-e29b-41d4-a716-446655440001',
    'bb0e8400-e29b-41d4-a716-446655440002',
  ],
};

describe('generate-large-inventory-seed helpers', () => {
  it('buildPartIdentifierRecord marks primary OEM identifiers', () => {
    resetSeed();
    const identifier = buildPartIdentifierRecord(
      ORG,
      'c20e8400-e29b-41d4-a716-446655440001',
      'WIX',
      true,
      true,
      null
    );

    expect(identifier.identifier_type).toBe('oem');
    expect(identifier.notes).toBe('Primary OEM part number');
    expect(identifier.raw_value).toMatch(/^WIX-\d{4}-\d{2}$/);
  });

  it('buildGroupMemberRecord marks primary members', () => {
    const member = buildGroupMemberRecord(
      'c40e8400-e29b-41d4-a716-446655440001',
      'c30e8400-e29b-41d4-a716-446655440001',
      'c20e8400-e29b-41d4-a716-446655440001',
      null,
      true
    );

    expect(member.is_primary).toBe(true);
    expect(member.notes).toBe('OEM reference');
  });

  it('generatePartIdentifiersAndGroups returns linked group members', () => {
    resetSeed();
    const items = [{
      id: 'c10e8400-e29b-41d4-a716-446655440001',
      organization_id: ORG.id,
      name: 'Filter',
      description: 'Test item',
      sku: 'FLT-001',
      quantity_on_hand: 10,
      low_stock_threshold: 2,
      location: 'Shelf 1',
      default_unit_cost: 25,
      created_by: ORG.users[0],
    }];

    const result = generatePartIdentifiersAndGroups(
      'apex',
      items,
      1,
      1,
      1,
      1
    );

    expect(result.groups).toHaveLength(1);
    expect(result.identifiers.length).toBeGreaterThanOrEqual(2);
    expect(result.members.length).toBe(result.identifiers.length);
    expect(result.groups[0].organization_id).toBe(ORG.id);
  });

  it('buildAlternateGroupRecord uses verified status metadata', () => {
    resetSeed(99999);
    const group = buildAlternateGroupRecord(
      ORG,
      'c30e8400-e29b-41d4-a716-446655440001',
      {
        category: 'Filters',
        nameTemplate: '{brand} {type} Filter',
        skuPrefix: 'FLT',
        brands: ['WIX'],
        priceRange: { min: 10, max: 20 },
        variations: ['Oil'],
      },
      'Oil'
    );

    expect(['verified', 'unverified', 'deprecated']).toContain(group.status);
    expect(group.name).toContain('Compatible');
  });

  it('selectAlternateGroupStatus returns a valid status shape', () => {
    resetSeed();
    const status = selectAlternateGroupStatus(ORG.users);
    expect(['verified', 'unverified', 'deprecated']).toContain(status.status);
    if (status.status === 'verified') {
      expect(status.verifiedBy).not.toBeNull();
    } else {
      expect(status.verifiedBy).toBeNull();
    }
  });
});

describe('generate-large-inventory-seed output contract', () => {
  it('matches the pre-refactor SQL baseline aside from generated timestamp', () => {
    resetSeed();
    const baselinePath = resolve(
      process.cwd(),
      'tmp/fallow/20260606-0820/large-inventory-before.sql'
    );
    const baseline = readFileSync(baselinePath, 'utf8');
    const generated = generateSQL();

    const normalize = (sql: string) =>
      sql
        .replace(/\r\n/g, '\n')
        .replace(/^-- Generated: .+$/m, '-- Generated: <timestamp>')
        .trimEnd();

    expect(normalize(generated)).toBe(normalize(baseline));
  });
});
