import { Camera, QrCode, Receipt, UserCircle } from 'lucide-react';
import type { Benefit } from '@/pages/features/data/featurePageTypes';

export const repairShopWorkflows: Benefit[] = [
  {
    icon: QrCode,
    iconColor: 'info',
    title: 'Scan at the counter',
    subtitle: "QR on the customer's machine",
    description:
      'A machine hits the lot. You scan the sticker. The full service record is on the phone. You are not flipping through a binder or a spreadsheet.',
    benefits: ['Scan and the record is there', 'Full service history'],
    benefitColor: 'info',
  },
  {
    icon: Camera,
    iconColor: 'info',
    title: 'Photos on the work order',
    subtitle: 'Techs shoot damage from the phone',
    description:
      'Techs take photos on the job. Damage, work in progress, and the finished machine stay on that work order. They do not live in a text thread you cannot find next year.',
    benefits: ['Upload from the phone', 'Tied to that job'],
    benefitColor: 'info',
  },
  {
    icon: UserCircle,
    iconColor: 'info',
    title: 'Who owns the machine',
    subtitle: 'Equipment linked to the customer',
    description:
      'Every machine belongs to someone. Open the customer and see what you have worked on, and when they are due back.',
    benefits: ['Equipment tied to owners', 'What you serviced last'],
    benefitColor: 'info',
  },
  {
    icon: Receipt,
    iconColor: 'info',
    title: 'QuickBooks invoicing',
    subtitle: 'Finished job to invoice in one click',
    description:
      'When the work order is done, export it to QuickBooks Online as a draft. Labor and parts come with it. Stop re-entering billable hours into your accounting software.',
    benefits: ['One-click QB export', 'Team to customer mapping', 'Export history and status'],
    benefitColor: 'info',
  },
];
