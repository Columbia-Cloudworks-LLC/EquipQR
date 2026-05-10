import React from 'react';
import { Link } from 'react-router-dom';
import { ScanLine } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DASHBOARD_MOBILE_SCAN_ENTRY_PATH } from '@/features/dashboard/constants/mobileDashboard';

export interface MobileDashboardHeroProps {
  className?: string;
}

/**
 * Above-the-fold primary action for mobile technicians — routes to the fleet
 * surface where QR-backed equipment records are opened after a physical scan.
 */
const MobileDashboardHero: React.FC<MobileDashboardHeroProps> = ({ className }) => {
  return (
    <Link
      to={DASHBOARD_MOBILE_SCAN_ENTRY_PATH}
      data-testid="mobile-dashboard-scan-hero"
      className={cn(
        'flex w-full items-center gap-4 rounded-xl border border-primary/25 bg-primary/5 px-4 py-3.5',
        'text-left shadow-sm transition-colors hover:bg-primary/10 active:scale-[0.99]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'touch-manipulation min-h-[52px]',
        className
      )}
    >
      <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
        <ScanLine className="h-6 w-6" aria-hidden />
      </span>
      <span className="min-w-0 flex-1 space-y-0.5">
        <span className="block text-base font-semibold leading-tight text-foreground">Scan equipment QR</span>
        <span className="block text-sm text-muted-foreground leading-snug">
          Open Equipment, then use your camera on any sticker — you&apos;ll jump straight to that asset.
        </span>
      </span>
    </Link>
  );
};

export default MobileDashboardHero;
