import React from 'react';
import { Link } from 'react-router-dom';
import { Settings, HelpCircle, Bug, LogOut, User } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useUser } from '@/contexts/useUser';
import { useIsMobile } from '@/hooks/use-mobile';
import { useBugReport } from '@/features/tickets/context/BugReportContext';
import { cn } from '@/lib/utils';

interface UserProfileMenuProps {
  className?: string;
}

const UserProfileMenu: React.FC<UserProfileMenuProps> = ({ className }) => {
  const { signOut } = useAuth();
  const { currentUser } = useUser();
  const isMobile = useIsMobile();
  const { openBugReport } = useBugReport();

  const handleSignOut = async () => {
    await signOut();
  };

  const displayName = currentUser?.name || 'User';
  const displayEmail = currentUser?.email || '';

  return (
    <DropdownMenu modal={!isMobile}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'relative h-8 w-8 rounded-full text-foreground hover:bg-accent hover:text-accent-foreground',
            className,
          )}
          aria-label={`User menu (${displayName})`}
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-sidebar-primary text-sidebar-primary-foreground">
            <User className="h-4 w-4" />
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-56 rounded-lg"
        side="bottom"
        align="end"
        sideOffset={8}
      >
        <DropdownMenuLabel className="flex flex-col gap-0.5 py-2">
          <span className="truncate text-sm font-semibold">{displayName}</span>
          {displayEmail ? (
            <span className="truncate text-xs font-normal text-muted-foreground">
              {displayEmail}
            </span>
          ) : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/dashboard/settings" className="text-sm cursor-pointer">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/dashboard/support" className="text-sm cursor-pointer">
            <HelpCircle className="mr-2 h-4 w-4" />
            Support
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
