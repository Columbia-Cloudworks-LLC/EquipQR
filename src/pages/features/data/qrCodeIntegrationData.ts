import { QrCode, ScanLine, Smartphone, Tags } from 'lucide-react';
import { landingImage } from '@/lib/landingImage';
import type { Benefit, FeaturePageContent, ImageScreenshot, Step } from './featurePageTypes';

type Screenshot = ImageScreenshot;

export const heroIcon = QrCode;

export const content: FeaturePageContent = {
  benefitsTitle: 'One scan opens the machine',
  benefitsDescription:
    'A tech scans the sticker and lands on that unit. History, work orders, and PM checklists. No typing a serial number in the yard.',
  stepsTitle: 'How it works',
  stepsDescription: 'Print labels, stick them on machines, scan on the job.',
  showcaseTitle: 'QR labels',
  showcaseDescription:
    'Print from the equipment record. Scan with any phone camera.',
  showcaseClassName: 'bg-muted/30',
  ctaTitle: 'Print the first labels',
  ctaDescription:
    'Create a free account, generate labels, and stick them on the fleet.',
  ctaPrimaryText: 'Print the first labels',
};

export const benefits: Benefit[] = [
  {
    icon: ScanLine,
    iconColor: 'success',
    title: 'Scan the sticker',
    subtitle: 'One scan, full history',
    description:
      'Scan a QR label on any machine to open its details, service history, and open work orders. No typing a serial number in the yard.',
    benefits: ['No serial lookup', 'History on the phone'],
    benefitColor: 'success',
  },
  {
    icon: Smartphone,
    iconColor: 'info',
    title: 'Every scan is logged',
    subtitle: 'Who opened what, and when',
    description:
      'Each scan can be logged. Know when a unit was opened, and link the scan to work-order check-in or a finished PM.',
    benefits: ['Scan to work order', 'Check-in and PM links'],
    benefitColor: 'info',
  },
  {
    icon: Tags,
    iconColor: 'warning',
    title: 'Print labels',
    subtitle: 'Stick them on the fleet',
    description:
      'Generate QR labels for equipment and inventory from the app. Print a size that fits, stick it on the machine, and start scanning.',
    benefits: ['Equipment and parts labels', 'Print from the record'],
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
      "Use your phone camera or the in-app QR scanner to scan any label. You're redirected directly to that equipment's or item's page. Public links skip login when you configure them that way.",
  },
  {
    number: 3,
    title: 'View Details & History',
    description:
      'Access specs, maintenance history, active work orders, and linked documents. Create or accept work orders from the same screen when signed in.',
  },
];

export const showcases: Screenshot[] = [
  {
    kind: 'image',
    imageUrl: landingImage('equipment-qr-code-modal-2026-04.png'),
    imageAlt: 'EquipQR Equipment QR Code modal showing scannable QR code with equipment URL and download options',
    title: 'Equipment QR Codes',
    description:
      'Each piece of equipment gets its own unique QR code. Technicians scan the code with any smartphone camera to open equipment details, maintenance history, and active work orders. No app download required.',
  },
  {
    kind: 'image',
    imageUrl: landingImage('equipment-list-2026-04.png'),
    imageAlt: 'EquipQR Equipment list showing QR code buttons on each equipment card with team assignments and last maintenance dates',
    title: 'Quick Access from Equipment List',
    description:
      'Every equipment card includes a QR code button. View, download, or print QR codes from your equipment list without opening each detail page.',
  },
];
