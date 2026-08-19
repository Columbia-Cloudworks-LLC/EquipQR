import { ClipboardList, UserCheck, Calendar, ListChecks } from 'lucide-react';
import { landingImage } from '@/lib/landingImage';
import type { Benefit, FeaturePageContent, ImageScreenshot, Step } from './featurePageTypes';

export const content: FeaturePageContent = {
  benefitsTitle: 'Every job stays on the board',
  benefitsDescription:
    'Statuses, assignees, and due dates sit on the work order. The shop floor can see what is open without a call to the office.',
  stepsTitle: 'How it works',
  stepsDescription: 'Create the job, assign it, close it. PM checklists and parts stay on the same record.',
  showcaseTitle: 'Work order board',
  showcaseDescription: 'Filter by status, priority, or assignee. Open a job to finish the checklist.',
  showcaseClassName: 'bg-muted/30',
  ctaTitle: 'Create the first work order',
  ctaDescription:
    'Open a job on a machine, assign it, and keep the history on that unit.',
  ctaPrimaryText: 'Create the first work order',
};

export const benefits: Benefit[] = [
  {
    icon: UserCheck,
    iconColor: 'success',
    title: 'Assign the job',
    subtitle: 'A tech or a team, then they accept',
    description:
      'Assign a work order to a technician or a team. They accept before starting. Reassign if the first person cannot take it.',
    benefits: ['Team or individual', 'Accept before start'],
    benefitColor: 'success',
  },
  {
    icon: ListChecks,
    iconColor: 'info',
    title: 'Status on the board',
    subtitle: 'Draft, open, done, cancelled',
    description:
      'Filter by status, priority, machine, or assignee. PM checklists, parts, and notes sit on the same work order.',
    benefits: ['Status and priority filters', 'PM, parts, and notes'],
    benefitColor: 'info',
  },
  {
    icon: Calendar,
    iconColor: 'warning',
    title: 'Due dates and overdue',
    subtitle: 'Urgent work at the top',
    description:
      'Set a due date and a priority. Filters and the dashboard show what is overdue or coming up this week.',
    benefits: ['Due dates and priority', 'Overdue on the dashboard'],
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
      'View all work orders with filters by status, priority, assignee, or equipment. Spot overdue items and drill into details. Create and assign new work from the same view.',
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
