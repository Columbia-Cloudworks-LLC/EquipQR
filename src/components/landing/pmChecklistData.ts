import { Receipt, Cloud, FileSpreadsheet, type LucideIcon } from 'lucide-react';

/**
 * PM checklist sections and items — sourced verbatim from
 * src/features/pm-templates/services/preventativeMaintenanceService.ts
 * so the hero animation demo shows actual product content.
 */
export interface PMChecklistItem {
  id: string;
  title: string;
}

export interface PMChecklistSection {
  title: string;
  items: PMChecklistItem[];
}

export const PM_CHECKLIST_SECTIONS: PMChecklistSection[] = [
  {
    title: 'Visual Inspection',
    items: [
      { id: 'oil-leaks',   title: 'Oil/Coolant Leaks' },
      { id: 'tire-wheel',  title: 'Tire & Wheel Condition' },
      { id: 'seat-belt',   title: 'Seat & Seat Belt Condition' },
    ],
  },
  {
    title: 'Engine Compartment',
    items: [
      { id: 'air-filter',  title: 'Check Condition of Air Filter' },
      { id: 'engine-oil',  title: 'Change Engine Oil & Filter' },
    ],
  },
];

/** All 5 items flattened — useful for sequential animation. */
export const ALL_PM_ITEMS: PMChecklistItem[] = PM_CHECKLIST_SECTIONS.flatMap(s => s.items);

export interface ExportTarget {
  label: string;
  icon: LucideIcon;
}

export const EXPORT_TARGETS: ExportTarget[] = [
  { label: 'Export to QuickBooks',   icon: Receipt },
  { label: 'Export to Google Drive', icon: Cloud },
  { label: 'Export to Excel',        icon: FileSpreadsheet },
];
