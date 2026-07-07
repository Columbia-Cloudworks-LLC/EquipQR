/**
 * Bulk inventory generator: inventory items, part identifiers, alternate
 * groups, and group members for all four business orgs.
 *
 * Ported from the retired scripts/generate-large-inventory-seed.ts (which
 * emitted the committed 26_large_inventory.sql). Volume now scales with the
 * --scale knob instead of living in version control.
 */

import { SeededRng } from '../rng';
import {
  ORGS,
  ORG_KEYS,
  ORG_CATEGORY_WEIGHTS,
  PART_TEMPLATES,
  EQUIPMENT_MODELS,
  UUID_PREFIXES,
  type OrgKey,
  type PartTemplate,
} from '../reference-data';
import { deterministicUuid, escapeSql, renderSeedFile, uuidLiteral } from '../sql-builder';

const BASE_ITEMS_PER_ORG: Record<OrgKey, number> = {
  apex: 300,
  metro: 250,
  valley: 150,
  industrial: 200,
};

const BASE_GROUPS_PER_ORG: Record<OrgKey, number> = {
  apex: 50,
  metro: 40,
  valley: 25,
  industrial: 35,
};

const PARTS_PER_GROUP = { min: 2, max: 6 };

export interface GeneratedInventoryItem {
  id: string;
  orgKey: OrgKey;
  organizationId: string;
  name: string;
  description: string;
  sku: string | null;
  quantityOnHand: number;
  lowStockThreshold: number;
  location: string;
  defaultUnitCost: number;
  createdBy: string;
}

interface GeneratedPartIdentifier {
  id: string;
  organizationId: string;
  identifierType: 'oem' | 'aftermarket';
  rawValue: string;
  normValue: string;
  inventoryItemId: string | null;
  manufacturer: string;
  notes: string;
  createdBy: string;
}

interface GeneratedAlternateGroup {
  id: string;
  organizationId: string;
  name: string;
  description: string;
  status: 'verified' | 'unverified' | 'deprecated';
  notes: string | null;
  evidenceUrl: string | null;
  createdBy: string;
  verifiedBy: string | null;
}

interface GeneratedGroupMember {
  id: string;
  groupId: string;
  partIdentifierId: string;
  inventoryItemId: string | null;
  isPrimary: boolean;
  notes: string;
}

export interface InventoryDomainResult {
  sql: string;
  items: GeneratedInventoryItem[];
  summary: { items: number; groups: number; identifiers: number; members: number };
}

function generateItemsForOrg(
  rng: SeededRng,
  orgKey: OrgKey,
  count: number,
  startCounter: number,
): GeneratedInventoryItem[] {
  const org = ORGS[orgKey];
  const weights = ORG_CATEGORY_WEIGHTS[orgKey];
  const weightedTemplates: PartTemplate[] = [];
  for (const template of PART_TEMPLATES) {
    const weight = weights[template.category] ?? 1;
    for (let i = 0; i < weight; i++) weightedTemplates.push(template);
  }

  const equipmentList = [
    ...EQUIPMENT_MODELS.excavators,
    ...EQUIPMENT_MODELS.loaders,
    ...EQUIPMENT_MODELS.lifts,
    ...EQUIPMENT_MODELS.forklifts,
  ];

  const items: GeneratedInventoryItem[] = [];
  for (let i = 0; i < count; i++) {
    const template = rng.choice(weightedTemplates);
    const brand = rng.choice(template.brands);
    const variation = template.variations ? rng.choice(template.variations) : '';
    const name = template.nameTemplate.replace('{brand}', brand).replace('{type}', variation);
    const equipment = rng.choice(equipmentList);

    const hasSku = rng.next() > 0.1;
    const skuCounter = (startCounter + i).toString().padStart(4, '0');
    const sku = hasSku ? `${template.skuPrefix}-${brand.substring(0, 3).toUpperCase()}-${skuCounter}` : null;

    // Stock distribution: ~15% out of stock, ~25% low stock, rest normal.
    const stockRoll = rng.next();
    let quantity: number;
    let threshold: number;
    if (stockRoll < 0.15) {
      quantity = 0;
      threshold = rng.int(2, 5);
    } else if (stockRoll < 0.4) {
      threshold = rng.int(3, 8);
      quantity = rng.int(1, threshold - 1);
    } else {
      threshold = rng.int(2, 10);
      quantity = rng.int(threshold + 1, threshold + 30);
    }

    items.push({
      id: deterministicUuid(UUID_PREFIXES.inventoryItem, startCounter + i),
      orgKey,
      organizationId: org.id,
      name,
      description: `${variation} for ${equipment} and similar models`,
      sku,
      quantityOnHand: quantity,
      lowStockThreshold: threshold,
      location: rng.choice(org.storageLocations),
      defaultUnitCost: rng.price(template.priceRange.min, template.priceRange.max),
      createdBy: rng.choice(org.staff).id,
    });
  }
  return items;
}

