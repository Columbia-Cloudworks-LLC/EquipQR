
import React from 'react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useSidebar } from '@/components/ui/sidebar-context';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import NotificationBell from '@/components/notifications/NotificationBell';
import { useOrganization } from '@/contexts/OrganizationContext';
import ContextBreadcrumb from './ContextBreadcrumb';
import QuickBooksStatusIndicator from './QuickBooksStatusIndicator';
import UserProfileMenu from './UserProfileMenu';

const TopBar: React.FC = () => {
  const { organizationId } = useOrganization();
  const { toggleSidebar } = useSidebar();

  return (
    <header
      className="flex min-h-14 sm:min-h-0 sm:h-16 shrink-0 items-center gap-2 transition-none group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12 border-b sm:border-b-0"
    >
      <div className="flex items-center gap-2 px-3 sm:px-4 w-full text-foreground">
        {/* Mobile: brand logo doubles as the sidebar trigger. */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          aria-label="Open menu"
          className="-ml-1 h-8 w-8 p-1 flex-shrink-0 sm:hidden"
        >
          <img
            src="/icons/EquipQR-Icon-Purple-Small.png"
            alt="EquipQR"
            className="h-6 w-6"
          />
        </Button>
        <SidebarTrigger className="-ml-1 flex-shrink-0 hidden sm:inline-flex" />
        <Separator orientation="vertical" className="mr-2 h-4 hidden sm:block border-border" />

        <div className="flex-1 min-w-0 flex items-center gap-2">
          <ContextBreadcrumb />
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          {organizationId && <NotificationBell organizationId={organizationId} />}
          {organizationId && <QuickBooksStatusIndicator organizationId={organizationId} />}
          <UserProfileMenu />
        </div>
      </div>
    </header>
  );
};

export default TopBar;
