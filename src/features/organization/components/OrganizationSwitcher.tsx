
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronsUpDown, Building } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useOrganization } from '@/contexts/OrganizationContext';
import { cn } from '@/lib/utils';

/** Helper to format role for display */
const formatRole = (role: string) => {
  return role.charAt(0).toUpperCase() + role.slice(1);
};

interface OrganizationSwitcherProps {
  className?: string;
}

const OrganizationSwitcher: React.FC<OrganizationSwitcherProps> = ({ className }) => {
  const { currentOrganization, userOrganizations, switchOrganization, isLoading } = useOrganization();
  const navigate = useNavigate();
  const [logoError, setLogoError] = useState(false);

  const handleOrganizationSwitch = (organizationId: string) => {
    switchOrganization(organizationId);
    // Navigate to dashboard after switching organizations
    navigate('/dashboard');
  };

  if (!currentOrganization || isLoading) {
    return (
      <div className={cn("flex items-center gap-2 p-2", className)}>
        <div className="w-5 h-5 sm:w-6 sm:h-6 bg-muted rounded animate-pulse" />
        <div className="flex-1 min-w-0">
          <div className="h-3 sm:h-4 bg-muted rounded animate-pulse mb-1" />
          <div className="h-2 sm:h-3 bg-muted rounded animate-pulse w-12 sm:w-16" />
        </div>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "flex items-center gap-2 w-full justify-between p-2 h-auto text-left",
            className
          )}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-5 h-5 sm:w-6 sm:h-6 bg-primary rounded flex items-center justify-center flex-shrink-0 overflow-hidden">
              {currentOrganization.logo && !logoError ? (
                <img 
                  src={currentOrganization.logo} 
                  alt={`${currentOrganization.name} logo`}
                  className="w-full h-full object-cover"
                  onError={() => setLogoError(true)}
                />
              ) : (
                <Building className="h-3 w-3 sm:h-4 sm:w-4 text-primary-foreground" />
              )}
            </div>
            <div className="flex flex-col items-start min-w-0 flex-1">
              <span className="text-xs sm:text-sm font-medium truncate w-full text-left">
                {currentOrganization.name}
              </span>
              <span className="text-[10px] sm:text-xs text-muted-foreground">
                {formatRole(currentOrganization.userRole)}
              </span>
            </div>
          </div>
          <ChevronsUpDown className="h-3 w-3 sm:h-4 sm:w-4 opacity-50 flex-shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 sm:w-64" align="start" side="bottom">
        <DropdownMenuLabel className="text-xs sm:text-sm">Switch Organization</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {userOrganizations.map((organization) => (
          <DropdownMenuItem
            key={organization.id}
            onClick={() => handleOrganizationSwitch(organization.id)}
            className="flex items-center gap-2 p-2 cursor-pointer"
            disabled={organization.userStatus !== 'active'}
          >
            <div className="w-5 h-5 sm:w-6 sm:h-6 bg-primary rounded flex items-center justify-center flex-shrink-0">
              <Building className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-medium truncate">
                  {organization.name}
                </span>
                {currentOrganization.id === organization.id && (
                  <Check className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                )}
              </div>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-[10px] sm:text-xs text-muted-foreground">
                  {formatRole(organization.userRole)}
                </span>
                {organization.userStatus !== 'active' && (
                  <Badge variant="outline" className="text-[10px] sm:text-xs px-1 py-0">
                    {organization.userStatus}
                  </Badge>
                )}
              </div>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default OrganizationSwitcher;

