/** Shared equipment filter option values (labels vary by surface). */

export const EQUIPMENT_STATUS_FILTER_VALUES = [
  'all',
  'active',
  'maintenance',
  'inactive',
  'out_of_service',
] as const;

export const EQUIPMENT_STATUS_FILTER_LABELS: Record<(typeof EQUIPMENT_STATUS_FILTER_VALUES)[number], string> & Record<string, string> = {
  all: 'All Statuses',
  active: 'Active',
  maintenance: 'Maintenance',
  inactive: 'Inactive',
  out_of_service: 'Out of Service',
};

export const EQUIPMENT_QUICK_FILTERS = [
  { label: 'Maintenance Due', value: 'maintenance-due' },
  { label: 'Warranty Expiring', value: 'warranty-expiring' },
  { label: 'Recently Added', value: 'recently-added' },
  { label: 'Active Only', value: 'active-only' },
] as const;
