import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download, MoreHorizontal } from 'lucide-react';

interface WorkOrderDetailsMobileHeaderProps {
  workOrder: {
    title: string;
  };
  showExports?: boolean;
  /** Opens unified overflow/actions sheet */
  onOpenActionSheet: () => void;
}

export const WorkOrderDetailsMobileHeader: React.FC<WorkOrderDetailsMobileHeaderProps> = ({
  workOrder,
  showExports = false,
  onOpenActionSheet,
}) => {
  return (
    <div className="sticky top-0 z-10 bg-background border-b lg:hidden">
      <div className="px-3 pt-2 pb-3 space-y-2">
        <div className="flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            asChild
            className="-ml-2 min-h-[44px] gap-1.5 px-2 text-muted-foreground hover:text-foreground touch-manipulation"
          >
            <Link to="/dashboard/work-orders">
              <ArrowLeft className="h-4 w-4" aria-hidden />
              <span className="text-sm font-medium">Work Orders</span>
            </Link>
          </Button>

          <div className="flex shrink-0 items-center gap-0.5">
            <Button
              variant={showExports ? 'outline' : 'ghost'}
              onClick={() => void onOpenActionSheet()}
              className="min-h-[44px] min-w-[44px] touch-manipulation"
              aria-label={showExports ? 'Export' : 'Open actions and settings'}
              title={showExports ? 'Export' : 'Open actions and settings'}
            >
              {showExports ? (
                <Download className="h-5 w-5" aria-hidden />
              ) : (
                <MoreHorizontal className="h-6 w-6" aria-hidden />
              )}
            </Button>
          </div>
        </div>

        <h1
          className="text-xl font-bold leading-tight line-clamp-3"
          data-route-heading="true"
          tabIndex={-1}
        >
          {workOrder.title}
        </h1>
      </div>
    </div>
  );
};