function generateGroupsForOrg(
  rng: SeededRng,
  orgKey: OrgKey,
  items: GeneratedInventoryItem[],
  groupCount: number,
  counters: { identifier: number; group: number; member: number },
): {
  identifiers: GeneratedPartIdentifier[];
  groups: GeneratedAlternateGroup[];
  members: GeneratedGroupMember[];
} {
  const org = ORGS[orgKey];
  const identifiers: GeneratedPartIdentifier[] = [];
  const groups: GeneratedAlternateGroup[] = [];
  const members: GeneratedGroupMember[] = [];

  const equipmentPool = [
    ...EQUIPMENT_MODELS.excavators,
    ...EQUIPMENT_MODELS.loaders,
    ...EQUIPMENT_MODELS.lifts,
    ...EQUIPMENT_MODELS.forklifts,
    ...EQUIPMENT_MODELS.mowers,
  ];

  for (let g = 0; g < groupCount; g++) {
    const groupId = deterministicUuid(UUID_PREFIXES.alternateGroup, counters.group++);
    const template = rng.choice(PART_TEMPLATES);
    const variation = template.variations ? rng.choice(template.variations) : template.category;

    const statusRoll = rng.next();
    const status: GeneratedAlternateGroup['status'] =
      statusRoll < 0.6 ? 'verified' : statusRoll < 0.9 ? 'unverified' : 'deprecated';
    const verifiedBy = status === 'verified' ? rng.choice(org.staff).id : null;
    const equipment = rng.choice(equipmentPool);

    groups.push({
      id: groupId,
      organizationId: org.id,
      name: `${variation} - ${equipment.split(' ')[0]} Compatible`,
      description: `Interchangeable ${variation.toLowerCase()}s verified for ${equipment} and similar models.`,
      status,
      notes: status === 'verified' ? 'Cross-referenced with OEM parts catalog.' : null,
      evidenceUrl: status === 'verified' && rng.next() > 0.5 ? 'https://example.com/parts-catalog' : null,
      createdBy: rng.choice(org.staff).id,
      verifiedBy,
    });

    const partsInGroup = rng.int(PARTS_PER_GROUP.min, PARTS_PER_GROUP.max);
    const brands = rng.shuffle(template.brands).slice(0, partsInGroup);
    const linkedItem = rng.next() > 0.3 ? rng.choice(items) : null;

    for (let p = 0; p < partsInGroup; p++) {
      const brand = brands[p] ?? rng.choice(template.brands);
      const isPrimary = p === 0;
      const isOem = p < 2;
      const identifierId = deterministicUuid(UUID_PREFIXES.partIdentifier, counters.identifier++);
      const inventoryItemId = isPrimary && linkedItem ? linkedItem.id : null;
      const partNumber = `${brand.substring(0, 3).toUpperCase()}-${rng.int(1000, 9999)}-${rng.int(10, 99)}`;

      identifiers.push({
        id: identifierId,
        organizationId: org.id,
        identifierType: isOem ? 'oem' : 'aftermarket',
        rawValue: partNumber,
        normValue: partNumber.toLowerCase(),
        inventoryItemId,
        manufacturer: brand,
        notes: isPrimary ? 'Primary OEM part number' : `${brand} aftermarket alternative`,
        createdBy: rng.choice(org.staff).id,
      });
      members.push({
        id: deterministicUuid(UUID_PREFIXES.groupMember, counters.member++),
        groupId,
        partIdentifierId: identifierId,
        inventoryItemId,
        isPrimary,
        notes: isPrimary ? 'OEM reference' : 'Verified alternative',
      });
    }
  }

  return { identifiers, groups, members };
}

