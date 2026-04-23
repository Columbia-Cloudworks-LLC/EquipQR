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

export interface FeatureCardSet {
  cards: [FeatureCard, FeatureCard];
}

/**
 * Feature card sets for the every-3rd-cycle national map view.
 * Each set is two thematically-related cards. The orchestrator picks one set
 * per national cycle (deterministic on cycleSeed) and displays the pair
 * alongside the half-stage US map.
 */
export const FEATURE_CARD_SETS: FeatureCardSet[] = [
  // Set 1 — mobile + scanning
  {
    cards: [
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
    ],
  },
  // Set 2 — billing + PM templates
  {
    cards: [
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
    ],
  },
  // Set 3 — assets + map
  {
    cards: [
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
    ],
  },
  // Set 4 — teams + domain fit
  {
    cards: [
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
    ],
  },
];
