/** Shared equipment filter option values (labels vary by surface). */

export const EQUIPMENT_STATUS_FILTER_VALUES = [
  'all',
  'active',
  'maintenance',
  'inactive',
  'out_of_service',
] as const;

export type EquipmentStatusFilterValue = (typeof EQUIPMENT_STATUS_FILTER_VALUES)[number];

export const EQUIPMENT_QUICK_FILTERS = [
  { label: 'Maintenance Due', value: 'maintenance-due' },
  { label: 'Warranty Expiring', value: 'warranty-expiring' },
  { label: 'Recently Added', value: 'recently-added' },
  { label: 'Active Only', value: 'active-only' },
] as const;

export type EquipmentQuickFilterValue = (typeof EQUIPMENT_QUICK_FILTERS)[number]['value'];
