import { ClipboardList, UserCheck, Calendar, ListChecks } from 'lucide-react';
import { landingImage } from '@/lib/landingImage';
import type { Benefit, FeaturePageContent, ImageScreenshot, Step } from './featurePageTypes';

export const content: FeaturePageContent = {
  benefitsTitle: 'Why Use Work Order Management?',
  benefitsDescription:
    'Keep maintenance organized with clear statuses, assignments, and due dates. Reduce missed tasks and improve visibility across your team.',
  stepsTitle: 'How It Works',
  stepsDescription: 'Work orders tie equipment, teams, PM templates, and inventory into one workflow.',
  showcaseTitle: 'See Work Order Management in Action',
  showcaseDescription: "Here's what work orders look like in the EquipQR™ app.",
  showcaseClassName: 'bg-muted/30',
  ctaTitle: 'Ready to Organize Your Maintenance?',
  ctaDescription:
    'Start using Work Order Management today—completely free. Create your account and keep every repair and PM tracked from start to finish.',
  ctaPrimaryText: 'Start Using Work Orders Free',
};

export const benefits: Benefit[] = [
  {
    icon: UserCheck,
    iconColor: 'success',
    title: 'Smart Assignment Rules',
    subtitle: 'Assign work efficiently',
    description:
      'Assign work orders to technicians or teams based on skills, availability, or location. Use acceptance workflows so assignees confirm before starting, and reassign when needed.',
    benefits: ['Team-based assignment', 'Acceptance workflow', 'Reassignment support'],
    benefitColor: 'success',
  },
  {
    icon: ListChecks,
    iconColor: 'info',
    title: 'Progress Tracking',
    subtitle: 'See status at a glance',
    description:
      'Track work orders from draft to in progress, completed, or cancelled. Filter by status, priority, equipment, or assignee. Attach PM checklists, parts, and notes for full context.',
    benefits: ['Clear status workflow', 'PM checklist integration', 'Parts and notes'],
    benefitColor: 'info',
  },
  {
    icon: Calendar,
    iconColor: 'warning',
    title: 'Due Date Management',
    subtitle: 'Stay on schedule',
    description:
      'Set due dates and priorities so urgent work rises to the top. Use filters and dashboards to spot overdue or upcoming work and keep maintenance on track.',
    benefits: ['Priority and due dates', 'Overdue visibility', 'Dashboard summaries'],
    benefitColor: 'warning',
  },
];

export const steps: Step[] = [
  {
    number: 1,
    title: 'Create a Work Order',
    description:
      'Link the work order to equipment, add a description, and optionally attach a PM template. Set priority, due date, and assign to a technician or team.',
  },
  {
    number: 2,
    title: 'Assign & Accept',
    description:
      'Assignees receive notifications and can accept or decline. Once accepted, they see the full work order with PM checklist, parts, and equipment details.',
  },
  {
    number: 3,
    title: 'Complete the Work',
    description:
      'Work through the checklist, log parts used, add notes or photos, and update status. Progress saves automatically so nothing is lost.',
  },
  {
    number: 4,
    title: 'Close & Record',
    description:
      'Mark the work order complete. The PM record and service history are stored permanently on the equipment for compliance and future reference.',
  },
];

export const showcases: ImageScreenshot[] = [
  {
    kind: 'image',
    imageUrl: landingImage('work-orders-list-2026-04.png'),
    imageAlt: 'Work orders list with filters by status, priority, and assignee',
    title: 'Work Orders List',
    description:
      'View all work orders with filters by status, priority, assignee, or equipment. Quickly spot overdue items and drill into details. Create and assign new work from the same view.',
  },
  {
    kind: 'image',
    imageUrl: landingImage('work-order-detail-2026-04.png'),
    imageAlt: 'Work order detail page with equipment info, assignee, and PM checklist',
    title: 'Work Order Detail & PM Checklist',
    description:
      'Open any work order to see full context: equipment, assignee, due date, and attached PM template. Complete checklist items, add parts, notes, and photos, then mark complete.',
  },
];

export const heroIcon = ClipboardList;
