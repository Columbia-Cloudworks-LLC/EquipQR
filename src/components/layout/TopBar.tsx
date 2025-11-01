
import React from 'react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from '@/components/ui/breadcrumb';
import NotificationBell from '@/components/notifications/NotificationBell';
import { useSimpleOrganization } from '@/hooks/useSimpleOrganization';

interface TopBarProps {
  title?: string;
  breadcrumb?: string;
}

const TopBar: React.FC<TopBarProps> = ({ title, breadcrumb }) => {
  const { organizationId } = useSimpleOrganization();

  return (
    <header 
      className="flex h-14 sm:h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12 border-b sm:border-b-0"
    >
      <div className="flex items-center gap-2 px-3 sm:px-4 w-full text-foreground">
        <SidebarTrigger className="-ml-1 flex-shrink-0" />
        <Separator orientation="vertical" className="mr-2 h-4 hidden sm:block border-border" />
        <div className="flex-1 min-w-0">
          {breadcrumb && (
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage className="text-sm sm:text-base truncate">{breadcrumb}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          )}
          {title && !breadcrumb && (
            <h1 className="text-base sm:text-lg font-semibold truncate">{title}</h1>
          )}
        </div>
        {/* Notification Bell on the right side */}
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
