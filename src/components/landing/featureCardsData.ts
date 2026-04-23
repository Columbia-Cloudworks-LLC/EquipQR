import {
  Smartphone,
  Receipt,
  ScanLine,
  Wrench,
  MapPin,
  Users,
  ClipboardCheck,
  Package,
  type LucideIcon,
} from 'lucide-react';

export interface FeatureCard {
  icon: LucideIcon;
  title: string;
  description: string;
}

/**
 * Single feature cards for the every-3rd-cycle national map view.
 * The orchestrator picks one card per national cycle (deterministic on
 * cycleSeed) and displays it horizontally below the US map. One card per
 * cycle gives the user enough time to read the single sentence.
 */
export const FEATURE_CARDS: FeatureCard[] = [
  {
    icon: Smartphone,
    title: 'Mobile-first',
    description: 'Open the right job from a phone, in the field',
  },
  {
    icon: ScanLine,
    title: 'Scan to record',
    description: 'One QR scan loads service history and details',
  },
  {
    icon: Receipt,
    title: 'QuickBooks sync',
    description: 'Approved work orders post invoices automatically',
  },
  {
    icon: ClipboardCheck,
    title: 'PM templates',
    description: 'Configure once, schedule across your fleet',
  },
  {
    icon: Package,
    title: 'Asset history',
    description: 'Every machine carries its full service record',
  },
  {
    icon: MapPin,
    title: 'Fleet map',
    description: 'See where your equipment lives, anywhere in the US',
  },
  {
    icon: Users,
    title: 'Multi-org & teams',
    description: 'Workspaces with role-based access for your crew',
  },
  {
    icon: Wrench,
    title: 'Built for shops',
    description: 'Heavy-equipment workflows, not a generic CMMS',
  },
];
