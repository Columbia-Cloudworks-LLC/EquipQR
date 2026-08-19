/**
 * Single source of truth for public marketing URLs that are indexable (sitemap + prerender).
 * Keep in sync with `src/App.tsx` public routes.
 * Feature `/features/*` rows are derived from FEATURE_SEO_BY_PATH.
 *
 * Relative imports are required: Vite loads this graph from `vite.config.ts` via Node ESM
 * (`scripts/generate-marketing-html.ts`), and `tsx scripts/generate-sitemap.ts` does the same.
 * `@/` aliases are Vite/tsconfig.app paths only and fail as `ERR_MODULE_NOT_FOUND` / `UNRESOLVED_IMPORT`.
 */

import { deriveFeatureMarketingRoute } from './featureMarketingDerivation';
import type { MarketingRoute } from './marketingRouteTypes';

export type { MarketingRoute };


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
      'Scan a machine at drop-off and pull its service record on the phone. Photos stay on the work order. Close the job and send a QuickBooks draft.',
    heading: 'Built for Repair Shops',
    navLabel: 'Repair shops',
    bodyParagraphs: [
      'Scan a machine at drop-off and pull its service record on the phone. Photos stay on the work order. Close the job and send a QuickBooks draft.',
      'A loader hits the lot. You scan the sticker. Last service, open issues, and photos are on the phone.',
    ],
  },
  deriveFeatureMarketingRoute({
    path: '/features/pm-templates',
    priority: '0.8',
    changefreq: 'monthly',
    extraBodyParagraphs: [
      'Attach a checklist. Techs work the same items on the phone. The finished record stays on the work order.',
    ],
  }),
  deriveFeatureMarketingRoute({
    path: '/features/inventory',
    priority: '0.8',
    changefreq: 'monthly',
    extraBodyParagraphs: [
      'Know what is on hand, where it lives, and which alternates you can substitute before technicians arrive on site.',
    ],
  }),
  deriveFeatureMarketingRoute({
    path: '/features/part-lookup-alternates',
    priority: '0.8',
    changefreq: 'monthly',
    navLabel: 'Part lookup',
    extraBodyParagraphs: [
      'Search the part number. See stock and approved substitutes before you place an emergency order.',
    ],
  }),
  deriveFeatureMarketingRoute({
    path: '/features/qr-code-integration',
    priority: '0.8',
    changefreq: 'monthly',
    navLabel: 'QR codes',
    extraBodyParagraphs: [
      'Technicians jump straight into the right record after a scan. No phone trees, no re-typing unit numbers.',
    ],
  }),
  deriveFeatureMarketingRoute({
    path: '/features/google-workspace',
    priority: '0.8',
    changefreq: 'monthly',
    navLabel: 'Google Workspace',
    extraBodyParagraphs: [
      'Connect Google Workspace. Import the directory. Techs sign in with the same Google account they already use.',
    ],
  }),
  deriveFeatureMarketingRoute({
    path: '/features/quickbooks',
    priority: '0.8',
    changefreq: 'monthly',
    navLabel: 'QuickBooks',
    extraBodyParagraphs: [
      'Finished field work becomes draft invoices with fewer manual line items and less re-keying in accounting.',
    ],
  }),
  deriveFeatureMarketingRoute({
    path: '/features/work-order-management',
    priority: '0.8',
    changefreq: 'monthly',
    navLabel: 'Work orders',
    extraBodyParagraphs: [
      'Statuses, due dates, assignees, and the PM checklist stay on the work order from intake to close.',
    ],
  }),
  deriveFeatureMarketingRoute({
    path: '/features/team-collaboration',
    priority: '0.8',
    changefreq: 'monthly',
    navLabel: 'Teams',
    extraBodyParagraphs: [
      'Each crew sees its own machines and work orders. Manager, Technician, Requestor, and Viewer roles get different views of the same shop.',
    ],
  }),
  deriveFeatureMarketingRoute({
    path: '/features/fleet-visualization',
    priority: '0.8',
    changefreq: 'monthly',
    navLabel: 'Fleet map',
    extraBodyParagraphs: [
      'Open the map. See last confirmed locations, open work, and machines due for PM. No GPS hardware required.',
    ],
  }),
  deriveFeatureMarketingRoute({
    path: '/features/customer-crm',
    priority: '0.8',
    changefreq: 'monthly',
    navLabel: 'Customer CRM',
    extraBodyParagraphs: [
      'See which units belong to which owners, what you have serviced, and what is coming due. All of it ties back to work orders.',
    ],
  }),
  deriveFeatureMarketingRoute({
    path: '/features/mobile-first-design',
    priority: '0.8',
    changefreq: 'monthly',
    navLabel: 'Mobile',
    extraBodyParagraphs: [
      'Work orders, checklists, and scans run on a phone in the yard. The same account works on a tablet or desktop back at the shop.',
    ],
  }),
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
      'What EquipQR collects, which processors handle it, how we protect it, and what rights you have.',
    heading: 'Privacy Policy',
    bodyParagraphs: [
      'EquipQR is committed to describing in plain language what we collect, why we collect it, and your privacy rights.',
      'Read the live policy in the app for the full detail, sections, and tables referenced by compliance workflows.',
    ],
  },
];

export const EXPECTED_MARKETING_ROUTE_COUNT = 16;
