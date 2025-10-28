
import React from 'react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Home, 
  Package, 
  ClipboardList, 
  Users, 
  Map, 
  Building,
  QrCode,
  CreditCard,
  Settings,
  FileText,
  ChevronUp,
  LogOut,
  User,
  HelpCircle,
  ClipboardCheck,
  Bug,
  Shield
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { isLightColor } from "@/lib/utils";
import OrganizationSwitcher from "@/components/organization/OrganizationSwitcher";
import { useAuth } from "@/hooks/useAuth";
import { useUser } from "@/contexts/UserContext";
import { useSimpleOrganization } from "@/hooks/useSimpleOrganization";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSidebar } from "@/components/ui/sidebar";
import Logo from "@/components/ui/Logo";
import { useSuperAdminAccess } from "@/hooks/useSuperAdminAccess";

const mainNavigation = [
  { title: "Dashboard", url: "/dashboard", icon: Home },
  { title: "Equipment", url: "/dashboard/equipment", icon: Package },
  { title: "Work Orders", url: "/dashboard/work-orders", icon: ClipboardList },
  { title: "Teams", url: "/dashboard/teams", icon: Users },
  { title: "Fleet Map", url: "/dashboard/fleet-map", icon: Map },
];

const managementNavigation = [
  { title: "Organization", url: "/dashboard/organization", icon: Building },
  { title: "PM Templates", url: "/dashboard/pm-templates", icon: ClipboardCheck, adminOnly: true },
  { title: "QR Scanner", url: "/dashboard/scanner", icon: QrCode },
  // Billing removed - app is now free
  // { title: "Billing", url: "/dashboard/billing", icon: CreditCard },
  { title: "Reports", url: "/dashboard/reports", icon: FileText },
  { title: "Settings", url: "/dashboard/settings", icon: Settings },
];

// Billing debug routes removed
// const debugNavigation = [
//   { title: "Billing Debug", url: "/dashboard/debug/billing", icon: Bug },
//   { title: "Exemptions Admin", url: "/dashboard/debug/exemptions-admin", icon: Shield, superAdminOnly: true },
// ];
const debugNavigation: Array<{ title: string; url: string; icon: any; superAdminOnly?: boolean }> = [];

