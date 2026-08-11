export const sampleAlternateParts = [
  {
    group_id: 'group-1',
    group_name: 'Oil Filter Alternates',
    group_verified: true,
    inventory_item_id: 'inv-1',
    inventory_name: 'WIX Oil Filter',
    is_in_stock: true,
    is_matching_input: false,
  },
  {
    group_id: 'group-1',
    group_name: 'Oil Filter Alternates',
    group_verified: true,
    inventory_item_id: 'inv-2',
    inventory_name: 'CAT Oil Filter',
    is_in_stock: true,
    is_matching_input: true,
  },
] as const;

export const sampleCompatibleParts = [
  {
    inventory_item_id: 'inv-1',
    name: 'Oil Filter',
    rule_match_type: 'exact',
    rule_status: 'verified',
    is_verified: true,
    is_in_stock: true,
  },
  {
    inventory_item_id: 'inv-2',
    name: 'Air Filter',
    rule_match_type: 'prefix',
    rule_status: 'unverified',
    is_verified: false,
    is_in_stock: false,
  },
] as const;

export const sampleAlternateGroup = {
  id: 'group-1',
  name: 'Test Group',
  organization_id: 'org-1',
  status: 'unverified',
  created_at: new Date().toISOString(),
} as const;

export const sampleGroupMember = {
  id: 'member-1',
  group_id: 'group-1',
  part_identifier_id: 'ident-1',
  inventory_item_id: null,
  is_primary: true,
  notes: null,
  created_at: new Date().toISOString(),
  part_identifiers: { identifier_type: 'oem', raw_value: 'CAT-123', manufacturer: 'Caterpillar' },
  inventory_items: null,
} as const;

export const samplePartIdentifier = {
  id: 'ident-1',
  identifier_type: 'oem',
  raw_value: 'CAT-123',
  norm_value: 'cat-123',
  organization_id: 'org-1',
} as const;