export function generateInventoryDomain(scale: number): InventoryDomainResult {
  const rng = new SeededRng(12345);
  const allItems: GeneratedInventoryItem[] = [];
  const allIdentifiers: GeneratedPartIdentifier[] = [];
  const allGroups: GeneratedAlternateGroup[] = [];
  const allMembers: GeneratedGroupMember[] = [];

  let itemCounter = 100;
  const counters = { identifier: 100, group: 100, member: 100 };

  for (const orgKey of ORG_KEYS) {
    const itemCount = BASE_ITEMS_PER_ORG[orgKey] * scale;
    const groupCount = BASE_GROUPS_PER_ORG[orgKey] * scale;

    const items = generateItemsForOrg(rng, orgKey, itemCount, itemCounter);
    allItems.push(...items);
    itemCounter += itemCount;

    const { identifiers, groups, members } = generateGroupsForOrg(rng, orgKey, items, groupCount, counters);
    allIdentifiers.push(...identifiers);
    allGroups.push(...groups);
    allMembers.push(...members);
  }

  const itemRows = allItems.map((item) =>
    [
      uuidLiteral(item.id),
      uuidLiteral(item.organizationId),
      escapeSql(item.name),
      escapeSql(item.description),
      escapeSql(item.sku),
      String(item.quantityOnHand),
      String(item.lowStockThreshold),
      escapeSql(item.location),
      String(item.defaultUnitCost),
      uuidLiteral(item.createdBy),
      `NOW() - INTERVAL '${rng.int(1, 180)} days'`,
      `NOW() - INTERVAL '${rng.int(0, 30)} days'`,
    ].join(', '),
  );

  const groupRows = allGroups.map((group) =>
    [
      uuidLiteral(group.id),
      uuidLiteral(group.organizationId),
      escapeSql(group.name),
      escapeSql(group.description),
      `'${group.status}'::verification_status`,
      escapeSql(group.notes),
      escapeSql(group.evidenceUrl),
      uuidLiteral(group.createdBy),
      uuidLiteral(group.verifiedBy),
      group.verifiedBy ? `NOW() - INTERVAL '${rng.int(1, 90)} days'` : 'NULL',
      `NOW() - INTERVAL '${rng.int(30, 180)} days'`,
    ].join(', '),
  );

  const identifierRows = allIdentifiers.map((ident) =>
    [
      uuidLiteral(ident.id),
      uuidLiteral(ident.organizationId),
      `'${ident.identifierType}'::part_identifier_type`,
      escapeSql(ident.rawValue),
      escapeSql(ident.normValue),
      uuidLiteral(ident.inventoryItemId),
      escapeSql(ident.manufacturer),
      escapeSql(ident.notes),
      uuidLiteral(ident.createdBy),
      `NOW() - INTERVAL '${rng.int(1, 120)} days'`,
    ].join(', '),
  );

  const memberRows = allMembers.map((member) =>
    [
      uuidLiteral(member.id),
      uuidLiteral(member.groupId),
      uuidLiteral(member.partIdentifierId),
      uuidLiteral(member.inventoryItemId),
      String(member.isPrimary),
      escapeSql(member.notes),
      `NOW() - INTERVAL '${rng.int(1, 90)} days'`,
    ].join(', '),
  );

  const sql = renderSeedFile({
    fileTitle: 'Generated Seed Data - Bulk Inventory & Part Alternates',
    descriptionLines: [
      `Scale: ${scale} (${allItems.length} items, ${allGroups.length} groups, ${allIdentifiers.length} identifiers)`,
      'Depends on committed durable-core seeds (organizations, users).',
    ],
    sections: [
      {
        title: 'INVENTORY ITEMS',
        insert: {
          table: 'public.inventory_items',
          columns: [
            'id', 'organization_id', 'name', 'description', 'sku',
            'quantity_on_hand', 'low_stock_threshold', 'location',
            'default_unit_cost', 'created_by', 'created_at', 'updated_at',
          ],
          rows: itemRows,
        },
      },
      {
        title: 'PART ALTERNATE GROUPS',
        insert: {
          table: 'public.part_alternate_groups',
          columns: [
            'id', 'organization_id', 'name', 'description', 'status',
            'notes', 'evidence_url', 'created_by', 'verified_by', 'verified_at', 'created_at',
          ],
          rows: groupRows,
        },
      },
      {
        title: 'PART IDENTIFIERS',
        insert: {
          table: 'public.part_identifiers',
          columns: [
            'id', 'organization_id', 'identifier_type', 'raw_value', 'norm_value',
            'inventory_item_id', 'manufacturer', 'notes', 'created_by', 'created_at',
          ],
          rows: identifierRows,
        },
      },
      {
        title: 'PART ALTERNATE GROUP MEMBERS',
        insert: {
          table: 'public.part_alternate_group_members',
          columns: ['id', 'group_id', 'part_identifier_id', 'inventory_item_id', 'is_primary', 'notes', 'created_at'],
          rows: memberRows,
        },
      },
    ],
  });

  return {
    sql,
    items: allItems,
    summary: {
      items: allItems.length,
      groups: allGroups.length,
      identifiers: allIdentifiers.length,
      members: allMembers.length,
    },
  };
}
