import { Building2, History, Wrench, UserCircle } from 'lucide-react';
import { landingImage } from '@/lib/landingImage';
import type { Benefit, FeaturePageContent, ImageScreenshot, Step } from './featurePageTypes';

export const content: FeaturePageContent = {
  benefitsTitle: 'Why Use Customer CRM?',
  benefitsDescription:
    'Know who owns what. Track service history per customer, streamline reporting, and keep client relationships organized.',
  stepsTitle: 'How It Works',
  stepsDescription: 'Customer CRM connects clients, equipment, and service history in one place.',
  showcaseTitle: 'See Customer CRM in Action',
  showcaseDescription:
    "Here's what customer-linked equipment and service history look like in the EquipQR™ app.",
  showcaseClassName: 'bg-muted/30',
  ctaTitle: 'Ready to Organize by Customer?',
  ctaDescription:
    'Start using Customer CRM today—completely free. Create your account, add customers, link equipment, and maintain a permanent service history for every client asset.',
  ctaPrimaryText: 'Start Using Customer CRM Free',
};

export const benefits: Benefit[] = [
  {
    icon: Building2,
    iconColor: 'success',
    title: 'Customer Profiles',
    subtitle: 'Organize by client',
    description:
      'Create customer records and link equipment to each client. View all assets and contact info in one place. Perfect for rental companies, dealers, and service providers who manage client equipment.',
    benefits: ['Customer-linked equipment', 'Contact and details', 'Single view per customer'],
    benefitColor: 'success',
  },
  {
    icon: History,
    iconColor: 'info',
    title: 'Service History Tracking',
    subtitle: 'Permanent record per asset',
    description:
      "Every work order and PM completion is stored on the equipment. When equipment is linked to a customer, you have a full service history for that client's assets—ideal for warranty, audits, and reporting.",
    benefits: ['Work order history', 'PM records', 'Audit-ready documentation'],
    benefitColor: 'info',
  },
  {
    icon: Wrench,
    iconColor: 'warning',
    title: 'Equipment Ownership',
    subtitle: 'Clear ownership visibility',
    description:
      'See at a glance which equipment belongs to which customer. Filter work orders and reports by customer. Use this for billing, maintenance summaries, and client-specific dashboards.',
    benefits: ['Ownership attribution', 'Filter by customer', 'Client reporting'],
    benefitColor: 'warning',
  },
];

export const steps: Step[] = [
  {
    number: 1,
    title: 'Create Customers',
    description:
      'Add customer records with name, contact info, and any custom fields. Organize clients by type or segment as needed.',
  },
  {
    number: 2,
    title: 'Link Equipment',
    description:
      'Assign equipment to customers. Each asset is tied to an owner, so you can filter and report by client. Equipment retains its full service history.',
  },
  {
    number: 3,
    title: 'Track Service',
    description:
      'Work orders and PMs are completed as usual. All activity is recorded on the equipment and, by extension, visible in the context of the owning customer.',
  },
  {
    number: 4,
    title: 'Report by Customer',
    description:
      'Filter work orders, equipment, and reports by customer. Use service history for warranty claims, audits, and client-specific maintenance summaries.',
  },
];

export const showcases: ImageScreenshot[] = [
  {
    kind: 'image',
    imageUrl: landingImage('equipment-list-2026-04.png'),
    imageAlt:
      'Equipment list view showing all tracked assets — each piece of equipment can be linked to a customer',
    title: 'Customers & Linked Equipment',
    description:
      'View all customers and their linked equipment. Open a customer to see contact details and every asset you maintain for them. Create and edit customers, then assign equipment.',
  },
  {
    kind: 'image',
    imageUrl: landingImage('team-detail-2026-04.png'),
    imageAlt:
      'Service team detail page showing team members and the equipment they are responsible for',
    title: 'Service Teams & Customer Equipment',
    description:
      'Assign service teams to customer equipment so the right technicians receive work orders. Each team member sees only the assets they are responsible for, keeping customer data organized and access controlled.',
  },
];

export const heroIcon = UserCircle;
