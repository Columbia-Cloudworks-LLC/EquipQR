import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Settings, HelpCircle, Bug, LogOut, User, BookOpen } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useUser } from '@/contexts/useUser';
import { useIsMobile } from '@/hooks/use-mobile';
import { useBugReport } from '@/features/tickets/context/BugReportContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useOrganizationNotifications } from '@/hooks/useOrganizationNotifications';
import NotificationMenuSection from '@/components/notifications/NotificationMenuSection';
import { cn } from '@/lib/utils';
import { SUPPORT_DOCS_URL } from '@/lib/documentationUrl';

interface UserProfileMenuProps {
  className?: string;
}

const UserProfileMenu: React.FC<UserProfileMenuProps> = ({ className }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const { signOut } = useAuth();
  const { currentUser } = useUser();
  const { organizationId } = useOrganization();
  const isMobile = useIsMobile();
  const { openBugReport } = useBugReport();
  const { notifications, unreadCount } = useOrganizationNotifications(organizationId);

  const handleSignOut = async () => {
    await signOut();
  };

  const displayName = currentUser?.name || 'User';
  const displayEmail = currentUser?.email || '';
  const triggerLabel =
    unreadCount > 0
      ? `User menu (${displayName}, ${unreadCount} unread notifications)`
      : `User menu (${displayName})`;

  return (
    <DropdownMenu modal={!isMobile} open={menuOpen} onOpenChange={setMenuOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'relative h-8 w-8 rounded-full text-foreground hover:bg-accent hover:text-accent-foreground',
            className,
          )}
          aria-label={triggerLabel}
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-sidebar-primary text-sidebar-primary-foreground">
            <User className="h-4 w-4" />
          </div>
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-0.5 -right-0.5 h-3.5 min-w-3.5 flex items-center justify-center p-0 text-[9px] font-medium border border-background"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className={cn('rounded-lg', organizationId ? 'w-80' : 'w-56')}
        side="bottom"
        align="end"
        sideOffset={8}
      >
        <DropdownMenuLabel className="flex items-center justify-between gap-2 py-2 pr-1">
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="truncate text-sm font-semibold">{displayName}</span>
            {displayEmail ? (
              <span className="truncate text-xs font-normal text-muted-foreground">
                {displayEmail}
              </span>
            ) : null}
          </div>
          <Button
            variant="ghost"
            size="icon"
            asChild
            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
            aria-label="Settings"
            title="Settings"
          >
            <Link to="/dashboard/settings" onClick={() => setMenuOpen(false)}>
              <Settings className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </DropdownMenuLabel>
        {organizationId ? (
          <NotificationMenuSection
            organizationId={organizationId}
            notifications={notifications}
            onClose={() => setMenuOpen(false)}
          />
        ) : (
          <DropdownMenuSeparator />
        )}
        <DropdownMenuItem asChild>
          <a
            href={SUPPORT_DOCS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm cursor-pointer flex items-center"
          >
            <BookOpen className="mr-2 h-4 w-4" />
            Help Center
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/dashboard/support" className="text-sm cursor-pointer">
            <HelpCircle className="mr-2 h-4 w-4" />
            Support & tickets
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            openBugReport();
          }}
          className="text-sm cursor-pointer"
        >
          <Bug className="mr-2 h-4 w-4" />
          Report an Issue
          <span className="ml-auto text-xs text-muted-foreground">Ctrl+Shift+B</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} className="text-sm cursor-pointer">
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserProfileMenu;
