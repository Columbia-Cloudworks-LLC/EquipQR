
import React from 'react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Home,
  Forklift,
  ClipboardList,
  Users,
  Map,
  Building,
  FileText,
  ClipboardCheck,
  Warehouse,
  Search,
  Layers,
  History,
  ShieldCheck,
  Plug,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { isLightColor } from "@/lib/utils";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSidebar } from "@/components/ui/sidebar-context";
import Logo from "@/components/ui/Logo";
import { DSR_COCKPIT_ENABLED } from "@/lib/flags";

interface NavigationItem {
  title: string;
  url: string;
  icon: LucideIcon;
  adminOnly?: boolean;
  featureEnabled?: boolean;
}

interface NavigationGroup {
  label: string;
  items: NavigationItem[];
}

const navigationGroups: NavigationGroup[] = [
  {
    label: "Fleet",
    items: [
      { title: "Equipment", url: "/dashboard/equipment", icon: Forklift },
      { title: "Fleet Map", url: "/dashboard/fleet-map", icon: Map },
      { title: "Inventory", url: "/dashboard/inventory", icon: Warehouse },
      { title: "Part Lookup", url: "/dashboard/part-lookup", icon: Search },
      { title: "Part Alternates", url: "/dashboard/alternate-groups", icon: Layers },
    ],
  },
  {
    label: "Operations",
    items: [
      { title: "Dashboard", url: "/dashboard", icon: Home },
      { title: "Work Orders", url: "/dashboard/work-orders", icon: ClipboardList },
      { title: "PM Templates", url: "/dashboard/pm-templates", icon: ClipboardCheck, adminOnly: true },
      { title: "Reports", url: "/dashboard/reports", icon: FileText },
    ],
  },
  {
    label: "Infrastructure",
    items: [
      { title: "Teams", url: "/dashboard/teams", icon: Users },
      { title: "Organization", url: "/dashboard/organization", icon: Building },
      { title: "Integrations", url: "/dashboard/organization#integrations", icon: Plug },
    ],
  },
  {
    label: "Audit",
    items: [
      { title: "Audit Log", url: "/dashboard/audit-log", icon: History, adminOnly: true },
      { title: "DSR Cockpit", url: "/dashboard/dsr", icon: ShieldCheck, adminOnly: true, featureEnabled: DSR_COCKPIT_ENABLED },
    ],
  },
];

const AppSidebar = () => {
  const location = useLocation();
  const { currentOrganization } = useOrganization();
  const isMobile = useIsMobile();
  const { setOpenMobile } = useSidebar();

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

  const isAdmin =
    currentOrganization?.userRole === 'owner' ||
    currentOrganization?.userRole === 'admin';

  const renderNavItem = (item: NavigationItem) => {
    const isActive = location.pathname === item.url;
    return (
      <SidebarMenuItem key={item.title}>
        <SidebarMenuButton
          asChild
          className={cn(
            "text-sm transition-colors duration-fast",
            textColorClass,
            hasCustomBranding ? '' : 'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
            hoverBackgroundClass,
            isActive && hasCustomBranding ? activeBackgroundClass : '',
            isActive && hasCustomBranding ? 'font-medium' : '',
            isActive && !hasCustomBranding ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground border-l-2 border-l-sidebar-primary rounded-l-none' : ''
          )}
        >
          <Link to={item.url} onClick={handleNavClick}>
            <item.icon className="h-4 w-4" />
            <span>{item.title}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  const visibleGroups = navigationGroups
    .map((group) => ({
      label: group.label,
      items: group.items.filter((item) => {
        if (item.adminOnly && !isAdmin) return false;
        if (item.featureEnabled === false) return false;
        return true;
      }),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <Sidebar variant="inset">
      <div
        className="flex h-full w-full flex-col bg-sidebar group-data-[variant=floating]:rounded-lg group-data-[variant=floating]:border group-data-[variant=floating]:border-sidebar-border group-data-[variant=floating]:shadow"
        style={sidebarStyle}
      >
        <SidebarHeader className="p-3 sm:p-4">
          <div className={cn("flex items-center gap-2 px-1 sm:px-2 py-1 sm:py-2", textColorClass)}>
            <Logo size="sm" />
            <span className="font-semibold text-base sm:text-lg">EquipQR™</span>
          </div>
        </SidebarHeader>

        <SidebarContent className="px-2 sm:px-3 overflow-x-hidden" role="navigation" aria-label="Main navigation">
          {visibleGroups.map((group, idx) => (
            <React.Fragment key={group.label}>
              {idx > 0 && <Separator className="mx-1 my-1 opacity-30" />}
              <SidebarGroup>
                <SidebarGroupLabel className={cn(
                  "text-[10px] uppercase tracking-widest font-semibold",
                  mutedTextColorClass || "text-sidebar-foreground/50"
                )}>
                  {group.label}
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {group.items.map(renderNavItem)}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </React.Fragment>
          ))}
        </SidebarContent>
      </div>
    </Sidebar>
  );
};

export default AppSidebar;
