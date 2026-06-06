import { Smartphone, WifiOff, Hand, MonitorSmartphone } from 'lucide-react';
import { landingImage } from '@/lib/landingImage';
import type { Benefit, FeaturePageContent, ImageGridScreenshot, Step } from './featurePageTypes';

export const content: FeaturePageContent = {
  benefitsTitle: 'Why Use Mobile-First Design?',
  benefitsDescription:
    'EquipQR™ is built for the field. Technicians get a fast, touch-friendly experience on phones and tablets—even when connectivity is spotty.',
  stepsTitle: 'How It Works',
  stepsDescription: 'EquipQR™ adapts to how you work—in the shop, in the field, or at a desk.',
  showcaseTitle: 'See Mobile-First Design in Action',
  showcaseDescription: "Here's what the EquipQR™ app looks like on mobile and across devices.",
  showcaseClassName: 'bg-muted/30',
  ctaTitle: 'Ready to Work Better in the Field?',
  ctaDescription:
    'Start using EquipQR™ today—completely free. Create your account and use it on any device, with offline support and a touch-optimized experience built for technicians.',
  ctaPrimaryText: 'Start Using EquipQR on Mobile Free',
};

export const benefits: Benefit[] = [
  {
    icon: WifiOff,
    iconColor: 'success',
    title: 'Offline Capability',
    subtitle: 'Work without connectivity',
    description:
      'View equipment, work orders, and PM checklists when you’re offline. Capture updates and complete inspections; data syncs automatically when you’re back online.',
    benefits: ['Offline access to key data', 'Sync when connected', 'No lost work'],
    benefitColor: 'success',
  },
  {
    icon: Hand,
    iconColor: 'info',
    title: 'Touch-Optimized UI',
    subtitle: 'Designed for small screens',
    description:
      'Buttons, lists, and forms are sized for touch. Navigate quickly between equipment, work orders, and PM checklists. QR scanning, form entry, and checklist completion feel natural on a phone.',
    benefits: ['Tap-friendly controls', 'Mobile-friendly forms', 'Fast navigation'],
    benefitColor: 'info',
  },
  {
    icon: MonitorSmartphone,
    iconColor: 'warning',
    title: 'Cross-Platform',
    subtitle: 'Phone, tablet, desktop',
    description:
      'Use EquipQR on any device—iOS, Android, or desktop. The same account and data everywhere. Technicians work on phones in the field; admins manage from larger screens.',
    benefits: ['Works on all devices', 'Responsive layout', 'One app, any screen'],
    benefitColor: 'warning',
  },
];

export const steps: Step[] = [
  {
    number: 1,
    title: 'Access Anywhere',
    description:
      'Log in from your phone, tablet, or computer. The same data and features are available—responsive layout ensures a good experience on any screen size.',
  },
  {
    number: 2,
    title: 'Work Offline When Needed',
    description:
      'In low-signal areas, continue viewing equipment and work orders, and complete PM checklists. Changes sync automatically when you’re back online so nothing is lost.',
  },
  {
    number: 3,
    title: 'Use Touch-Optimized Flows',
    description:
      'Scan QR codes, fill forms, complete checklists, and add parts from your phone. Large tap targets and simple navigation keep field use quick and error-free.',
  },
  {
    number: 4,
    title: 'Switch Devices Seamlessly',
    description:
      'Start on a phone in the field and pick up on a tablet or desktop later. Your account, org, and data stay in sync across all devices.',
  },
];

export const showcases: ImageGridScreenshot[] = [
  {
    kind: 'image-grid',
    images: [
      {
        imageUrl: landingImage('mobile-work-orders-2026-04.png'),
        imageAlt: 'Mobile work orders list showing scan-created and in-progress work orders',
      },
      {
        imageUrl: landingImage('mobile-work-order-detail-2026-04.png'),
        imageAlt: 'Mobile work order detail showing equipment, location, team, and PM checklist status',
      },
      {
        imageUrl: landingImage('mobile-pm-checklist-2026-04.png'),
        imageAlt: 'Mobile PM checklist with completed sections for excavator preventative maintenance',
      },
    ],
    title: 'Mobile Work Orders & PM Checklists',
    description:
      'View and complete work orders on any phone. PM checklists are easy to work through with large touch-friendly controls. See work order status, equipment details, team assignment, and checklist progress — all on one screen.',
  },
];

export const heroIcon = Smartphone;
