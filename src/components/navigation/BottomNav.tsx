/**
 * Bottom Navigation Bar Component
 * 
 * Mobile-first sticky bottom navigation for primary app sections.
 * Only visible on mobile (<768px), hidden on desktop.
 * 
 * Features:
 * - 48x48px touch targets (exceeds 44px minimum)
 * - Safe area insets for iOS devices
 * - Active state indicator
 * - Smooth transitions
 */

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  Forklift, 
  ClipboardList, 
  Warehouse,
  Menu
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/components/ui/sidebar-context';

interface NavItem {
  label: string;
  shortLabel?: string; // Optional shorter label for small screens
  href: string;
  icon: LucideIcon;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: Home },
  { label: 'Equipment', href: '/dashboard/equipment', icon: Forklift },
  { label: 'Work Orders', shortLabel: 'Orders', href: '/dashboard/work-orders', icon: ClipboardList },
  { label: 'Inventory', href: '/dashboard/inventory', icon: Warehouse },
];

const BottomNav: React.FC = () => {
  const location = useLocation();
  const { setOpenMobile } = useSidebar();

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(href);
  };

  const handleMenuClick = () => {
    setOpenMobile(true);
  };

  return (
    <nav 
      className={cn(
        // Base styles
        "fixed bottom-0 left-0 right-0 z-fixed",
        "bg-background/95 backdrop-blur-sm border-t",
        // Safe area padding for iOS
        "pb-safe-bottom",
        // Hide on desktop
        "md:hidden",
        // Animation
        "animate-slide-up"
      )}
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="flex items-stretch justify-around px-2">
        {navItems.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                // Touch target: 48x48px minimum
                "flex flex-col items-center justify-center",
                "min-w-[48px] min-h-[48px] py-2 px-3",
                // Touch feedback
                "touch-manipulation active:scale-95",
                "transition-all duration-fast",
                // Typography
                "text-xs font-medium",
                // Colors
                active 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground",
                // Focus styles
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md"
              )}
              aria-current={active ? 'page' : undefined}
            >
              <div className={cn(
                "relative p-1.5 rounded-lg transition-all duration-fast",
                active && "bg-primary/10"
              )}>
                <Icon className={cn(
                  "h-5 w-5 transition-transform duration-fast",
                  active && "scale-110"
                )} />
                {active && (
                  <span 
                    className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary"
                    aria-hidden="true"
                  />
                )}
              </div>
              <span className="mt-0.5 whitespace-nowrap">
                <span className="hidden sm:inline">{item.label}</span>
                <span className="sm:hidden">{item.shortLabel || item.label}</span>
              </span>
            </Link>
          );
        })}
        
        {/* More/Menu button to open sidebar */}
        <button
          onClick={handleMenuClick}
          className={cn(
            // Touch target: 48x48px minimum
            "flex flex-col items-center justify-center",
            "min-w-[48px] min-h-[48px] py-2 px-3",
            // Touch feedback
            "touch-manipulation active:scale-95",
            "transition-all duration-fast",
            // Typography
            "text-xs font-medium",
            // Colors
            "text-muted-foreground hover:text-foreground",
            // Focus styles
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md"
          )}
          aria-label="Open menu"
        >
          <div className="p-1.5 rounded-lg">
            <Menu className="h-5 w-5" />
          </div>
          <span className="mt-0.5">More</span>
        </button>
      </div>
    </nav>
  );
};

export default BottomNav;
