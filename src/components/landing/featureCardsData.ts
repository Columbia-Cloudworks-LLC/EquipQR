import {
  Smartphone,
  Receipt,
  ScanLine,
  Wrench,
  MapPin,
  Users,
  ClipboardCheck,
  Package,
  WifiOff,
  type LucideIcon,
} from 'lucide-react';

export interface FeatureCard {
  icon: LucideIcon;
  title: string;
  description: string;
}

export interface FeatureCardSet {
  /** Theme label — not displayed, but useful for documentation. */
  theme: string;
  cards: [FeatureCard, FeatureCard, FeatureCard];
}

/**
 * Feature card sets for the every-3rd-cycle national map view.
 * Three thematic sets of three cards each — nine distinct features total.
 * The orchestrator picks one set per national cycle (cycleSeed % 3) so the
 * viewer sees set A then B then C in rotation.
 */
export const FEATURE_CARD_SETS: FeatureCardSet[] = [
  {
    theme: 'In the field',
    cards: [
      {
        icon: Smartphone,
        title: 'Mobile-first',
        description: 'Open the right job from a phone, in the field',
      },
      {
        icon: ScanLine,
        title: 'Scan to record',
        description: 'One QR scan loads service history & details',
      },
      {
        icon: WifiOff,
        title: 'Offline-capable',
        description: 'Crews keep working when the signal drops',
      },
    ],
  },
  {
    theme: 'Back office',
    cards: [
      {
        icon: Receipt,
        title: 'QuickBooks sync',
        description: 'Approved orders post invoices automatically',
      },
      {
        icon: ClipboardCheck,
        title: 'PM templates',
        description: 'Configure once, schedule across your fleet',
      },
      {
        icon: Users,
        title: 'Multi-org & teams',
        description: 'Workspaces with role-based access',
      },
    ],
  },
  {
    theme: 'Equipment lifecycle',
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
      {
        icon: Wrench,
        title: 'Built for shops',
        description: 'Heavy-equipment workflows, not a generic CMMS',
      },
    ],
  },
];
