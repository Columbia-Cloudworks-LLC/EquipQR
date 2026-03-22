
import React from 'react';
import { useLocation } from 'react-router-dom';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from '@/components/ui/breadcrumb';
import NotificationBell from '@/components/notifications/NotificationBell';
import { useOrganization } from '@/contexts/OrganizationContext';

const ROUTE_LABELS: Record<string, string> = {
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

function getPageLabel(pathname: string): string {
  if (ROUTE_LABELS[pathname]) return ROUTE_LABELS[pathname];
  // Match dynamic routes, e.g. /dashboard/equipment/:id
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length >= 2) {
    const base = `/${segments[0]}/${segments[1]}`;
    if (ROUTE_LABELS[base]) return ROUTE_LABELS[base];
  }
  return '';
}

interface TopBarProps {
  title?: string;
  breadcrumb?: string;
}

const TopBar: React.FC<TopBarProps> = ({ title, breadcrumb }) => {
  const { organizationId } = useOrganization();
  const location = useLocation();

  const pageLabel = breadcrumb ?? title ?? getPageLabel(location.pathname);

  return (
    <header
      className="flex h-14 sm:h-16 shrink-0 items-center gap-2 transition-none group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12 border-b sm:border-b-0"
    >
      <div className="flex items-center gap-2 px-3 sm:px-4 w-full text-foreground">
        <SidebarTrigger className="-ml-1 flex-shrink-0" />
        <Separator orientation="vertical" className="mr-2 h-4 hidden sm:block border-border" />
        <div className="flex-1 min-w-0">
          {pageLabel && (
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage className="text-sm sm:text-base truncate font-medium">{pageLabel}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          )}
        </div>
        {organizationId && (
          <div className="flex items-center gap-2">
            <NotificationBell organizationId={organizationId} />
          </div>
        )}
      </div>
    </header>
  );
};

export default TopBar;
