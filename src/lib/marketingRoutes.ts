/**
 * Single source of truth for public marketing URLs that are indexable (sitemap + prerender).
 * Keep in sync with `src/App.tsx` public routes.
 */

export type MarketingRoute = {
  path: string;
  priority: string;
  changefreq: string;
  /** Same `title` prop as `PageSEO` for this path (see `src/components/seo/PageSEO.tsx`). */
  title: string;
  description: string;
  /** Primary visible heading in prerendered HTML. */
  heading: string;
  /** Short label for crawlable nav links (defaults to `heading` in generator). */
  navLabel?: string;
  /** Canonical URL path for `<link rel="canonical">` (`/` for `/landing`). */
  canonicalPath?: string;
  /** Two or more paragraphs for non-JS crawlers. */
  bodyParagraphs: readonly [string, string, ...string[]];
};

const BASE = 'https://equipqr.app';

export function resolveFullDocumentTitle(route: MarketingRoute): string {
  return resolveCanonicalPath(route) === '/' ? route.title : `${route.title} | EquipQR`;
}

export function resolveCanonicalPath(route: MarketingRoute): string {
  const path = route.canonicalPath ?? route.path;
  if (!path.startsWith('/')) {
    throw new Error(`Invalid canonical path for ${route.path}: ${path}`);
  }
  return path;
}

export function resolveCanonicalUrl(route: MarketingRoute): string {
  return `${BASE}${resolveCanonicalPath(route)}`;
}

/**
 * Order matches legacy `scripts/generate-sitemap.mjs` (now `scripts/generate-sitemap.ts`) PUBLIC_ROUTES for stable sitemap output.
 */
