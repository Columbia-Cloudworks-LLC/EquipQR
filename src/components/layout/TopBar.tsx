
import React from 'react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import NotificationBell from '@/components/notifications/NotificationBell';
import { useOrganization } from '@/contexts/OrganizationContext';
import ContextBreadcrumb from './ContextBreadcrumb';
import QuickBooksStatusIndicator from './QuickBooksStatusIndicator';

const TopBar: React.FC = () => {
  const { organizationId } = useOrganization();

  return (
    <header
      className="flex h-14 sm:h-16 shrink-0 items-center gap-2 transition-none group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12 border-b sm:border-b-0"
    >
      <div className="flex items-center gap-2 px-3 sm:px-4 w-full text-foreground">
        <SidebarTrigger className="-ml-1 flex-shrink-0" />
        <Separator orientation="vertical" className="mr-2 h-4 hidden sm:block border-border" />

        <div className="flex-1 min-w-0 flex items-center gap-2">
          <ContextBreadcrumb />
        </div>

        {organizationId && (
          <div className="flex items-center gap-1 sm:gap-2">
            <QuickBooksStatusIndicator organizationId={organizationId} />
            <NotificationBell organizationId={organizationId} />
          </div>
        )}
      </div>
    </header>
  );
};

export default TopBar;
