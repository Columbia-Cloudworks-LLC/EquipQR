/**
 * Shared route-label resolution for the global TopBar / ContextBreadcrumb.
 *
 * Centralized here so both `TopBar.tsx` and `ContextBreadcrumb.tsx` can
 * resolve the human-readable label for the currently active dashboard route
 * (the "section" segment of the breadcrumb) without duplicating the map.
 */

export const ROUTE_LABELS: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/dashboard/equipment': 'Equipment',
  '/dashboard/work-orders': 'Work Orders',
  '/dashboard/fleet-map': 'Fleet Map',
  '/dashboard/inventory': 'Inventory',
  '/dashboard/part-lookup': 'Part Lookup',
  '/dashboard/alternate-groups': 'Part Alternates',
  '/dashboard/teams': 'Teams',
  '/dashboard/organization': 'Organization',
  '/dashboard/pm-templates': 'PM Templates',
  '/dashboard/reports': 'Reports',
  '/dashboard/audit-log': 'Audit Log',
  '/dashboard/settings': 'Settings',
  '/dashboard/support': 'Support',
};

/**
 * Routes where the page content already renders a prominent H1 title.
 * On mobile the top-bar label would duplicate that title, so consumers
 * may suppress the section label and show the compact brand mark instead.
 */
export const ROUTES_WITH_PAGE_H1 = new Set([
  '/dashboard',
  '/dashboard/equipment',
  '/dashboard/work-orders',
  '/dashboard/inventory',
  '/dashboard/fleet-map',
  '/dashboard/teams',
  '/dashboard/reports',
  '/dashboard/pm-templates',
  '/dashboard/audit-log',
  '/dashboard/settings',
  '/dashboard/support',
  '/dashboard/organization',
]);

const MOBILE_DETAIL_PREFIXES = [
  '/dashboard/equipment/',
  '/dashboard/work-orders/',
  '/dashboard/inventory/',
];

export function shouldSuppressLabelOnMobile(pathname: string): boolean {
  if (ROUTES_WITH_PAGE_H1.has(pathname)) return true;
  return MOBILE_DETAIL_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function getPageLabel(pathname: string): string {
  if (ROUTE_LABELS[pathname]) return ROUTE_LABELS[pathname];
  // Match dynamic routes, e.g. /dashboard/equipment/:id
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length >= 2) {
    const base = `/${segments[0]}/${segments[1]}`;
    if (ROUTE_LABELS[base]) return ROUTE_LABELS[base];
  }
  return '';
}
