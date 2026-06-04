import { Receipt, FileSpreadsheet, Link2, RefreshCw } from 'lucide-react';
import { landingImage } from '@/lib/landingImage';
import type { Benefit, FeaturePageContent, ShowcaseItem, Step } from './featurePageTypes';

export const content: FeaturePageContent = {
  benefitsTitle: 'Why Use QuickBooks Integration?',
  benefitsDescription:
    'Turn completed work orders into QuickBooks draft invoices with one click. Map teams to customers, track export history, and keep billing in sync with your maintenance data.',
  stepsTitle: 'How It Works',
  stepsDescription: 'QuickBooks integration links work orders, teams, and customers to your accounting workflow.',
  showcaseTitle: 'See QuickBooks Integration in Action',
  showcaseDescription:
    "Here's what the QuickBooks connection and work order export looks like in the EquipQR™ app.",
  showcaseClassName: 'bg-muted/30',
  ctaTitle: 'Ready to Streamline Billing with QuickBooks?',
  ctaDescription:
    'Start using QuickBooks integration today—completely free. Create your account, connect QuickBooks, map teams to customers, and export work orders as draft invoices.',
  ctaPrimaryText: 'Start Using QuickBooks Integration Free',
};

export const benefits: Benefit[] = [
  {
    icon: FileSpreadsheet,
    iconColor: 'success',
    title: 'Export to Invoices',
    subtitle: 'Work orders → draft invoices',
    description:
      'Export completed work orders to QuickBooks Online as draft invoices. Work order details, labor, and parts flow into the invoice. Review and send from QuickBooks when ready.',
    benefits: ['One-click export', 'Draft invoices in QuickBooks', 'Export history & status'],
    benefitColor: 'success',
  },
  {
    icon: Link2,
    iconColor: 'info',
    title: 'Team–Customer Mapping',
    subtitle: 'Map teams to QuickBooks customers',
    description:
      'Equipment belongs to teams; teams map to QuickBooks customers. When you export a work order, the invoice is created for the customer linked to that equipment’s team. Set up mappings once in team settings.',
    benefits: ['Team → QuickBooks customer', 'Search & select customers', 'Mappings preserved on disconnect'],
    benefitColor: 'info',
  },
  {
    icon: RefreshCw,
    iconColor: 'warning',
    title: 'OAuth Connect',
    subtitle: 'Secure, simple connection',
    description:
      'Connect QuickBooks via OAuth in Organization Settings. Sign in with your Intuit account, authorize EquipQR™, and you’re done. Tokens refresh automatically; reconnect only if needed.',
    benefits: ['Connect in Organization Settings', 'Auto token refresh', 'Sandbox & production'],
    benefitColor: 'warning',
  },
];

export const steps: Step[] = [
  {
    number: 1,
    title: 'Connect QuickBooks',
    description:
      'In Organization Settings → Integrations, connect QuickBooks Online. Authorize via Intuit OAuth. Your org is linked to your QuickBooks company; connection status is shown in settings.',
  },
  {
    number: 2,
    title: 'Map Teams to Customers',
    description:
      'For each team, map to a QuickBooks customer. Work orders for equipment on that team export to that customer’s draft invoices. Use the customer search to find and select the right QuickBooks customer.',
  },
  {
    number: 3,
    title: 'Complete Work Orders',
    description:
      'Complete work orders as usual. Only work orders in “Completed” status can be exported. Ensure the equipment has a team and that team has a QuickBooks customer mapping.',
  },
  {
    number: 4,
    title: 'Export to QuickBooks',
    description:
      'From the work order detail, use “Export to QuickBooks” to create a draft invoice. View export history, open the invoice in QuickBooks, and manage billing there. Re-export is blocked once an invoice exists.',
  },
];

export const showcases: ShowcaseItem[] = [
  {
    kind: 'demo-video',
    baseName: 'mobile_export_to_quickbooks',
    alt: 'Animated mobile demo showing a completed EquipQR work order being exported to QuickBooks Online as a draft invoice',
    title: 'Export a Work Order to QuickBooks on Mobile',
    description:
      'Watch a completed work order flow from EquipQR into a QuickBooks Online draft invoice in a few taps. Labor, parts, and customer mapping carry over so you can review and send the invoice from QuickBooks.',
  },
  {
    kind: 'image',
    imageUrl: landingImage('quickbooks-settings-2026-04.png'),
    imageAlt:
      'Organization Settings showing QuickBooks Online connected, Google Workspace connected, and QR scan location toggle',
    title: 'QuickBooks Connected in Organization Settings',
    description:
      'Connect QuickBooks Online from Organization Settings → Integrations. The connection status badge confirms the OAuth link is active and tokens refresh automatically. No re-authentication needed unless you manually disconnect.',
  },
  {
    kind: 'image',
    imageUrl: landingImage('work-order-detail-2026-04.png'),
    imageAlt: 'Completed work order detail page showing equipment information, PM checklist status, and assignment',
    title: 'Export Completed Work Orders in One Click',
    description:
      'Once a work order is marked Completed, use the Export to QuickBooks action from the work order detail page. The draft invoice is created in your QuickBooks company, linked to the customer mapped to that equipment’s team.',
  },
];

export const heroIcon = Receipt;
