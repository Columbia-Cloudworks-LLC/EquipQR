import type { LucideIcon } from 'lucide-react';
import {
  PackageCheck,
  AlertTriangle,
  Link2,
  ListChecks,
  History,
  Settings2,
} from 'lucide-react';

export interface Capability {
  name: string;
  description: string;
  icon: LucideIcon;
}

export interface Benefit {
  icon: LucideIcon;
  iconColor: 'success' | 'warning' | 'info';
  title: string;
  subtitle: string;
  description: string;
  benefits: string[];
  benefitColor: 'success' | 'warning' | 'info';
}

export interface Step {
  number: number;
  title: string;
  description: string;
}

export interface Screenshot {
  imageUrl: string;
  imageAlt: string;
  title: string;
  description: string;
}

export const capabilities: Capability[] = [
  {
    name: 'Parts Catalog',
    description: 'Maintain a central catalog of parts and supplies with part numbers, descriptions, and preferred vendors.',
    icon: ListChecks,
  },
  {
    name: 'Transaction History',
    description: 'Track every receipt, issue, and adjustment with full audit trail. Know who moved what and when.',
    icon: History,
  },
  {
    name: 'Compatibility Rules',
    description: 'Define which parts fit which equipment. Link inventory items to specific makes, models, or equipment types.',
    icon: Link2,
  },
  {
    name: 'Low Stock Alerts',
    description: 'Set minimum quantities and get notified when stock falls below threshold. Never run out of critical parts.',
    icon: AlertTriangle,
  },
  {
    name: 'Equipment Linking',
    description: 'Associate inventory items with equipment for quick lookup during work orders and PM tasks.',
    icon: Settings2,
  },
];

export const benefits: Benefit[] = [
  {
    icon: PackageCheck,
    iconColor: 'success',
    title: 'Real-Time Stock Levels',
    subtitle: 'Always know what\'s on hand',
    description:
      'Track quantities across locations with every receipt, issue, and adjustment recorded. View current stock at a glance and drill into transaction history for any item.',
    benefits: ['Live quantity updates', 'Transaction audit trail', 'Multi-location support'],
    benefitColor: 'success',
  },
  {
    icon: AlertTriangle,
    iconColor: 'warning',
    title: 'Low Stock Alerts',
    subtitle: 'Never run out of critical parts',
    description:
      'Set minimum quantities per item and get notified when stock falls below threshold. Proactively reorder before downtime—integrate with your replenishment workflow.',
    benefits: ['Custom thresholds', 'In-app notifications', 'Reorder visibility'],
    benefitColor: 'warning',
  },
  {
    icon: Link2,
    iconColor: 'info',
    title: 'Equipment Compatibility',
    subtitle: 'Link parts to equipment',
    description:
      'Define which parts fit which equipment via compatibility rules. Technicians see only relevant inventory when working on a unit, and work orders can consume linked parts with one click.',
    benefits: ['Make/model rules', 'Equipment-specific parts', 'Work order integration'],
    benefitColor: 'info',
  },
];

export const steps: Step[] = [
  {
    number: 1,
    title: 'Add Inventory Items',
    description:
      'Create items with part numbers, descriptions, and optional min/max quantities. Organize with categories or custom fields to match your catalog structure.',
  },
  {
    number: 2,
    title: 'Record Transactions',
    description:
      'Log receipts when stock arrives, issues when parts are used, and adjustments for counts or corrections. Every change is tracked with timestamp and user.',
  },
  {
    number: 3,
    title: 'Link to Equipment',
    description:
      'Define compatibility rules so the right parts show up for each equipment type. Use Part Lookup and alternates when creating work orders to pull from inventory quickly.',
  },
  {
    number: 4,
    title: 'Stay Ahead of Stockouts',
    description:
      'Rely on low-stock alerts to reorder before you run out. View dashboards and reports to analyze usage patterns and optimize replenishment.',
  },
];

export const screenshots: Screenshot[] = [
  {
    imageUrl: 'https://supabase.equipqr.app/storage/v1/object/public/landing-page-images/inventory-list.png',
    imageAlt: 'Inventory list view showing parts with stock levels, SKUs, and low stock indicators',
    title: 'Inventory List View',
    description:
      'Browse all inventory items with part numbers, descriptions, current stock levels, and low-stock indicators. Filter, sort, and search to find what you need quickly.',
  },
  {
    imageUrl: 'https://supabase.equipqr.app/storage/v1/object/public/landing-page-images/inventory-detail.png',
    imageAlt: 'Inventory item detail page showing stock information and transaction history',
    title: 'Item Detail & Transaction History',
    description:
      'Open any item to see full details, compatibility rules, linked equipment, and a complete transaction history. Add receipts, issues, and adjustments from one place.',
  },
];
