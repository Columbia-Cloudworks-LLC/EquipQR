import { seedInventory } from '../../user/shared/seed-data';
import type { CatalogFlow } from '../types';

const ITEM = `/dashboard/inventory/${seedInventory.hydraulicOil.id}`;
const DETAIL = ['src/features/inventory/pages/InventoryItemDetail.tsx'];
/** First Apex group in supabase/seeds/25_part_alternate_groups.sql. */
const OIL_FILTER_GROUP = 'b30e8400-e29b-41d4-a716-446655440001';

export const inventoryFlow: CatalogFlow = {
  id: 'inventory',
  title: 'Inventory',
  area: 'Inventory',
  description: 'Parts inventory: list, item detail tabs and quantity adjustment.',
  personas: ['owner', 'technician'],
  screens: [
    {
      id: 'list',
      title: 'Inventory list',
      description: 'Inventory items with QR and per-item actions. Technicians without inventory access see the access-required guard.',
      route: '/dashboard/inventory',
      sources: ['src/features/inventory/pages/InventoryList.tsx'],
    },
    {
      id: 'filters',
      title: 'Inventory filters',
      description: 'Filter sheet for the inventory list.',
      route: '/dashboard/inventory',
      steps: [{ action: 'click', target: { role: 'button', name: /open filters/i } }],
      personas: ['owner'],
      sources: ['src/features/inventory/pages/InventoryList.tsx'],
    },
    {
      id: 'detail',
      title: 'Inventory item: overview',
      description: `"${seedInventory.hydraulicOil.name}" overview tab.`,
      route: ITEM,
      sources: DETAIL,
    },
    {
      id: 'detail-history',
      title: 'Inventory item: transaction history',
      description: 'Quantity changes over time.',
      route: ITEM,
      steps: [{ action: 'click', target: { role: 'tab', name: /^transaction history$/i } }],
      capture: 'page',
      personas: ['owner'],
      sources: DETAIL,
    },
    {
      id: 'detail-compatibility',
      title: 'Inventory item: compatibility',
      description: 'Equipment this part fits.',
      route: ITEM,
      steps: [{ action: 'click', target: { role: 'tab', name: /^compatibility$/i } }],
      capture: 'page',
      personas: ['owner'],
      sources: DETAIL,
    },
    {
      id: 'adjust-quantity',
      title: 'Adjust quantity',
      description: 'Stock adjustment dialog.',
      route: ITEM,
      steps: [{ action: 'click', target: { role: 'button', name: /^adjust quantity$/i } }],
      personas: ['owner'],
      sources: DETAIL,
    },
  ],
};

export const partLookupFlow: CatalogFlow = {
  id: 'part-lookup',
  title: 'Part lookup & alternates',
  area: 'Inventory',
  description: 'Cross-reference a part number or a make/model, and manage alternate part groups.',
  personas: ['owner', 'technician'],
  screens: [
    {
      id: 'lookup',
      title: 'Part lookup',
      description: 'Empty part-number search with suggestions. Technicians without parts access see the access-required guard.',
      route: '/dashboard/part-lookup',
      sources: ['src/features/inventory/pages/PartLookup.tsx'],
    },
    {
      id: 'lookup-results',
      title: 'Part lookup results',
      description: 'Results after tapping a suggested part number.',
      route: '/dashboard/part-lookup',
      steps: [{ action: 'click', target: { role: 'button', name: /^try: CAT-1R-0750$/i } }],
      capture: 'page',
      personas: ['owner'],
      sources: ['src/features/inventory/pages/PartLookup.tsx'],
    },
    {
      id: 'lookup-make-model',
      title: 'Part lookup by make/model',
      description: 'Make/model search tab.',
      route: '/dashboard/part-lookup',
      steps: [{ action: 'click', target: { role: 'tab', name: /^by make\/model$/i } }],
      capture: 'page',
      personas: ['owner'],
      sources: ['src/features/inventory/pages/PartLookup.tsx'],
    },
    {
      id: 'groups',
      title: 'Alternate part groups',
      description: 'List of interchangeable part groups.',
      route: '/dashboard/alternate-groups',
      sources: ['src/features/inventory/pages/AlternateGroupsPage.tsx'],
    },
    {
      id: 'group-detail',
      title: 'Alternate group detail',
      description: 'Members and evidence for one alternate group.',
      route: `/dashboard/alternate-groups/${OIL_FILTER_GROUP}`,
      sources: ['src/features/inventory/pages/AlternateGroupDetail.tsx'],
    },
    {
      id: 'new-group',
      title: 'New alternate group',
      description: 'Create-group dialog.',
      route: '/dashboard/alternate-groups',
      steps: [{ action: 'click', target: { role: 'button', name: /^new alternate part group$/i } }],
      personas: ['owner'],
      sources: ['src/features/inventory/pages/AlternateGroupsPage.tsx'],
    },
  ],
};
