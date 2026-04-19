import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';
import WorkOrderCard from './WorkOrderCard';
import { WorkOrdersEmptyState } from './WorkOrdersEmptyState';
import { isOfflineId } from '@/features/work-orders/hooks/useOfflineMergedWorkOrders';
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
  onReopenClick
}) => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const handleNavigate = useCallback((id: string) => {
    if (isOfflineId(id)) {
      // Offline items cannot be opened — they will sync when back online
      toast.info('Pending sync', {
        description: 'This work order will be available for viewing after it syncs.',
      });
      return;
    }
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
    <div className="space-y-4">
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
            isAboveTheFold={index < ABOVE_FOLD_COUNT}
          />
        </div>
      ))}
    </div>
  );
};