const AppSidebar = () => {
  const location = useLocation();
  const { signOut } = useAuth();
  const { currentUser } = useUser();
  const { currentOrganization } = useSimpleOrganization();
  const isMobile = useIsMobile();
  const { setOpenMobile } = useSidebar();
  const { isSuperAdmin } = useSuperAdminAccess();

  const handleSignOut = async () => {
    await signOut();
  };

  const handleNavClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  // Get organization branding
  const orgBackgroundColor = currentOrganization?.backgroundColor;
  const hasCustomBranding = orgBackgroundColor && orgBackgroundColor !== '#ffffff';
  const isLightBrand = hasCustomBranding ? isLightColor(orgBackgroundColor) : true;

  // Dynamic styles for branded sidebar using CSS variables
  const sidebarStyle = hasCustomBranding ? {
    '--brand': orgBackgroundColor,
    '--brand-foreground': isLightBrand ? '#1a1a1a' : '#ffffff',
    backgroundColor: orgBackgroundColor,
  } as React.CSSProperties : {};

  const textColorClass = hasCustomBranding 
    ? 'text-brand-foreground'
    : '';

  const mutedTextColorClass = hasCustomBranding 
    ? (isLightBrand ? 'text-brand-foreground/70' : 'text-brand-foreground/70')
    : '';

  const hoverBackgroundClass = hasCustomBranding
    ? (isLightBrand ? 'hover:bg-brand-foreground/10' : 'hover:bg-brand-foreground/20')
    : '';

  const activeBackgroundClass = hasCustomBranding
    ? (isLightBrand ? 'bg-brand-foreground/15' : 'bg-brand-foreground/25')
    : '';

  return (
    <Sidebar variant="inset">
      <div 
        className="flex h-full w-full flex-col bg-sidebar group-data-[variant=floating]:rounded-lg group-data-[variant=floating]:border group-data-[variant=floating]:border-sidebar-border group-data-[variant=floating]:shadow"
        style={sidebarStyle}
      >
        <SidebarHeader className="p-3 sm:p-4">
          <div className={cn("flex items-center gap-2 px-1 sm:px-2 py-1 sm:py-2", textColorClass)}>
            <Logo size="sm" />
            <span className="font-semibold text-base sm:text-lg">EquipQR</span>
          </div>
          <OrganizationSwitcher />
        </SidebarHeader>
        
        <SidebarContent className="px-2 sm:px-3">
          <SidebarGroup>
            <SidebarGroupLabel className={cn("text-xs", mutedTextColorClass)}>
              Navigation
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {mainNavigation.map((item) => {
                  const isActive = location.pathname === item.url;
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton 
                        asChild
                        className={cn(
                          "text-sm transition-colors",
                          textColorClass,
                          hasCustomBranding ? '' : 'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                          hoverBackgroundClass,
                          isActive && hasCustomBranding ? activeBackgroundClass : '',
                          isActive && hasCustomBranding ? 'font-medium' : '',
                          isActive && !hasCustomBranding ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground' : ''
                        )}
                      >
                        <Link to={item.url} onClick={handleNavClick}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          
          <SidebarGroup>
            <SidebarGroupLabel className={cn("text-xs", mutedTextColorClass)}>
              Management
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {managementNavigation.map((item) => {
                  const isActive = location.pathname === item.url;
                  const isAdmin = currentOrganization?.userRole === 'owner' || currentOrganization?.userRole === 'admin';
                  
                  // Hide admin-only items for non-admins
                  if (item.adminOnly && !isAdmin) {
                    return null;
                  }
                  
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton 
                        asChild
                        className={cn(
                          "text-sm transition-colors",
                          textColorClass,
                          hasCustomBranding ? '' : 'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                          hoverBackgroundClass,
                          isActive && hasCustomBranding ? activeBackgroundClass : '',
                          isActive && hasCustomBranding ? 'font-medium' : '',
                          isActive && !hasCustomBranding ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground' : ''
                        )}
                      >
                        <Link to={item.url} onClick={handleNavClick}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          
          {/* Debug section - only shown in development */}
          {import.meta.env.DEV && (
            <SidebarGroup>
              <SidebarGroupLabel className={cn("text-xs", mutedTextColorClass)}>
                Debug
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {debugNavigation.map((item) => {
                    const isActive = location.pathname === item.url;
                    
                    // Hide super admin only items if user is not a super admin
                    if ((item as any).superAdminOnly && !isSuperAdmin) {
                      return null;
                    }
                    
                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton 
                          asChild
                          className={cn(
                            "text-sm transition-colors",
                            textColorClass,
                            hasCustomBranding ? '' : 'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                            hoverBackgroundClass,
                            isActive && hasCustomBranding ? activeBackgroundClass : '',
                            isActive && hasCustomBranding ? 'font-medium' : '',
                            isActive && !hasCustomBranding ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground' : ''
                          )}
                        >
                          <Link to={item.url} onClick={handleNavClick}>
                            <item.icon className="h-4 w-4" />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}
        </SidebarContent>
        
        <SidebarFooter className="p-2 sm:p-3">
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    size="lg"
                    className={cn(
                      "transition-colors",
                      textColorClass,
                      hasCustomBranding ? '' : 'data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground',
                      hasCustomBranding && isLightBrand ? 'data-[state=open]:bg-black/10' : '',
                      hasCustomBranding && !isLightBrand ? 'data-[state=open]:bg-white/20' : ''
                    )}
                  >
                    <div className={cn(
                      "flex aspect-square size-6 sm:size-8 items-center justify-center rounded-lg",
                      hasCustomBranding 
                        ? 'bg-brand-foreground/20 text-brand-foreground'
                        : 'bg-sidebar-primary text-sidebar-primary-foreground'
                    )}>
                      <User className="size-3 sm:size-4" />
                    </div>
                    <div className="grid flex-1 text-left text-xs sm:text-sm leading-tight min-w-0">
                      <span className="truncate font-semibold">
                        {currentUser?.name || 'User'}
                      </span>
                      <span className={cn(
                        "truncate text-xs",
                        hasCustomBranding ? mutedTextColorClass : 'text-muted-foreground'
                      )}>
                        {currentUser?.email || ''}
                      </span>
                    </div>
                    <ChevronUp className="ml-auto size-3 sm:size-4" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                  side="bottom"
                  align="end"
                  sideOffset={4}
                >
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard/support" onClick={handleNavClick} className="text-sm cursor-pointer">
                      <HelpCircle className="mr-2 h-4 w-4" />
                      Support
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleSignOut} className="text-sm">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </div>
    </Sidebar>
  );
};

export default AppSidebar;
