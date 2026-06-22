import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import WorkOrderCard from './WorkOrderCard';
import { WorkOrdersEmptyState } from './WorkOrdersEmptyState';
import type { WorkOrder } from '@/features/work-orders/types/workOrder';
import type { QuickFilterPreset } from '@/features/work-orders/hooks/useWorkOrderFilters';

interface WorkOrdersListProps {
  workOrders: WorkOrder[];
  onAcceptClick: (workOrder: WorkOrder) => void;
  onStatusUpdate: (workOrderId: string, newStatus: string) => void;
  isUpdating: boolean;
  isAccepting: boolean;
  hasActiveFilters: boolean;
  activePresets: Set<QuickFilterPreset>;
  onCreateClick: () => void;
  onAssignClick?: () => void;
  onReopenClick?: () => void;
  onShowQR?: (workOrder: WorkOrder) => void;
}

export const WorkOrdersList: React.FC<WorkOrdersListProps> = ({
  workOrders,
  onAcceptClick,
  onStatusUpdate,
  isUpdating,
  isAccepting,
  hasActiveFilters,
  activePresets,
  onCreateClick,
  onAssignClick,
  onReopenClick,
  onShowQR,
}) => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const handleNavigate = useCallback((id: string) => {
    navigate(`/dashboard/work-orders/${id}`);
  }, [navigate]);

  if (workOrders.length === 0) {
    return (
      <WorkOrdersEmptyState 
        hasActiveFilters={hasActiveFilters}
        activePresets={activePresets}
        onCreateClick={onCreateClick}
      />
    );
  }

  // Above-the-fold cutoff for eager image loading. Six cards covers the
  // typical desktop viewport (each desktop card is ~140px tall) and the
  // first ~3 mobile cards. Cards past this index keep `loading="lazy"`.
  // This silences the Chrome "Images loaded lazily and replaced with
  // placeholders" intervention warning on /dashboard/work-orders.
  const ABOVE_FOLD_COUNT = 6;

  return (
    <div className={cn('space-y-4', isMobile && 'space-y-2.5')}>
      {workOrders.map((order, index) => (
        // Avoid content-visibility (cv-auto): it breaks Radix Tooltip positioning
        // (getBoundingClientRect) for PM segment tooltips on list cards.
        <div key={order.id}>
          <WorkOrderCard
            workOrder={order}
            variant={isMobile ? 'mobile' : 'desktop'}
            onNavigate={handleNavigate}
            onAcceptClick={onAcceptClick}
            onStatusUpdate={onStatusUpdate}
            isUpdating={isUpdating}
            isAccepting={isAccepting}
            onAssignClick={onAssignClick}
            onReopenClick={onReopenClick}
            onShowQR={isMobile ? onShowQR : undefined}
            isAboveTheFold={index < ABOVE_FOLD_COUNT}
          />
        </div>
      ))}
    </div>
  );
};

