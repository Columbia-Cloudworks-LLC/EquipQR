import {
  FileCheck,
  CheckCircle2,
  ClipboardCheck,
  Settings2,
  Wrench,
  Truck,
} from 'lucide-react';
import { landingImage } from '@/lib/landingImage';
import type { BuiltInTemplate } from '@/components/landing/features/PmBuiltInTemplatesSection';
import type { Benefit, FeaturePageContent, ShowcaseItem, Step } from './featurePageTypes';

export const content: FeaturePageContent = {
  benefitsTitle: 'Why Use PM Templates?',
  benefitsDescription:
    'Preventative maintenance templates ensure consistent inspections, reduce missed items, and create a permanent maintenance record for every piece of equipment.',
  stepsTitle: 'How It Works',
  stepsDescription: 'PM Templates integrate seamlessly with work orders for a streamlined maintenance workflow.',
  stepsClassName: 'bg-muted/30',
  showcaseTitle: 'See PM Templates in Action',
  showcaseDescription: "Here's what PM Templates look like in the EquipQR™ app.",
  ctaTitle: 'Ready to Standardize Your Maintenance?',
  ctaDescription:
    'Start using PM Templates today—completely free. Create your account and access all built-in templates immediately.',
  ctaPrimaryText: 'Start Using PM Templates Free',
  ctaClassName: 'bg-muted/30',
};

export const benefits: Benefit[] = [
  {
    icon: CheckCircle2,
    iconColor: 'success',
    title: 'Consistent Inspections',
    subtitle: 'Never miss a check item',
    description:
      'Every technician follows the same comprehensive checklist, ensuring consistent quality across all inspections. No more guesswork or forgotten items—just thorough, standardized maintenance every time.',
    benefits: ['Standardized procedures', 'Training simplified', 'Quality assurance'],
    benefitColor: 'success',
  },
  {
    icon: ClipboardCheck,
    iconColor: 'info',
    title: 'Complete Records',
    subtitle: 'Permanent maintenance history',
    description:
      'Every completed checklist is saved as a permanent record attached to the work order. Track what was inspected, who did it, and when—perfect for compliance, audits, and warranty documentation.',
    benefits: ['Audit-ready records', 'Warranty protection', 'Compliance tracking'],
    benefitColor: 'info',
  },
  {
    icon: Settings2,
    iconColor: 'warning',
    title: 'Fully Customizable',
    subtitle: 'Build your own templates',
    description:
      'Start with our built-in templates and customize them to match your specific requirements, or create entirely new templates from scratch. Add sections, items, and descriptions that fit your workflow.',
    benefits: ['Custom templates', 'Flexible sections', 'Equipment-specific'],
    benefitColor: 'warning',
  },
];

export const builtInTemplates: BuiltInTemplate[] = [
  {
    name: 'Forklift PM',
    items: 103,
    sections: 12,
    description:
      'Complete inspection covering visual checks, engine, hydraulics, brakes, electrical, and safety systems.',
    icon: Truck,
  },
  {
    name: 'Excavator PM',
    items: 84,
    sections: 10,
    description:
      'Comprehensive checklist for track-type excavators including undercarriage, boom, and bucket inspection.',
    icon: Wrench,
  },
  {
    name: 'Scissor Lift PM',
    items: 74,
    sections: 9,
    description: 'Safety-focused checklist covering platform, hydraulics, electrical, and emergency systems.',
    icon: ClipboardCheck,
  },
  {
    name: 'Skid Steer PM',
    items: 80,
    sections: 10,
    description:
      'Full inspection template for skid steer loaders including loader arms, hydraulics, and controls.',
    icon: Wrench,
  },
  {
    name: 'Pull Trailer PM',
    items: 65,
    sections: 8,
    description: 'DOT-compliant trailer inspection covering lights, brakes, tires, and coupling systems.',
    icon: Truck,
  },
  {
    name: 'Compressor PM',
    items: 58,
    sections: 7,
    description: 'Industrial compressor maintenance checklist for air systems, filters, and safety valves.',
    icon: Settings2,
  },
];

export const steps: Step[] = [
  {
    number: 1,
    title: 'Create Work Order',
    description:
      'When creating a new work order for preventative maintenance, select a PM template from your available templates. The template is automatically attached to the work order.',
  },
  {
    number: 2,
    title: 'Complete Checklist',
    description:
      'Work through the checklist items organized by section. Mark items as OK, flag issues that need attention, or add notes for specific items. Use "Set All OK" to quickly mark completed sections.',
  },
  {
    number: 3,
    title: 'Save Progress',
    description:
      'Your checklist progress is saved automatically. Come back later to continue where you left off, or complete the inspection in one session. All data is preserved until the work order is completed.',
  },
  {
    number: 4,
    title: 'Permanent Record',
    description:
      'When the work order is completed, the PM checklist becomes a permanent record. Access the full inspection details anytime from the work order history or equipment service records.',
  },
];

export const showcases: ShowcaseItem[] = [
  {
    kind: 'demo-video',
    baseName: 'mobile_create_pm',
    alt: 'Animated mobile demo showing a technician creating a preventative maintenance checklist in EquipQR',
    title: 'Create a PM Checklist from a Phone',
    description:
      'Build a preventative maintenance checklist on a phone from the field. Pick a template, attach it to a work order, and start ticking off items with large touch-friendly controls — no laptop required.',
  },
  {
    kind: 'image',
    imageUrl: landingImage('pm-templates-list-2026-04.png'),
    imageAlt: 'PM Templates List showing 6 global templates including Forklift, Excavator, and Scissor Lift',
    title: 'Browse Available Templates',
    description:
      'View all available PM templates in your organization. Each card shows the template name, description, section count, and quick actions like Apply to Equipment, Clone, or Configure.',
  },
  {
    kind: 'image',
    imageUrl: landingImage('pm-templates-detail-2026-04.png'),
    imageAlt: 'Forklift PM template detail view showing 12 sections and 103 checklist items',
    title: 'Detailed Template View',
    description:
      'Drill into any template to see the full structure. The Forklift PM template includes 12 sections with 103 total items covering visual inspection, engine, hydraulics, brakes, electrical systems, and more.',
  },
];

export const heroIcon = FileCheck;
