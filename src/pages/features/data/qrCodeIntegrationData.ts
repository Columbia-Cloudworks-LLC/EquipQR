import type { LucideIcon } from 'lucide-react';
import { ScanLine, Smartphone, Tags } from 'lucide-react';
import type { Benefit, Step, Screenshot } from './inventoryManagementData';

export const benefits: Benefit[] = [
  {
    icon: ScanLine,
    iconColor: 'success',
    title: 'Instant Equipment Access',
    subtitle: 'One scan, full context',
    description:
      'Scan a QR label on any asset to open its details, service history, and active work orders. No need to search by ID or serial number—everything is one tap away.',
    benefits: ['Zero manual lookup', 'Full equipment context', 'Works on any smartphone'],
    benefitColor: 'success',
  },
  {
    icon: Smartphone,
    iconColor: 'info',
    title: 'Automated Tracking',
    subtitle: 'Built-in audit trail',
    description:
      'Every scan can be logged for compliance and analytics. Know when and where equipment was accessed, and link scans to work order check-in or PM completion.',
    benefits: ['Scan-to-work-order flow', 'Mobile-optimized scanning', 'Fast, reliable redirects'],
    benefitColor: 'info',
  },
  {
    icon: Tags,
    iconColor: 'warning',
    title: 'Generate Labels',
    subtitle: 'Print and apply with ease',
    description:
      'Generate QR labels for equipment and inventory from the app. Print standard sizes, apply to assets, and start scanning. Labels work with any QR reader or the built-in scanner.',
    benefits: ['Equipment & inventory labels', 'Printable formats', 'In-app scanner'],
    benefitColor: 'warning',
  },
];

export const steps: Step[] = [
  {
    number: 1,
    title: 'Generate QR Labels',
    description:
      'From the equipment or inventory detail view, generate a QR code. Print labels at your preferred size and apply them to assets, bins, or parts.',
  },
  {
    number: 2,
    title: 'Scan in the Field',
    description:
      'Use your phone camera or the in-app QR scanner to scan any label. You\'re redirected directly to that equipment\'s or item\'s page—no login required for public links when configured.',
  },
  {
    number: 3,
    title: 'View Details & History',
    description:
      'Access specs, maintenance history, active work orders, and linked documents. Create or accept work orders from the same screen when signed in.',
  },
  {
    number: 4,
    title: 'Streamline Operations',
    description:
      'Reduce errors and speed up check-ins, PMs, and parts lookup. QR codes work for equipment, inventory items, and custom workflows you build on top.',
  },
];

export const screenshots: Screenshot[] = [
  {
    imageUrl: 'https://supabase.equipqr.app/storage/v1/object/public/landing-page-images/equipment-qr-codes.png',
    imageAlt: 'EquipQR Equipment QR Code modal showing scannable QR code with equipment URL and download options',
    title: 'Equipment QR Codes',
    description:
      'Each piece of equipment gets its own unique QR code. Technicians scan the code with any smartphone camera to instantly access equipment details, maintenance history, and active work orders—no app download required.',
  },
  {
    imageUrl: 'https://supabase.equipqr.app/storage/v1/object/public/landing-page-images/generate-and-print-qr-labels.png',
    imageAlt: 'EquipQR QR Code generation modal with download and print options',
    title: 'Generate & Print Labels',
    description:
      'Generate QR codes from equipment or inventory detail views. Download in PNG format, print at standard sizes, apply to assets, and start scanning. Labels work with any QR reader or the app scanner.',
  },
  {
    imageUrl: 'https://supabase.equipqr.app/storage/v1/object/public/landing-page-images/qr-quick-access-from-equipment-list.png',
    imageAlt: 'EquipQR Equipment list showing QR code buttons on each equipment card',
    title: 'Quick Access from Equipment List',
    description:
      'Every equipment card includes a QR code button for instant access. View, download, or print QR codes directly from your equipment list without navigating to individual detail pages.',
  },
  {
    imageUrl: 'https://supabase.equipqr.app/storage/v1/object/public/landing-page-images/equipment-details-at-a-glance.png',
    imageAlt: 'EquipQR Equipment detail page with QR code button and full equipment information',
    title: 'Equipment Details at a Glance',
    description:
      'When technicians scan a QR code, they land directly on the equipment detail page with all relevant information: specs, maintenance history, work orders, and custom attributes—no searching required.',
  },
];
