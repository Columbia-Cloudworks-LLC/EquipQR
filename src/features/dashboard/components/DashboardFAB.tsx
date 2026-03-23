import React, { useState } from 'react';
import { Plus, ClipboardList, QrCode, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface SpeedDialAction {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  className?: string;
}

/**
 * Persistent mobile FAB for primary dashboard creation actions.
 * Only visible on mobile (<768px), positioned above the bottom nav bar.
 */
const DashboardFAB: React.FC = () => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  if (!isMobile) return null;

  const actions: SpeedDialAction[] = [
    {
      icon: <ClipboardList className="h-5 w-5" />,
      label: 'New Work Order',
      onClick: () => {
        setOpen(false);
        navigate('/dashboard/work-orders?create=true');
      },
    },
    {
      icon: <QrCode className="h-5 w-5" />,
      label: 'Scan QR Code',
      onClick: () => {
        setOpen(false);
        navigate('/dashboard/equipment?scan=true');
      },
    },
  ];

  return (
    <>
      {/* Backdrop to close speed-dial */}
      {open && (
        <div
          className="fixed inset-0 z-[49]"
          aria-hidden="true"
          onClick={() => setOpen(false)}
        />
      )}

      <div className="fixed bottom-[78px] right-4 z-50 flex flex-col items-end gap-3">
        {/* Speed-dial action buttons */}
        <div
          className={cn(
            "flex flex-col items-end gap-2 transition-all duration-200",
            open ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 translate-y-2 pointer-events-none"
          )}
          aria-hidden={!open}
        >
          {actions.map((action) => (
            <button
              key={action.label}
              onClick={action.onClick}
              className={cn(
                "flex items-center gap-2.5 rounded-full",
                "bg-background border border-border shadow-lg",
                "px-4 h-11 text-sm font-medium text-foreground",
                "touch-manipulation active:scale-[0.97] transition-transform duration-100",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                action.className
              )}
              aria-label={action.label}
            >
              <span className="text-primary">{action.icon}</span>
              {action.label}
            </button>
          ))}
        </div>

        {/* Main FAB trigger */}
        <Button
          type="button"
          size="icon"
          onClick={() => setOpen((prev) => !prev)}
          aria-label={open ? "Close quick actions" : "Quick actions"}
          aria-expanded={open}
          className={cn(
            "h-14 w-14 rounded-full shadow-elevation-3",
            "transition-transform duration-200",
            open && "rotate-45"
          )}
        >
          {open ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
        </Button>
      </div>
    </>
  );
};

export default DashboardFAB;
