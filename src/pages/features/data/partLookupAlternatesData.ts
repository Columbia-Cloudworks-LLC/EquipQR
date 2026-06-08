import { Search, Zap, GitCompare, DollarSign, Layers, BookOpen, Link2 } from 'lucide-react';
import { landingImage } from '@/lib/landingImage';
import type { Benefit, Capability, FeaturePageContent, ImageScreenshot, Step } from './featurePageTypes';

export const content: FeaturePageContent = {
  benefitsTitle: 'Why Use Part Lookup & Alternates?',
  benefitsDescription:
    'Reduce downtime by finding the right part—or an approved substitute—fast. Fewer wrong orders, less guesswork, and better cost visibility.',
  capabilitiesTitle: 'Key Capabilities',
  capabilitiesDescription:
    'Part Lookup and alternates give you one place to search, compare, and substitute parts across inventory and catalogs.',
  stepsTitle: 'How It Works',
  stepsDescription:
    'Part Lookup and alternates integrate with Inventory Management and work orders for a seamless lookup-to-use workflow.',
  stepsClassName: 'bg-muted/30',
  showcaseTitle: 'See Part Lookup in Action',
  showcaseDescription:
    'Search by part number, OEM number, or description. Results show inventory stock, alternates, and cost at a glance.',
  ctaTitle: 'Ready to Find Parts Faster?',
  ctaDescription:
    'Start using Part Lookup and alternates today—completely free. Create your account and begin searching your inventory and building alternate groups.',
  ctaPrimaryText: 'Start Using Part Lookup Free',
  ctaClassName: 'bg-muted/30',
};

export const benefits: Benefit[] = [
  {
    icon: Zap,
    iconColor: 'success',
    title: 'Fast Part Number Search',
    subtitle: 'Find parts in seconds',
    description:
      'Search by part number, description, or manufacturer. Results include your inventory, alternate groups, and linked cross-references so you never miss a match.',
    benefits: ['Instant search results', 'Fuzzy matching', 'Cross-catalog lookup'],
    benefitColor: 'success',
  },
  {
    icon: GitCompare,
    iconColor: 'info',
    title: 'Alternate Part Discovery',
    subtitle: 'Swap with confidence',
    description:
      'Create alternate groups for interchangeable parts. When the preferred part is unavailable, see approved substitutes with stock levels and use them on work orders without second-guessing.',
    benefits: ['Approved alternates only', 'One-click substitution', 'Reduce downtime'],
    benefitColor: 'info',
  },
  {
    icon: DollarSign,
    iconColor: 'warning',
    title: 'Stock & Cost Comparison',
    subtitle: 'Make informed decisions',
    description:
      'See real-time stock availability and cost for each part and its alternates. Compare options before committing to a work order or purchase, and optimize for availability and budget.',
    benefits: ['Stock visibility', 'Cost comparison', 'Smarter ordering'],
    benefitColor: 'warning',
  },
];

export const capabilities: Capability[] = [
  {
    name: 'Part Number Search',
    description:
      'Search by part number, description, or keyword across your inventory. Fast, fuzzy matching helps you find what you need even with partial IDs.',
    icon: Search,
  },
  {
    name: 'Alternate Groups',
    description:
      'Define groups of interchangeable parts. When one is out of stock, quickly see approved alternates and swap without guesswork.',
    icon: Layers,
  },
  {
    name: 'Cross-Reference',
    description:
      'Link OEM, aftermarket, and manufacturer part numbers. Look up by any number and see all related parts in one place.',
    icon: Link2,
  },
  {
    name: 'Stock Availability',
    description:
      'See real-time stock levels and locations for each part and its alternates. Know instantly what you can use on a work order.',
    icon: Search,
  },
  {
    name: 'Catalog Integration',
    description:
      'Search external catalogs and alternate sources alongside your inventory. Compare availability and cost before ordering.',
    icon: BookOpen,
  },
];

export const steps: Step[] = [
  {
    number: 1,
    title: 'Search by Part Number',
    description:
      'Enter a part number, description, or keyword in Part Lookup. Results include matching inventory items, alternate groups, and cross-references. Filter by availability or equipment compatibility as needed.',
  },
  {
    number: 2,
    title: 'View Alternates & Stock',
    description:
      'Open any part to see its alternate group and stock levels. Compare availability and cost across preferred and alternate options. Use what’s in stock or plan reorders accordingly.',
  },
  {
    number: 3,
    title: 'Use in Work Orders',
    description:
      'When adding parts to a work order, search from Part Lookup or pick from equipment-linked inventory. Select an alternate if the primary is out of stock—consumption and history stay accurate.',
  },
  {
    number: 4,
    title: 'Manage Alternate Groups',
    description:
      'Create and maintain alternate groups in the app. Add or remove equivalents, set preferred parts, and keep cross-references up to date. Part Lookup always reflects your latest data.',
  },
];

export const showcases: ImageScreenshot[] = [
  {
    kind: 'image',
    imageUrl: landingImage('part-lookup-2026-04.png'),
    imageAlt: 'Part Lookup page with search by part number tab and example search suggestions',
    title: 'Search by Part Number or Make/Model',
    description:
      'Enter any OEM, aftermarket, or internal part number and see matching inventory, alternate groups, and cross-references side by side. Switch to the Make/Model tab to filter by equipment type.',
  },
];

export const heroIcon = Search;
