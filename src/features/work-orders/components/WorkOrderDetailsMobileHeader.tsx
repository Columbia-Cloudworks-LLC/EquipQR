import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, MoreHorizontal } from 'lucide-react';

interface WorkOrderDetailsMobileHeaderProps {
  workOrder: {
    title: string;
  };
  canEdit: boolean;
  onEditClick: () => void;
  /** Opens unified overflow/actions sheet */
  onOpenActionSheet: () => void;
}

export const WorkOrderDetailsMobileHeader: React.FC<WorkOrderDetailsMobileHeaderProps> = ({
  workOrder,
  canEdit,
  onEditClick,
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
            {canEdit && (
              <Button
                variant="outline"
                onClick={onEditClick}
                className="min-h-[44px] px-3 touch-manipulation"
                aria-label="Edit work order"
              >
                <Edit className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              onClick={() => void onOpenActionSheet()}
              className="min-h-[44px] min-w-[44px] touch-manipulation"
              aria-label="Open actions and settings"
              title="Open actions and settings"
            >
              <MoreHorizontal className="h-6 w-6" aria-hidden />
            </Button>
          </div>
        </div>

        <h1 className="text-xl font-bold leading-tight line-clamp-3">{workOrder.title}</h1>
      </div>
    </div>
  );
};