export const MARKETING_ROUTES: readonly MarketingRoute[] = [
  {
    path: '/',
    priority: '1.0',
    changefreq: 'weekly',
    title: 'EquipQR | Free Work Order Software for Heavy Equipment Repair Shops',
    description:
      'Stop losing money to lost work orders. EquipQR gives heavy equipment repair shops secure QR code equipment tracking, team-based access, and one-click QuickBooks work order invoicing.',
    heading: 'Free Work Order Software for Heavy Equipment Repair Shops',
    navLabel: 'Home',
    bodyParagraphs: [
      'Stop losing money to lost work orders. EquipQR gives heavy equipment repair shops secure QR code equipment tracking, team-based access, and one-click QuickBooks work order invoicing.',
      'Scan equipment QR codes in the field, organize teams with role-based access, and close the loop from request to invoice without spreadsheets or paper folders.',
      'Explore feature pages or create a free account to put your first scan live in minutes.',
    ],
  },
  {
    path: '/landing',
    priority: '0.9',
    changefreq: 'monthly',
    title: 'EquipQR | Free Work Order Software for Heavy Equipment Repair Shops',
    description:
      'Stop losing money to lost work orders. EquipQR gives heavy equipment repair shops secure QR code equipment tracking, team-based access, and one-click QuickBooks work order invoicing.',
    heading: 'EquipQR Marketing Home',
    navLabel: 'Landing',
    canonicalPath: '/',
    bodyParagraphs: [
      'This URL exists for backward compatibility. The canonical marketing home is the root path (/).',
      'EquipQR helps heavy equipment repair shops track equipment with QR codes, manage work orders, collaborate in teams, and export billing to QuickBooks Online.',
      'Use the navigation below to read feature pages, legal policies, or sign up from the interactive app.',
    ],
  },
  {
    path: '/solutions/repair-shops',
    priority: '0.8',
    changefreq: 'monthly',
    title: 'Built for Repair Shops',
    description:
      'Streamline your repair operations with QR code tracking, photo documentation, and customer management—all completely free. Built specifically for repair shops.',
    heading: 'Built for Repair Shops',
    navLabel: 'Repair shops',
    bodyParagraphs: [
      'Streamline your repair operations with QR code tracking, photo documentation, and customer management—all completely free.',
      'EquipQR is built for shops that need equipment history, technician mobile workflows, and repeatable PM templates without enterprise complexity.',
    ],
  },
  {
    path: '/features/pm-templates',
    priority: '0.8',
    changefreq: 'monthly',
    title: 'PM Templates',
    description:
      'Create reusable preventative maintenance templates with checklists, schedules, and equipment compatibility rules. Standardize maintenance procedures across your fleet.',
    heading: 'PM Templates',
    bodyParagraphs: [
      'Create reusable preventative maintenance templates with checklists, schedules, and equipment compatibility rules. Standardize maintenance procedures across your fleet.',
      'Ship inspections faster with templates your technicians can execute from mobile devices and attach to work orders for audit-ready documentation.',
    ],
  },
  {
    path: '/features/inventory',
    priority: '0.8',
    changefreq: 'monthly',
    title: 'Inventory Management',
    description:
      'Track parts, materials, and supplies with real-time stock levels, location management, and equipment compatibility rules. Never run out of critical parts.',
    heading: 'Inventory Management',
    bodyParagraphs: [
      'Track parts and supplies with real-time stock levels, low stock alerts, and transaction history. Link inventory to equipment for compatibility tracking and streamlined work order workflows.',
      'Know what is on hand, where it lives, and which alternates you can substitute before technicians arrive on site.',
    ],
  },
  {
    path: '/features/part-lookup-alternates',
    priority: '0.8',
    changefreq: 'monthly',
    title: 'Part Lookup & Alternates',
    description:
      'Find compatible parts quickly with intelligent search. Discover OEM, aftermarket, and cross-reference alternatives. Link parts to equipment for instant compatibility.',
    heading: 'Part Lookup & Alternates',
    navLabel: 'Part lookup',
    bodyParagraphs: [
      'Quickly find parts by part number and discover interchangeable alternatives. Search inventory, external catalogs, and alternate part groups—all in one place.',
      'Reduce downtime by surfacing approved alternates and cross-references before you place an emergency order.',
    ],
  },
  {
    path: '/features/qr-code-integration',
    priority: '0.8',
    changefreq: 'monthly',
    title: 'QR Code Integration',
    description:
      'Instantly access equipment details, work orders, and maintenance history with QR code scanning. Generate labels and streamline field operations from any device.',
    heading: 'QR Code Integration',
    navLabel: 'QR codes',
    bodyParagraphs: [
      'Instantly access equipment details, work orders, and maintenance history with QR code scanning. Generate labels and streamline field operations from any device.',
      'Technicians jump straight into the right record after a scan—no phone trees, no re-typing unit numbers.',
    ],
  },
  {
    path: '/features/google-workspace',
    priority: '0.8',
    changefreq: 'monthly',
    title: 'Google Workspace Integration',
    description:
      'Connect your Google Workspace to import users from your directory. Sync members, assign roles, and let users sign in with Google for seamless access.',
    heading: 'Google Workspace Integration',
    navLabel: 'Google Workspace',
    bodyParagraphs: [
      'Connect your Google Workspace to import users from your directory. Sync members, assign roles, and let users sign in with Google for seamless access.',
      'Keep identity aligned with IT-managed groups while EquipQR enforces organization and team permissions.',
    ],
  },
  {
    path: '/features/quickbooks',
    priority: '0.8',
    changefreq: 'monthly',
    title: 'QuickBooks Integration',
    description:
      'Connect QuickBooks Online and export completed work orders as draft invoices. Map teams to customers and streamline billing from EquipQR™.',
    heading: 'QuickBooks Integration',
    navLabel: 'QuickBooks',
    bodyParagraphs: [
      'Connect QuickBooks Online and export completed work orders as draft invoices. Map teams to customers and streamline billing from EquipQR.',
      'Finished field work becomes draft invoices with fewer manual line items and less re-keying in accounting.',
    ],
  },
  {
    path: '/features/work-order-management',
    priority: '0.8',
    changefreq: 'monthly',
    title: 'Work Order Management',
    description:
      'Create, assign, and track work orders with intelligent workflows. Monitor progress and ensure nothing falls through the cracks—from request to completion.',
    heading: 'Work Order Management',
    navLabel: 'Work orders',
    bodyParagraphs: [
      'Create, assign, and track work orders with intelligent workflows. Monitor progress and ensure nothing falls through the cracks—from request to completion.',
      'Standardize statuses, due dates, assignments, and PM checklist evidence so every job stays visible from intake to close-out.',
    ],
  },
  {
    path: '/features/team-collaboration',
    priority: '0.8',
    changefreq: 'monthly',
    title: 'Team Collaboration',
    description:
      'Organize teams across multiple organizations with role-based access control. Track performance and distribute workload efficiently.',
    heading: 'Team Collaboration',
    navLabel: 'Teams',
    bodyParagraphs: [
      'Organize teams across multiple organizations with role-based access control. Track performance and distribute workload efficiently.',
      'EquipQR separates organization roles from team roles so vendors, customers, and internal staff see only what they should.',
    ],
  },
  {
    path: '/features/fleet-visualization',
    priority: '0.8',
    changefreq: 'monthly',
    title: 'Fleet Visualization',
    description:
      'Interactive map showing equipment last confirmed locations, status, and PM clusters. Plan maintenance routes and see your fleet at a glance.',
    heading: 'Fleet Visualization',
    navLabel: 'Fleet map',
    bodyParagraphs: [
      'Interactive map showing equipment last confirmed locations, status, and PM clusters. Plan maintenance routes and see your fleet at a glance.',
      'Turn location history and status signals into a single operational picture instead of tab-hopping across spreadsheets.',
    ],
  },
  {
    path: '/features/customer-crm',
    priority: '0.8',
    changefreq: 'monthly',
    title: 'Customer CRM',
    description: 'Link equipment to specific customers. Maintain a permanent service history for every client asset.',
    heading: 'Customer CRM',
    navLabel: 'Customer CRM',
    bodyParagraphs: [
      'Link equipment to specific customers. Maintain a permanent service history for every client asset.',
      'See which units belong to which owners, what you have serviced, and what is coming due—all tied back to work orders.',
    ],
  },
  {
    path: '/features/mobile-first-design',
    priority: '0.8',
    changefreq: 'monthly',
    title: 'Mobile-First Design',
    description:
      'Native mobile experience for field technicians. Work offline and sync when connected. Optimized for all devices.',
    heading: 'Mobile-First Design',
    navLabel: 'Mobile',
    bodyParagraphs: [
      'Native mobile experience for field technicians. Work offline and sync when connected. Optimized for all devices.',
      'Technician workflows stay fast on phones and tablets so adoption happens where the work actually happens.',
    ],
  },
  {
    path: '/terms-of-service',
    priority: '0.3',
    changefreq: 'yearly',
    title: 'Terms of Service',
    description:
      'Review the Terms of Service for EquipQR, the fleet equipment management platform by Columbia Cloudworks LLC. Covers accounts, billing, data, and liability.',
    heading: 'Terms of Service',
    bodyParagraphs: [
      'Review the Terms of Service for EquipQR, the fleet equipment management platform by Columbia Cloudworks LLC.',
      'This page summarizes legal terms; the full agreement is available in the application when you sign in or create an account.',
    ],
  },
  {
    path: '/privacy-policy',
    priority: '0.3',
    changefreq: 'yearly',
    title: 'Privacy Policy',
    description:
      "EquipQR's comprehensive privacy policy. Learn exactly what data we collect, which service providers process it, how we protect it, and what rights you have.",
    heading: 'Privacy Policy',
    bodyParagraphs: [
      'EquipQR is committed to describing in plain language what we collect, why we collect it, and your privacy rights.',
      'Read the live policy in the app for the full detail, sections, and tables referenced by compliance workflows.',
    ],
  },
] as const;

export const EXPECTED_MARKETING_ROUTE_COUNT = 16;
