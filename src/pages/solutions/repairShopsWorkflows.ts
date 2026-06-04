import { Camera, QrCode, Receipt, UserCircle } from 'lucide-react';
import type { Benefit } from '@/pages/features/data/featurePageTypes';

export const repairShopWorkflows: Benefit[] = [
  {
    icon: QrCode,
    iconColor: 'info',
    title: 'Instant Intake',
    subtitle: 'QR codes for customer equipment',
    description:
      'When a customer brings in equipment, scan the QR code to instantly access the complete service history. No more searching through paper files or spreadsheets. Every piece of equipment gets a unique QR code that links directly to its full record.',
    benefits: ['Instant equipment lookup', 'Complete service history', 'Mobile-optimized scanning'],
    benefitColor: 'info',
  },
  {
    icon: Camera,
    iconColor: 'info',
    title: 'Photo Evidence',
    subtitle: 'Technicians uploading damage photos to work orders',
    description:
      'Technicians can capture and upload photos directly to work orders from their mobile devices. Document damage, repairs in progress, and completed work with visual evidence that stays permanently linked to each service record.',
    benefits: ['Mobile photo uploads', 'Permanent documentation', 'Visual service history'],
    benefitColor: 'info',
  },
  {
    icon: UserCircle,
    iconColor: 'info',
    title: 'Customer Profiles',
    subtitle: 'Linking equipment to owners',
    description:
      "Link every piece of equipment to its owner. Build comprehensive customer profiles that show all equipment serviced, complete service history, and maintenance schedules. Know exactly what you've worked on for each customer.",
    benefits: ['Customer equipment tracking', 'Complete service history', 'Relationship management'],
    benefitColor: 'info',
  },
  {
    icon: Receipt,
    iconColor: 'info',
    title: 'QuickBooks Invoicing',
    subtitle: 'Finished job → invoice in one click',
    description:
      'When a work order is complete, export it directly to QuickBooks Online as a draft invoice. Work order details, labor, and parts flow in automatically. No re-entering data in your accounting software.',
    benefits: ['One-click QB export', 'Team → customer mapping', 'Export history & status'],
    benefitColor: 'info',
  },
];
